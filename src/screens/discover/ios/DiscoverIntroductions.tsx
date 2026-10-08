import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
import { PreferencesSheet } from '@/components/PreferencesSheet';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonCard } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { Wordmark } from '@/components/Wordmark';
import { haptics } from '@/lib/haptics';
import { savedStore } from '@/lib/savedStore';
import { palette, radii, spacing, useTheme } from '@/theme';

const PAGE = 12;

/**
 * Discovery for iOS: a considered introduction, not a feed to be swiped.
 *
 * Each member arrives as an IntroductionCard, which puts the explained
 * compatibility, marriage intentions and faith before the photograph. There is
 * no gesture that decides anything: the two decisions are labelled buttons
 * ("Not now", "Express interest"), there is no rewind, and nothing is counted
 * out loud as a score of likes.
 *
 * This is a pushed screen (/introductions) on both platforms, reached from the
 * Journey home, which owns the matchmaker, wali meetings and events. Reviewing
 * introductions is one step of the journey, not the front door.
 */
export default function DiscoverIntroductions({ onBack }: { onBack?: () => void } = {}) {
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
  const [prefsSet, setPrefsSet] = useState(true);
  const [prefsOpen, setPrefsOpen] = useState(false);

  const page = useRef(1);
  const exhausted = useRef(false);
  const loadingMore = useRef(false);
  // Everyone ever loaded this session. The backend re-ranks a growing pool per
  // page, so pages overlap; this keeps anyone already seen (or answered) from
  // coming round again.
  const known = useRef<Set<string>>(new Set());

  const current = profiles[index] ?? null;
  const isPremium = !!quota?.is_premium;

  const loadSide = useCallback(async () => {
    setQuota(await matchesApi.quota().catch(() => null));
    setSavedCount(await savedStore.count());
  }, []);

  const refreshPrefs = useCallback(() => {
    profilesApi
      .getPreferences()
      .then((p) => setPrefsSet(Object.values(p ?? {}).some((v) => v != null)))
      .catch(() => setPrefsSet(true));
  }, []);

  // First load. `loading` already starts true, so nothing is set up front;
  // reload() below is the path that resets state for a retry or refresh.
  const load = useCallback(async () => {
    page.current = 1;
    exhausted.current = false;
    try {
      const mine = await profilesApi.getMine();
      if (!mine) {
        router.replace('/(onboarding)/profile-setup');
        return;
      }
      refreshPrefs();
      const feed = await profilesApi.discover(1, PAGE);
      known.current = new Set(feed.map((p) => p.user_id));
      setProfiles(feed);
      setIndex(0);
      if (feed.length < PAGE) exhausted.current = true;
    } catch (err) {
      setError(errorMessage(err, 'Could not load introductions'));
    } finally {
      setLoading(false);
    }
  }, [router, refreshPrefs]);

  useEffect(() => {
    load();
    loadSide();
  }, [load, loadSide]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    load();
  }, [load]);

  useFocusEffect(useCallback(() => { loadSide(); }, [loadSide]));

  const loadMore = useCallback(async () => {
    if (exhausted.current || loadingMore.current) return;
    loadingMore.current = true;
    try {
      // A page can be all repeats; keep going (briefly) until something is new.
      for (let tries = 0; tries < 3 && !exhausted.current; tries++) {
        const next = await profilesApi.discover(page.current + 1, PAGE);
        page.current += 1;
        if (next.length === 0) {
          exhausted.current = true;
          break;
        }
        const fresh = next.filter((p) => !known.current.has(p.user_id));
        if (fresh.length > 0) {
          fresh.forEach((p) => known.current.add(p.user_id));
          setProfiles((prev) => [...prev, ...fresh]);
          break;
        }
      }
    } catch {
      /* keep going with what we have */
    } finally {
      loadingMore.current = false;
    }
  }, []);

  // Top the queue up while a few introductions are still ahead.
  useEffect(() => {
    if (!loading && profiles.length > 0 && profiles.length - index <= 3) loadMore();
  }, [loading, profiles.length, index, loadMore]);

  const advance = useCallback(() => setIndex((i) => i + 1), []);

  const upsell = useCallback((message: string) => {
    haptics.warning();
    setNotice(message);
  }, []);

  const onNotNow = useCallback(async () => {
    if (!current || busy) return;
    setBusy(true);
    const target = current;
    haptics.light();
    advance();
    try {
      await matchesApi.pass(target.user_id);
    } catch {
      /* a failed pass is harmless; the card has already moved on */
    } finally {
      setBusy(false);
    }
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
      const status = err?.response?.status;
      if (status === 429 || status === 403 || status === 402) {
        haptics.warning();
        // The current card stays put on a limit, so nobody is skipped by accident.
        setNotice(err?.response?.data?.detail ?? 'You have reached your limit for now.');
      }
    } finally {
      loadSide();
      setBusy(false);
    }
  }, [current, busy, advance, loadSide]);

  const onSave = useCallback(async () => {
    if (!current || busy) return;
    if (!isPremium) return upsell('Keeping a shortlist is a Premium feature.');
    setBusy(true);
    haptics.light();
    await savedStore.add(current);
    setSavedCount(await savedStore.count());
    advance();
    setBusy(false);
  }, [current, busy, isPremium, advance, upsell]);

  const allowance = quota && !quota.is_premium ? quota.likes_remaining : null;

  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <Wordmark size={28} color={palette.burgundy} showMark={false} />
        <Text variant="footnote" tone="muted" style={styles.tagline}>introductions for marriage</Text>

        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={10}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Back to your journey"
          >
            <Ionicons name="chevron-back" size={26} color={palette.burgundy} />
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => setPrefsOpen(true)}
          hitSlop={10}
          style={styles.prefs}
          accessibilityRole="button"
          accessibilityLabel="Who you are looking for"
        >
          <Ionicons name="options-outline" size={22} color={palette.burgundy} />
          {!prefsSet ? <View style={[styles.dot, { borderColor: c.bg }]} /> : null}
        </Pressable>
        <Pressable
          onPress={() => router.push('/saved')}
          hitSlop={10}
          style={styles.shortlist}
          accessibilityRole="button"
          accessibilityLabel="Shortlist"
        >
          <Ionicons name="bookmark-outline" size={22} color={palette.burgundy} />
          {savedCount > 0 ? (
            <View style={styles.badge}>
              <Text variant="label" color={palette.cream} style={styles.badgeText}>{savedCount}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          onPress={() => router.push('/notifications')}
          hitSlop={10}
          style={styles.bell}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={22} color={palette.burgundy} />
        </Pressable>
      </View>

      {allowance != null ? (
        <View style={styles.strip}>
          <StripPill
            icon="mail-open-outline"
            label={`${allowance} introductions left`}
            onPress={() => router.push('/premium')}
            muted
          />
        </View>
      ) : null}

      {notice ? (
        <Pressable
          onPress={() => { setNotice(null); router.push('/premium'); }}
          style={[styles.notice, { backgroundColor: palette.sand }]}
        >
          <Text variant="footnote" tone="default" center>{`${notice}  Tap to see plans.`}</Text>
        </Pressable>
      ) : null}

      <View style={styles.body}>
        {loading ? (
          <SkeletonCard />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : current ? (
          <>
            <Animated.View key={current.user_id} entering={FadeIn.duration(260)} style={{ flex: 1 }}>
              <IntroductionCard profile={current} onActioned={advance} />
            </Animated.View>

            <View style={[styles.actions, onBack ? { paddingBottom: insets.bottom + spacing.sm } : null]}>
              <PressableScale
                scaleTo={0.96}
                onPress={onNotNow}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={`Not now for ${current.display_name}`}
                style={[styles.notNow, { backgroundColor: c.surface, borderColor: c.borderStrong }]}
              >
                <Text variant="callout" tone="accent" style={styles.actionText}>Not now</Text>
              </PressableScale>

              <PressableScale
                scaleTo={0.96}
                onPress={onInterest}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={`Express interest in ${current.display_name}`}
                style={[styles.interest, { backgroundColor: palette.burgundy }]}
              >
                <Ionicons name="mail-outline" size={17} color={palette.cream} />
                <Text variant="callout" color={palette.cream} style={styles.actionText}>Express interest</Text>
              </PressableScale>

              <PressableScale
                scaleTo={0.94}
                onPress={onSave}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={isPremium ? `Add ${current.display_name} to your shortlist` : 'Shortlist is a Premium feature'}
                style={[styles.save, { backgroundColor: c.surface, borderColor: c.borderStrong }]}
              >
                <Ionicons name="bookmark-outline" size={19} color={c.accent} />
                {!isPremium ? (
                  <View style={[styles.lock, { backgroundColor: c.accent, borderColor: c.surface }]}>
                    <Ionicons name="lock-closed" size={7} color={palette.cream} />
                  </View>
                ) : null}
              </PressableScale>
            </View>
          </>
        ) : profiles.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No one to show yet"
            message="New members are introduced to you as they join, matched to what you are looking for."
            actionLabel="Refine who you are looking for"
            onAction={() => setPrefsOpen(true)}
          />
        ) : (
          <EmptyState
            icon="checkmark-done-outline"
            title="You're all caught up"
            message="You've reviewed everyone we have for now. New introductions arrive as more members join, so check back soon."
            actionLabel="Refresh"
            onAction={reload}
          />
        )}
      </View>

      <PreferencesSheet
        visible={prefsOpen}
        onClose={() => {
          setPrefsOpen(false);
          refreshPrefs();
        }}
      />

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

function StripPill({
  icon,
  label,
  onPress,
  muted,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  muted?: boolean;
}) {
  const { c } = useTheme();
  return (
    <PressableScale
      scaleTo={0.97}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.pill,
        muted
          ? { backgroundColor: c.surface, borderColor: c.border }
          : { backgroundColor: c.accentFaint, borderColor: 'transparent' },
      ]}
    >
      <Ionicons name={icon} size={15} color={c.accent} />
      <Text variant="footnote" tone="accent">{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: { alignItems: 'center', paddingBottom: spacing.sm },
  tagline: { letterSpacing: 1, marginTop: -2 },
  prefs: { position: 'absolute', right: spacing.lg + 80, top: 0 },
  shortlist: { position: 'absolute', right: spacing.lg + 40, top: 0 },
  bell: { position: 'absolute', right: spacing.lg, top: 0 },
  dot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    backgroundColor: palette.burgundy,
  },
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

  strip: { alignItems: 'flex-start', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  back: { position: 'absolute', left: spacing.lg, top: 0 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },

  notice: { marginHorizontal: spacing.lg, padding: spacing.md, borderRadius: 12, marginBottom: spacing.sm },

  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  notNow: {
    flex: 0.8,
    height: 52,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  interest: {
    flex: 1.5,
    height: 52,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  actionText: { fontWeight: '600' },
  save: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lock: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
