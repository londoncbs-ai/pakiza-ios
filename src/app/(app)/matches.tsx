import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { matchesApi } from '@/api/matches';
import type { MatchSummary } from '@/api/types';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { SkeletonList } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { fonts, palette, shadow, spacing, useTheme } from '@/theme';

export default function Matches() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c } = useTheme();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setMatches(await matchesApi.list());
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  // Refresh whenever the tab gains focus (e.g. after a new match in Discover).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <Text variant="title" tone="burgundy">Matches</Text>
        <Text variant="footnote" tone="muted">People you’ve both said yes to</Text>
      </View>

      <Pressable style={[styles.likesBanner, { backgroundColor: c.surface, borderColor: palette.gold }]} onPress={() => router.push('/likes')}>
        <Ionicons name="heart-circle" size={26} color={palette.gold} />
        <View style={{ flex: 1 }}>
          <Text style={styles.likesTitle}>See who likes you</Text>
          <Text style={styles.likesSub}>Skip ahead to people already interested</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={palette.muted} />
      </Pressable>

      {loading ? (
        <SkeletonList />
      ) : error ? (
        <ErrorState message={error} onRetry={onRefresh} />
      ) : matches.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No matches yet"
          message="When you and someone both express interest, they’ll appear here to begin a conversation."
        />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(m) => m.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.burgundy} />}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
          renderItem={({ item }) => {
            const photo =
              item.profile.photos?.find((p) => p.is_primary)?.cdn_url ?? item.profile.photos?.[0]?.cdn_url;
            const openChat = () => {
              if (item.conversation_id) {
                router.push({
                  pathname: '/chat/[id]',
                  params: { id: item.conversation_id, name: item.profile.display_name },
                });
              }
            };
            return (
              <Pressable style={[styles.card, { backgroundColor: c.surface }]} onPress={openChat}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarInitial}>{item.profile.display_name[0]}</Text>
                  </View>
                )}
                <View style={styles.cardBody}>
                  <Text style={styles.cardName}>
                    {item.profile.display_name}
                    {item.profile.age ? `, ${item.profile.age}` : ''}
                  </Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {[item.profile.city, item.profile.occupation].filter(Boolean).join('  ·  ') || 'New match'}
                  </Text>
                </View>
                <Text style={styles.hello}>Say hello →</Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.cream },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  likesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(199,159,94,0.5)',
  },
  likesTitle: { fontFamily: fonts.bodySemibold, fontSize: 15, color: palette.ink },
  likesSub: { fontFamily: fonts.body, fontSize: 12.5, color: palette.muted, marginTop: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.soft,
  },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarPlaceholder: { backgroundColor: palette.sand, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: fonts.display, fontSize: 26, color: palette.burgundy },
  cardBody: { flex: 1, marginLeft: spacing.md },
  cardName: { fontFamily: fonts.displaySemibold, fontSize: 20, color: palette.ink },
  cardMeta: { fontFamily: fonts.body, fontSize: 13.5, color: palette.muted, marginTop: 2 },
  hello: { fontFamily: fonts.bodyMedium, fontSize: 13, color: palette.gold },
});
