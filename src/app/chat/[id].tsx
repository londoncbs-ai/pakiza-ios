import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { chatApi, chatSocketUrl } from '@/api/chat';
import { wsTicket } from '@/api/ws';
import { errorMessage } from '@/api/client';
import { matchesApi } from '@/api/matches';
import { REPORT_REASONS, safetyApi, type ReportReason } from '@/api/safety';
import type { ChatMessage, Conversation } from '@/api/types';
import { ChatImageBubble } from '@/components/ChatImageBubble';
import { PlanBadge } from '@/components/PlanBadge';
import { FeatureHint } from '@/components/FeatureHint';
import { MeetingCard } from '@/components/MeetingCard';
import { SafetySheet } from '@/components/SafetySheet';
import { Screen } from '@/components/Screen';
import { SwipeToReply } from '@/components/SwipeToReply';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { PressableScale } from '@/components/PressableScale';
import { VoiceMessage } from '@/components/VoiceMessage';
import { formatDuration, useAudioRecorder } from '@/hooks/useAudioRecorder';
import { haptics } from '@/lib/haptics';
import { primaryPhotoUrl } from '@/lib/photos';
import { useAuth } from '@/store/auth';
import { useRealtime } from '@/store/realtime';
import { fonts, palette, radii, spacing, useTheme } from '@/theme';

/** A one-line label for a quoted reply (handles text and media messages). */
function replySnippet(m: ChatMessage | undefined): string {
  if (!m) return 'Message';
  if (m.type === 'image') return 'Photo';
  if (m.type === 'voice') return 'Voice message';
  if (m.type === 'meeting') return 'Meeting';
  return m.content?.trim() || 'Message';
}

