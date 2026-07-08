import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { boostsApi } from '@/api/boosts';
import type { BoostStatus } from '@/api/types';
import { BoostSheet } from '@/components/BoostSheet';
import { Button } from '@/components/Button';
import { ErrorState } from '@/components/ErrorState';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { Text } from '@/components/Text';
import { PAYMENTS_ENABLED } from '@/lib/features';
import { formatPoundsExact } from '@/lib/format';
import { formatCountdown } from '@/lib/giving';
import { haptics } from '@/lib/haptics';
import { spacing, radii, useTheme } from '@/theme';

// Fallbacks until the live status arrives (the backend is the source of truth).
const DEFAULT_PRICE_PENCE = 500;
const DEFAULT_DURATION_MIN = 60;

const PERKS = [
  { icon: 'rocket-outline', text: 'Your profile jumps to the top of discovery for everyone.' },
  { icon: 'eye-outline', text: 'Get seen by far more members during your boosted hour.' },
  { icon: 'heart-outline', text: 'More views means more chances at a meaningful match.' },
] as const;

export default function Boost() {
  // Purchases are disabled until native IAP ships (see lib/features.ts).
  if (!PAYMENTS_ENABLED) return <Redirect href="/(app)/profile" />;
  return <BoostScreen />;
}

function BoostScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c, isDark } = useTheme();

  const [status, setStatus] = useState<BoostStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const s = await boostsApi.active();
      setStatus(s);
      setRemaining(s.seconds_remaining);
    } catch (err) {
      setError(errorMessage(err, 'Could not load your boost status'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Tick the countdown down to zero while a boost is active.
  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (!status?.active || remaining <= 0) return;
    timer.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (timer.current) clearInterval(timer.current);
          setStatus((prev) => (prev ? { ...prev, active: false, seconds_remaining: 0 } : prev));
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [status?.active, remaining]);

  const pricePence = status?.price_pence ?? DEFAULT_PRICE_PENCE;
  const durationMin = status?.duration_minutes ?? DEFAULT_DURATION_MIN;
  const price = formatPoundsExact(pricePence);
  const active = !!status?.active && remaining > 0;

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
        <Text variant="subhead" tone="default">Boost</Text>
        <View style={styles.headerBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      ) : error && !status ? (
        <ErrorState message={error} onRetry={() => { setLoading(true); load(); }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 120 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.crest, { backgroundColor: c.accentFaint }]}>
            <Ionicons name="flash" size={22} color={c.accent} />
          </View>
          <Text variant="display" tone="default" style={styles.lead}>Boost your profile</Text>
          <Text variant="callout" tone="muted" style={styles.sub}>
            {price} puts you at the top of discovery for {durationMin} minutes, so the right people see
            you first.
          </Text>

          {active ? (
            <Surface style={[styles.activeCard, { borderColor: c.accent }]}>
              <View style={[styles.activeBadge, { backgroundColor: c.accentFaint }]}>
                <Ionicons name="flash" size={18} color={c.accent} />
                <Text variant="label" tone="accent">Boost active</Text>
              </View>
              <Text variant="title" tone="default" style={styles.countdown}>{formatCountdown(remaining)}</Text>
              <Text variant="footnote" tone="muted">left at the top of discovery</Text>
            </Surface>
          ) : (
            <Surface style={isDark ? styles.perksCard : [styles.perksCard, styles.softShadow]}>
              {PERKS.map((p) => (
                <View key={p.text} style={styles.perkRow}>
                  <View style={[styles.perkIcon, { backgroundColor: c.accentFaint }]}>
                    <Ionicons name={p.icon} size={16} color={c.accent} />
                  </View>
                  <Text variant="callout" tone="default" style={styles.perkText}>{p.text}</Text>
                </View>
              ))}
            </Surface>
          )}

          <Text variant="footnote" tone="subtle" center style={styles.disclaimer}>
            Dev mode: purchases are simulated (no real charge).
          </Text>
        </ScrollView>
      )}

      {!loading ? (
        <View style={[styles.ctaBar, { backgroundColor: c.surface, borderTopColor: c.border, paddingBottom: insets.bottom + spacing.md }]}>
          <Button
            label={active ? 'Extend boost' : `Boost now (${price})`}
            onPress={() => { haptics.light(); setSheetOpen(true); }}
          />
        </View>
      ) : null}

      <BoostSheet
        pricePence={pricePence}
        durationMinutes={durationMin}
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onBoosted={(s) => {
          setSheetOpen(false);
          setStatus(s);
          setRemaining(s.seconds_remaining);
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  crest: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  lead: { letterSpacing: -0.5 },
  sub: { marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: 21 },

  activeCard: { alignItems: 'center', padding: spacing.xl, gap: spacing.xs, borderWidth: 1.5 },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginBottom: spacing.sm,
  },
  countdown: { letterSpacing: 0.5 },

  perksCard: { padding: spacing.lg, gap: spacing.lg },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  perkIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  perkText: { flex: 1, lineHeight: 21 },
  softShadow: {
    shadowColor: '#3D0010',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },

  disclaimer: { marginTop: spacing.xl },

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
