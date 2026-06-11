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
import { fonts, palette, radii, shadow, spacing, tint } from '@/theme';

export default function LikesYou() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locked, setLocked] = useState(false);
  const [opened, setOpened] = useState<PublicProfile | null>(null);

  const load = useCallback(async () => {
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
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ width: 30 }}>
          <Ionicons name="chevron-back" size={26} color={palette.burgundy} />
        </Pressable>
        <Text variant="heading" tone="burgundy">Likes You</Text>
        <View style={{ width: 30 }} />
      </View>

      {loading ? (
        <SkeletonList count={4} />
      ) : locked ? (
        <View style={styles.lock}>
          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed" size={40} color={palette.gold} />
          </View>
          <Text style={styles.lockTitle}>See who already likes you</Text>
          <Text style={styles.lockBody}>
            People have shown interest in your profile. Upgrade to Gold to see them and match instantly.
          </Text>
          <Button label="Upgrade to Gold" variant="secondary" onPress={() => router.push('/premium')} style={{ marginTop: spacing.lg }} />
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.burgundy} />}
        >
          {profiles.map((p) => {
            const photo = p.photos?.find((x) => x.is_primary)?.cdn_url ?? p.photos?.[0]?.cdn_url;
            return (
              <Pressable key={p.user_id} style={styles.card} onPress={() => setOpened(p)}>
                {photo ? (
                  <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <View style={[StyleSheet.absoluteFill, styles.ph]}><Text style={styles.phText}>{p.display_name[0]}</Text></View>
                )}
                <View style={styles.cardOverlay}>
                  <Text style={styles.cardName} numberOfLines={1}>
                    {p.display_name}{p.age ? `, ${p.age}` : ''}
                  </Text>
                  {p.city ? <Text style={styles.cardCity} numberOfLines={1}>{p.city}</Text> : null}
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
  root: { flex: 1, backgroundColor: palette.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  lock: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl },
  lockIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: tint.goldFaint, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  lockTitle: { fontFamily: fonts.display, fontSize: 28, color: palette.burgundy, textAlign: 'center' },
  lockBody: { fontFamily: fonts.body, fontSize: 15, color: palette.muted, textAlign: 'center', lineHeight: 22, marginTop: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.md, gap: spacing.md },
  card: { width: '47%', aspectRatio: 0.8, borderRadius: radii.card, overflow: 'hidden', backgroundColor: palette.burgundyDark, ...shadow.soft },
  ph: { backgroundColor: palette.burgundy, alignItems: 'center', justifyContent: 'center' },
  phText: { fontFamily: fonts.display, fontSize: 64, color: palette.goldSoft },
  cardOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.md, backgroundColor: tint.overlayStrong },
  cardName: { fontFamily: fonts.displaySemibold, fontSize: 18, color: palette.cream },
  cardCity: { fontFamily: fonts.body, fontSize: 12.5, color: tint.onDarkSoft },
});
