import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { notificationsApi } from '@/api/notifications';
import type { AppNotification, NotificationType } from '@/api/types';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale } from '@/components/PressableScale';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { palette, radii, spacing, useTheme } from '@/theme';

const ICON: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  match: 'heart',
  new_message: 'chatbubble',
  like: 'thumbs-up',
  superlike: 'star',
  profile_view: 'eye',
  wali_request: 'people',
  system: 'megaphone',
  moderation: 'shield',
  meeting_request: 'calendar',
  meeting_accepted: 'checkmark-circle',
  meeting_declined: 'close-circle',
  meeting_scheduled: 'calendar-outline',
  meeting_update: 'sync',
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
  const { c } = useTheme();
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
    const meetingId = n.payload?.meeting_id;
    const convId = n.payload?.conversation_id;
    // A meeting_* notification with tab === "chat" opens the coordination thread.
    if (meetingId && n.payload?.tab === 'chat') {
      router.push({ pathname: '/meeting/[id]/chat', params: { id: String(meetingId) } });
    }
    // meeting_request lands in the chat (where the booking card lives); the other
    // meeting_* updates deep-link straight to the meeting detail.
    else if (n.payload?.screen === 'meeting' && meetingId) {
      router.push({ pathname: '/meeting/[id]', params: { id: String(meetingId) } });
    } else if (convId) {
      router.push({ pathname: '/chat/[id]', params: { id: String(convId) } });
    } else if (meetingId) {
      router.push({ pathname: '/meeting/[id]', params: { id: String(meetingId) } });
    } else if (n.payload?.screen === 'match' || n.payload?.screen === 'likes') {
      router.push('/(app)/matches');
    }
  };

  const markAll = async () => {
    await notificationsApi.markAllRead().catch(() => {});
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
  };

  const hasUnread = items.some((x) => !x.is_read);

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerSide}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
        <Text variant="heading" tone="default">Notifications</Text>
        <Pressable onPress={markAll} hitSlop={10} disabled={!hasUnread} style={styles.headerEnd}>
          <Text variant="footnote" tone={hasUnread ? 'accent' : 'subtle'} style={styles.markAll}>
            Read all
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      ) : error ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Something went wrong"
          message={error}
          actionLabel="Try again"
          onAction={load}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title="You're all caught up"
          message="Likes, matches and messages will show up here as they happen."
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ paddingVertical: spacing.sm, paddingBottom: insets.bottom + spacing.xl }}
          ItemSeparatorComponent={() => (
            <View style={[styles.divider, { backgroundColor: c.border }]} />
          )}
          renderItem={({ item }) => {
            const unread = !item.is_read;
            return (
              <PressableScale
                onPress={() => open(item)}
                style={unread ? [styles.row, { backgroundColor: c.accentFaint }] : styles.row}
              >
                <View style={[styles.iconWrap, { backgroundColor: c.accentFaint }]}>
                  <Ionicons name={ICON[item.type] ?? 'notifications'} size={20} color={c.accent} />
                </View>
                <View style={styles.body}>
                  <Text variant="subhead" tone="default" numberOfLines={1}>{item.title}</Text>
                  {item.body ? (
                    <Text variant="callout" tone="muted" numberOfLines={2} style={styles.rowBody}>
                      {item.body}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.meta}>
                  <Text variant="footnote" tone="subtle">{rel(item.created_at)}</Text>
                  {unread ? <View style={[styles.dot, { backgroundColor: c.accent }]} /> : null}
                </View>
              </PressableScale>
            );
          }}
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
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSide: { width: 56, alignItems: 'flex-start' },
  headerEnd: { width: 56, alignItems: 'flex-end' },
  markAll: { textAlign: 'right' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  body: { flex: 1 },
  rowBody: { marginTop: 2 },
  meta: { alignItems: 'flex-end', gap: spacing.xs, marginLeft: spacing.sm },
  dot: { width: 9, height: 9, borderRadius: radii.pill },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: spacing.lg + 44 + spacing.md },
});
