import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { chatApi, chatSocketUrl } from '@/api/chat';
import { errorMessage } from '@/api/client';
import { matchesApi } from '@/api/matches';
import type { ChatMessage, Conversation } from '@/api/types';
import { SafetySheet } from '@/components/SafetySheet';
import { tokenStore } from '@/lib/storage';
import { useAuth } from '@/store/auth';
import { fonts, palette, radii, spacing } from '@/theme';

export default function ChatThread() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]); // newest-first (inverted list)
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const [conv, setConv] = useState<Conversation | null>(null);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Upsert by id, keeping newest-first order.
  const upsert = useCallback((m: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((x) => x.id === m.id)) return prev;
      return [m, ...prev];
    });
  }, []);

  // Load history + open the realtime socket.
  useEffect(() => {
    let active = true;
    (async () => {
      chatApi.getConversation(String(id)).then((c) => active && setConv(c)).catch(() => {});
      let isLocked = false;
      try {
        const history = await chatApi.getMessages(String(id));
        if (active) setMessages(history); // already newest-first
        chatApi.markRead(String(id)).catch(() => {});
      } catch (err: any) {
        if (err?.response?.status === 402) {
          isLocked = true;
          if (active) setLocked(true);
        } else if (active) {
          setError(errorMessage(err, 'Could not load messages'));
        }
      } finally {
        if (active) setLoading(false);
      }

      // No realtime socket for a locked chat.
      const token = await tokenStore.getAccess();
      if (!token || !active || isLocked) return;
      const ws = new WebSocket(chatSocketUrl(String(id), token));
      wsRef.current = ws;
      ws.onmessage = (ev) => {
        try {
          const { type, payload } = JSON.parse(ev.data);
          if (type === 'message') {
            upsert({
              id: payload.id,
              conversation_id: payload.conversation_id,
              sender_id: payload.sender_id,
              type: payload.type ?? 'text',
              content: payload.content ?? null,
              media_url: null,
              media_duration_secs: null,
              is_read: false,
              is_delivered: true,
              sent_at: payload.sent_at,
              deleted_at: null,
            });
            if (payload.sender_id !== userId) chatApi.markRead(String(id)).catch(() => {});
          } else if (type === 'typing') {
            if (payload.sender_id !== userId) {
              setPeerTyping(!!payload.is_typing);
              if (typingTimer.current) clearTimeout(typingTimer.current);
              typingTimer.current = setTimeout(() => setPeerTyping(false), 4000);
            }
          }
        } catch {
          /* ignore malformed frames */
        }
      };
      ws.onerror = () => {};
    })();

    return () => {
      active = false;
      wsRef.current?.close();
      wsRef.current = null;
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [id, userId, upsert]);

  const sendTyping = (isTyping: boolean) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'typing', payload: { is_typing: isTyping } }));
    }
  };

  const unmatch = () => {
    if (!conv) return;
    Alert.alert('Unmatch?', 'This ends the connection and closes the conversation.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unmatch',
        style: 'destructive',
        onPress: async () => {
          try {
            await matchesApi.unmatch(conv.match_id);
            router.back();
          } catch (err) {
            Alert.alert('Could not unmatch', errorMessage(err));
          }
        },
      },
    ]);
  };

  const openMenu = () => {
    Alert.alert(name ?? 'Options', undefined, [
      { text: 'Report or block', onPress: () => setSafetyOpen(true) },
      { text: 'Unmatch', style: 'destructive', onPress: unmatch },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setText('');
    setSending(true);
    sendTyping(false);
    try {
      const msg = await chatApi.sendMessage(String(id), body);
      upsert(msg); // WS will also echo; upsert dedupes by id
    } catch (err) {
      setError(errorMessage(err, 'Message failed to send'));
      setText(body); // restore so the user can retry
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={palette.cream} />
        </Pressable>
        <Text style={styles.headerName} numberOfLines={1}>{name ?? 'Chat'}</Text>
        <Pressable onPress={openMenu} hitSlop={12} style={{ width: 30, alignItems: 'flex-end' }}>
          <Ionicons name="ellipsis-horizontal" size={22} color={palette.cream} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {loading ? (
          <View style={styles.center}><ActivityIndicator color={palette.burgundy} size="large" /></View>
        ) : locked ? (
          <View style={styles.lockedWrap}>
            <Ionicons name="lock-closed" size={44} color={palette.gold} />
            <Text style={styles.lockedTitle}>This chat is locked</Text>
            <Text style={styles.lockedBody}>
              On the free plan you can keep a few chats open at once. Upgrade to message all your matches, or unmatch someone to free up a slot.
            </Text>
            <Pressable style={styles.upgradeBtn} onPress={() => router.replace('/premium')}>
              <Text style={styles.upgradeText}>Upgrade to Premium</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={messages}
            inverted
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.empty}>You matched! Send a thoughtful first message to begin.</Text>
              </View>
            }
            renderItem={({ item }) => {
              const mine = item.sender_id === userId;
              return (
                <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.msgText, mine ? styles.textMine : styles.textTheirs]}>{item.content}</Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        {peerTyping ? <Text style={styles.typing}>typing…</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!locked ? (
        <View style={[styles.composer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={(t) => {
              setText(t);
              sendTyping(t.length > 0);
            }}
            placeholder="Write a message…"
            placeholderTextColor={palette.muted}
            multiline
            onBlur={() => sendTyping(false)}
          />
          <Pressable onPress={send} disabled={!text.trim() || sending} style={[styles.sendBtn, (!text.trim() || sending) && styles.sendDisabled]}>
            <Ionicons name="send" size={20} color={palette.cream} />
          </Pressable>
        </View>
        ) : null}
      </KeyboardAvoidingView>

      {conv ? (
        <SafetySheet
          userId={conv.other_profile.user_id}
          name={conv.other_profile.display_name}
          visible={safetyOpen}
          onClose={() => setSafetyOpen(false)}
          onActioned={() => router.back()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.cream },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lockedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.sm },
  lockedTitle: { fontFamily: fonts.display, fontSize: 26, color: palette.burgundy, marginTop: spacing.sm },
  lockedBody: { fontFamily: fonts.body, fontSize: 14.5, color: palette.muted, textAlign: 'center', lineHeight: 21 },
  upgradeBtn: { backgroundColor: palette.gold, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 999, marginTop: spacing.md },
  upgradeText: { fontFamily: fonts.bodySemibold, color: palette.ink, fontSize: 15 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: palette.burgundy,
  },
  back: { width: 30 },
  headerName: { fontFamily: fonts.displaySemibold, fontSize: 22, color: palette.cream, flex: 1, textAlign: 'center' },
  emptyWrap: { transform: [{ scaleY: -1 }], paddingTop: 80, paddingHorizontal: spacing.xl },
  empty: { fontFamily: fonts.body, color: palette.muted, textAlign: 'center', lineHeight: 22 },
  bubbleRow: { marginVertical: 4, flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMine: { backgroundColor: palette.burgundy, borderBottomRightRadius: 5 },
  bubbleTheirs: { backgroundColor: palette.white, borderBottomLeftRadius: 5, borderWidth: 1, borderColor: palette.line },
  msgText: { fontFamily: fonts.body, fontSize: 15.5, lineHeight: 21 },
  textMine: { color: palette.cream },
  textTheirs: { color: palette.ink },
  typing: { fontFamily: fonts.body, fontSize: 12.5, color: palette.muted, marginLeft: spacing.lg, marginBottom: 4 },
  error: { fontFamily: fonts.body, color: '#B00020', fontSize: 12.5, textAlign: 'center', marginBottom: 4 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    backgroundColor: palette.cream,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    backgroundColor: palette.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    fontFamily: fonts.body,
    fontSize: 15.5,
    color: palette.ink,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: palette.burgundy, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.5 },
});
