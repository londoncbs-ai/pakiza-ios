import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { supportApi, supportSocketUrl } from '@/api/support';
import { wsTicket } from '@/api/ws';
import type { SupportChatMessage } from '@/api/types';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { PressableScale } from '@/components/PressableScale';
import { useRealtime } from '@/store/realtime';
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

export default function Support() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, isDark } = useTheme();
  const { revision, setActiveContext, refreshUnread } = useRealtime();

  const [messages, setMessages] = useState<SupportChatMessage[]>([]); // newest-first (inverted list)
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const threadIdRef = useRef<string | null>(null);

  // Upsert by id, keeping newest-first order.
  const upsert = useCallback((m: SupportChatMessage) => {
    setMessages((prev) => {
      if (prev.some((x) => x.id === m.id)) return prev;
      return [m, ...prev];
    });
  }, []);

  // Reload the thread (also the revision-driven safety net).
  const reload = useCallback(async () => {
    try {
      const thread = await supportApi.thread();
      threadIdRef.current = thread.id;
      // Server returns oldest-first; the inverted list wants newest-first.
      setMessages([...thread.messages].reverse());
      supportApi.markRead().catch(() => {});
      refreshUnread();
    } catch {
      /* a transient failure leaves the existing list in place */
    }
  }, [refreshUnread]);

  // Load the thread + open the realtime socket, reconnecting with backoff while
  // focused. setActiveContext suppresses the global banner only while we are here.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      let backoff = 1000;
      let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
      setActiveContext({ kind: 'support' });

      const clearReconnect = () => {
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
      };

      const scheduleReconnect = () => {
        if (!active) return;
        clearReconnect();
        const delay = backoff;
        backoff = Math.min(backoff * 2, 15000);
        reconnectTimer = setTimeout(() => openSocket(), delay);
      };

      const openSocket = async () => {
        if (!active) return;
        const threadId = threadIdRef.current;
        let ticket: string;
        try {
          ticket = await wsTicket();
        } catch {
          scheduleReconnect();
          return;
        }
        if (!active || !threadId) return;
        let ws: WebSocket;
        try {
          ws = new WebSocket(supportSocketUrl(threadId, ticket));
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
                thread_id: payload.thread_id,
                sender_id: payload.sender_id ?? null,
                sender_role: payload.sender_role,
                body: payload.body,
                read_by_member: false,
                read_by_admin: false,
                created_at: payload.created_at,
              });
              if (payload.sender_role !== 'member') {
                supportApi.markRead().catch(() => {});
                refreshUnread();
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
        try {
          const thread = await supportApi.thread();
          threadIdRef.current = thread.id;
          if (active) setMessages([...thread.messages].reverse());
          supportApi.markRead().catch(() => {});
          refreshUnread();
        } catch (err) {
          if (active) setError(errorMessage(err, 'Could not load support chat'));
        } finally {
          if (active) setLoading(false);
        }
        if (!active) return;
        openSocket();
      })();

      const onAppState = (next: string) => {
        if (next !== 'active' || !active) return;
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
        setActiveContext(null);
      };
    }, [upsert, reload, refreshUnread, setActiveContext])
  );

  // A missed socket event still surfaces via the global notification feed.
  useEffect(() => {
    if (revision > 0) reload();
  }, [revision, reload]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setText('');
    setSending(true);
    try {
      const msg = await supportApi.send(body);
      upsert(msg); // WS may also echo; upsert dedupes by id
    } catch (err) {
      setError(errorMessage(err, 'Message failed to send'));
      setText(body); // restore so the member can retry
    } finally {
      setSending(false);
    }
  };

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

        <View style={styles.headerText}>
          <Text variant="subhead" tone="default" numberOfLines={1} style={styles.headerName}>
            Support
          </Text>
          <Text variant="footnote" tone="subtle">We usually reply within a day</Text>
        </View>

        <View style={styles.back} />
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
        ) : (
          // Empty state is an overlay OUTSIDE the inverted list: inverted
          // lists transform their children differently per platform.
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
              const showDay = !older || dayKey(older.created_at) !== dayKey(item.created_at);

              // System messages render as a centered muted pill, not a bubble.
              if (item.sender_role === 'system') {
                return (
                  <View>
                    <View style={styles.systemRow}>
                      <View style={[styles.systemPill, { backgroundColor: c.surfaceAlt }]}>
                        <Text variant="footnote" tone="muted" center>
                          {item.body}
                        </Text>
                      </View>
                    </View>
                    {showDay ? <DaySeparator iso={item.created_at} /> : null}
                  </View>
                );
              }

              const mine = item.sender_role === 'member';
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
                        <Text variant="body" color={mine ? palette.cream : c.text} style={styles.msgText}>
                          {item.body}
                        </Text>
                      </View>
                      <View style={[styles.metaRow, mine ? styles.metaMine : styles.metaTheirs]}>
                        <Text variant="footnote" tone="subtle">{timeLabel(item.created_at)}</Text>
                      </View>
                    </View>
                  </View>
                  {showDay ? <DaySeparator iso={item.created_at} /> : null}
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
                  How can we help?
                </Text>
                <Text variant="body" tone="muted" center style={styles.emptyBody}>
                  Ask us anything about your account, billing, or how Pakiza works. The team will get back to you soon.
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
            onChangeText={setText}
            placeholder="Write a message…"
            placeholderTextColor={c.textSubtle}
            multiline
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
      </KeyboardAvoidingView>
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
  headerText: { flex: 1, paddingHorizontal: 2 },
  headerName: { marginBottom: 0 },

  // List
  listContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  emptyOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { paddingHorizontal: spacing.xl, alignItems: 'center' },
  emptyBadge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  emptyBody: { marginTop: spacing.xs, lineHeight: 22 },

  // Date separator
  daySep: { alignItems: 'center', paddingVertical: spacing.md },

  // System pill
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
