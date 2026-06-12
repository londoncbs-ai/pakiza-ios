import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { errorMessage } from '@/api/client';
import { meetingsApi } from '@/api/meetings';
import type { MeetingRequest } from '@/api/types';
import { Button } from './Button';
import { Text } from './Text';
import { formatFee } from '@/lib/meetings';
import { haptics } from '@/lib/haptics';
import { radii, spacing, useTheme } from '@/theme';

/**
 * Meeting fee payment sheet.
 *
 * Calls /meetings/{id}/checkout to begin payment. With Stripe configured the
 * backend returns a PaymentIntent client_secret (the integration point for a
 * native PaymentSheet, which needs a dev build). In dev (no keys) we confirm
 * directly against the backend so the flow stays testable, no real charge.
 */
export function MeetingFeeSheet({
  meeting,
  visible,
  onClose,
  onPaid,
}: {
  meeting: MeetingRequest | null;
  visible: boolean;
  onClose: () => void;
  onPaid: (m: MeetingRequest) => void;
}) {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async () => {
    if (!meeting || busy) return;
    setBusy(true);
    setError(null);
    try {
      const session = await meetingsApi.checkout(meeting.id);
      // With Stripe configured (session.mode === 'stripe') you would present the
      // native PaymentSheet here using session.client_secret, then confirm. In
      // dev we record the payment directly (validated server-side, no charge).
      const updated = await meetingsApi.confirmPaid(meeting.id, session.client_secret ?? undefined);
      haptics.success();
      onPaid(updated);
    } catch (err) {
      haptics.error();
      setError(errorMessage(err, 'Payment could not be completed'));
    } finally {
      setBusy(false);
    }
  };

  // The sheet collects the viewer's share of the fee, not the whole fee.
  const price = formatFee(meeting?.my_share_pence) ?? '';
  const isSplit = meeting?.fee_payer === 'split';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={[styles.grabber, { backgroundColor: c.borderStrong }]} />

        <Text variant="label" tone="accent" style={styles.kicker}>
          Book-a-meet
        </Text>
        <Text variant="title" tone="default">Pay your share</Text>

        <View style={[styles.summary, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
          <View style={styles.summaryRow}>
            <Text variant="callout" tone="muted">Meeting with</Text>
            <Text variant="callout" tone="default">{meeting?.other_party_name ?? 'your match'}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <View style={styles.summaryRow}>
            <Text variant="body" tone="default">Your share today</Text>
            <Text variant="heading" tone="default">{price}</Text>
          </View>
        </View>

        <View style={styles.note}>
          <Ionicons name="shield-checkmark-outline" size={18} color={c.accent} />
          <Text variant="footnote" tone="muted" style={styles.noteText}>
            {isSplit
              ? 'You are splitting this one-off fee evenly. This covers our team arranging and supervising your meeting safely, with your wali kept informed throughout.'
              : 'This one-off fee covers our team arranging and supervising your meeting safely. Your wali stays informed throughout.'}
          </Text>
        </View>

        {error ? (
          <Text variant="footnote" tone="danger" center style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Button label={price ? `Pay ${price}` : 'Pay fee'} onPress={pay} loading={busy} />

        <Text variant="footnote" tone="subtle" center style={styles.dev}>
          Dev mode: simulated payment, you will not be charged.
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: {
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: spacing.lg },
  kicker: { marginBottom: spacing.xs },
  summary: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  divider: { height: StyleSheet.hairlineWidth },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.lg },
  noteText: { flex: 1, lineHeight: 19 },
  error: { marginBottom: spacing.sm },
  dev: { marginTop: spacing.md },
});
