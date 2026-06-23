import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { matchesApi } from '@/api/matches';
import type { PublicProfile } from '@/api/types';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ProfileDetail } from '@/components/ProfileDetail';
import { SkeletonList } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { primaryPhotoUrl } from '@/lib/photos';
import { fonts, palette, radii, shadow, spacing, tint, useTheme } from '@/theme';

export default function LikesYou() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c, isDark } = useTheme();
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locked, setLocked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [opened, setOpened] = useState<PublicProfile | null>(null);

  const load = useCallback(async () => {
    matchesApi.likesCount().then(setLikeCount).catch(() => {});
    try {
      setProfiles(await matchesApi.likesReceived());
      setLocked(false);
    } catch (err: any) {
      if (err?.response?.status === 402) setLocked(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const decide = async (p: PublicProfile, action: 'like' | 'pass') => {
    setOpened(null);
    setProfiles((prev) => prev.filter((x) => x.user_id !== p.user_id));
    try {
      if (action === 'pass') await matchesApi.pass(p.user_id);
      else {
        const res = await matchesApi.like(p.user_id);
        if (res.is_matched) Alert.alert("It's a match!", `You and ${p.display_name} matched.`);
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ width: 30 }}>
          <Ionicons name="chevron-back" size={26} color={c.accent} />
        </Pressable>
        <Text variant="heading" tone="accent">Likes You</Text>
        <View style={{ width: 30 }} />
      </View>

      {loading ? (
        <SkeletonList count={4} />
      ) : locked ? (
        <View style={styles.lock}>
          <View style={[styles.lockIcon, { backgroundColor: c.accentFaint }]}>
            <Ionicons name="lock-closed" size={40} color={c.accent} />
          </View>
          <Text variant="title" tone="accent" center style={styles.lockTitle}>
            {likeCount > 0
              ? `${likeCount} ${likeCount === 1 ? 'person likes' : 'people like'} you`
              : 'See who already likes you'}
          </Text>
          <Text variant="body" tone="muted" center style={styles.lockBody}>
            {likeCount > 0
              ? 'Upgrade to Gold to see them and match instantly, without waiting to find each other in Discover.'
              : 'When someone likes you, upgrade to Gold to see them and match instantly.'}
          </Text>
          <Button label="Upgrade to Gold" variant="primary" onPress={() => router.push('/premium')} style={{ marginTop: spacing.lg }} />
        </View>
      ) : profiles.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="No new likes right now"
          message="Keep your profile fresh and check back soon. New interest will appear here."
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.grid}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
        >
          {profiles.map((p) => {
            const photo = primaryPhotoUrl(p);
            return (
              <Pressable key={p.user_id} style={[styles.card, !isDark && shadow.soft]} onPress={() => setOpened(p)}>
                {photo ? (
                  <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <View style={[StyleSheet.absoluteFill, styles.ph]}>
                    <Text style={styles.phText} color={palette.cream}>{p.display_name[0]}</Text>
                  </View>
                )}
                <View style={styles.cardOverlay}>
                  <Text variant="subhead" color={palette.cream} style={styles.cardName} numberOfLines={1}>
                    {p.display_name}{p.age ? `, ${p.age}` : ''}
                  </Text>
                  {p.city ? (
                    <Text variant="footnote" color={tint.onDarkSoft} numberOfLines={1}>{p.city}</Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={!!opened} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpened(null)}>
        {opened ? (
          <ProfileDetail
            profile={opened}
            onClose={() => setOpened(null)}
            onLike={() => decide(opened, 'like')}
            onPass={() => decide(opened, 'pass')}
          />
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  lock: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl },
  lockIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  lockTitle: { fontFamily: fonts.display },
  lockBody: { lineHeight: 22, marginTop: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.md, gap: spacing.md },
  card: { width: '47%', aspectRatio: 0.8, borderRadius: radii.card, overflow: 'hidden', backgroundColor: palette.burgundyDark },
  ph: { backgroundColor: palette.burgundy, alignItems: 'center', justifyContent: 'center' },
  phText: { fontFamily: fonts.display, fontSize: 64 },
  cardOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.md, backgroundColor: tint.overlayStrong },
  cardName: { fontFamily: fonts.displaySemibold },
});
