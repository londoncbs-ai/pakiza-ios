import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';

import { chatApi } from '@/api/chat';
import { errorMessage } from '@/api/client';
import type { Conversation } from '@/api/types';
import { fonts, palette, shadow, spacing } from '@/theme';

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
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await chatApi.listConversations());
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

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>Begin the conversation with purpose</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={palette.burgundy} size="large" style={{ marginTop: 60 }} />
      ) : error ? (
        <Text style={styles.empty}>{error}</Text>
      ) : items.length === 0 ? (
        <Text style={styles.empty}>No conversations yet. When you match, you can start a chat here.</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
          renderItem={({ item }) => {
            const photo =
              item.other_profile.photos?.find((p) => p.is_primary)?.cdn_url ?? item.other_profile.photos?.[0]?.cdn_url;
            return (
              <Pressable
                style={styles.row}
                onPress={() =>
                  router.push({ pathname: '/chat/[id]', params: { id: item.id, name: item.other_profile.display_name } })
                }
              >
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <View style={[styles.avatar, styles.placeholder]}>
                    <Text style={styles.initial}>{item.other_profile.display_name[0]}</Text>
                  </View>
                )}
                <View style={styles.body}>
                  <Text style={styles.name}>{item.other_profile.display_name}</Text>
                  <Text style={styles.preview} numberOfLines={1}>
                    {item.last_message_at ? 'Tap to continue your conversation' : 'New match. Say salaam 👋'}
                  </Text>
                </View>
                <View style={styles.meta}>
                  <Text style={styles.time}>{relativeTime(item.last_message_at)}</Text>
                  {item.unread_count > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.unread_count}</Text>
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
  root: { flex: 1, backgroundColor: palette.cream },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { fontFamily: fonts.display, fontSize: 32, color: palette.burgundy },
  subtitle: { fontFamily: fonts.body, fontSize: 13.5, color: palette.muted, marginTop: -2 },
  empty: { fontFamily: fonts.body, color: palette.muted, textAlign: 'center', marginTop: 70, paddingHorizontal: spacing.xxl, lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.white, borderRadius: 16, padding: spacing.md, marginBottom: spacing.md, ...shadow.soft },
  avatar: { width: 58, height: 58, borderRadius: 29 },
  placeholder: { backgroundColor: palette.sand, alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: fonts.display, fontSize: 24, color: palette.burgundy },
  body: { flex: 1, marginLeft: spacing.md },
  name: { fontFamily: fonts.displaySemibold, fontSize: 19, color: palette.ink },
  preview: { fontFamily: fonts.body, fontSize: 13.5, color: palette.muted, marginTop: 2 },
  meta: { alignItems: 'flex-end', gap: 6 },
  time: { fontFamily: fonts.body, fontSize: 12, color: palette.muted },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: palette.burgundy, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { fontFamily: fonts.bodySemibold, fontSize: 12, color: palette.cream },
});
