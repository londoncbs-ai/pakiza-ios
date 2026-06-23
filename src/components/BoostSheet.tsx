import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { errorMessage } from '@/api/client';
import { boostsApi } from '@/api/boosts';
import type { BoostStatus } from '@/api/types';
import { Button } from './Button';
import { Text } from './Text';
import { formatPoundsExact } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { radii, spacing, useTheme } from '@/theme';

/**
 * Profile boost payment sheet.
 *
 * Calls /boosts/checkout to begin payment. With Stripe configured the backend
 * returns a PaymentIntent client_secret (the integration point for a native
 * PaymentSheet, which needs a dev build). In dev (no keys) we confirm directly
 * against the backend so the flow stays testable, no real charge.
 */
export function BoostSheet({
  pricePence,
  durationMinutes,
  visible,
  onClose,
  onBoosted,
}: {
  pricePence: number;
  durationMinutes: number;
  visible: boolean;
  onClose: () => void;
  onBoosted: (status: BoostStatus) => void;
}) {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const session = await boostsApi.checkout();
      // With Stripe configured (session.mode === 'stripe') you would present the
      // native PaymentSheet here using session.client_secret, then confirm. In
      // dev we activate the boost directly (validated server-side, no charge).
      const status = await boostsApi.confirm(session.boost_id, session.client_secret ?? undefined);
      haptics.success();
      onBoosted(status);
    } catch (err) {
      haptics.error();
      setError(errorMessage(err, 'Payment could not be completed'));
    } finally {
      setBusy(false);
    }
  };

  const price = formatPoundsExact(pricePence);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={[styles.grabber, { backgroundColor: c.borderStrong }]} />

        <Text variant="label" tone="accent" style={styles.kicker}>
          Profile boost
        </Text>
        <Text variant="title" tone="default">Be seen first</Text>

        <View style={[styles.summary, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
          <View style={styles.summaryRow}>
            <Text variant="callout" tone="muted">Top of discovery for</Text>
            <Text variant="callout" tone="default">{durationMinutes} minutes</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <View style={styles.summaryRow}>
            <Text variant="body" tone="default">Total today</Text>
            <Text variant="heading" tone="default">{price}</Text>
          </View>
        </View>

        <View style={styles.note}>
          <Ionicons name="flash-outline" size={18} color={c.accent} />
          <Text variant="footnote" tone="muted" style={styles.noteText}>
            Your profile jumps to the top of other members' discovery feed for the next hour, so the
            right people see you sooner.
          </Text>
        </View>

        {error ? (
          <Text variant="footnote" tone="danger" center style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Button label={price ? `Boost ${price}` : 'Boost now'} onPress={pay} loading={busy} />

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
