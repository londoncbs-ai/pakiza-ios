import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { chatApi } from '@/api/chat';
import { errorMessage } from '@/api/client';
import type { Conversation } from '@/api/types';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { SkeletonList } from '@/components/Skeleton';
import { Text } from '@/components/Text';
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

export default function Messages() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c, isDark } = useTheme();
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await chatApi.listConversations());
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
          keyExtractor={(c) => c.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
          renderItem={({ item }) => {
            const photo =
              item.other_profile.photos?.find((p) => p.is_primary)?.cdn_url ?? item.other_profile.photos?.[0]?.cdn_url;
            return (
              <Pressable
                style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }, !isDark && shadow.soft]}
                onPress={() =>
                  item.locked
                    ? router.push('/premium')
                    : router.push({ pathname: '/chat/[id]', params: { id: item.id, name: item.other_profile.display_name } })
                }
              >
                {photo ? (
                  <Image source={{ uri: photo }} style={[styles.avatar, item.locked && styles.dim]} contentFit="cover" />
                ) : (
                  <View style={[styles.avatar, styles.placeholder, { backgroundColor: c.surfaceAlt }]}>
                    <Text style={styles.initial} tone="accent">{item.other_profile.display_name[0]}</Text>
                  </View>
                )}
                <View style={styles.body}>
                  <Text variant="subhead" tone="default" style={styles.name}>{item.other_profile.display_name}</Text>
                  <Text variant="footnote" tone="muted" style={styles.preview} numberOfLines={1}>
                    {item.locked
                      ? 'Locked — upgrade to keep this chat open'
                      : item.last_message_at
                        ? 'Tap to continue your conversation'
                        : 'New match. Say salaam 👋'}
                  </Text>
                </View>
                <View style={styles.meta}>
                  {item.locked ? (
                    <Ionicons name="lock-closed" size={18} color={c.accent} />
                  ) : (
                    <>
                      <Text variant="footnote" tone="subtle">{relativeTime(item.last_message_at)}</Text>
                      {item.unread_count > 0 ? (
                        <View style={[styles.badge, { backgroundColor: palette.burgundy }]}>
                          <Text variant="footnote" color={palette.cream} style={styles.badgeText}>{item.unread_count}</Text>
                        </View>
                      ) : null}
                    </>
                  )}
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
  dim: { opacity: 0.5 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: fonts.display, fontSize: 24 },
  body: { flex: 1, marginLeft: spacing.md },
  name: { fontFamily: fonts.displaySemibold },
  preview: { marginTop: 2 },
  meta: { alignItems: 'flex-end', gap: 6 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { fontFamily: fonts.bodySemibold },
});
