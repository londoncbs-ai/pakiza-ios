import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { matchesApi } from '@/api/matches';
import { profilesApi } from '@/api/profiles';
import type { PublicProfile, Quota } from '@/api/types';
import { ErrorState } from '@/components/ErrorState';
import { MatchModal } from '@/components/MatchModal';
import { ProfileDetail } from '@/components/ProfileDetail';
import { SkeletonCard } from '@/components/Skeleton';
import { SwipeDeck, type SwipeAction, type SwipeDeckHandle } from '@/components/SwipeDeck';
import { Text } from '@/components/Text';
import { Wordmark } from '@/components/Wordmark';
import { fonts, palette, spacing } from '@/theme';

export default function Discover() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matched, setMatched] = useState<PublicProfile | null>(null);
  const [opened, setOpened] = useState<PublicProfile | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const deckRef = useRef<SwipeDeckHandle>(null);

  const loadQuota = useCallback(async () => {
    setQuota(await matchesApi.quota().catch(() => null));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const mine = await profilesApi.getMine();
      if (!mine) {
        router.replace('/(onboarding)/profile-setup');
        return;
      }
      setProfiles(await profilesApi.discover(1, 20));
    } catch (err) {
      setError(errorMessage(err, 'Could not load your feed'));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
    loadQuota();
  }, [load, loadQuota]);

  const onRewind = useCallback(async () => {
    try {
      const profile = await matchesApi.rewind();
      deckRef.current?.rewind(profile);
    } catch (err: any) {
      if (err?.response?.status === 402) router.push('/premium');
      else if (err?.response?.status === 404) Alert.alert('Nothing to rewind', 'Swipe on someone first.');
    }
  }, [router]);

  const onBoost = useCallback(async () => {
    try {
      await matchesApi.boost();
      Alert.alert('You are boosted', 'Your profile is shown first for the next 30 minutes.');
      load();
    } catch (err: any) {
      if (err?.response?.status === 402) router.push('/premium');
    }
  }, [load, router]);

  const onDecision = useCallback(async (profile: PublicProfile, action: SwipeAction) => {
    try {
      if (action === 'pass') {
        await matchesApi.pass(profile.user_id);
      } else {
        const res = await matchesApi.like(profile.user_id, action === 'superlike');
        if (res.is_matched) setMatched(res.matched_profile ?? profile);
      }
    } catch (err: any) {
      const sc = err?.response?.status;
      if (sc === 429 || sc === 403) {
        setNotice(err?.response?.data?.detail ?? 'You have reached your limit for now.');
      }
    } finally {
      loadQuota();
    }
  }, [loadQuota]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <Wordmark size={30} color={palette.burgundy} />
        <Text variant="footnote" tone="muted" style={styles.tagline}>where love finds purpose</Text>

        {quota && !quota.is_premium ? (
          <View style={styles.quotaRow}>
            <View style={styles.quotaPill}>
              <Ionicons name="heart" size={12} color={palette.burgundy} />
              <Text style={styles.quotaText}>{quota.likes_remaining ?? 0} likes left</Text>
            </View>
            <Pressable
              style={styles.quotaPill}
              onPress={() => router.push('/(app)/matches')}
            >
              <Ionicons name="people" size={12} color={palette.burgundy} />
              <Text style={styles.quotaText}>{quota.active_matches}/{quota.match_limit} matches</Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable onPress={() => router.push('/notifications')} hitSlop={10} style={styles.bell}>
          <Ionicons name="notifications-outline" size={24} color={palette.burgundy} />
        </Pressable>
      </View>

      {notice ? (
        <Pressable onPress={() => { setNotice(null); router.push('/premium'); }} style={styles.notice}>
          <Text style={styles.noticeText}>{notice}  Tap to upgrade.</Text>
        </Pressable>
      ) : null}

      <View style={[styles.body, { paddingBottom: spacing.md }]}>
        {loading ? (
          <SkeletonCard />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <SwipeDeck ref={deckRef} profiles={profiles} onDecision={onDecision} onOpen={setOpened} onBoost={onBoost} onRewind={onRewind} />
        )}
      </View>

      <Modal visible={!!opened} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpened(null)}>
        {opened ? <ProfileDetail profile={opened} onClose={() => setOpened(null)} /> : null}
      </Modal>

      <MatchModal
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
  tagline: { fontFamily: fonts.body, fontSize: 12, color: palette.muted, letterSpacing: 1, marginTop: -2 },
  bell: { position: 'absolute', right: spacing.lg, top: 0 },
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
  quotaText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: palette.ink },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  notice: { backgroundColor: palette.sand, marginHorizontal: spacing.lg, padding: spacing.md, borderRadius: 12 },
  noticeText: { fontFamily: fonts.bodyMedium, color: palette.ink, textAlign: 'center', fontSize: 13 },
});
