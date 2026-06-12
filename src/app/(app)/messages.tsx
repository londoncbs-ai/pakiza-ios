import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { inboxApi, type InboxItem } from '@/api/inbox';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { SkeletonList } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { useRealtime } from '@/store/realtime';
import { fonts, palette, radii, shadow, spacing, useTheme } from '@/theme';

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d` : new Date(iso).toLocaleDateString();
}

const KIND_ICON: Record<InboxItem['kind'], keyof typeof Ionicons.glyphMap> = {
  chat: 'chatbubble',
  support: 'headset',
  meeting: 'calendar',
};

const KIND_LABEL: Record<InboxItem['kind'], string> = {
  chat: '',
  support: 'Support',
  meeting: 'Meeting',
};

export default function Messages() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c, isDark } = useTheme();
  const { revision } = useRealtime();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await inboxApi.list());
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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // A new message / match elsewhere reorders the inbox - refetch on each event.
  useEffect(() => {
    if (revision > 0) load();
  }, [revision, load]);

  const openItem = useCallback(
    (item: InboxItem) => {
      router.push(
        item.param_id
          ? ({ pathname: item.route, params: { id: item.param_id } } as never)
          : (item.route as never)
      );
    },
    [router]
  );

  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <Text variant="title" tone="accent">Messages</Text>
        <Text variant="footnote" tone="muted">Begin the conversation with purpose</Text>
      </View>

      {loading ? (
        <SkeletonList />
      ) : error ? (
        <ErrorState message={error} onRetry={onRefresh} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          title="No conversations yet"
          message="When you and someone both express interest, you can begin a thoughtful conversation here."
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.kind}:${item.id}`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
          renderItem={({ item }) => {
            const kindLabel = KIND_LABEL[item.kind];
            return (
              <Pressable
                style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }, !isDark && shadow.soft]}
                onPress={() => openItem(item)}
              >
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={styles.avatar} contentFit="cover" />
                ) : item.kind === 'chat' ? (
                  <View style={[styles.avatar, styles.placeholder, { backgroundColor: c.surfaceAlt }]}>
                    <Text style={styles.initial} tone="accent">{item.title[0]?.toUpperCase() ?? '?'}</Text>
                  </View>
                ) : (
                  <View style={[styles.avatar, styles.placeholder, { backgroundColor: c.accentFaint }]}>
                    <Ionicons name={KIND_ICON[item.kind]} size={24} color={c.accent} />
                  </View>
                )}
                <View style={styles.body}>
                  <View style={styles.titleRow}>
                    <Text variant="subhead" tone="default" style={styles.name} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {kindLabel ? (
                      <View style={[styles.chip, { backgroundColor: c.accentFaint }]}>
                        <Ionicons name={KIND_ICON[item.kind]} size={11} color={c.accent} />
                        <Text variant="label" tone="accent">{kindLabel}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text variant="footnote" tone="muted" style={styles.preview} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>
                <View style={styles.meta}>
                  <Text variant="footnote" tone="subtle">{relativeTime(item.last_at)}</Text>
                  {item.unread > 0 ? (
                    <View style={[styles.badge, { backgroundColor: palette.burgundy }]}>
                      <Text variant="footnote" color={palette.cream} style={styles.badgeText}>{item.unread}</Text>
                    </View>
                  ) : null}
                </View>
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
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  avatar: { width: 58, height: 58, borderRadius: 29 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: fonts.display, fontSize: 24 },
  body: { flex: 1, marginLeft: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { fontFamily: fonts.displaySemibold, flexShrink: 1 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  preview: { marginTop: 2 },
  meta: { alignItems: 'flex-end', gap: 6, marginLeft: spacing.sm },
  badge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { fontFamily: fonts.bodySemibold },
});
