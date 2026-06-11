import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { matchesApi } from '@/api/matches';
import { profilesApi } from '@/api/profiles';
import type { PublicProfile, Quota } from '@/api/types';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { IntroductionCard } from '@/components/IntroductionCard';
import { InterestModal } from '@/components/InterestModal';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonCard } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { Wordmark } from '@/components/Wordmark';
import { haptics } from '@/lib/haptics';
import { savedStore } from '@/lib/savedStore';
import { palette, spacing, tint, useTheme } from '@/theme';

const PAGE = 12;

export default function Discover() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();

  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matched, setMatched] = useState<PublicProfile | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  const page = useRef(1);
  const exhausted = useRef(false);
  const loadingMore = useRef(false);

  const current = profiles[index] ?? null;

  const loadQuota = useCallback(async () => {
    setQuota(await matchesApi.quota().catch(() => null));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    page.current = 1;
    exhausted.current = false;
    try {
      const mine = await profilesApi.getMine();
      if (!mine) {
        router.replace('/(onboarding)/profile-setup');
        return;
      }
      const feed = await profilesApi.discover(1, PAGE);
      setProfiles(feed);
      setIndex(0);
      if (feed.length < PAGE) exhausted.current = true;
    } catch (err) {
      setError(errorMessage(err, 'Could not load your feed'));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
    loadQuota();
    savedStore.count().then(setSavedCount);
  }, [load, loadQuota]);

  // Keep quota + saved count fresh when returning to the tab.
  useFocusEffect(
    useCallback(() => {
      loadQuota();
      savedStore.count().then(setSavedCount);
    }, [loadQuota])
  );

  const loadMore = useCallback(async () => {
    if (exhausted.current || loadingMore.current) return;
    loadingMore.current = true;
    try {
      const next = await profilesApi.discover(page.current + 1, PAGE);
      page.current += 1;
      if (next.length === 0) exhausted.current = true;
      else setProfiles((prev) => [...prev, ...next]);
    } catch {
      /* keep going with what we have */
    } finally {
      loadingMore.current = false;
    }
  }, []);

  const advance = useCallback(() => {
    setIndex((i) => {
      const nextIdx = i + 1;
      if (profiles.length - nextIdx <= 3) loadMore();
      return nextIdx;
    });
  }, [profiles.length, loadMore]);

  const onNotNow = useCallback(async () => {
    if (!current || busy) return;
    setBusy(true);
    const target = current;
    advance();
    try {
      await matchesApi.pass(target.user_id);
    } catch {
      /* a failed pass is harmless; the card has already moved on */
    } finally {
      setBusy(false);
    }
  }, [current, busy, advance]);

  const isPremium = !!quota?.is_premium;

  const upsell = useCallback((feature: string) => {
    haptics.warning();
    setNotice(`${feature} is a Premium feature.`);
  }, []);

  const onSave = useCallback(async () => {
    if (!current || busy) return;
    if (!isPremium) return upsell('Save to revisit');
    setBusy(true);
    haptics.light();
    await savedStore.add(current);
    setSavedCount(await savedStore.count());
    advance();
    setBusy(false);
  }, [current, busy, advance, isPremium, upsell]);

  const onRewind = useCallback(async () => {
    if (busy) return;
    if (!isPremium) return upsell('Going back');
    setBusy(true);
    try {
      const profile = await matchesApi.rewind();
      setProfiles((prev) => {
        const next = [...prev];
        next.splice(index, 0, profile);
        return next;
      });
      haptics.light();
    } catch (err: any) {
      const sc = err?.response?.status;
      if (sc === 402) upsell('Going back');
      else if (sc === 404) Alert.alert('Nothing to undo', 'Make a decision first, then you can go back to it.');
    } finally {
      setBusy(false);
    }
  }, [busy, isPremium, index, upsell]);

  const onBoost = useCallback(async () => {
    if (busy) return;
    if (!isPremium) return upsell('Boost');
    setBusy(true);
    try {
      await matchesApi.boost();
      haptics.success();
      Alert.alert('You are boosted', 'Your profile is shown first in Discover for the next 30 minutes.');
    } catch (err: any) {
      if (err?.response?.status === 402) upsell('Boost');
    } finally {
      setBusy(false);
    }
  }, [busy, isPremium, upsell]);

  const onInterest = useCallback(async () => {
    if (!current || busy) return;
    setBusy(true);
    const target = current;
    try {
      const res = await matchesApi.like(target.user_id);
      if (res.is_matched) {
        haptics.success();
        setMatched(res.matched_profile ?? target);
      } else {
        haptics.light();
      }
      advance();
    } catch (err: any) {
      const sc = err?.response?.status;
      if (sc === 429 || sc === 403) {
        haptics.warning();
        setNotice(err?.response?.data?.detail ?? 'You have reached your limit for now.');
      }
      // On a limit error we deliberately keep the current card in place.
    } finally {
      loadQuota();
      setBusy(false);
    }
  }, [current, busy, advance, loadQuota]);

  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <Wordmark size={28} color={palette.burgundy} />
        <Text variant="footnote" tone="muted" style={styles.tagline}>where love finds purpose</Text>

        {quota && !quota.is_premium ? (
          <View style={styles.quotaRow}>
            <View style={[styles.quotaPill, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Ionicons name="heart" size={12} color={palette.burgundy} />
              <Text variant="footnote" tone="default">{quota.likes_remaining ?? 0} likes left</Text>
            </View>
            <Pressable style={[styles.quotaPill, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => router.push('/(app)/matches')}>
              <Ionicons name="people" size={12} color={palette.burgundy} />
              <Text variant="footnote" tone="default">{quota.active_matches}/{quota.match_limit} matches</Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable onPress={() => router.push('/saved')} hitSlop={10} style={styles.bookmark}>
          <Ionicons name="bookmark-outline" size={22} color={palette.burgundy} />
          {savedCount > 0 ? (
            <View style={styles.badge}>
              <Text variant="label" color={palette.cream} style={styles.badgeText}>{savedCount}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable onPress={() => router.push('/notifications')} hitSlop={10} style={styles.bell}>
          <Ionicons name="notifications-outline" size={22} color={palette.burgundy} />
        </Pressable>
      </View>

      {notice ? (
        <Pressable onPress={() => { setNotice(null); router.push('/premium'); }} style={styles.notice}>
          <Text variant="footnote" tone="default" center>{notice}  Tap to upgrade.</Text>
        </Pressable>
      ) : null}

      <View style={styles.body}>
        {loading ? (
          <SkeletonCard />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : current ? (
          <>
            <Animated.View key={current.user_id} entering={FadeIn.duration(260)} style={{ flex: 1 }}>
              <IntroductionCard profile={current} onActioned={advance} />
            </Animated.View>

            <View style={styles.actionBar}>
              <ActionCircle icon="arrow-undo-outline" size={48} onPress={onRewind} disabled={busy} locked={!isPremium}
                iconColor={c.accent} bg={c.surface} borderColor={c.border} label="Go back" />
              <ActionCircle icon="close" size={56} onPress={onNotNow} disabled={busy}
                iconColor={palette.sienna} bg={c.surface} borderColor={c.borderStrong} label="Not now" />
              <ActionCircle icon="bookmark-outline" size={52} onPress={onSave} disabled={busy} locked={!isPremium}
                iconColor={c.accent} bg={c.surface} borderColor={c.border} label="Save to revisit" />
              <ActionCircle icon="heart" size={66} onPress={onInterest} disabled={busy} primary
                iconColor={palette.cream} label="Express interest" />
              <ActionCircle icon="flash-outline" size={48} onPress={onBoost} disabled={busy} locked={!isPremium}
                iconColor={c.accent} bg={c.surface} borderColor={c.border} label="Boost your profile" />
            </View>
          </>
        ) : (
          <EmptyState
            icon="checkmark-done-outline"
            title="You're all caught up"
            message="You've reviewed everyone we have for now. New introductions arrive as more members join, so check back soon."
            actionLabel="Refresh"
            onAction={load}
          />
        )}
      </View>

      <InterestModal
        profile={matched}
        onClose={() => setMatched(null)}
        onMessage={() => {
          setMatched(null);
          router.push('/(app)/messages');
        }}
      />
    </View>
  );
}

function ActionCircle({
  icon,
  size,
  onPress,
  disabled,
  primary,
  locked,
  iconColor,
  bg,
  borderColor,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  size: number;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  locked?: boolean;
  iconColor: string;
  bg?: string;
  borderColor?: string;
  label: string;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
        primary ? { backgroundColor: palette.burgundy } : { backgroundColor: bg, borderWidth: 1.5, borderColor },
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.42)} color={iconColor} />
      {locked ? (
        <View style={styles.lockDot}>
          <Ionicons name="lock-closed" size={9} color={palette.cream} />
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.cream },
  header: { alignItems: 'center', paddingBottom: spacing.sm },
  tagline: { letterSpacing: 1, marginTop: -2 },
  bookmark: { position: 'absolute', right: spacing.lg + 40, top: 0 },
  bell: { position: 'absolute', right: spacing.lg, top: 0 },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: palette.burgundy,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 10, letterSpacing: 0 },
  quotaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  quotaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
  },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  notice: { backgroundColor: palette.sand, marginHorizontal: spacing.lg, padding: spacing.md, borderRadius: 12, marginBottom: spacing.sm },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  circle: { alignItems: 'center', justifyContent: 'center' },
  lockDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: palette.burgundy,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