/** Guess a sensible filename + mime for an uploaded image from its uri. */
function imageUpload(uri: string): { name: string; mime: string } {
  const name = uri.split('/').pop() || 'photo.jpg';
  const ext = (name.split('.').pop() || 'jpg').toLowerCase();
  return { name, mime: ext === 'png' ? 'image/png' : 'image/jpeg' };
}

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
  const { revision, setActiveContext, refreshUnread } = useRealtime();

  const [messages, setMessages] = useState<ChatMessage[]>([]); // newest-first (inverted list)
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const [conv, setConv] = useState<Conversation | null>(null);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [reportMsg, setReportMsg] = useState<ChatMessage | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [locked, setLocked] = useState(false);
  const recorder = useAudioRecorder();
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockedRef = useRef(false); // no socket / no refetch for a locked chat

  // Upsert by id, keeping newest-first order.
  const upsert = useCallback((m: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((x) => x.id === m.id)) return prev;
      return [m, ...prev];
    });
  }, []);

  // Reload history (also used as the revision-driven safety net).
  const reload = useCallback(async () => {
    if (lockedRef.current) return;
    try {
      const history = await chatApi.getMessages(String(id));
      setMessages(history); // already newest-first
      chatApi.markRead(String(id)).catch(() => {});
      refreshUnread();
    } catch {
      /* a transient failure leaves the existing list in place */
    }
  }, [id, refreshUnread]);

  // Load history + open the realtime socket, reconnecting with backoff while
  // the screen is focused. Mounting on focus also clears the active context on
  // blur so the global banner stays suppressed only while we are here.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      let backoff = 1000;
      let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
      lockedRef.current = false; // re-determined from the history load below
      setActiveContext({ kind: 'chat', id: String(id) });

      const clearReconnect = () => {
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
      };

      const scheduleReconnect = () => {
        if (!active || lockedRef.current) return;
        clearReconnect();
        const delay = backoff;
        backoff = Math.min(backoff * 2, 15000);
        reconnectTimer = setTimeout(() => openSocket(), delay);
      };

      const openSocket = async () => {
        if (!active || lockedRef.current) return;
        let ticket: string;
        try {
          ticket = await wsTicket();
        } catch {
          scheduleReconnect();
          return;
        }
        if (!active || lockedRef.current) return;
        let ws: WebSocket;
        try {
          ws = new WebSocket(chatSocketUrl(String(id), ticket));
        } catch {
          scheduleReconnect();
          return;
        }
        wsRef.current = ws;
        ws.onopen = () => {
          backoff = 1000;
        };
        ws.onmessage = (ev) => {
          try {
            const { type, payload } = JSON.parse(ev.data);
            if (type === 'message') {
              upsert({
                id: payload.id,
                conversation_id: payload.conversation_id,
                sender_id: payload.sender_id,
                // Keep the real message type (e.g. a booking arrives as 'meeting'),
                // and carry through any metadata so the live card can render.
                type: payload.type ?? 'text',
                content: payload.content ?? null,
                // Media frames carry a presigned GET url + duration; metadata
                // carries reply_to_id (and meeting/system extras).
                media_url: payload.media_url ?? null,
                media_duration_secs: payload.media_duration_secs ?? null,
                is_read: false,
                is_delivered: true,
                sent_at: payload.sent_at,
                deleted_at: null,
                metadata: payload.metadata ?? null,
              });
              if (payload.sender_id !== userId) {
                chatApi.markRead(String(id)).catch(() => {});
                refreshUnread();
              }
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
        ws.onerror = () => {
          /* onclose follows; reconnect is scheduled there */
        };
        ws.onclose = () => {
          if (wsRef.current === ws) wsRef.current = null;
          scheduleReconnect();
        };
      };

      (async () => {
        chatApi.getConversation(String(id)).then((conversation) => active && setConv(conversation)).catch(() => {});
        let isLocked = false;
        try {
          const history = await chatApi.getMessages(String(id));
          if (active) setMessages(history); // already newest-first
          chatApi.markRead(String(id)).catch(() => {});
          refreshUnread();
        } catch (err: any) {
          if (err?.response?.status === 402) {
            isLocked = true;
            lockedRef.current = true;
            if (active) setLocked(true);
          } else if (active) {
            setError(errorMessage(err, 'Could not load messages'));
          }
        } finally {
          if (active) setLoading(false);
        }
        if (!active || isLocked) return;
        openSocket();
      })();

      // Reconnect promptly when the app returns to the foreground.
      const onAppState = (next: string) => {
        if (next !== 'active' || !active || lockedRef.current) return;
        const ws = wsRef.current;
        const live = ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING);
        if (!live) {
          backoff = 1000;
          clearReconnect();
          openSocket();
        }
        reload();
      };
      const sub = AppState.addEventListener('change', onAppState);

      return () => {
        active = false;
        clearReconnect();
        sub.remove();
        wsRef.current?.close();
        wsRef.current = null;
        if (typingTimer.current) clearTimeout(typingTimer.current);
        setActiveContext(null);
      };
    }, [id, userId, upsert, reload, refreshUnread, setActiveContext])
  );

  // A missed socket event still surfaces via the global notification feed.
  useEffect(() => {
    if (revision > 0) reload();
  }, [revision, reload]);

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
    const reply = replyTo;
    setText('');
    setReplyTo(null);
    setSending(true);
    sendTyping(false);
    try {
      const msg = await chatApi.sendMessage(String(id), {
        type: 'text',
        content: body,
        reply_to_id: reply?.id ?? null,
      });
      upsert(msg); // WS will also echo; upsert dedupes by id
    } catch (err) {
      setError(errorMessage(err, 'Message failed to send'));
      setText(body); // restore so the user can retry
      setReplyTo(reply);
    } finally {
      setSending(false);
    }
  };

  // Pick an image, upload it, then send an image message (carrying any reply).
  const pickAndSendImage = async () => {
    if (uploading || sending || recorder.recording) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (res.canceled) return;
    const uri = res.assets[0].uri;
    const reply = replyTo;
    setReplyTo(null);
    setUploading(true);
    try {
      const { name, mime } = imageUpload(uri);
      const { media_s3_key } = await chatApi.uploadMedia(String(id), uri, mime, name);
      const msg = await chatApi.sendMessage(String(id), {
        type: 'image',
        media_s3_key,
        reply_to_id: reply?.id ?? null,
      });
      upsert(msg);
    } catch (err) {
      setError(errorMessage(err, 'Photo failed to send'));
      setReplyTo(reply);
    } finally {
      setUploading(false);
    }
  };

  // Tap to start recording; tap again to stop, upload and send the voice note.
  const toggleRecording = async () => {
    if (uploading || sending) return;
    if (!recorder.recording) {
      const ok = await recorder.start();
      if (!ok) {
        Alert.alert(
          'Microphone needed',
          'Allow microphone access in Settings to record voice messages.',
        );
      }
      return;
    }
    const take = await recorder.stop();
    if (!take) return;
    const reply = replyTo;
    setReplyTo(null);
    setUploading(true);
    try {
      const name = take.uri.split('/').pop() || 'voice.m4a';
      const { media_s3_key } = await chatApi.uploadMedia(String(id), take.uri, 'audio/m4a', name);
      const msg = await chatApi.sendMessage(String(id), {
        type: 'voice',
        media_s3_key,
        media_duration_secs: take.durationSecs,
        reply_to_id: reply?.id ?? null,
      });
      upsert(msg);
    } catch (err) {
      setError(errorMessage(err, 'Voice message failed to send'));
      setReplyTo(reply);
    } finally {
      setUploading(false);
    }
  };

  const cancelRecording = () => {
    recorder.cancel();
  };

  const submitReport = async (reason: ReportReason) => {
    const m = reportMsg;
    setReportMsg(null);
    if (!m) return;
    try {
      await safetyApi.report(m.sender_id, reason, undefined, m.id);
      haptics.success();
      Alert.alert('Message reported', 'Thank you. Our team will review this message and the surrounding conversation.');
    } catch (err: any) {
      if (err?.response?.status === 409) Alert.alert('Already reported', 'You have already reported this message.');
      else Alert.alert('Could not report', errorMessage(err));
    }
  };

  const peer = conv?.other_profile;
  const peerName = peer?.display_name ?? name ?? 'Chat';
  const peerPhoto = primaryPhotoUrl(peer);
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
          <View style={styles.headerAvatarWrap}>
            {peerPhoto ? (
              <Image source={{ uri: peerPhoto }} style={styles.headerAvatar} contentFit="cover" transition={120} />
            ) : (
              <View style={[styles.headerAvatar, styles.headerAvatarFallback, { backgroundColor: c.accentFaint }]}>
                <Text variant="callout" tone="accent">{peerName[0]?.toUpperCase() ?? '?'}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerText}>
            <View style={styles.headerNameRow}>
              <Text variant="subhead" tone="default" numberOfLines={1} style={styles.headerName}>
                {peerName}
              </Text>
              <PlanBadge plan={peer?.plan} />
            </View>
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

      {!locked && conv ? (
        <FeatureHint
          hintKey="chat-book-meet"
          icon="shield-checkmark"
          text="You can add a wali and book a supervised meet from a match."
          onPress={() =>
            router.push({
              pathname: '/book-meet',
              params: { conversationId: String(id), matchId: conv.match_id, name: peerName },
            })
          }
          style={styles.chatHint}
        />
      ) : null}

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
          // The empty state lives OUTSIDE the inverted list as an overlay:
          // inverted lists transform their content differently per platform,
          // so anything rendered inside gets flipped or mirrored.
          <View style={{ flex: 1 }}>
          <FlatList
            data={messages}
            inverted
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.listContent}
            keyboardDismissMode="interactive"
            renderItem={({ item, index }) => {
              // Inverted list: the visually-previous (older) message is at index+1.
              const older = messages[index + 1];
              const showDay = !older || dayKey(older.sent_at) !== dayKey(item.sent_at);

              // A booking renders as a live, centered card (not a chat bubble).
              if (item.type === 'meeting') {
                return (
                  <View>
                    <MeetingCard meetingId={item.metadata?.meeting_id} />
                    {showDay ? <DaySeparator iso={item.sent_at} /> : null}
                  </View>
                );
              }

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
              const isImage = item.type === 'image';
              const isVoice = item.type === 'voice';
              const isMedia = isImage || isVoice;

              // Resolve a quoted reply against the in-memory list.
              const replyId = item.metadata?.reply_to_id as string | undefined;
              const quoted = replyId ? messages.find((m) => m.id === replyId) : undefined;
              const quotedSender =
                quoted && quoted.sender_id === userId ? 'You' : peerName;

              // Images have no bubble chrome; voice/text keep the padded bubble.
              const bubbleStyle = isImage
                ? [styles.imageBubble]
                : [
                    styles.bubble,
                    mine
                      ? [styles.bubbleMine, { backgroundColor: palette.burgundy }]
                      : [styles.bubbleTheirs, { backgroundColor: c.surfaceAlt, borderColor: c.border }],
                  ];

              return (
                <View>
                  <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
                    <View style={[mine ? styles.colMine : styles.colTheirs]}>
                      <SwipeToReply mine={mine} onReply={() => setReplyTo(item)}>
                        {replyId ? (
                          <View
                            style={[
                              styles.quote,
                              mine ? styles.quoteMine : styles.quoteTheirs,
                              {
                                backgroundColor: mine ? 'rgba(251,247,239,0.14)' : c.surfaceAlt,
                                borderLeftColor: mine ? palette.cream : c.accent,
                              },
                            ]}
                          >
                            <Text variant="footnote" color={mine ? palette.cream : c.accent} numberOfLines={1}>
                              {quoted ? quotedSender : 'Reply'}
                            </Text>
                            <Text
                              variant="footnote"
                              color={mine ? 'rgba(251,247,239,0.85)' : c.textMuted}
                              numberOfLines={1}
                            >
                              {replySnippet(quoted)}
                            </Text>
                          </View>
                        ) : null}
                        <Pressable
                          onLongPress={!mine ? () => { haptics.selection(); setReportMsg(item); } : undefined}
                          delayLongPress={350}
                          style={bubbleStyle}
                        >
                          {isImage ? (
                            <ChatImageBubble url={item.media_url} />
                          ) : isVoice ? (
                            <VoiceMessage
                              url={item.media_url}
                              durationSecs={item.media_duration_secs}
                              mine={mine}
                            />
                          ) : (
                            <Text
                              variant="body"
                              color={mine ? palette.cream : c.text}
                              style={styles.msgText}
                            >
                              {item.content}
                            </Text>
                          )}
                        </Pressable>
                      </SwipeToReply>
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
          {messages.length === 0 && !loading ? (
            <View style={styles.emptyOverlay} pointerEvents="none">
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
            </View>
          ) : null}
          </View>
        )}

        {error ? (
          <Text variant="footnote" tone="danger" center style={styles.error}>
            {error}
          </Text>
        ) : null}

        {!locked ? (
          <View style={[styles.composerWrap, { backgroundColor: c.surface, borderTopColor: c.border }]}>
            {/* Reply preview bar */}
            {replyTo ? (
              <View style={[styles.replyBar, { borderLeftColor: c.accent, backgroundColor: c.surfaceAlt }]}>
                <View style={styles.replyBarText}>
                  <Text variant="footnote" tone="accent" numberOfLines={1}>
                    Replying to {replyTo.sender_id === userId ? 'yourself' : peerName}
                  </Text>
                  <Text variant="footnote" tone="muted" numberOfLines={1}>
                    {replySnippet(replyTo)}
                  </Text>
                </View>
                <Pressable onPress={() => setReplyTo(null)} hitSlop={10} style={styles.replyClose}>
                  <Ionicons name="close" size={18} color={c.textMuted} />
                </Pressable>
              </View>
            ) : null}

            <View style={[styles.composer, { paddingBottom: insets.bottom + spacing.sm }]}>
              {recorder.recording ? (
                <View style={[styles.recordingBar, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                  <Pressable onPress={cancelRecording} hitSlop={8} style={styles.recordCancel}>
                    <Ionicons name="trash-outline" size={20} color={c.danger} />
                  </Pressable>
                  <View style={styles.recordingMeta}>
                    <View style={[styles.recordDot, { backgroundColor: c.danger }]} />
                    <Text variant="body" tone="default" style={styles.recordTime}>
                      {formatDuration(recorder.elapsedSecs)}
                    </Text>
                    <Text variant="footnote" tone="subtle">Recording…</Text>
                  </View>
                </View>
              ) : (
                <>
                  <Pressable
                    onPress={pickAndSendImage}
                    disabled={uploading || sending}
                    hitSlop={6}
                    style={styles.attachBtn}
                  >
                    <Ionicons name="image-outline" size={24} color={c.textMuted} />
                  </Pressable>
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
                </>
              )}

              {/* Send a typed message, or - when empty - record / stop a voice note. */}
              {canSend ? (
                <PressableScale
                  onPress={send}
                  haptic={false}
                  style={[styles.sendBtn, { backgroundColor: palette.burgundy }]}
                >
                  <Ionicons name="arrow-up" size={22} color={palette.cream} />
                </PressableScale>
              ) : (
                <PressableScale
                  onPress={toggleRecording}
                  disabled={uploading}
                  haptic={false}
                  style={[
                    styles.sendBtn,
                    {
                      backgroundColor: recorder.recording ? palette.burgundy : c.surfaceAlt,
                      opacity: uploading ? 0.45 : 1,
                    },
                  ]}
                >
                  {uploading ? (
                    <ActivityIndicator color={recorder.recording ? palette.cream : c.accent} size="small" />
                  ) : (
                    <Ionicons
                      name={recorder.recording ? 'stop' : 'mic'}
                      size={22}
                      color={recorder.recording ? palette.cream : c.accent}
                    />
                  )}
                </PressableScale>
              )}
            </View>
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

      {/* Report-a-message reason picker */}
      <Modal visible={!!reportMsg} transparent animationType="fade" onRequestClose={() => setReportMsg(null)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setReportMsg(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + spacing.md }]}>
            <Text variant="subhead" tone="default" center style={{ marginBottom: 2 }}>Report this message</Text>
            <Text variant="footnote" tone="muted" center style={{ marginBottom: spacing.md }}>
              Our team will see this message and the surrounding chat.
            </Text>
            {reportMsg?.content ? (
              <View style={[styles.reportPreview, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                <Text variant="footnote" tone="muted" numberOfLines={3}>“{reportMsg.content}”</Text>
              </View>
            ) : null}
            {REPORT_REASONS.map((r) => (
              <Pressable
                key={r.value}
                onPress={() => submitReport(r.value)}
                style={[styles.reasonRow, { borderTopColor: c.border }]}
              >
                <Text variant="body" tone="default">{r.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={c.textSubtle} />
              </Pressable>
            ))}
            <Pressable onPress={() => setReportMsg(null)} style={styles.reasonCancel}>
              <Text variant="subhead" tone="muted">Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  headerAvatarWrap: { width: 38, height: 38 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19 },
  headerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  headerName: { marginBottom: 0, flexShrink: 1 },
  kebab: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },

  chatHint: { marginHorizontal: spacing.lg, marginTop: spacing.sm },

  // Locked state
  lockedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  lockBadge: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  lockedBody: { marginTop: spacing.sm, lineHeight: 22 },

  // List
  listContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  emptyOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { paddingHorizontal: spacing.xl, alignItems: 'center' },
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
  imageBubble: { borderRadius: radii.lg, overflow: 'hidden' },
  msgText: { fontSize: 15.5, lineHeight: 21 },

  // Quoted reply above a bubble
  quote: {
    borderLeftWidth: 2,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginBottom: 4,
    maxWidth: '100%',
  },
  quoteMine: { alignSelf: 'flex-end' },
  quoteTheirs: { alignSelf: 'flex-start' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, paddingHorizontal: 2 },
  metaMine: { justifyContent: 'flex-end' },
  metaTheirs: { justifyContent: 'flex-start' },

  error: { marginBottom: spacing.xs },

  // Composer
  composerWrap: { borderTopWidth: StyleSheet.hairlineWidth },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  attachBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  // Reply preview bar
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderLeftWidth: 3,
    borderRadius: radii.sm,
  },
  replyBarText: { flex: 1 },
  replyClose: { padding: 2 },

  // Voice recording bar (replaces the text input while recording)
  recordingBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  recordCancel: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  recordingMeta: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  recordDot: { width: 9, height: 9, borderRadius: 5 },
  recordTime: { fontVariant: ['tabular-nums'] },
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

  // Report-message sheet
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,16,17,0.45)' },
  sheet: { borderTopLeftRadius: radii.card, borderTopRightRadius: radii.card, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  reportPreview: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm },
  reasonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  reasonCancel: { alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.xs },
});
