import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { chatApi, chatSocketUrl } from '@/api/chat';
import { errorMessage } from '@/api/client';
import { matchesApi } from '@/api/matches';
import type { ChatMessage, Conversation } from '@/api/types';
import { SafetySheet } from '@/components/SafetySheet';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { haptics } from '@/lib/haptics';
import { tokenStore } from '@/lib/storage';
import { useAuth } from '@/store/auth';
import { fonts, palette, radii, spacing, useTheme } from '@/theme';

/** Day key for grouping messages into date separators. */
function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}

/** Human date label for a separator (Today / Yesterday / e.g. 4 June). */
function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
}

/** Short time stamp shown under a bubble. */
function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function ChatThread() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const { c, isDark } = useTheme();

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
      chatApi.getConversation(String(id)).then((conversation) => active && setConv(conversation)).catch(() => {});
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
    haptics.selection();
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

  const peer = conv?.other_profile;
  const peerName = peer?.display_name ?? name ?? 'Chat';
  const peerPhoto = peer?.photos?.find((p) => p.is_primary)?.cdn_url ?? peer?.photos?.[0]?.cdn_url;
  const canSend = !!text.trim() && !sending;

  return (
    <Screen>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + spacing.xs, backgroundColor: c.surface, borderBottomColor: c.border },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>

        <View style={styles.headerCenter}>
          {peerPhoto ? (
            <Image source={{ uri: peerPhoto }} style={styles.headerAvatar} contentFit="cover" transition={120} />
          ) : (
            <View style={[styles.headerAvatar, styles.headerAvatarFallback, { backgroundColor: c.accentFaint }]}>
              <Text variant="callout" tone="accent">{peerName[0]?.toUpperCase() ?? '?'}</Text>
            </View>
          )}
          <View style={styles.headerText}>
            <Text variant="subhead" tone="default" numberOfLines={1} style={styles.headerName}>
              {peerName}
            </Text>
            {peerTyping ? (
              <Text variant="footnote" tone="accent">typing…</Text>
            ) : conv ? (
              <Text variant="footnote" tone="subtle">Matched</Text>
            ) : null}
          </View>
        </View>

        <Pressable onPress={openMenu} hitSlop={12} style={styles.kebab}>
          <Ionicons name="ellipsis-horizontal" size={22} color={c.textMuted} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={c.accent} size="large" />
          </View>
        ) : locked ? (
          <View style={styles.lockedWrap}>
            <View style={[styles.lockBadge, { backgroundColor: c.accentFaint }]}>
              <Ionicons name="lock-closed" size={32} color={c.accent} />
            </View>
            <Text variant="heading" tone="default" center style={{ marginTop: spacing.lg }}>
              This chat is locked
            </Text>
            <Text variant="body" tone="muted" center style={styles.lockedBody}>
              On the free plan you can keep a few chats open at once. Upgrade to message all your matches, or unmatch
              someone to free up a slot.
            </Text>
            <Button
              label="Upgrade to Premium"
              variant="primary"
              onPress={() => router.replace('/premium')}
              style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}
            />
          </View>
        ) : (
          <FlatList
            data={messages}
            inverted
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.listContent}
            keyboardDismissMode="interactive"
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyBadge, { backgroundColor: c.accentFaint }]}>
                  <Ionicons name="chatbubbles-outline" size={30} color={c.accent} />
                </View>
                <Text variant="subhead" tone="default" center style={{ marginTop: spacing.md }}>
                  You matched!
                </Text>
                <Text variant="body" tone="muted" center style={styles.emptyBody}>
                  Send a thoughtful first message to begin.
                </Text>
              </View>
            }
            renderItem={({ item, index }) => {
              // Inverted list: the visually-previous (older) message is at index+1.
              const older = messages[index + 1];
              const showDay = !older || dayKey(older.sent_at) !== dayKey(item.sent_at);

              // System / wali messages render as a centered pill, not a bubble.
              if (item.type === 'system' || item.type === 'wali') {
                return (
                  <View>
                    <View style={styles.systemRow}>
                      <View style={[styles.systemPill, { backgroundColor: c.surfaceAlt }]}>
                        {item.type === 'wali' ? (
                          <Ionicons name="shield-checkmark" size={13} color={c.textMuted} />
                        ) : null}
                        <Text variant="footnote" tone="muted" center>
                          {item.content}
                        </Text>
                      </View>
                    </View>
                    {showDay ? <DaySeparator iso={item.sent_at} /> : null}
                  </View>
                );
              }

              const mine = item.sender_id === userId;
              return (
                <View>
                  <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
                    <View style={[mine ? styles.colMine : styles.colTheirs]}>
                      <View
                        style={[
                          styles.bubble,
                          mine
                            ? [styles.bubbleMine, { backgroundColor: palette.burgundy }]
                            : [styles.bubbleTheirs, { backgroundColor: c.surfaceAlt, borderColor: c.border }],
                        ]}
                      >
                        <Text
                          variant="body"
                          color={mine ? palette.cream : c.text}
                          style={styles.msgText}
                        >
                          {item.content}
                        </Text>
                      </View>
                      <View style={[styles.metaRow, mine ? styles.metaMine : styles.metaTheirs]}>
                        <Text variant="footnote" tone="subtle">{timeLabel(item.sent_at)}</Text>
                        {mine ? (
                          <Ionicons
                            name={item.is_read ? 'checkmark-done' : 'checkmark'}
                            size={14}
                            color={item.is_read ? c.accent : c.textSubtle}
                          />
                        ) : null}
                      </View>
                    </View>
                  </View>
                  {showDay ? <DaySeparator iso={item.sent_at} /> : null}
                </View>
              );
            }}
          />
        )}

        {error ? (
          <Text variant="footnote" tone="danger" center style={styles.error}>
            {error}
          </Text>
        ) : null}

        {!locked ? (
          <View
            style={[
              styles.composer,
              {
                paddingBottom: insets.bottom + spacing.sm,
                backgroundColor: c.surface,
                borderTopColor: c.border,
              },
            ]}
          >
            <TextInput
              style={[styles.input, { backgroundColor: c.surfaceAlt, color: c.text, borderColor: c.border }]}
              value={text}
              onChangeText={(t) => {
                setText(t);
                sendTyping(t.length > 0);
              }}
              placeholder="Write a message…"
              placeholderTextColor={c.textSubtle}
              multiline
              onBlur={() => sendTyping(false)}
              keyboardAppearance={isDark ? 'dark' : 'light'}
            />
            <PressableScale
              onPress={send}
              disabled={!canSend}
              haptic={false}
              style={[styles.sendBtn, { backgroundColor: palette.burgundy, opacity: canSend ? 1 : 0.45 }]}
            >
              <Ionicons name="arrow-up" size={22} color={palette.cream} />
            </PressableScale>
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
    </Screen>
  );
}

