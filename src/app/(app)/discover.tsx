import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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

  const onSave = useCallback(async () => {
    if (!current || busy) return;
    setBusy(true);
    haptics.light();
    await savedStore.add(current);
    setSavedCount(await savedStore.count());
    advance();
    setBusy(false);
  }, [current, busy, advance]);

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
              <PressableScale style={[styles.actionPill, styles.notNow, { backgroundColor: c.surface, borderColor: c.borderStrong }]} onPress={onNotNow} disabled={busy}
                accessibilityRole="button" accessibilityLabel="Not now">
                <Ionicons name="close" size={20} color={palette.sienna} />
                <Text variant="subhead" color={palette.sienna}>Not now</Text>
              </PressableScale>

              <PressableScale style={styles.saveBtn} onPress={onSave} disabled={busy}
                accessibilityRole="button" accessibilityLabel="Save to revisit">
                <Ionicons name="bookmark-outline" size={22} color={palette.gold} />
              </PressableScale>

              <PressableScale style={[styles.actionPill, styles.interest]} onPress={onInterest} disabled={busy}
                accessibilityRole="button" accessibilityLabel="Express interest">
                <Ionicons name="heart" size={20} color={palette.cream} />
                <Text variant="subhead" color={palette.cream}>Interested</Text>
              </PressableScale>
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
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  actionPill: {
    height: 56,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  notNow: { flex: 1, borderWidth: 1.5, borderColor: palette.sienna, backgroundColor: palette.white },
  interest: { flex: 1.5, backgroundColor: palette.burgundy },
  saveBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: tint.goldSoft,
    backgroundColor: tint.goldFaint,
  },
});
