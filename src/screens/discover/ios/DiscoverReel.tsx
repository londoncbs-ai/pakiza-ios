import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { matchesApi } from '@/api/matches';
import { profilesApi } from '@/api/profiles';
import type { MyProfile, PublicProfile, Quota } from '@/api/types';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { InterestModal } from '@/components/InterestModal';
import { PreferencesSheet } from '@/components/PreferencesSheet';
import { PressableScale } from '@/components/PressableScale';
import { Text } from '@/components/Text';
import { ReelPage } from './ReelPage';
import { haptics } from '@/lib/haptics';
import { savedStore } from '@/lib/savedStore';
import { palette, radii, spacing, useTheme } from '@/theme';

const PAGE = 15;

/**
 * Discovery for iOS: one person at a time, moved through by scrolling.
 *
 * Scrolling on to the next person RECORDS A PASS on the one left behind, so the
 * vertical gesture is a decision, not just navigation. Two rules keep that
 * honest: it fires on settle, so a scroll that springs back rejects nobody, and
 * the page stamps itself in red as it leaves, so the member always sees what
 * their gesture just did. Passing is therefore never silent.
 *
 * Because the scroll carries the rejection, the only buttons are the two
 * choices worth making deliberately: express interest, and save for later.
 *
 * The feed keeps loading; the supply is not rationed. The paid tiers keep their
 * place in the header, because this screen is where they are worth buying.
 *
 * Each page owns its photograph pager, parallax and expanding profile - see
 * ReelPage. This file owns the data, the decisions and the header.
 *
 * Android keeps its swipe deck untouched - see src/app/(app)/discover.tsx.
 */
