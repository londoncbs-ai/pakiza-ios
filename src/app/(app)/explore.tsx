import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { eventsApi } from '@/api/events';
import { newsApi } from '@/api/news';
import type { ArticleItem, EventItem } from '@/api/types';
import { ErrorState } from '@/components/ErrorState';
import { Screen } from '@/components/Screen';
import { SkeletonList } from '@/components/Skeleton';
import { Surface } from '@/components/Surface';
import { Text } from '@/components/Text';
import { haptics } from '@/lib/haptics';
import { palette, radii, shadow, spacing, tint, useTheme } from '@/theme';

const NEWS_LABELS: Record<ArticleItem['category'], string> = {
  advice: 'Advice',
  success_story: 'Success story',
  faith: 'Faith',
  guide: 'Guide',
  announcement: 'News',
};

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
}

export default function ExploreTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c, isDark } = useTheme();

  const [featured, setFeatured] = useState<ArticleItem | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    // A failure of any single source should not blank the whole hub, so each
    // call is settled on its own. We only surface a full error state when every
    // source fails (the network is plainly down).
    const results = await Promise.allSettled([
      newsApi.list(undefined, true),
      eventsApi.list(),
      newsApi.list(),
    ]);

    const [featuredRes, eventsRes, articlesRes] = results;

    if (featuredRes.status === 'fulfilled') {
      setFeatured(featuredRes.value[0] ?? null);
    }
    if (eventsRes.status === 'fulfilled') {
      setEvents(eventsRes.value.slice(0, 6));
    }
    if (articlesRes.status === 'fulfilled') {
      setArticles(articlesRes.value.slice(0, 5));
    }

    if (results.every((r) => r.status === 'rejected')) {
      const firstReason = (results[0] as PromiseRejectedResult).reason;
      setError(errorMessage(firstReason));
    } else {
      setError(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          await load();
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    load().finally(() => setLoading(false));
  }, [load]);

  const openArticle = (id: string) => {
    haptics.selection();
    router.push({ pathname: '/article/[id]', params: { id } });
  };
  const openEvent = (id: string) => {
    haptics.selection();
    router.push({ pathname: '/event/[id]', params: { id } });
  };

  if (loading) {
    return (
      <Screen>
        <View style={{ paddingTop: insets.top + spacing.md }}>
          <View style={styles.headerPad}>
            <Text variant="title" tone="accent">Explore</Text>
            <Text variant="callout" tone="muted" style={{ marginTop: 2 }}>
              Events, guidance and stories for your journey
            </Text>
          </View>
          <SkeletonList count={4} />
        </View>
      </Screen>
    );
  }

  if (error && !featured && events.length === 0 && articles.length === 0) {
    return (
      <Screen>
        <View style={[styles.headerPad, { paddingTop: insets.top + spacing.md }]}>
          <Text variant="title" tone="accent">Explore</Text>
        </View>
        <ErrorState message={error} onRetry={retry} />
      </Screen>
    );
  }

  const hasUpcoming = events.length > 0;
  const hasStories = articles.length > 0;

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
      >
        {/* Header */}
        <View style={styles.headerPad}>
          <Text variant="title" tone="accent">Explore</Text>
          <Text variant="callout" tone="muted" style={{ marginTop: 2 }}>
            Events, guidance and stories for your journey
          </Text>
        </View>

        {/* Featured hero */}
        {featured ? (
          <Pressable
            onPress={() => openArticle(featured.id)}
            style={[styles.heroWrap, !isDark && shadow.soft]}
          >
            <View style={[styles.hero, { backgroundColor: c.surfaceAlt }]}>
              {featured.cover_image_url ? (
                <Image
                  source={{ uri: featured.cover_image_url }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={180}
                />
              ) : null}
              <LinearGradient
                colors={tint.scrim}
                locations={[0, 0.55, 1]}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <View style={styles.heroContent} pointerEvents="none">
                <View style={[styles.pill, { backgroundColor: palette.burgundy }]}>
                  <Text variant="label" color={palette.cream}>{NEWS_LABELS[featured.category]}</Text>
                </View>
                <Text variant="heading" color={palette.cream} numberOfLines={3} style={styles.heroTitle}>
                  {featured.title}
                </Text>
              </View>
            </View>
          </Pressable>
        ) : null}

        {/* Upcoming events */}
        {hasUpcoming ? (
          <View style={styles.section}>
            <SectionHeader title="Upcoming events" onSeeAll={() => router.push('/events')} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hScroll}
            >
              {events.map((ev) => {
                const place = ev.is_online
                  ? 'Online'
                  : [ev.location_name, ev.city].filter(Boolean).join(', ') || 'In person';
                const footnote = [place, ev.price_label].filter(Boolean).join(' · ');
                return (
                  <Pressable key={ev.id} onPress={() => openEvent(ev.id)} style={styles.eventCardWrap}>
                    <Surface elevated style={styles.eventCard}>
                      <View style={[styles.eventCover, { backgroundColor: c.surfaceAlt }]}>
                        {ev.cover_image_url ? (
                          <Image
                            source={{ uri: ev.cover_image_url }}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                            transition={180}
                          />
                        ) : (
                          <View style={styles.coverFallback}>
                            <Ionicons name="calendar-outline" size={28} color={c.textSubtle} />
                          </View>
                        )}
                      </View>
                      <View style={styles.eventBody}>
                        <Text variant="subhead" tone="default" numberOfLines={2}>{ev.title}</Text>
                        <View style={styles.metaRow}>
                          <Ionicons name="calendar-outline" size={14} color={c.accent} />
                          <Text variant="footnote" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
                            {formatEventDate(ev.starts_at)}
                          </Text>
                        </View>
                        {footnote ? (
                          <Text variant="footnote" tone="subtle" numberOfLines={1}>{footnote}</Text>
                        ) : null}
                      </View>
                    </Surface>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* Stories & advice */}
        {hasStories ? (
          <View style={styles.section}>
            <SectionHeader title="Stories & advice" onSeeAll={() => router.push('/news')} />
            <View style={styles.storyList}>
              {articles.map((a) => (
                <Pressable key={a.id} onPress={() => openArticle(a.id)}>
                  <Surface elevated style={styles.storyRow}>
                    <View style={[styles.thumb, { backgroundColor: c.surfaceAlt }]}>
                      {a.cover_image_url ? (
                        <Image
                          source={{ uri: a.cover_image_url }}
                          style={StyleSheet.absoluteFill}
                          contentFit="cover"
                          transition={180}
                        />
                      ) : (
                        <View style={styles.coverFallback}>
                          <Ionicons name="document-text-outline" size={22} color={c.textSubtle} />
                        </View>
                      )}
                    </View>
                    <View style={styles.storyBody}>
                      <Text variant="footnote" tone="accent">{NEWS_LABELS[a.category]}</Text>
                      <Text variant="subhead" tone="default" numberOfLines={2} style={{ marginTop: 2 }}>
                        {a.title}
                      </Text>
                      <Text variant="footnote" tone="muted" numberOfLines={1} style={{ marginTop: 4 }}>
                        {a.author_name} · {a.read_minutes} min read
                      </Text>
                    </View>
                  </Surface>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {!hasUpcoming && !hasStories && !featured ? (
          <View style={styles.section}>
            <Text variant="callout" tone="muted" center>
              Nothing to explore just yet. Pull down to refresh.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll: () => void }) {
  const { c } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text variant="heading" tone="default">{title}</Text>
      <Pressable onPress={() => { haptics.selection(); onSeeAll(); }} hitSlop={8} style={styles.seeAll}>
        <Text variant="footnote" tone="accent">See all</Text>
        <Ionicons name="chevron-forward" size={14} color={c.accent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  headerPad: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  heroWrap: {
    marginHorizontal: spacing.lg,
    borderRadius: radii.card,
  },
  hero: {
    height: 200,
    borderRadius: radii.card,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroContent: { padding: spacing.lg },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    marginBottom: spacing.sm,
  },
  heroTitle: { lineHeight: 26 },
  section: { marginTop: spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  hScroll: { paddingHorizontal: spacing.lg, gap: spacing.md },
  eventCardWrap: { width: 260 },
  eventCard: { borderRadius: radii.lg, overflow: 'hidden', padding: 0 },
  eventCover: { height: 140, width: '100%' },
  coverFallback: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  eventBody: { padding: spacing.md, gap: spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  storyList: { paddingHorizontal: spacing.lg, gap: spacing.md },
  storyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radii.lg },
  thumb: { width: 72, height: 72, borderRadius: radii.md, overflow: 'hidden' },
  storyBody: { flex: 1 },
});
