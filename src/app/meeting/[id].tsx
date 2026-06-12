import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { meetingsApi } from '@/api/meetings';
import type { MeetingFeePayer, MeetingRequest, MeetingStatus } from '@/api/types';
import { Button } from '@/components/Button';
import { ErrorState } from '@/components/ErrorState';
import { MeetingFeeSheet } from '@/components/MeetingFeeSheet';
import { OptionGroup } from '@/components/OptionGroup';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { Text } from '@/components/Text';
import {
  MEETING_FEE_STATUS_LABEL,
  MEETING_MODE_LABEL,
  MEETING_STATUS_LABEL,
  formatFee,
  formatMeetingDateTime,
  isTerminal,
} from '@/lib/meetings';
import { haptics } from '@/lib/haptics';
import { palette, radii, spacing, useTheme } from '@/theme';

// The viewer-relative fee-payer choice. We map this to the absolute
// requester/recipient values the backend expects based on is_requester.
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

// The happy-path progression shown as a timeline.
const TIMELINE: MeetingStatus[] = ['pending', 'accepted', 'reviewing', 'scheduled', 'completed'];

export default function MeetingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();

  const [meeting, setMeeting] = useState<MeetingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feeOpen, setFeeOpen] = useState(false);
  const [savingPayer, setSavingPayer] = useState(false);

  const load = useCallback(async () => {
    try {
      const m = await meetingsApi.get(String(id));
      setMeeting(m);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'Could not load this meeting'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const cancel = () => {
    if (!meeting) return;
    Alert.alert('Cancel this meeting?', 'This cannot be undone. Your match and our team will be notified.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel meeting',
        style: 'destructive',
        onPress: async () => {
          try {
            const updated = await meetingsApi.cancel(meeting.id);
            haptics.warning();
            setMeeting(updated);
          } catch (err) {
            Alert.alert('Could not cancel', errorMessage(err));
          }
        },
      },
    ]);
  };

  const setPayer = async (choice: FeeChoice | null) => {
    if (!meeting || savingPayer || choice == null) return;
    const payer = choiceToPayer(choice, meeting.is_requester);
    if (payer === meeting.fee_payer) return;
    setSavingPayer(true);
    try {
      const updated = await meetingsApi.setPayment(meeting.id, payer);
      haptics.selection();
      setMeeting(updated);
    } catch (err) {
      haptics.error();
      Alert.alert('Could not update', errorMessage(err, 'Please try again.'));
    } finally {
      setSavingPayer(false);
    }
  };

  const place = meeting?.confirmed_location ?? meeting?.proposed_location;
  const when = formatMeetingDateTime(meeting?.scheduled_at) ?? formatMeetingDateTime(meeting?.proposed_at);
  const fee = formatFee(meeting?.fee_pence);
  const myShare = formatFee(meeting?.my_share_pence);
  // The viewer can pay their share when a real share is owed and they have not yet paid.
  const canPay =
    !!meeting &&
    (meeting.fee_status === 'due' || meeting.fee_status === 'paid') &&
    !meeting.i_have_paid &&
    meeting.my_share_pence > 0;
  // The fee split can be changed only while no one has paid and the fee is not waived.
  const paymentStarted = !!meeting && (meeting.requester_paid || meeting.recipient_paid);
  const canChoosePayer =
    !!meeting && meeting.fee_status !== 'waived' && !paymentStarted && !isTerminal(meeting.status);
  const canCancel = !!meeting && !isTerminal(meeting.status);
  const otherName = meeting?.other_party_name ?? 'Your match';

  // Viewer-relative walis. The viewer sees their OWN wali in full; the other
  // party's wali is shown by NAME ONLY (their other details stay private).
  const myWaliName = meeting ? (meeting.is_requester ? meeting.wali_name : meeting.recipient_wali_name) : null;
  const myWaliRel = meeting ? (meeting.is_requester ? meeting.wali_relationship : meeting.recipient_wali_relationship) : null;
  const myWaliVerified = meeting ? (meeting.is_requester ? meeting.wali_verified : meeting.recipient_wali_verified) : false;
  const theirWaliName = meeting ? (meeting.is_requester ? meeting.recipient_wali_name : meeting.wali_name) : null;
  // Has the other party settled their share? Derived from the absolute paid flags + the split.
  const otherPaid = meeting
    ? meeting.is_requester
      ? meeting.recipient_paid
      : meeting.requester_paid
    : false;
  // The other party's share is the total fee minus the viewer's share.
  const otherShare =
    meeting && meeting.fee_pence != null
      ? formatFee(Math.max(0, meeting.fee_pence - meeting.my_share_pence))
      : null;
  const feeChoiceOptions: { label: string; value: FeeChoice }[] = [
    { label: 'I will pay', value: 'mine' },
    { label: `${otherName} will pay`, value: 'theirs' },
    { label: 'Split evenly', value: 'split' },
  ];

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
        <Text variant="heading" tone="default">Meeting</Text>
        <View style={styles.back} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      ) : error || !meeting ? (
        <ErrorState message={error ?? 'Meeting unavailable'} onRetry={onRefresh} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Headline */}
          <Text variant="title" tone="default">
            {meeting.other_party_name ? `With ${meeting.other_party_name}` : 'Supervised meeting'}
          </Text>
          <View style={styles.headlineRow}>
            <View style={[styles.statusPill, { backgroundColor: c.accentFaint }]}>
              <Text variant="label" tone="accent">{MEETING_STATUS_LABEL[meeting.status]}</Text>
            </View>
            <Text variant="footnote" tone="muted">{MEETING_MODE_LABEL[meeting.mode]}</Text>
          </View>

          {/* Coordination chat entry */}
          <Pressable
            onPress={() => {
              haptics.selection();
              router.push({ pathname: '/meeting/[id]/chat', params: { id: meeting.id } });
            }}
          >
            <Surface elevated style={styles.chatEntry}>
              <View style={[styles.chatEntryIcon, { backgroundColor: c.accentFaint }]}>
                <Ionicons name="chatbubbles" size={20} color={c.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="subhead" tone="default">Message the organiser</Text>
                <Text variant="footnote" tone="muted" style={styles.chatEntrySub}>
                  Coordinate the details with your match and the Pakiza team.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={c.textSubtle} />
            </Surface>
          </Pressable>

          {/* Who is coming */}
          <Surface elevated style={styles.section}>
            <SectionTitle>Who is coming</SectionTitle>
            <PersonRow icon="person-circle-outline" name="You" detail="Attending this meeting" />
            {myWaliName ? (
              <PersonRow
                icon="shield-checkmark-outline"
                name={myWaliName}
                detail={`Your wali${myWaliRel ? ` · ${myWaliRel}` : ''}`}
                verified={myWaliVerified}
                pending={!myWaliVerified}
              />
            ) : null}
            <PersonRow icon="heart-outline" name={otherName} detail="Your match" />
            {theirWaliName ? (
              <PersonRow icon="shield-outline" name={theirWaliName} detail={`${otherName}'s wali`} />
            ) : (
              <PersonRow icon="shield-outline" name="Wali to be added" detail={`${otherName}'s guardian`} muted />
            )}
            <PersonRow
              icon="sparkles-outline"
              name={meeting.organiser_name ?? 'Awaiting a Pakiza organiser'}
              detail={meeting.organiser_name ? 'Arranging your meeting' : 'We will assign someone soon'}
              muted={!meeting.organiser_name}
            />
          </Surface>

          {/* Timeline */}
          {!isTerminal(meeting.status) || meeting.status === 'completed' ? (
            <Surface elevated style={styles.section}>
              <SectionTitle>Progress</SectionTitle>
              <Timeline status={meeting.status} />
            </Surface>
          ) : (
            <Surface elevated style={styles.endedBanner}>
              <Ionicons name="close-circle-outline" size={20} color={c.textMuted} />
              <Text variant="callout" tone="muted" style={{ flex: 1 }}>
                This meeting was {meeting.status === 'declined' ? 'declined' : 'cancelled'}.
                {meeting.decline_reason ? ` ${meeting.decline_reason}` : ''}
                {meeting.cancel_reason ? ` ${meeting.cancel_reason}` : ''}
              </Text>
            </Surface>
          )}

          {/* Details */}
          <Surface elevated style={styles.section}>
            <SectionTitle>Details</SectionTitle>
            <Row icon="calendar-outline" label="When" value={when ?? 'To be arranged'} />
            <Row icon="location-outline" label="Where" value={place ?? 'To be arranged'} />
            {meeting.note ? <Row icon="document-text-outline" label="Your note" value={meeting.note} /> : null}
          </Surface>

          {/* Your wali (the viewer's own; the other party's stays private) */}
          <Surface elevated style={styles.section}>
            <SectionTitle>Your wali</SectionTitle>
            {myWaliName ? (
              <>
                <Row icon="person-outline" label="Name" value={myWaliName} />
                <Row icon="people-outline" label="Relationship" value={myWaliRel ?? '-'} />
                <View style={styles.verifyRow}>
                  <Ionicons
                    name={myWaliVerified ? 'shield-checkmark' : 'shield-outline'}
                    size={18}
                    color={myWaliVerified ? c.success : c.textMuted}
                  />
                  <Text variant="footnote" tone={myWaliVerified ? 'success' : 'muted'}>
                    {myWaliVerified ? 'Wali verified by our team' : 'Verification in progress'}
                  </Text>
                </View>
              </>
            ) : (
              <Text variant="footnote" tone="muted">
                You will add your wali when you accept this meeting.
              </Text>
            )}
          </Surface>

          {/* Payment */}
          {meeting.fee_status !== 'none' ? (
            <Surface elevated style={styles.section}>
              <SectionTitle>Payment</SectionTitle>
              <Row icon="card-outline" label="Total fee" value={fee ?? 'To be confirmed'} />
              <Row icon="pricetag-outline" label="Status" value={MEETING_FEE_STATUS_LABEL[meeting.fee_status]} />

              {meeting.fee_status === 'waived' ? (
                <View style={styles.payNote}>
                  <Ionicons name="gift-outline" size={16} color={c.success} />
                  <Text variant="footnote" tone="success" style={styles.payNoteText}>
                    This fee has been waived. There is nothing to pay.
                  </Text>
                </View>
              ) : (
                <>
                  {/* Who pays */}
                  {canChoosePayer ? (
                    <View style={styles.payerWrap}>
                      <OptionGroup
                        label="Who pays the fee?"
                        options={feeChoiceOptions}
                        value={payerToChoice(meeting.fee_payer, meeting.is_requester)}
                        onChange={setPayer}
                        onDark={false}
                        clearable={false}
                      />
                      {savingPayer ? (
                        <Text variant="footnote" tone="subtle" style={styles.payerSaving}>
                          Saving…
                        </Text>
                      ) : null}
                    </View>
                  ) : (
                    <Row
                      icon="people-outline"
                      label="Who pays"
                      value={
                        meeting.fee_payer === 'split'
                          ? 'Split evenly'
                          : (meeting.fee_payer === 'requester') === meeting.is_requester
                            ? 'You are paying'
                            : `${otherName} is paying`
                      }
                    />
                  )}

                  {/* Each side's share + status */}
                  <View style={[styles.shareWrap, { borderTopColor: c.border }]}>
                    <ShareRow
                      name="You"
                      amount={meeting.my_share_pence > 0 ? (myShare ?? '') : 'Nothing to pay'}
                      paid={meeting.i_have_paid}
                      owes={meeting.my_share_pence > 0}
                    />
                    <ShareRow
                      name={otherName}
                      amount={
                        meeting.fee_pence != null && meeting.fee_pence - meeting.my_share_pence > 0
                          ? (otherShare ?? '')
                          : 'Nothing to pay'
                      }
                      paid={otherPaid}
                      owes={meeting.fee_pence != null && meeting.fee_pence - meeting.my_share_pence > 0}
                    />
                  </View>

                  {canPay ? (
                    <Button
                      label={myShare ? `Pay your share · ${myShare}` : 'Pay your share'}
                      variant="primary"
                      onPress={() => { haptics.selection(); setFeeOpen(true); }}
                      style={{ marginTop: spacing.md }}
                    />
                  ) : meeting.i_have_paid && meeting.my_share_pence > 0 ? (
                    <View style={styles.payNote}>
                      <Ionicons name="checkmark-circle" size={16} color={c.success} />
                      <Text variant="footnote" tone="success" style={styles.payNoteText}>
                        You have paid your share. Thank you.
                      </Text>
                    </View>
                  ) : null}
                </>
              )}
            </Surface>
          ) : null}

          {canCancel ? (
            <Button label="Cancel meeting" variant="outline" onPress={cancel} style={styles.cancelBtn} />
          ) : null}
        </ScrollView>
      )}

      <MeetingFeeSheet
        meeting={meeting}
        visible={feeOpen}
        onClose={() => setFeeOpen(false)}
        onPaid={(m) => { setMeeting(m); setFeeOpen(false); }}
      />
    </Screen>
  );
}

