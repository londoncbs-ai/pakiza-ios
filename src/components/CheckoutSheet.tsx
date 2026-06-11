import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { subscriptionsApi } from '@/api/subscriptions';
import type { Subscription, SubscriptionPlan } from '@/api/types';
import { Button } from './Button';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { radii, spacing, useTheme } from '@/theme';

const PRICE: Record<string, string> = { premium: '£14.99', gold: '£24.99' };

/**
 * Payment + contract acceptance sheet.
 *
 * Calls /subscriptions/checkout to start payment. With Stripe configured the
 * backend returns a PaymentIntent client_secret (the integration point for
 * @stripe/stripe-react-native's PaymentSheet, which requires a dev build).
 * In dev (no keys) it completes against the backend so the flow is testable.
 */
export function CheckoutSheet({
  plan,
  planName,
  visible,
  onClose,
  onPurchased,
}: {
  plan: SubscriptionPlan | null;
  planName: string;
  visible: boolean;
  onClose: () => void;
  onPurchased: (s: Subscription) => void;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c } = useTheme();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscribe = async () => {
    if (!plan || !agreed) return;
    setBusy(true);
    setError(null);
    try {
      const session = await subscriptionsApi.checkout(plan);
      // With Stripe configured (session.mode === 'stripe') you'd present the
      // PaymentSheet here using session.client_secret, then confirm. In dev we
      // record the purchase directly (validated server-side, no real charge).
      const sub = await subscriptionsApi.purchase(plan, 'stripe', session.client_secret ?? 'dev-receipt');
      onPurchased(sub);
    } catch (err) {
      setError(errorMessage(err, 'Payment could not be completed'));
    } finally {
      setBusy(false);
    }
  };

  const price = plan ? PRICE[plan] ?? '' : '';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: c.surface, paddingBottom: insets.bottom + spacing.lg },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: c.borderStrong }]} />

        {/* Header */}
        <Text variant="label" tone="accent" style={styles.kicker}>
          Pakiza Premium
        </Text>
        <Text variant="title" tone="default">Subscribe to {planName}</Text>

        {/* Order summary */}
        <View style={[styles.summary, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
          <View style={styles.summaryRow}>
            <Text variant="callout" tone="muted">Plan</Text>
            <Text variant="callout" tone="default">{planName}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <View style={styles.summaryRow}>
            <Text variant="callout" tone="muted">Billing</Text>
            <Text variant="callout" tone="default">Monthly</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <View style={styles.summaryRow}>
            <Text variant="body" tone="default">Total today</Text>
            <View style={styles.priceWrap}>
              <Text variant="heading" tone="default">{price}</Text>
              <Text variant="footnote" tone="subtle"> / month</Text>
            </View>
          </View>
        </View>

        {/* Billing terms */}
        <View style={styles.terms}>
          <Term text={`Billed ${price} every month to your payment method.`} />
          <Term text="Renews automatically until cancelled. Cancel anytime from Profile → Pakiza Premium." />
          <Term text="Your plan benefits start immediately and last for the paid period if you cancel." />
          <Term text="Prices include applicable taxes. No refunds for partial periods." />
        </View>

        {/* Agreement */}
        <PressableScale haptic style={styles.agreeRow} onPress={() => setAgreed((a) => !a)}>
          <Ionicons
            name={agreed ? 'checkbox' : 'square-outline'}
            size={22}
            color={agreed ? c.accent : c.textSubtle}
          />
          <Text variant="footnote" tone="muted" style={styles.agreeText}>
            I agree to the{' '}
            <Text variant="footnote" tone="accent" style={styles.link} onPress={() => router.push('/terms')}>
              Terms & billing agreement
            </Text>
            .
          </Text>
        </PressableScale>

        {error ? (
          <Text variant="footnote" tone="danger" center style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Button
          label={agreed ? `Subscribe ${price}/mo` : 'Agree to continue'}
          onPress={subscribe}
          loading={busy}
          disabled={!agreed}
        />

        <Text variant="footnote" tone="subtle" center style={styles.dev}>
          Dev mode: simulated payment, you won’t be charged.
        </Text>
      </View>
    </Modal>
  );
}

function Term({ text }: { text: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.termRow}>
      <View style={[styles.bullet, { backgroundColor: c.accent }]} />
      <Text variant="footnote" tone="muted" style={styles.termText}>
        {text}
      </Text>
    </View>
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
  priceWrap: { flexDirection: 'row', alignItems: 'baseline' },
  divider: { height: StyleSheet.hairlineWidth },
  terms: { gap: spacing.md, marginBottom: spacing.lg },
  termRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bullet: { width: 5, height: 5, borderRadius: 3, marginTop: 7 },
  termText: { flex: 1, lineHeight: 19 },
  agreeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  agreeText: { flex: 1, lineHeight: 20 },
  link: { textDecorationLine: 'underline' },
  error: { marginBottom: spacing.sm },
  dev: { marginTop: spacing.md },
});
