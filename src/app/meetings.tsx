import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { meetingsApi } from '@/api/meetings';
import type { MeetingRequest, MeetingStatus } from '@/api/types';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { FeatureHint } from '@/components/FeatureHint';
import { Screen } from '@/components/Screen';
import { SkeletonList } from '@/components/Skeleton';
import { Surface } from '@/components/Surface';
import { Text } from '@/components/Text';
import {
  MEETING_MODE_LABEL,
  MEETING_STATUS_LABEL,
  formatMeetingDateTime,
  meetingTone,
  type MeetingTone,
} from '@/lib/meetings';
import { haptics } from '@/lib/haptics';
import { palette, radii, shadow, spacing, useTheme } from '@/theme';

type Filter = 'all' | MeetingStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function Meetings() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c, isDark } = useTheme();

  const [meetings, setMeetings] = useState<MeetingRequest[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (f: Filter) => {
    setError(null);
    try {
      const data = await meetingsApi.listMine(f === 'all' ? undefined : f);
      setMeetings(data);
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

  // Refresh when returning to this screen (e.g. after booking or paying).
  useFocusEffect(useCallback(() => { load(filter); }, [filter, load]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(filter);
  }, [filter, load]);

  const selectFilter = (key: Filter) => {
    if (key === filter) return;
    haptics.selection();
    setFilter(key);
  };

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={c.accent} />
        </Pressable>
        <Text variant="heading" tone="accent">My meetings</Text>
        <View style={styles.back} />
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
              style={[styles.chip, { backgroundColor: active ? palette.burgundy : c.surfaceAlt }]}
            >
              <Text variant="footnote" color={active ? palette.cream : c.text}>{f.label}</Text>
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
          data={meetings}
          keyExtractor={(m) => m.id}
          contentContainerStyle={[styles.listContent, meetings.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <EmptyState
                icon="calendar-outline"
                title="No meetings yet"
                message="When you book a supervised meet with a match, it will appear here."
              />
              <FeatureHint
                hintKey="meetings-empty"
                icon="sparkles"
                text="New: book a supervised meet with your match, with a wali present."
                style={styles.emptyHint}
              />
            </View>
          }
          renderItem={({ item }) => {
            const when = formatMeetingDateTime(item.scheduled_at) ?? formatMeetingDateTime(item.proposed_at);
            return (
              <Pressable
                onPress={() => router.push({ pathname: '/meeting/[id]', params: { id: item.id } })}
                style={({ pressed }) => [pressed && { opacity: 0.92 }]}
              >
                <Surface style={isDark ? styles.card : [styles.card, shadow.soft]}>
                  <View style={styles.cardTop}>
                    <Text variant="subhead" tone="default" numberOfLines={1} style={styles.cardName}>
                      {item.other_party_name ?? 'Supervised meeting'}
                    </Text>
                    <StatusBadge status={item.status} />
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name="videocam-outline" size={15} color={c.textMuted} />
                    <Text variant="footnote" tone="muted">{MEETING_MODE_LABEL[item.mode]}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name="calendar-outline" size={15} color={c.textMuted} />
                    <Text variant="footnote" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
                      {when ?? 'Time to be arranged'}
                    </Text>
                  </View>
                </Surface>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

function StatusBadge({ status }: { status: MeetingStatus }) {
  const { c } = useTheme();
  const tone = meetingTone(status);
  const bg: Record<MeetingTone, string> = {
    pending: c.surfaceAlt,
    progress: c.accentFaint,
    scheduled: c.accentFaint,
    done: c.accentFaint,
    ended: c.surfaceAlt,
  };
  const fg: Record<MeetingTone, 'muted' | 'accent' | 'success'> = {
    pending: 'muted',
    progress: 'accent',
    scheduled: 'accent',
    done: 'success',
    ended: 'muted',
  };
  return (
    <View style={[styles.badge, { backgroundColor: bg[tone] }]}>
      <Text variant="label" tone={fg[tone]}>{MEETING_STATUS_LABEL[status]}</Text>
    </View>
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
  back: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  chipsScroll: { flexGrow: 0 },
  chipsRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radii.pill },
  stateWrap: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.md },
  listEmpty: { flexGrow: 1 },
  empty: { flex: 1, justifyContent: 'center' },
  emptyHint: { marginHorizontal: spacing.xl, marginTop: spacing.lg },
  card: { padding: spacing.lg, gap: spacing.xs },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.xs },
  cardName: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radii.pill },
});