function Timeline({ status }: { status: MeetingStatus }) {
  const { c } = useTheme();
  // For a terminal-but-completed meeting we mark all as done.
  const reachedIdx = status === 'completed' ? TIMELINE.length - 1 : TIMELINE.indexOf(status);
  return (
    <View style={styles.timeline}>
      {TIMELINE.map((s, i) => {
        const reached = i <= reachedIdx && reachedIdx >= 0;
        const current = i === reachedIdx;
        return (
          <View key={s} style={styles.tlRow}>
            <View style={styles.tlMarkerCol}>
              <View
                style={[
                  styles.tlDot,
                  {
                    backgroundColor: reached ? c.accent : c.surfaceAlt,
                    borderColor: reached ? c.accent : c.borderStrong,
                  },
                ]}
              >
                {reached ? <Ionicons name="checkmark" size={11} color={palette.cream} /> : null}
              </View>
              {i < TIMELINE.length - 1 ? (
                <View style={[styles.tlLine, { backgroundColor: i < reachedIdx ? c.accent : c.border }]} />
              ) : null}
            </View>
            <Text
              variant="callout"
              tone={current ? 'accent' : reached ? 'default' : 'subtle'}
              style={styles.tlLabel}
            >
              {MEETING_STATUS_LABEL[s]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text variant="label" tone="accent" style={styles.sectionTitle}>
      {children}
    </Text>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { c } = useTheme();
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={c.accent} style={styles.rowIcon} />
      <View style={{ flex: 1 }}>
        <Text variant="footnote" tone="muted">{label}</Text>
        <Text variant="callout" tone="default" style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

/** A person attending the meeting, with an optional verified / pending badge. */
function PersonRow({
  icon,
  name,
  detail,
  verified,
  pending,
  muted,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  name: string;
  detail: string;
  verified?: boolean;
  pending?: boolean;
  muted?: boolean;
}) {
  const { c } = useTheme();
  return (
    <View style={styles.personRow}>
      <View style={[styles.personAvatar, { backgroundColor: c.accentFaint }]}>
        <Ionicons name={icon} size={20} color={c.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="callout" tone={muted ? 'muted' : 'default'}>{name}</Text>
        <Text variant="footnote" tone="muted" style={styles.personDetail}>{detail}</Text>
      </View>
      {verified ? (
        <View style={styles.personFlag}>
          <Ionicons name="shield-checkmark" size={15} color={c.success} />
          <Text variant="label" tone="success">Verified</Text>
        </View>
      ) : pending ? (
        <View style={styles.personFlag}>
          <Ionicons name="time-outline" size={15} color={c.textMuted} />
          <Text variant="label" tone="muted">Pending</Text>
        </View>
      ) : null}
    </View>
  );
}

/** A single party's fee share and paid/owed status. */
function ShareRow({
  name,
  amount,
  paid,
  owes,
}: {
  name: string;
  amount: string;
  paid: boolean;
  owes: boolean;
}) {
  const { c } = useTheme();
  return (
    <View style={styles.shareRow}>
      <Text variant="callout" tone="default" numberOfLines={1} style={styles.shareName}>{name}</Text>
      <Text variant="callout" tone="muted" style={styles.shareAmount}>{amount}</Text>
      {!owes ? (
        <Text variant="label" tone="subtle">No charge</Text>
      ) : paid ? (
        <View style={styles.shareFlag}>
          <Ionicons name="checkmark-circle" size={15} color={c.success} />
          <Text variant="label" tone="success">Paid</Text>
        </View>
      ) : (
        <View style={[styles.shareFlag, { backgroundColor: c.accentFaint }]}>
          <Text variant="label" tone="accent">Owed</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  headlineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.lg },
  statusPill: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radii.pill },

  section: { padding: spacing.lg, marginBottom: spacing.lg },
  sectionTitle: { marginBottom: spacing.md },
  endedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.sm },
  rowIcon: { marginTop: 2 },
  rowValue: { marginTop: 1, lineHeight: 21 },

  verifyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },

  // coordination chat entry
  chatEntry: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, marginBottom: spacing.lg },
  chatEntryIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  chatEntrySub: { marginTop: 2, lineHeight: 18 },

  // who is coming
  personRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  personAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  personDetail: { marginTop: 1 },
  personFlag: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  // payment shares
  payerWrap: { marginTop: spacing.md },
  payerSaving: { marginTop: -spacing.sm, marginBottom: spacing.sm, marginLeft: spacing.xs },
  shareWrap: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.sm, paddingTop: spacing.sm },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  shareName: { flex: 1 },
  shareAmount: {},
  shareFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  payNote: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.md },
  payNoteText: { flex: 1, lineHeight: 18 },

  // timeline
  timeline: { marginTop: spacing.xs },
  tlRow: { flexDirection: 'row', alignItems: 'flex-start' },
  tlMarkerCol: { alignItems: 'center', width: 24 },
  tlDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tlLine: { width: 2, height: 22, marginVertical: 2 },
  tlLabel: { marginLeft: spacing.md, paddingTop: 1 },

  cancelBtn: { marginTop: spacing.xs },
});
