import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { matchesApi } from '@/api/matches';
import { profilesApi } from '@/api/profiles';
import type { PublicProfile } from '@/api/types';
import { MatchModal } from '@/components/MatchModal';
import { ProfileDetail } from '@/components/ProfileDetail';
import { SwipeDeck, type SwipeAction } from '@/components/SwipeDeck';
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
  }, [load]);

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
        <Wordmark size={30} color={palette.burgundy} />
        <Text style={styles.tagline}>where love finds purpose</Text>
      </View>

      {notice ? (
        <Pressable onPress={() => setNotice(null)} style={styles.notice}>
          <Text style={styles.noticeText}>{notice}</Text>
        </Pressable>
      ) : null}

      <View style={[styles.body, { paddingBottom: spacing.md }]}>
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
          <SwipeDeck profiles={profiles} onDecision={onDecision} onOpen={setOpened} />
        )}
      </View>

      <Modal visible={!!opened} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpened(null)}>
        {opened ? <ProfileDetail profile={opened} onClose={() => setOpened(null)} /> : null}
      </Modal>

      <MatchModal profile={matched} onClose={() => setMatched(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.cream },
  header: { alignItems: 'center', paddingBottom: spacing.sm },
  tagline: { fontFamily: fonts.body, fontSize: 12, color: palette.muted, letterSpacing: 1, marginTop: -2 },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: {
    fontFamily: fonts.body,
    color: palette.muted,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  retry: { backgroundColor: palette.burgundy, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 },
  retryText: { fontFamily: fonts.bodySemibold, color: palette.cream },
  notice: { backgroundColor: palette.sand, marginHorizontal: spacing.lg, padding: spacing.md, borderRadius: 12 },
  noticeText: { fontFamily: fonts.bodyMedium, color: palette.ink, textAlign: 'center', fontSize: 13 },
});
