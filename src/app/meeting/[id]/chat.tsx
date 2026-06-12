import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { meetingsApi } from '@/api/meetings';
import type { MeetingFeePayer, MeetingMessage, MeetingRequest } from '@/api/types';
import { Button } from '@/components/Button';
import { MeetingFeeSheet } from '@/components/MeetingFeeSheet';
import { OptionGroup } from '@/components/OptionGroup';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { Text } from '@/components/Text';
import { PressableScale } from '@/components/PressableScale';
import { formatFee } from '@/lib/meetings';
import { haptics } from '@/lib/haptics';
import { useRealtime } from '@/store/realtime';
import { fonts, palette, radii, spacing, useTheme } from '@/theme';

// Viewer-relative payment choice <-> the absolute requester/recipient the API expects.
type FeeChoice = 'mine' | 'theirs' | 'split';
function choiceToPayer(choice: FeeChoice, isRequester: boolean): MeetingFeePayer {
  if (choice === 'split') return 'split';
  if (choice === 'mine') return isRequester ? 'requester' : 'recipient';
  return isRequester ? 'recipient' : 'requester';
}
function payerToChoice(payer: MeetingFeePayer, isRequester: boolean): FeeChoice {
  if (payer === 'split') return 'split';
  const viewerPays = payer === 'requester' ? isRequester : !isRequester;
  return viewerPays ? 'mine' : 'theirs';
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

export default function MeetingChat() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, isDark } = useTheme();
  const { revision, setActiveContext, refreshUnread } = useRealtime();

  const [messages, setMessages] = useState<MeetingMessage[]>([]); // newest-first (inverted list)
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchName, setMatchName] = useState<string | null>(name ?? null);
  const [meeting, setMeeting] = useState<MeetingRequest | null>(null);
  const [feeOpen, setFeeOpen] = useState(false);
  const [savingPayer, setSavingPayer] = useState(false);
  const firstLoad = useRef(true);

  // Upsert by id, keeping newest-first order.
  const upsert = useCallback((m: MeetingMessage) => {
    setMessages((prev) => {
      if (prev.some((x) => x.id === m.id)) return prev;
      return [m, ...prev];
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const history = await meetingsApi.listMessages(String(id));
      // Server returns oldest-first; the inverted list wants newest-first.
      setMessages([...history].reverse());
      setError(null);
      // Each load clears the thread's unread and refreshes the badge.
      meetingsApi.markThreadRead(String(id)).then(() => refreshUnread()).catch(() => {});
    } catch (err) {
      if (firstLoad.current) setError(errorMessage(err, 'Could not load this chat'));
    } finally {
      firstLoad.current = false;
      setLoading(false);
    }
  }, [id, refreshUnread]);

  // Load the meeting (header name + the live fee/payment state for the pay card).
  const loadMeeting = useCallback(() => {
    meetingsApi
      .get(String(id))
      .then((m) => {
        setMeeting(m);
        if (m.other_party_name) setMatchName(m.other_party_name);
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    loadMeeting();
  }, [loadMeeting]);

  // Load on focus + suppress the global banner while we are here.
  useFocusEffect(
    useCallback(() => {
      setActiveContext({ kind: 'meeting', id: String(id) });
      load();
      return () => setActiveContext(null);
    }, [id, load, setActiveContext])
  );

  // A live update (e.g. a team reply or a new fee) bumps revision; refetch both
  // the messages and the meeting so the thread and the pay card stay current.
  useEffect(() => {
    if (revision > 0) {
      load();
      loadMeeting();
    }
  }, [revision, load, loadMeeting]);

  const headerTitle = matchName ? `${matchName} (meeting)` : 'Coordination chat';

  // ── Fee / payment ──
  const feeDue = !!meeting && meeting.fee_status === 'due';
  const canChoosePayer = !!meeting && !meeting.requester_paid && !meeting.recipient_paid;
  const feeChoiceOptions: { label: string; value: FeeChoice }[] = [
    { label: 'I will pay', value: 'mine' },
    { label: `${matchName ?? 'They'} pay`, value: 'theirs' },
    { label: 'Split evenly', value: 'split' },
  ];
  const changePayer = async (choice: FeeChoice | null) => {
    if (!meeting || !choice || savingPayer) return;
    const payer = choiceToPayer(choice, meeting.is_requester);
    if (payer === meeting.fee_payer) return;
    setSavingPayer(true);
    try {
      const updated = await meetingsApi.setPayment(meeting.id, payer);
      setMeeting(updated);
      haptics.selection();
    } catch (err) {
      setError(errorMessage(err, 'Could not update who pays'));
    } finally {
      setSavingPayer(false);
    }
  };

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setText('');
    setSending(true);
    try {
      const msg = await meetingsApi.postMessage(String(id), body);
      upsert(msg);
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
            {headerTitle}
          </Text>
          <Text variant="footnote" tone="subtle">You, your match and the Pakiza team</Text>
        </View>

        <View style={styles.back} />
      </View>

      {/* Interactive fee card: appears the moment the team sets a fee. */}
      {feeDue && meeting ? (
        <Surface elevated style={styles.feeCard}>
          <View style={styles.feeHead}>
            <Ionicons name="card-outline" size={16} color={c.accent} />
            <Text variant="subhead" tone="default" style={styles.feeTitle}>Meeting fee</Text>
            <Text variant="subhead" tone="accent">{formatFee(meeting.fee_pence)}</Text>
          </View>
          <Text variant="footnote" tone="muted" style={styles.feeSub}>
            {meeting.i_have_paid
              ? 'You have paid your share. Thank you.'
              : `Your share: ${formatFee(meeting.my_share_pence)}`}
          </Text>
          {canChoosePayer ? (
            <OptionGroup
              label="Who pays?"
              options={feeChoiceOptions}
              value={payerToChoice(meeting.fee_payer, meeting.is_requester)}
              onChange={changePayer}
              onDark={false}
              clearable={false}
            />
          ) : null}
          {!meeting.i_have_paid && meeting.my_share_pence > 0 ? (
            <Button
              label={`Pay your share (${formatFee(meeting.my_share_pence)})`}
              onPress={() => { haptics.selection(); setFeeOpen(true); }}
              style={styles.feePay}
            />
          ) : null}
        </Surface>
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
                  Coordinate your meeting
                </Text>
                <Text variant="body" tone="muted" center style={styles.emptyBody}>
                  Use this thread to sort out the details with your match and our team. Your wali is kept informed throughout.
                </Text>
              </View>
            }
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

              const mine = item.is_me;
              const fromTeam = item.sender_role === 'team';
              return (
                <View>
                  <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
                    <View style={[mine ? styles.colMine : styles.colTheirs]}>
                      {!mine ? (
                        <View style={styles.senderRow}>
                          {fromTeam ? (
                            <View style={[styles.teamBadge, { backgroundColor: c.accentFaint }]}>
                              <Ionicons name="shield-checkmark" size={11} color={c.accent} />
                              <Text variant="label" tone="accent">Pakiza team</Text>
                            </View>
                          ) : (
                            <Text variant="label" tone="muted" style={styles.senderName}>
                              {item.sender_label}
                            </Text>
                          )}
                        </View>
                      ) : null}
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
            onPress={() => { haptics.selection(); send(); }}
            disabled={!canSend}
            haptic={false}
            style={[styles.sendBtn, { backgroundColor: palette.burgundy, opacity: canSend ? 1 : 0.45 }]}
          >
            <Ionicons name="arrow-up" size={22} color={palette.cream} />
          </PressableScale>
        </View>
      </KeyboardAvoidingView>

      <MeetingFeeSheet
        meeting={meeting}
        visible={feeOpen}
        onClose={() => setFeeOpen(false)}
        onPaid={(m) => { setMeeting(m); setFeeOpen(false); }}
      />
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

  // Fee card (sticky above the thread when a fee is due)
  feeCard: { marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.lg },
  feeHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  feeTitle: { flex: 1 },
  feeSub: { marginTop: 2, marginBottom: spacing.sm },
  feePay: { marginTop: spacing.sm, height: 48 },

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
  emptyWrap: { transform: [{ scaleY: -1 }], paddingTop: 96, paddingHorizontal: spacing.xl, alignItems: 'center' },
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
  senderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3, paddingHorizontal: 2 },
  senderName: { paddingHorizontal: 2 },
  teamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
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
