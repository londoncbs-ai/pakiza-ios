import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { matchesApi } from '@/api/matches';
import { subscriptionsApi } from '@/api/subscriptions';
import { restoreAppleSubscription } from '@/lib/appleBilling';
import { restorePlaySubscription } from '@/lib/playBilling';
import type { Subscription, SubscriptionPlan } from '@/api/types';
import { Button } from '@/components/Button';
import { CheckoutSheet } from '@/components/CheckoutSheet';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { SUBSCRIPTIONS_ENABLED } from '@/lib/features';
import { haptics } from '@/lib/haptics';
import { palette, radii, spacing, useTheme } from '@/theme';

const PLANS: { plan: SubscriptionPlan; name: string; price: string; period: string; perDay: string; tagline: string; perks: string[]; highlight?: boolean }[] = [
  {
    plan: 'free',
    name: 'Free',
    price: '£0',
    period: '',
    perDay: '',
    tagline: 'Start meeting people.',
    perks: ['A daily set of curated introductions', 'Up to 4 open matches at a time', 'Unlimited messaging with your matches'],
  },
  {
    plan: 'premium',
    name: 'Premium',
    price: '£14.99',
    period: '/mo',
    perDay: 'about 50p a day',
    tagline: 'Move at your own pace.',
    perks: [
      'Unlimited likes and unlimited open matches',
      'Undo an accidental pass',
      'Save profiles to revisit later',
      'A profile boost every month (a £5 value)',
    ],
  },
  {
    plan: 'gold',
    name: 'Gold',
    price: '£24.99',
    period: '/mo',
    perDay: 'about 83p a day',
    tagline: 'Skip the queue. Meet first.',
    perks: [
      'Everything in Premium',
      'See everyone who likes you and match instantly',
      '5 profile boosts every month (a £25 value)',
      'Priority placement in discovery',
      'Gold badge on your profile',
    ],
    highlight: true,
  },
];

export default function Premium() {
  // Native billing everywhere subscriptions are sold (Play Billing on
  // Android, StoreKit on iOS); other platforms redirect away.
  if (!SUBSCRIPTIONS_ENABLED) return <Redirect href="/(app)/profile" />;
  return <PremiumScreen />;
}

function PremiumScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c, isDark } = useTheme();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SubscriptionPlan>('gold');
  const [likesWaiting, setLikesWaiting] = useState(0);
  const [checkout, setCheckout] = useState<{ plan: SubscriptionPlan; name: string } | null>(null);

  const load = useCallback(async () => {
    matchesApi.likesPreview().then((p) => setLikesWaiting(p.count)).catch(() => {});
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

  const restore = async () => {
    try {
      const restored =
        Platform.OS === 'ios'
          ? await restoreAppleSubscription()
          : await restorePlaySubscription();
      if (restored) {
        setSub(restored);
        Alert.alert('Restored', 'Your subscription is active again.');
      } else {
        Alert.alert('Nothing to restore', 'No previous purchase was found for this store account.');
      }
    } catch (err) {
      Alert.alert('Could not restore', errorMessage(err, 'Please try again.'));
    }
  };

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
  const selectedPlan = PLANS.find((p) => p.plan === selected) ?? PLANS[1];
  const selectedIsCurrent = sub?.plan === selected && sub?.status === 'active';

  const onContinue = () => {
    if (selectedIsCurrent || selected === 'free') return;
    haptics.light();
    setCheckout({ plan: selectedPlan.plan, name: selectedPlan.name });
  };

  return (
    <Screen>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
        <Text variant="subhead" tone="default">Pakiza Premium</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Value prop */}
        <View style={[styles.crest, { backgroundColor: c.accentFaint }]}>
          <Ionicons name="heart" size={22} color={c.accent} />
        </View>
        <Text variant="display" tone="default" style={styles.lead}>Invest in finding the one.</Text>
        <Text variant="callout" tone="muted" style={styles.sub}>
          Premium members connect with intention: more visibility, and more meaningful matches.
        </Text>

        {loading ? (
          <ActivityIndicator color={c.accent} size="large" style={{ marginTop: spacing.xxxl }} />
        ) : (
          <>
            {likesWaiting > 0 && sub?.plan !== 'gold' ? (
              <View style={[styles.likesBanner, { backgroundColor: c.accentFaint, borderColor: c.accent }]}>
                <Ionicons name="heart" size={18} color={c.accent} />
                <Text variant="footnote" tone="accent" style={{ flex: 1 }}>
                  {likesWaiting} {likesWaiting === 1 ? 'person has' : 'people have'} already liked you. Gold reveals them instantly.
                </Text>
              </View>
            ) : null}

            {activePremium ? (
              <View style={[styles.current, { backgroundColor: c.accentFaint }]}>
                <Ionicons name="ribbon-outline" size={18} color={c.accent} />
                <Text variant="footnote" tone="accent" style={styles.currentText}>
                  You’re on {sub!.plan.toUpperCase()}
                  {sub!.expires_at ? ` · renews ${new Date(sub!.expires_at).toLocaleDateString()}` : ''}
                </Text>
              </View>
            ) : null}

            {PLANS.map((p) => {
              const isCurrent = sub?.plan === p.plan && sub?.status === 'active';
              const isSelected = selected === p.plan;
              return (
                <Pressable
                  key={p.plan}
                  onPress={() => { haptics.selection(); setSelected(p.plan); }}
                  style={({ pressed }) => [
                    styles.card,
                    {
                      backgroundColor: isSelected ? c.accentFaint : c.surface,
                      borderColor: isSelected ? c.accent : c.border,
                      borderWidth: isSelected ? 2 : StyleSheet.hairlineWidth,
                    },
                    !isDark && styles.cardShadow,
                    pressed && { opacity: 0.92 },
                  ]}
                >
                  <View style={styles.cardHead}>
                    <View style={styles.cardHeadText}>
                      <View style={styles.nameRow}>
                        <Text variant="heading" tone="default">{p.name}</Text>
                        {p.highlight ? (
                          <View style={[styles.popularPill, { backgroundColor: c.accent }]}>
                            <Text variant="label" color={c.textOnAccent} style={styles.popularText}>Most popular</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text variant="footnote" tone="muted" style={{ marginTop: 2 }}>{p.tagline}</Text>
                    </View>

                    {/* Selection indicator */}
                    <View
                      style={[
                        styles.radio,
                        { borderColor: isSelected ? c.accent : c.borderStrong },
                        isSelected && { backgroundColor: c.accent },
                      ]}
                    >
                      {isSelected ? <Ionicons name="checkmark" size={15} color={c.textOnAccent} /> : null}
                    </View>
                  </View>

                  <View style={styles.priceRow}>
                    <Text variant="title" tone="default">{p.price}</Text>
                    {p.period ? <Text variant="callout" tone="subtle" style={styles.period}>{p.period}</Text> : null}
                    {p.perDay ? <Text variant="footnote" tone="subtle" style={styles.perDay}>{p.perDay}</Text> : null}
                    {isCurrent ? (
                      <View style={[styles.currentTag, { borderColor: c.borderStrong }]}>
                        <Text variant="label" tone="muted" style={styles.currentTagText}>Current</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={[styles.divider, { backgroundColor: c.border }]} />

                  <View style={styles.perks}>
                    {p.perks.map((perk) => (
                      <View key={perk} style={styles.perkRow}>
                        <Ionicons name="checkmark-circle" size={18} color={c.accent} />
                        <Text variant="callout" tone="default" style={styles.perk}>{perk}</Text>
                      </View>
                    ))}
                  </View>
                </Pressable>
              );
            })}

            {activePremium && sub!.auto_renews ? (
              <Pressable onPress={cancel} style={styles.cancel} hitSlop={8}>
                <Text variant="footnote" tone="muted">Cancel auto-renewal</Text>
              </Pressable>
            ) : null}

            <Text variant="footnote" tone="subtle" center style={styles.disclaimer}>
              {Platform.OS === 'android'
                ? 'Billed through Google Play. Cancel anytime in Play Store subscriptions.'
                : Platform.OS === 'ios'
                  ? 'Billed through the App Store as an auto-renewing monthly subscription. Cancel anytime in your Apple ID settings.'
                  : 'Dev mode: purchases are simulated (no real charge).'}
            </Text>

            <Pressable onPress={restore} style={styles.cancel} hitSlop={8}>
              <Text variant="footnote" tone="muted">Restore purchases</Text>
            </Pressable>

            {/* App Review 3.1.2: the paywall must link Terms of Use and the
                privacy policy. */}
            <View style={styles.legalRow}>
              <Pressable onPress={() => Linking.openURL('https://pakiza.co.uk/terms')} hitSlop={8}>
                <Text variant="footnote" tone="muted" style={styles.legalLink}>Terms of Use</Text>
              </Pressable>
              <Text variant="footnote" tone="subtle">·</Text>
              <Pressable onPress={() => Linking.openURL('https://pakiza.co.uk/privacy')} hitSlop={8}>
                <Text variant="footnote" tone="muted" style={styles.legalLink}>Privacy Policy</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      {/* Sticky CTA */}
      {!loading ? (
        <View style={[styles.ctaBar, { backgroundColor: c.surface, borderTopColor: c.border, paddingBottom: insets.bottom + spacing.md }]}>
          <Button
            label={
              selectedIsCurrent
                ? 'Current plan'
                : selected === 'free'
                  ? 'Your free plan'
                  : `Get ${selectedPlan.name} · ${selectedPlan.price}${selectedPlan.period}`
            }
            variant="primary"
            disabled={selectedIsCurrent || selected === 'free'}
            onPress={onContinue}
          />
        </View>
      ) : null}

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
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 30, alignItems: 'flex-start' },

  crest: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  lead: { letterSpacing: -0.5 },
  sub: { marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: 21 },

  current: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  currentText: { flex: 1 },

  card: {
    borderRadius: radii.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardShadow: {
    shadowColor: '#3D0010',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  likesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  cardHeadText: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  popularPill: { borderRadius: radii.pill, paddingHorizontal: 9, paddingVertical: 3 },
  popularText: { letterSpacing: 0.4 },

  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: spacing.md },
  period: { marginLeft: 1 },
  perDay: { marginLeft: spacing.sm },
  currentTag: {
    marginLeft: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
    alignSelf: 'center',
  },
  currentTagText: { letterSpacing: 0.4 },

  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.md },

  perks: { gap: spacing.sm },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  perk: { flex: 1 },

  cancel: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.xs },
  legalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, marginTop: spacing.xs,
  },
  legalLink: { textDecorationLine: 'underline' },
  disclaimer: { marginTop: spacing.sm },

  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
