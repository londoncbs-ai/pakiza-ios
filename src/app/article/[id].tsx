import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { errorMessage } from '@/api/client';
import { newsApi } from '@/api/news';
import type { Article, ArticleCategory } from '@/api/types';
import { ErrorState } from '@/components/ErrorState';
import { Screen } from '@/components/Screen';
import { Skeleton } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { palette, radii, spacing, tint, useTheme } from '@/theme';

const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  advice: 'Advice',
  success_story: 'Success story',
  faith: 'Faith',
  guide: 'Guide',
  announcement: 'News',
};

const HERO_HEIGHT = 240;

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await newsApi.get(id);
      setArticle(data);
    } catch (err) {
      setError(errorMessage(err, 'We could not load this article.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const BackChevron = (
    <Pressable
      onPress={() => router.back()}
      hitSlop={12}
      style={[styles.back, { top: insets.top + spacing.sm }]}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Ionicons name="chevron-back" size={22} color={palette.cream} />
    </Pressable>
  );

  if (loading) {
    return (
      <Screen>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
          <View style={[styles.hero, { backgroundColor: c.surfaceAlt }]}>
            <Skeleton width="100%" height={HERO_HEIGHT} radius={0} />
            {BackChevron}
          </View>
          <View style={styles.column}>
            <Skeleton width={90} height={13} style={{ marginTop: spacing.xl, marginBottom: spacing.md }} />
            <Skeleton width="85%" height={30} radius={radii.sm} style={{ marginBottom: spacing.sm }} />
            <Skeleton width="60%" height={30} radius={radii.sm} style={{ marginBottom: spacing.lg }} />
            <Skeleton width="50%" height={13} style={{ marginBottom: spacing.xl }} />
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} width={i % 3 === 2 ? '70%' : '100%'} height={14} style={{ marginBottom: spacing.md }} />
            ))}
          </View>
        </ScrollView>
      </Screen>
    );
  }

  if (error || !article) {
    return (
      <Screen>
        <View style={{ paddingTop: insets.top + spacing.sm }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={[styles.backInline, { backgroundColor: c.surfaceAlt }]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color={c.text} />
          </Pressable>
        </View>
        <ErrorState message={error ?? 'This article is no longer available.'} onRetry={load} />
      </Screen>
    );
  }

  const paragraphs = article.body.split('\n\n').map((p) => p.trim()).filter(Boolean);
  const byline = `By ${article.author_name} · ${shortDate(article.published_at)} · ${article.read_minutes} min read`;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
        {/* Cover hero */}
        <View style={[styles.hero, { backgroundColor: c.surfaceAlt }]}>
          {article.cover_image_url ? (
            <Image
              source={{ uri: article.cover_image_url }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={180}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.heroPlaceholder]}>
              <Ionicons name="book-outline" size={44} color={palette.cream} />
            </View>
          )}
          {BackChevron}
        </View>

        {/* Reading column */}
        <View style={styles.column}>
          <Text variant="footnote" tone="accent" style={styles.category}>
            {CATEGORY_LABELS[article.category]}
          </Text>

          <Text variant="title" tone="default" style={styles.title}>
            {article.title}
          </Text>

          <Text variant="footnote" tone="subtle" style={styles.byline}>
            {byline}
          </Text>

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          {paragraphs.map((para, i) => (
            <Text key={i} variant="body" tone="default" style={styles.paragraph}>
              {para}
            </Text>
          ))}

          <Text variant="display" tone="accent" center style={styles.signoff}>
            Pakiza
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    height: HERO_HEIGHT,
    overflow: 'hidden',
  },
  heroPlaceholder: {
    backgroundColor: palette.burgundy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: {
    position: 'absolute',
    left: spacing.lg,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: tint.overlaySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backInline: {
    marginLeft: spacing.lg,
    marginBottom: spacing.sm,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  column: {
    paddingHorizontal: spacing.lg,
  },
  category: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    marginBottom: spacing.md,
  },
  byline: {
    marginBottom: spacing.lg,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: spacing.xl,
  },
  paragraph: {
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  signoff: {
    fontSize: 26,
    lineHeight: 32,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
});
