import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { meetingsApi } from '@/api/meetings';
import type { MeetingRequest } from '@/api/types';
import { AcceptMeetingSheet } from './AcceptMeetingSheet';
import { Button } from './Button';
import { MeetingFeeSheet } from './MeetingFeeSheet';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import {
  MEETING_MODE_LABEL,
  MEETING_STATUS_LABEL,
  formatFee,
  formatMeetingDateTime,
} from '@/lib/meetings';
import { haptics } from '@/lib/haptics';
import { hexA, palette, radii, spacing, useTheme } from '@/theme';

/**
 * A live, centered meeting card shown inline in chat. It fetches the up-to-date
 * meeting (the chat message only carries an id) and re-fetches on focus so its
 * actions and status always reflect the latest state.
 */
export function MeetingCard({ meetingId }: { meetingId?: string }) {
  const router = useRouter();
  const { c } = useTheme();
  const [meeting, setMeeting] = useState<MeetingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [feeOpen, setFeeOpen] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);

  const load = useCallback(async () => {
    if (!meetingId) {
      setLoading(false);
      setError('Meeting unavailable');
      return;
    }
    try {
      const m = await meetingsApi.get(meetingId);
      setMeeting(m);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'Could not load this meeting'));
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const accept = () => {
    if (!meeting || acting) return;
    // The recipient adds their own wali as part of accepting.
    haptics.selection();
    setAcceptOpen(true);
  };

  const decline = async () => {
    if (!meeting || acting) return;
    setActing(true);
    try {
      const updated = await meetingsApi.decline(meeting.id);
      haptics.warning();
      setMeeting(updated);
    } catch (err) {
      haptics.error();
      setError(errorMessage(err, 'Could not decline'));
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.row}>
        <View style={[styles.card, styles.center, { backgroundColor: c.surface, borderColor: c.border }]}>
          <ActivityIndicator color={c.accent} />
        </View>
      </View>
    );
  }

  if (error || !meeting) {
    return (
      <View style={styles.row}>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.header}>
            <Ionicons name="calendar-outline" size={16} color={c.textMuted} />
            <Text variant="footnote" tone="muted">Book-a-meet</Text>
          </View>
          <Text variant="footnote" tone="muted" center style={styles.statusLine}>
            {error ?? 'This meeting is no longer available.'}
          </Text>
        </View>
      </View>
    );
  }

  const status = meeting.status;
  const isRecipient = meeting.is_requester === false;
  const when = formatMeetingDateTime(meeting.scheduled_at);
  const place = meeting.confirmed_location ?? meeting.proposed_location;
  const fee = formatFee(meeting.fee_pence);

  return (
    <View style={styles.row}>
      <PressableScale
        onPress={() => router.push({ pathname: '/meeting/[id]', params: { id: meeting.id } })}
        haptic={false}
        style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
      >
        <View style={styles.header}>
          <Ionicons name="calendar" size={16} color={c.accent} />
          <Text variant="footnote" tone="accent" style={styles.headerText}>Book-a-meet</Text>
          <View style={[styles.modePill, { backgroundColor: c.surfaceAlt }]}>
            <Text variant="label" tone="muted">{MEETING_MODE_LABEL[meeting.mode]}</Text>
          </View>
        </View>

        <Text variant="subhead" tone="default" center style={styles.title}>
          {meeting.other_party_name
            ? `Meeting with ${meeting.other_party_name}`
            : 'Supervised meeting'}
        </Text>

        {/* Status-specific body */}
        {status === 'pending' && isRecipient ? (
          <>
            <Text variant="footnote" tone="muted" center style={styles.statusLine}>
              {meeting.other_party_name ?? 'Your match'} invited you to a supervised meeting. A wali will be present.
            </Text>
            <View style={styles.actions}>
              <Button label="Decline" variant="outline" onPress={decline} disabled={acting} style={styles.btn} />
              <Button label="Accept" variant="primary" onPress={accept} loading={acting} style={styles.btn} />
            </View>
          </>
        ) : status === 'pending' ? (
          <StatusLine icon="time-outline" text={`Waiting for ${meeting.other_party_name ?? 'your match'} to accept`} />
        ) : status === 'accepted' || status === 'reviewing' ? (
          <StatusLine icon="shield-checkmark-outline" text="With the Pakiza team" />
        ) : status === 'scheduled' ? (
          <>
            {when ? <StatusLine icon="calendar-outline" text={when} /> : null}
            {place ? <StatusLine icon="location-outline" text={place} /> : null}
            {meeting.fee_status === 'due' && meeting.is_requester ? (
              <Button
                label={fee ? `Pay fee · ${fee}` : 'Pay fee'}
                variant="primary"
                onPress={() => { haptics.selection(); setFeeOpen(true); }}
                style={styles.payBtn}
              />
            ) : (
              <Text variant="footnote" tone="success" center style={styles.statusLine}>
                Your meeting is arranged.
              </Text>
            )}
          </>
        ) : status === 'completed' ? (
          <StatusLine icon="checkmark-circle-outline" text="Meeting completed" tone="success" />
        ) : status === 'declined' ? (
          <StatusLine icon="close-circle-outline" text="Declined" tone="muted" />
        ) : (
          <StatusLine icon="close-circle-outline" text="Cancelled" tone="muted" />
        )}

        <View style={[styles.badge, { backgroundColor: hexA(palette.burgundy, 0.08) }]}>
          <Text variant="label" tone="accent">{MEETING_STATUS_LABEL[status]}</Text>
        </View>
      </PressableScale>

      <MeetingFeeSheet
        meeting={meeting}
        visible={feeOpen}
        onClose={() => setFeeOpen(false)}
        onPaid={(m) => { setMeeting(m); setFeeOpen(false); }}
      />

      <AcceptMeetingSheet
        meetingId={meeting.id}
        matchName={meeting.other_party_name}
        visible={acceptOpen}
        onClose={() => setAcceptOpen(false)}
        onAccepted={(m) => { setMeeting(m); setAcceptOpen(false); }}
      />
    </View>
  );
}

function StatusLine({
  icon,
  text,
  tone = 'muted',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  tone?: 'muted' | 'success';
}) {
  const { c } = useTheme();
  return (
    <View style={styles.statusRow}>
      <Ionicons name={icon} size={15} color={tone === 'success' ? c.success : c.textMuted} />
      <Text variant="footnote" tone={tone} style={styles.statusRowText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', paddingVertical: spacing.sm },
  card: {
    width: '88%',
    maxWidth: 360,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  center: { alignItems: 'center', justifyContent: 'center', minHeight: 80 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerText: { flex: 1 },
  modePill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.pill },
  title: { marginTop: spacing.sm },
  statusLine: { marginTop: spacing.sm, lineHeight: 18 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.sm },
  statusRowText: { textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  btn: { flex: 1, height: 44 },
  payBtn: { marginTop: spacing.md, height: 46 },
  badge: {
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
});
