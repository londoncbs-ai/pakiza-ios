import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { notificationsApi } from '@/api/notifications';
import type { AppNotification, NotificationType } from '@/api/types';
import { fonts, palette, spacing } from '@/theme';

const ICON: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  match: 'heart',
  new_message: 'chatbubble',
  like: 'thumbs-up',
  superlike: 'star',
  profile_view: 'eye',
  wali_request: 'people',
  system: 'megaphone',
  moderation: 'shield',
};

function rel(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function Notifications() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await notificationsApi.list());
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const open = (n: AppNotification) => {
    if (!n.is_read) {
      notificationsApi.markRead(n.id).catch(() => {});
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
    const convId = n.payload?.conversation_id;
    if (convId) router.push({ pathname: '/chat/[id]', params: { id: String(convId) } });
    else if (n.payload?.screen === 'match' || n.payload?.screen === 'likes') router.push('/(app)/matches');
  };

  const markAll = async () => {
    await notificationsApi.markAllRead().catch(() => {});
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ width: 60 }}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <Pressable onPress={markAll} hitSlop={10} style={{ width: 60 }}>
          <Text style={styles.markAll}>Read all</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={palette.burgundy} size="large" style={{ marginTop: 60 }} />
      ) : error ? (
        <Text style={styles.empty}>{error}</Text>
      ) : items.length === 0 ? (
        <Text style={styles.empty}>You’re all caught up. Likes, matches and messages will show here.</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
          renderItem={({ item }) => (
            <Pressable style={[styles.row, !item.is_read && styles.unread]} onPress={() => open(item)}>
              <View style={styles.iconWrap}>
                <Ionicons name={ICON[item.type] ?? 'notifications'} size={19} color={palette.burgundy} />
              </View>
              <View style={styles.body}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowBody} numberOfLines={2}>{item.body}</Text>
              </View>
              <View style={styles.meta}>
                <Text style={styles.time}>{rel(item.created_at)}</Text>
                {!item.is_read ? <View style={styles.dot} /> : null}
              </View>
            </Pressable>
          )}
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  back: { fontFamily: fonts.bodyMedium, color: palette.muted, fontSize: 15 },
  title: { fontFamily: fonts.displaySemibold, fontSize: 22, color: palette.burgundy },
  markAll: { fontFamily: fonts.bodyMedium, color: palette.gold, fontSize: 14, textAlign: 'right' },
  empty: { fontFamily: fonts.body, color: palette.muted, textAlign: 'center', marginTop: 70, paddingHorizontal: spacing.xxl, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: 14, marginBottom: 6 },
  unread: { backgroundColor: 'rgba(199,159,94,0.12)' },
  iconWrap: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(128,0,32,0.07)', alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  body: { flex: 1 },
  rowTitle: { fontFamily: fonts.bodySemibold, fontSize: 15, color: palette.ink },
  rowBody: { fontFamily: fonts.body, fontSize: 13.5, color: palette.muted, marginTop: 1 },
  meta: { alignItems: 'flex-end', gap: 6, marginLeft: spacing.sm },
  time: { fontFamily: fonts.body, fontSize: 12, color: palette.muted },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: palette.burgundy },
});
