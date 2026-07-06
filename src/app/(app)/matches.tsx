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
import { FeatureHint } from '@/components/FeatureHint';
import { ProfileBadges } from '@/components/PlanBadge';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonList } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { haptics } from '@/lib/haptics';
import { primaryPhotoUrl } from '@/lib/photos';
import { fonts, palette, radii, shadow, spacing, useTheme } from '@/theme';

export default function Matches() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c, isDark } = useTheme();
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
        <Text variant="title" tone="accent">Matches</Text>
        <Text variant="footnote" tone="muted">People you’ve both said yes to</Text>
      </View>

      <Pressable
        style={[styles.likesBanner, { backgroundColor: c.surface, borderColor: c.border }, !isDark && shadow.soft]}
        onPress={() => router.push('/likes')}
      >
        <View style={[styles.likesIcon, { backgroundColor: c.accentFaint }]}>
          <Ionicons name="heart" size={20} color={c.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="callout" tone="default" style={styles.likesTitle}>See who likes you</Text>
          <Text variant="footnote" tone="muted">Skip ahead to people already interested</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={c.textSubtle} />
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
          ListHeaderComponent={
            <FeatureHint
              hintKey="matches-book-meet"
              icon="calendar"
              text="New: book a supervised meet with your match, with a wali present."
              style={styles.hintBanner}
            />
          }
          renderItem={({ item }) => {
            const photo = primaryPhotoUrl(item.profile);
            const canBook = !!item.conversation_id;
            const openChat = () => {
              if (item.conversation_id) {
                router.push({
                  pathname: '/chat/[id]',
                  params: { id: item.conversation_id, name: item.profile.display_name },
                });
              }
            };
            const bookMeet = () => {
              if (!canBook) return;
              haptics.selection();
              router.push({
                pathname: '/book-meet',
                params: {
                  conversationId: item.conversation_id!,
                  matchId: item.id,
                  name: item.profile.display_name,
                },
              });
            };
            return (
              <Pressable
                style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, !isDark && shadow.soft]}
                onPress={openChat}
              >
                <View style={styles.avatarWrap}>
                  {photo ? (
                    <Image source={{ uri: photo }} style={styles.avatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: c.surfaceAlt }]}>
                      <Text style={styles.avatarInitial} tone="accent">{item.profile.display_name[0]}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardBody}>
                  <Text variant="subhead" tone="default" style={styles.cardName}>
                    {item.profile.display_name}
                    {item.profile.age ? `, ${item.profile.age}` : ''}
                  </Text>
                  <ProfileBadges profile={item.profile} style={styles.cardBadges} />
                  <Text variant="footnote" tone="muted" style={styles.cardMeta} numberOfLines={1}>
                    {[item.profile.city, item.profile.occupation].filter(Boolean).join('  ·  ') || 'New match'}
                  </Text>
                  <Text variant="footnote" tone="accent" style={styles.hello}>Say hello →</Text>
                </View>
                <PressableScale
                  onPress={bookMeet}
                  disabled={!canBook}
                  accessibilityRole="button"
                  accessibilityLabel="Book a meet"
                  style={[
                    styles.bookBtn,
                    { backgroundColor: c.accentFaint, borderColor: c.border, opacity: canBook ? 1 : 0.4 },
                  ]}
                >
                  <Ionicons name="calendar" size={18} color={c.accent} />
                  <Text variant="label" tone="accent">Meet</Text>
                </PressableScale>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  likesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  likesIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likesTitle: { fontFamily: fonts.bodySemibold },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  avatarWrap: { width: 60, height: 60 },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  cardBadges: { marginTop: 4 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: fonts.display, fontSize: 26 },
  cardBody: { flex: 1, marginLeft: spacing.md },
  cardName: { fontFamily: fonts.displaySemibold },
  cardMeta: { marginTop: 2 },
  hello: { fontFamily: fonts.bodyMedium, marginTop: spacing.xs },
  hintBanner: { marginBottom: spacing.md },
  bookBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginLeft: spacing.sm,
  },
});