export default function DiscoverReel() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { width } = useWindowDimensions();

  const scrollY = useSharedValue(0);
  const listRef = useAnimatedRef<any>();
  // Read on the UI thread by the scroll clamp below.
  const floorY = useSharedValue(0);
  const canGoBack = useSharedValue(0);

  const [mine, setMine] = useState<MyProfile | null>(null);
  const [prefsSet, setPrefsSet] = useState(true);
  const [people, setPeople] = useState<PublicProfile[]>([]);
  const [interestIds, setInterestIds] = useState<Record<string, true>>({});
  const [savedIds, setSavedIds] = useState<Record<string, true>>({});
  const [anyExpanded, setAnyExpanded] = useState(false);
  const [backBlocked, setBackBlocked] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<PublicProfile | null>(null);

  const [pageH, setPageH] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [admirers, setAdmirers] = useState(0);
  const [savedCount, setSavedCount] = useState(0);

  const page = useRef(1);
  // Everyone already acted on, so a scroll never passes the same person twice
  // and never overrides an interest that was already sent.
  const decided = useRef<Set<string>>(new Set());
  const lastIndex = useRef(0);
  const backBlockedAt = useRef(0);
  // True while a corrective scroll is in flight, so the momentum-end it causes
  // is not mistaken for the member scrolling.
  const correcting = useRef(false);
  const blockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peopleRef = useRef<PublicProfile[]>([]);

  const exhausted = useRef(false);
  const loadingMore = useRef(false);
  const ready = useRef(false);

  const isPremium = !!quota?.is_premium;
  peopleRef.current = people;
  canGoBack.value = isPremium ? 1 : 0;

  const dedupe = (list: PublicProfile[]) => {
    const seen = new Set<string>();
    return list.filter((p) => !seen.has(p.user_id) && seen.add(p.user_id));
  };

  // ── Data ─────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setError(null);
    page.current = 1;
    exhausted.current = false;
    ready.current = false;
    try {
      const profile = await profilesApi.getMine();
      if (!profile) {
        router.replace('/(onboarding)/profile-setup');
        return;
      }
      setMine(profile);
      profilesApi
        .getPreferences()
        .then((p) => setPrefsSet(Object.values(p ?? {}).some((v) => v != null)))
        .catch(() => setPrefsSet(true));

      const feed = await profilesApi.discover(1, PAGE);
      setPeople(dedupe(feed));
      if (feed.length < PAGE) exhausted.current = true;
      ready.current = true;
    } catch (err) {
      setError(errorMessage(err, 'Could not load members'));
    }
  }, [router]);

  const loadSide = useCallback(async () => {
    setQuota(await matchesApi.quota().catch(() => null));
    setAdmirers(await matchesApi.likesCount().catch(() => 0));
    setSavedCount(await savedStore.count());
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
    loadSide();
  }, [load, loadSide]);

  useFocusEffect(useCallback(() => { loadSide(); }, [loadSide]));

  const loadMore = useCallback(async () => {
    if (!ready.current || exhausted.current || loadingMore.current) return;
    loadingMore.current = true;
    try {
      const next = await profilesApi.discover(page.current + 1, PAGE);
      page.current += 1;
      if (next.length === 0) exhausted.current = true;
      // The backend re-ranks a growing pool per page, so pages overlap.
      else setPeople((prev) => dedupe([...prev, ...next]));
    } catch {
      /* keep what we have */
    } finally {
      loadingMore.current = false;
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    await loadSide();
    setRefreshing(false);
  }, [load, loadSide]);

  // ── Decisions ────────────────────────────────────────────────────────────

  /**
   * Scrolling on to the next person records a pass on the one left behind.
   * Runs on settle rather than on every frame, so a scroll that springs back
   * does not reject anybody, and each person is passed at most once.
   */
  const blockedNotice = useCallback(() => {
    if (backBlockedAt.current && Date.now() - backBlockedAt.current < 4000) return;
    backBlockedAt.current = Date.now();
    haptics.warning();
    setBackBlocked(true);
    if (blockTimer.current) clearTimeout(blockTimer.current);
    blockTimer.current = setTimeout(() => setBackBlocked(false), 4000);
  }, []);

  const settle = useCallback(
    (y: number) => {
      if (!pageH) return;
      if (correcting.current) {
        correcting.current = false;
        return;
      }
      const idx = Math.round(y / pageH);

      // Revisiting somebody already passed is "Undo an accidental pass", a
      // Premium feature. Corrected once, here, after the scroll has stopped -
      // never per frame, because scrollTo emits scroll events and a per-frame
      // correction feeds itself.
      if (idx < lastIndex.current && !isPremium) {
        correcting.current = true;
        listRef.current?.scrollToOffset({ offset: lastIndex.current * pageH, animated: true });
        blockedNotice();
        return;
      }

      if (idx > lastIndex.current) {
        let passedAny = false;
        for (let i = lastIndex.current; i < idx; i++) {
          const p = peopleRef.current[i];
          if (!p || decided.current.has(p.user_id)) continue;
          decided.current.add(p.user_id);
          passedAny = true;
          matchesApi.pass(p.user_id).catch(() => {});
        }
        if (passedAny) haptics.light();
      }
      lastIndex.current = idx;
      floorY.value = idx * pageH;
    },
    [pageH, floorY, isPremium, blockedNotice]
  );


  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
    onMomentumEnd: (e) => {
      runOnJS(settle)(e.contentOffset.y);
    },
  });

  const advance = useCallback(
    (index: number) => {
      if (!pageH) return;
      lastIndex.current = index + 1;
      floorY.value = (index + 1) * pageH;
      correcting.current = true;
      listRef.current?.scrollToOffset({ offset: (index + 1) * pageH, animated: true });
    },
    [pageH, floorY]
  );

  const remove = useCallback((userId: string) => {
    setPeople((prev) => prev.filter((p) => p.user_id !== userId));
  }, []);

  /**
   * Undo the last pass. POST /matches/rewind is a Premium feature and answers
   * 402 for everyone else, so free members get the plans screen instead - the
   * lock on the control is what sells it rather than hiding it.
   */
  const onRewind = useCallback(async () => {
    if (busy || lastIndex.current === 0) return;
    if (!isPremium) {
      haptics.warning();
      router.push('/premium');
      return;
    }
    setBusy(true);
    try {
      await matchesApi.rewind();
      const back = lastIndex.current - 1;
      const p = peopleRef.current[back];
      if (p) {
        decided.current.delete(p.user_id);
        setInterestIds((prev) => {
          const next = { ...prev };
          delete next[p.user_id];
          return next;
        });
      }
      haptics.light();
      lastIndex.current = back;
      floorY.value = back * pageH;
      listRef.current?.scrollToOffset({ offset: back * pageH, animated: true });
    } catch (err: any) {
      if (err?.response?.status === 402) router.push('/premium');
    } finally {
      loadSide();
      setBusy(false);
    }
  }, [busy, isPremium, router, pageH, loadSide, floorY]);

  const upsell = useCallback(() => {
    haptics.warning();
    router.push('/premium');
  }, [router]);

  const onInterest = useCallback(
    async (profile: PublicProfile, index: number) => {
      if (busy || decided.current.has(profile.user_id)) return;
      setBusy(true);
      decided.current.add(profile.user_id);
      try {
        const res = await matchesApi.like(profile.user_id);
        if (res.is_matched) {
          haptics.success();
          setMatchedProfile(res.matched_profile ?? profile);
          setInterestIds((prev) => ({ ...prev, [profile.user_id]: true }));
        } else {
          haptics.light();
          setInterestIds((prev) => ({ ...prev, [profile.user_id]: true }));
          advance(index);
        }
      } catch (err: any) {
        decided.current.delete(profile.user_id);
        const status = err?.response?.status;
        haptics.warning();
        // Every wall here is a paid limit, so every wall leads to the plans.
        if (status === 429 || status === 403 || status === 402) upsell();
      } finally {
        loadSide();
        setBusy(false);
      }
    },
    [busy, loadSide, upsell, advance]
  );

  const onSave = useCallback(
    async (profile: PublicProfile) => {
      if (busy) return;
      if (!isPremium) return upsell(); // Save to revisit is a Premium feature
      setBusy(true);
      haptics.light();
      await savedStore.add(profile);
      setSavedIds((prev) => ({ ...prev, [profile.user_id]: true }));
      setSavedCount(await savedStore.count());
      setBusy(false);
    },
    [busy, isPremium, upsell]
  );

  // ── Header ───────────────────────────────────────────────────────────────

  const allowance = quota && !quota.is_premium ? quota.likes_remaining : null;

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: c.border }]}>
      <View style={styles.discRow}>
        <Disc icon="options-outline" label="Who you are looking for" dot={!prefsSet} onPress={() => setPrefsOpen(true)} />
        <Disc icon="compass-outline" label="Events, guidance and stories" onPress={() => router.push('/explore')} />
        <Disc icon="bookmark-outline" label="Shortlist" badge={savedCount} onPress={() => router.push('/saved')} />
        <Disc icon="notifications-outline" label="Notifications" onPress={() => router.push('/notifications')} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
        {admirers > 0 ? (
          <PressableScale
            scaleTo={0.97}
            onPress={() => router.push('/likes')}
            accessibilityRole="button"
            style={[styles.pill, { backgroundColor: palette.gold }]}
          >
            <Ionicons name="diamond" size={13} color={palette.burgundyDeep} />
            <Text variant="footnote" color={palette.burgundyDeep}>
              {`${admirers} interested in you`}
            </Text>
          </PressableScale>
        ) : null}

        {allowance != null ? (
          <PressableScale
            scaleTo={0.97}
            onPress={() => router.push('/premium')}
            accessibilityRole="button"
            style={[styles.pill, { backgroundColor: c.accentFaint }]}
          >
            <Text variant="footnote" tone="accent">{`${allowance} left  ·  Go unlimited`}</Text>
          </PressableScale>
        ) : (
          <View style={[styles.pill, { backgroundColor: c.accentFaint }]}>
            <Ionicons name="infinite" size={14} color={c.accent} />
            <Text variant="footnote" tone="accent">Unlimited</Text>
          </View>
        )}

        <PressableScale
          scaleTo={0.97}
          onPress={onRewind}
          accessibilityRole="button"
          accessibilityLabel={isPremium ? 'Go back to the last person' : 'Going back is a Premium feature'}
          style={[styles.pill, { backgroundColor: c.accentFaint }]}
        >
          <Ionicons name="arrow-undo-outline" size={13} color={c.accent} />
          <Text variant="footnote" tone="accent">Go back</Text>
          {!isPremium ? <Ionicons name="lock-closed" size={11} color={c.accent} /> : null}
        </PressableScale>

        <PressableScale
          scaleTo={0.97}
          onPress={() => router.push('/boost')}
          accessibilityRole="button"
          accessibilityLabel="Boost your profile"
          style={[styles.pill, { backgroundColor: c.accentFaint }]}
        >
          <Ionicons name="flash" size={13} color={c.accent} />
          <Text variant="footnote" tone="accent">Boost</Text>
        </PressableScale>
      </ScrollView>
    </View>
  );

  // ── States ───────────────────────────────────────────────────────────────

  if (!loading && error && people.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: c.bg }]}>
        {header}
        <ErrorState
          message={error}
          onRetry={() => {
            setLoading(true);
            load().finally(() => setLoading(false));
          }}
        />
      </View>
    );
  }

  if (!loading && people.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: c.bg }]}>
        {header}
        <EmptyState
          icon="people-outline"
          title="No one to show yet"
          message="New members are matched to what you are looking for as they join."
          actionLabel="Refine who you are looking for"
          onAction={() => setPrefsOpen(true)}
        />
        <PreferencesSheet visible={prefsOpen} onClose={() => setPrefsOpen(false)} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      {header}

      <View
        style={styles.stage}
        onLayout={(e: LayoutChangeEvent) => {
          // Only react to a real change: a re-layout that nudges this by a
          // pixel would shift every page under the scroll position.
          const h = Math.round(e.nativeEvent.layout.height);
          setPageH((prev) => (Math.abs(prev - h) > 1 ? h : prev));
        }}
      >
        {backBlocked ? (
          <PressableScale
            scaleTo={0.98}
            onPress={() => router.push('/premium')}
            accessibilityRole="button"
            style={[styles.blocked, { backgroundColor: c.accent }]}
          >
            <Ionicons name="lock-closed" size={13} color={palette.cream} />
            <Text variant="footnote" color={palette.cream} style={{ flex: 1 }}>
              Going back is a Premium feature
            </Text>
            <Text variant="footnote" color={palette.cream}>See plans →</Text>
          </PressableScale>
        ) : null}

        {pageH > 0 && !loading ? (
          <Animated.FlatList
            ref={listRef}
            data={people}
            keyExtractor={(p) => (p as PublicProfile).user_id}
            pagingEnabled
            decelerationRate="fast"
            scrollEnabled={!anyExpanded}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            getItemLayout={(_, i) => ({ length: pageH, offset: pageH * i, index: i })}
            onEndReached={loadMore}
            onEndReachedThreshold={1.5}
            windowSize={5}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
            renderItem={({ item, index }) => {
              const profile = item as PublicProfile;
              return (
                <ReelPage
                  profile={profile}
                  mine={mine}
                  prefsSet={prefsSet}
                  height={pageH}
                  width={width}
                  index={index}
                  scrollY={scrollY}
                  first={index === 0}
                  outcome={interestIds[profile.user_id] ? 'interest' : 'pass'}
                  busy={busy}
                  canSave={isPremium}
                  saved={!!savedIds[profile.user_id]}
                  onInterest={() => onInterest(profile, index)}
                  onSave={() => onSave(profile)}
                  onRemoved={() => remove(profile.user_id)}
                  onExpandedChange={setAnyExpanded}
                />
              );
            }}
          />
        ) : null}
      </View>

      <PreferencesSheet
        visible={prefsOpen}
        onClose={() => {
          setPrefsOpen(false);
          profilesApi
            .getPreferences()
            .then((p) => setPrefsSet(Object.values(p ?? {}).some((v) => v != null)))
            .catch(() => {});
        }}
      />

      <InterestModal
        profile={matchedProfile}
        onClose={() => setMatchedProfile(null)}
        onMessage={() => {
          setMatchedProfile(null);
          router.push('/(app)/messages');
        }}
      />
    </View>
  );
}

function Disc({
  icon,
  label: name,
  badge,
  dot,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  badge?: number;
  dot?: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <PressableScale
      scaleTo={0.95}
      hitSlop={6}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={[styles.disc, { backgroundColor: c.accentFaint }]}
    >
      <Ionicons name={icon} size={17} color={c.accent} />
      {badge && badge > 0 ? (
        <View style={[styles.discBadge, { backgroundColor: c.accent, borderColor: c.bg }]}>
          <Text variant="label" color={palette.cream} style={styles.discBadgeText} maxFontSizeMultiplier={1}>
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      ) : dot ? (
        <View style={[styles.discDot, { backgroundColor: c.accent, borderColor: c.bg }]} />
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: { paddingBottom: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  discRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.lg },
  disc: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  discBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  discBadgeText: { fontSize: 9, letterSpacing: 0 },
  discDot: { position: 'absolute', top: -1, right: -1, width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },

  pillRow: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
  },

  stage: { flex: 1 },
  // Floats over the page. Never in flow: see the onLayout note above.
  blocked: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.lg,
  },
});
