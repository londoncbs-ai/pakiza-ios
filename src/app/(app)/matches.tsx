import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { matchesApi } from '@/api/matches';
import type { MatchSummary } from '@/api/types';
import { fonts, palette, shadow, spacing } from '@/theme';

export default function Matches() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMatches(await matchesApi.list());
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.back}>‹  Discover</Text>
        </Pressable>
        <Text style={styles.title}>Matches</Text>
        <View style={{ width: 70 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={palette.burgundy} size="large" style={{ marginTop: 60 }} />
      ) : error ? (
        <Text style={styles.empty}>{error}</Text>
      ) : matches.length === 0 ? (
        <Text style={styles.empty}>
          No matches yet. Keep exploring — when you and someone both say yes, they’ll appear here.
        </Text>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
          renderItem={({ item }) => {
            const photo =
              item.profile.photos?.find((p) => p.is_primary)?.cdn_url ?? item.profile.photos?.[0]?.cdn_url;
            return (
              <View style={styles.card}>
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
              </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  back: { fontFamily: fonts.bodyMedium, color: palette.muted, fontSize: 15, width: 90 },
  title: { fontFamily: fonts.display, fontSize: 30, color: palette.burgundy },
  empty: {
    fontFamily: fonts.body,
    color: palette.muted,
    textAlign: 'center',
    marginTop: 70,
    paddingHorizontal: spacing.xxl,
    lineHeight: 22,
  },
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
