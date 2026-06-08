import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { matchesApi } from '@/api/matches';
import { profilesApi } from '@/api/profiles';
import type { PublicProfile } from '@/api/types';
import { MatchModal } from '@/components/MatchModal';
import { SwipeDeck, type SwipeAction } from '@/components/SwipeDeck';
import { Wordmark } from '@/components/Wordmark';
import { useAuth } from '@/store/auth';
import { colors, fonts, palette, spacing } from '@/theme';

export default function Discover() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();

  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matched, setMatched] = useState<PublicProfile | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Gate: must have a profile before browsing.
      const mine = await profilesApi.getMine();
      if (!mine) {
        router.replace('/(app)/profile-setup');
        return;
      }
      const feed = await profilesApi.discover(1, 20);
      setProfiles(feed);
    } catch (err) {
      setError(errorMessage(err, 'Could not load your feed'));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh the feed when returning from the matches screen.
  useFocusEffect(
    useCallback(() => {
      return () => setNotice(null);
    }, [])
  );

  const onDecision = useCallback(async (profile: PublicProfile, action: SwipeAction) => {
    try {
      if (action === 'pass') {
        await matchesApi.pass(profile.user_id);
      } else {
        const res = await matchesApi.like(profile.user_id, action === 'superlike');
        if (res.is_matched) setMatched(res.matched_profile ?? profile);
      }
    } catch (err: any) {
      if (err?.response?.status === 429) {
        setNotice('Daily like limit reached on the free tier. Upgrade to keep going.');
      }
    }
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <Pressable onPress={signOut} hitSlop={10}>
          <Text style={styles.headerAction}>Sign out</Text>
        </Pressable>
        <Wordmark size={28} color={palette.burgundy} />
        <Pressable onPress={() => router.push('/(app)/matches')} hitSlop={10}>
          <Text style={[styles.headerAction, { color: palette.gold }]}>Matches</Text>
        </Pressable>
      </View>

      {notice ? (
        <Pressable onPress={() => setNotice(null)} style={styles.notice}>
          <Text style={styles.noticeText}>{notice}</Text>
        </Pressable>
      ) : null}

      <View style={[styles.body, { paddingBottom: insets.bottom + spacing.lg }]}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={palette.burgundy} size="large" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={load} style={styles.retry}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <SwipeDeck profiles={profiles} onDecision={onDecision} />
        )}
      </View>

      <MatchModal profile={matched} onClose={() => setMatched(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerAction: { fontFamily: fonts.bodyMedium, fontSize: 14, color: palette.muted },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: {
    fontFamily: fonts.body,
    color: palette.muted,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  retry: {
    backgroundColor: palette.burgundy,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  retryText: { fontFamily: fonts.bodySemibold, color: palette.cream },
  notice: {
    backgroundColor: palette.sand,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
  },
  noticeText: { fontFamily: fonts.bodyMedium, color: palette.ink, textAlign: 'center', fontSize: 13 },
});
