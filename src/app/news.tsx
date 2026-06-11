import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { newsApi } from '@/api/news';
import type { ArticleCategory, ArticleItem } from '@/api/types';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PressableScale } from '@/components/PressableScale';
import { Screen } from '@/components/Screen';
import { SkeletonList } from '@/components/Skeleton';
import { Surface } from '@/components/Surface';
import { Text } from '@/components/Text';
import { palette, radii, shadow, spacing, useTheme } from '@/theme';

/** Title-case display labels for article categories (no gold). */
const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  advice: 'Advice',
  success_story: 'Success story',
  faith: 'Faith',
  guide: 'Guide',
  announcement: 'News',
};

const CATEGORIES: ArticleCategory[] = ['advice', 'success_story', 'faith', 'guide', 'announcement'];

/** A filter value of null means "All". */
type Filter = ArticleCategory | null;

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function News() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c, isDark } = useTheme();

  const [filter, setFilter] = useState<Filter>(null);
  const [items, setItems] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (category: Filter, mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await newsApi.list(category ?? undefined);
        setItems(data);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  const selectFilter = useCallback((next: Filter) => {
    setFilter(next);
  }, []);

  const openArticle = useCallback(
    (id: string) => {
      router.push({ pathname: '/article/[id]', params: { id } });
    },
    [router]
  );

  const renderCard = useCallback(
    ({ item }: { item: ArticleItem }) => {
      const meta = [item.author_name, `${item.read_minutes} min read`, shortDate(item.published_at)]
        .filter(Boolean)
        .join(' · ');
      return (
        <PressableScale onPress={() => openArticle(item.id)} haptic={false} style={styles.cardWrap}>
          <Surface elevated style={!isDark ? [styles.card, shadow.soft] : styles.card}>
            {item.cover_image_url ? (
              <Image source={{ uri: item.cover_image_url }} style={styles.cover} contentFit="cover" transition={180} />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder, { backgroundColor: c.accentFaint }]}>
                <Ionicons name="newspaper-outline" size={30} color={c.accent} />
              </View>
            )}
            <View style={styles.cardBody}>
              <Text variant="footnote" tone="accent" style={styles.cat}>
                {CATEGORY_LABELS[item.category]}
              </Text>
              <Text variant="subhead" tone="default" numberOfLines={2} style={styles.title}>
                {item.title}
              </Text>
              {item.excerpt ? (
                <Text variant="callout" tone="muted" numberOfLines={2} style={styles.excerpt}>
                  {item.excerpt}
                </Text>
              ) : null}
              <Text variant="footnote" tone="subtle" numberOfLines={1}>
                {meta}
              </Text>
            </View>
          </Surface>
        </PressableScale>
      );
    },
    [openArticle, isDark, c.accent, c.accentFaint]
  );

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={c.accent} />
        </Pressable>
        <Text variant="heading" tone="accent">
          News & Stories
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        style={styles.chipsScroll}
      >
        <FilterChip label="All" active={filter === null} onPress={() => selectFilter(null)} />
        {CATEGORIES.map((cat) => (
          <FilterChip
            key={cat}
            label={CATEGORY_LABELS[cat]}
            active={filter === cat}
            onPress={() => selectFilter(cat)}
          />
        ))}
      </ScrollView>

      {loading ? (
        <SkeletonList count={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load(filter)} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="newspaper-outline"
          title="Nothing here yet"
          message="There are no stories in this category right now. Check back soon for new advice, guides and success stories."
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(a) => a.id}
          renderItem={renderCard}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing.xl }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(filter, 'refresh')}
              tintColor={c.accent}
              colors={[c.accent]}
            />
          }
        />
      )}
    </Screen>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: active ? palette.burgundy : c.surfaceAlt, borderColor: active ? palette.burgundy : c.border },
      ]}
    >
      <Text variant="footnote" color={active ? palette.cream : c.text}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  backBtn: { width: 30 },
  chipsScroll: { flexGrow: 0 },
  chipsRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  cardWrap: { marginBottom: spacing.lg },
  card: {
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
  },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: spacing.lg },
  cat: { textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: spacing.xs },
  title: { marginBottom: spacing.xs },
  excerpt: { marginBottom: spacing.md, lineHeight: 21 },
});
