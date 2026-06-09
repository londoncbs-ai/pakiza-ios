import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { subscriptionsApi } from '@/api/subscriptions';
import type { Subscription, SubscriptionPlan } from '@/api/types';
import { Button } from '@/components/Button';
import { CheckoutSheet } from '@/components/CheckoutSheet';
import { fonts, palette, radii, shadow, spacing } from '@/theme';

const PLANS: { plan: SubscriptionPlan; name: string; price: string; perks: string[]; highlight?: boolean }[] = [
  {
    plan: 'premium',
    name: 'Premium',
    price: '£14.99/mo',
    perks: ['Unlimited likes', 'See who you’ve matched faster', '1 monthly profile boost', 'Advanced filters'],
    highlight: true,
  },
  {
    plan: 'gold',
    name: 'Gold',
    price: '£24.99/mo',
    perks: ['Everything in Premium', 'See who liked you', '5 monthly boosts', 'Priority in discovery'],
  },
];

export default function Premium() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkout, setCheckout] = useState<{ plan: SubscriptionPlan; name: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setSub(await subscriptionsApi.getMine());
    } catch {
      setSub(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const cancel = () => {
    Alert.alert('Cancel auto-renewal?', 'You’ll keep your benefits until the period ends.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel renewal',
        style: 'destructive',
        onPress: async () => {
          try {
            await subscriptionsApi.cancel();
            load();
          } catch (err) {
            Alert.alert('Could not cancel', errorMessage(err));
          }
        },
      },
    ]);
  };

  const activePremium = sub && sub.plan !== 'free' && sub.status === 'active';

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ width: 30 }}>
          <Ionicons name="chevron-back" size={26} color={palette.cream} />
        </Pressable>
        <Text style={styles.headerTitle}>Pakiza Premium</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
        <Text style={styles.lead}>Invest in finding the one.</Text>
        <Text style={styles.sub}>Premium members connect with intention: more visibility, and more meaningful matches.</Text>

        {loading ? (
          <ActivityIndicator color={palette.gold} size="large" style={{ marginTop: 40 }} />
        ) : (
          <>
            {activePremium ? (
              <View style={styles.current}>
                <Ionicons name="ribbon" size={18} color={palette.gold} />
                <Text style={styles.currentText}>
                  You’re on {sub!.plan.toUpperCase()}
                  {sub!.expires_at ? ` · renews ${new Date(sub!.expires_at).toLocaleDateString()}` : ''}
                </Text>
              </View>
            ) : null}

            {PLANS.map((p) => {
              const isCurrent = sub?.plan === p.plan && sub?.status === 'active';
              return (
                <View key={p.plan} style={[styles.card, p.highlight && styles.cardHighlight]}>
                  <View style={styles.cardHead}>
                    <Text style={styles.planName}>{p.name}</Text>
                    <Text style={styles.price}>{p.price}</Text>
                  </View>
                  {p.perks.map((perk) => (
                    <View key={perk} style={styles.perkRow}>
                      <Ionicons name="checkmark-circle" size={18} color={palette.gold} />
                      <Text style={styles.perk}>{perk}</Text>
                    </View>
                  ))}
                  <Button
                    label={isCurrent ? 'Current plan' : `Get ${p.name}`}
                    variant={p.highlight ? 'secondary' : 'outline'}
                    disabled={isCurrent}
                    onPress={() => setCheckout({ plan: p.plan, name: p.name })}
                    style={{ marginTop: spacing.md }}
                  />
                </View>
              );
            })}

            {activePremium && sub!.auto_renews ? (
              <Pressable onPress={cancel} style={styles.cancel}>
                <Text style={styles.cancelText}>Cancel auto-renewal</Text>
              </Pressable>
            ) : null}

            <Text style={styles.disclaimer}>Dev mode: purchases are simulated (no real charge).</Text>
          </>
        )}
      </ScrollView>

      <CheckoutSheet
        plan={checkout?.plan ?? null}
        planName={checkout?.name ?? ''}
        visible={!!checkout}
        onClose={() => setCheckout(null)}
        onPurchased={(s) => {
          setSub(s);
          setCheckout(null);
          Alert.alert('Welcome to Pakiza ' + s.plan.toUpperCase(), 'Your benefits are now active.');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.burgundyDeep },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  headerTitle: { fontFamily: fonts.displaySemibold, fontSize: 22, color: palette.cream },
  lead: { fontFamily: fonts.display, fontSize: 34, color: palette.cream, marginTop: spacing.sm },
  sub: { fontFamily: fonts.body, fontSize: 14.5, color: 'rgba(245,240,230,0.75)', lineHeight: 21, marginTop: spacing.sm, marginBottom: spacing.lg },
  current: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(199,159,94,0.15)', borderRadius: 12, padding: spacing.md, marginBottom: spacing.lg },
  currentText: { fontFamily: fonts.bodyMedium, color: palette.goldSoft, fontSize: 14 },
  card: { backgroundColor: palette.cream, borderRadius: radii.card, padding: spacing.lg, marginBottom: spacing.lg, ...shadow.card },
  cardHighlight: { borderWidth: 2, borderColor: palette.gold },
  cardHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.md },
  planName: { fontFamily: fonts.display, fontSize: 28, color: palette.burgundy },
  price: { fontFamily: fonts.bodySemibold, fontSize: 17, color: palette.ink },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 },
  perk: { fontFamily: fonts.body, fontSize: 14.5, color: palette.ink, flex: 1 },
  cancel: { alignItems: 'center', paddingVertical: spacing.md },
  cancelText: { fontFamily: fonts.bodyMedium, color: 'rgba(245,240,230,0.7)', fontSize: 14 },
  disclaimer: { fontFamily: fonts.body, fontSize: 12, color: 'rgba(245,240,230,0.45)', textAlign: 'center', marginTop: spacing.sm },
});
