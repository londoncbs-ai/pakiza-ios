import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { eventsApi } from '@/api/events';
import { errorMessage } from '@/api/client';
import type { EventCategory, EventItem } from '@/api/types';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Screen } from '@/components/Screen';
import { SkeletonList } from '@/components/Skeleton';
import { Surface } from '@/components/Surface';
import { Text } from '@/components/Text';
import { haptics } from '@/lib/haptics';
import { palette, radii, shadow, spacing, useTheme } from '@/theme';

const CATEGORY_LABELS: Record<EventCategory, string> = {
  matrimonial_meet: 'Curated introductions',
  speed_matching: 'Speed matching',
  webinar: 'Webinar',
  workshop: 'Workshop',
  community: 'Community',
  family: 'Families welcome',
};

type Filter = 'all' | EventCategory;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'matrimonial_meet', label: CATEGORY_LABELS.matrimonial_meet },
  { key: 'speed_matching', label: CATEGORY_LABELS.speed_matching },
  { key: 'webinar', label: CATEGORY_LABELS.webinar },
  { key: 'workshop', label: CATEGORY_LABELS.workshop },
  { key: 'community', label: CATEGORY_LABELS.community },
  { key: 'family', label: CATEGORY_LABELS.family },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c, isDark } = useTheme();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (f: Filter) => {
    setError(null);
    try {
      const data = await eventsApi.list(f === 'all' ? undefined : f);
      setEvents(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load(filter);
  }, [filter, load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(filter);
  }, [filter, load]);

  const selectFilter = (key: Filter) => {
    if (key === filter) return;
    haptics.selection();
    setFilter(key);
  };

  const renderCard = ({ item }: { item: EventItem }) => {
    const place = item.is_online ? 'Online' : [item.location_name, item.city].filter(Boolean).join(', ') || 'Location TBC';
    return (
      <Pressable
        onPress={() => router.push({ pathname: '/event/[id]', params: { id: item.id } })}
        style={({ pressed }) => [styles.cardWrap, pressed && { opacity: 0.92 }]}
      >
        <Surface style={isDark ? styles.card : [styles.card, shadow.soft]}>
          {item.cover_image_url ? (
            <Image source={{ uri: item.cover_image_url }} style={styles.cover} contentFit="cover" transition={180} />
          ) : (
            <View style={[styles.cover, styles.coverFallback, { backgroundColor: c.surfaceAlt }]}>
              <Ionicons name="calendar-outline" size={32} color={c.textSubtle} />
            </View>
          )}

          <View style={styles.cardBody}>
            <Text variant="footnote" tone="accent" numberOfLines={1}>
              {CATEGORY_LABELS[item.category]}
            </Text>
            <Text variant="subhead" tone="default" numberOfLines={2} style={styles.cardTitle}>
              {item.title}
            </Text>

            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={16} color={c.textMuted} />
              <Text variant="footnote" tone="muted" numberOfLines={1} style={styles.metaText}>
                {formatDate(item.starts_at)} · {formatTime(item.starts_at)}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={16} color={c.textMuted} />
              <Text variant="footnote" tone="muted" numberOfLines={1} style={styles.metaText}>
                {place}
              </Text>
            </View>

            <View style={styles.bottomRow}>
              {item.price_label ? (
                <View style={[styles.priceChip, { backgroundColor: c.surfaceAlt }]}>
                  <Text variant="footnote" tone="default" numberOfLines={1}>
                    {item.price_label}
                  </Text>
                </View>
              ) : (
                <View />
              )}
              <Text variant="footnote" tone="muted">
                {item.going_count} going
              </Text>
            </View>
          </View>
        </Surface>
      </Pressable>
    );
  };

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={c.accent} />
        </Pressable>
        <Text variant="heading" tone="accent">
          Events
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        style={styles.chipsScroll}
      >
        {FILTERS.map((f) => {
          const active = f.key === filter;
          return (
            <Pressable
              key={f.key}
              onPress={() => selectFilter(f.key)}
              style={[
                styles.chip,
                { backgroundColor: active ? palette.burgundy : c.surfaceAlt },
              ]}
            >
              <Text variant="footnote" color={active ? palette.cream : c.text}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.stateWrap}>
          <SkeletonList />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => { setLoading(true); load(filter); }} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={[
            styles.listContent,
            events.length === 0 && styles.listEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title="No events yet"
              message="Check back soon for events near you."
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
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
  },
  stateWrap: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  listEmpty: { flexGrow: 1 },
  cardWrap: { borderRadius: radii.lg },
  card: { overflow: 'hidden', padding: 0 },
  cover: { width: '100%', height: 150 },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: spacing.lg, gap: spacing.xs },
  cardTitle: { marginTop: 2, marginBottom: spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaText: { flex: 1 },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  priceChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
});
