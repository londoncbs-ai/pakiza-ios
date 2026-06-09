import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { subscriptionsApi } from '@/api/subscriptions';
import type { Subscription, SubscriptionPlan } from '@/api/types';
import { Button } from './Button';
import { fonts, palette, radii, spacing } from '@/theme';

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
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.grabber} />
        <Text style={styles.title}>Subscribe to {planName}</Text>
        <Text style={styles.price}>{price}<Text style={styles.per}> / month</Text></Text>

        <View style={styles.terms}>
          <Term text={`Billed ${price} every month to your payment method.`} />
          <Term text="Renews automatically until cancelled. Cancel anytime from Profile → Pakiza Premium." />
          <Term text="Your plan benefits start immediately and last for the paid period if you cancel." />
          <Term text="Prices include applicable taxes. No refunds for partial periods." />
        </View>

        <Pressable style={styles.agreeRow} onPress={() => setAgreed((a) => !a)}>
          <Ionicons name={agreed ? 'checkbox' : 'square-outline'} size={22} color={agreed ? palette.burgundy : palette.muted} />
          <Text style={styles.agreeText}>
            I agree to the{' '}
            <Text style={styles.link} onPress={() => router.push('/terms')}>Terms & billing agreement</Text>.
          </Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label={agreed ? `Subscribe ${price}/mo` : 'Agree to continue'}
          onPress={subscribe}
          loading={busy}
          disabled={!agreed}
        />
        <Text style={styles.dev}>Dev mode: simulated payment, you won’t be charged.</Text>
      </View>
    </Modal>
  );
}

function Term({ text }: { text: string }) {
  return (
    <View style={styles.termRow}>
      <Ionicons name="ellipse" size={5} color={palette.gold} style={{ marginTop: 7 }} />
      <Text style={styles.termText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(26,16,18,0.5)' },
  sheet: { backgroundColor: palette.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: palette.line, marginBottom: spacing.md },
  title: { fontFamily: fonts.display, fontSize: 28, color: palette.burgundy },
  price: { fontFamily: fonts.displaySemibold, fontSize: 30, color: palette.ink, marginTop: 4, marginBottom: spacing.md },
  per: { fontFamily: fonts.body, fontSize: 15, color: palette.muted },
  terms: { backgroundColor: palette.white, borderRadius: radii.card, padding: spacing.lg, gap: 10, marginBottom: spacing.lg },
  termRow: { flexDirection: 'row', gap: 8 },
  termText: { flex: 1, fontFamily: fonts.body, fontSize: 13.5, color: palette.ink, lineHeight: 19 },
  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: spacing.lg },
  agreeText: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: palette.ink, lineHeight: 20 },
  link: { fontFamily: fonts.bodySemibold, color: palette.burgundy, textDecorationLine: 'underline' },
  error: { fontFamily: fonts.body, color: '#B00020', textAlign: 'center', marginBottom: spacing.sm },
  dev: { fontFamily: fonts.body, fontSize: 11.5, color: palette.muted, textAlign: 'center', marginTop: spacing.sm },
});