/** Centered subtle date label between days of messages. */
function DaySeparator({ iso }: { iso: string }) {
  return (
    <View style={styles.daySep}>
      <Text variant="label" tone="subtle">{dayLabel(iso)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: 2 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19 },
  headerAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  headerName: { marginBottom: 0 },
  kebab: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },

  // Locked state
  lockedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  lockBadge: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  lockedBody: { marginTop: spacing.sm, lineHeight: 22 },

  // List
  listContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  emptyWrap: { transform: [{ scaleY: -1 }], paddingTop: 96, paddingHorizontal: spacing.xl, alignItems: 'center' },
  emptyBadge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  emptyBody: { marginTop: spacing.xs, lineHeight: 22 },

  // Date separator
  daySep: { alignItems: 'center', paddingVertical: spacing.md },

  // System / wali pill
  systemRow: { alignItems: 'center', paddingVertical: spacing.sm },
  systemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '82%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },

  // Bubbles
  bubbleRow: { marginVertical: 3, flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  colMine: { maxWidth: '78%', alignItems: 'flex-end' },
  colTheirs: { maxWidth: '78%', alignItems: 'flex-start' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.lg },
  bubbleMine: { borderBottomRightRadius: radii.xs / 2 },
  bubbleTheirs: { borderBottomLeftRadius: radii.xs / 2, borderWidth: StyleSheet.hairlineWidth },
  msgText: { fontSize: 15.5, lineHeight: 21 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, paddingHorizontal: 2 },
  metaMine: { justifyContent: 'flex-end' },
  metaTheirs: { justifyContent: 'flex-start' },

  error: { marginBottom: spacing.xs },

  // Composer
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    fontFamily: fonts.body,
    fontSize: 15.5,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
