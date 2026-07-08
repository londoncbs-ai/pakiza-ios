import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { safetyApi, type BlockedMember } from '@/api/safety';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { Text } from '@/components/Text';
import { haptics } from '@/lib/haptics';
import { palette, spacing, useTheme } from '@/theme';

export default function BlockedMembers() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c } = useTheme();
  const [blocks, setBlocks] = useState<BlockedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setBlocks(await safetyApi.listBlocks());
    } catch {
      // keep whatever we had; pull-to-refresh retries
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const unblock = useCallback((member: BlockedMember) => {
    const name = member.name ?? 'this member';
    Alert.alert(
      `Unblock ${name}?`,
      'You may see each other in Discover again and they will be able to contact you if you match.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'destructive',
          onPress: async () => {
            setBusy(member.user_id);
            try {
              await safetyApi.unblock(member.user_id);
              haptics.light();
              setBlocks((b) => b.filter((x) => x.user_id !== member.user_id));
            } catch (err) {
              Alert.alert('Could not unblock', errorMessage(err, 'Please try again.'));
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  }, []);

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ width: 30 }}>
          <Ionicons name="chevron-back" size={26} color={palette.burgundy} />
        </Pressable>
        <Text variant="heading" tone="burgundy">Blocked members</Text>
        <View style={{ width: 30 }} />
      </View>

      {!loading && blocks.length === 0 ? (
        <EmptyState
          icon="shield-checkmark-outline"
          title="No blocked members"
          message="Anyone you block from a profile or chat will appear here, so you can change your mind later."
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
          }
        >
          <Surface elevated style={styles.card}>
            {blocks.map((member, i) => (
              <View key={member.user_id}>
                {i > 0 ? <View style={[styles.divider, { backgroundColor: c.border }]} /> : null}
                <View style={styles.row}>
                  <Ionicons name="person-circle-outline" size={28} color={c.textMuted} />
                  <Text variant="body" style={styles.name} numberOfLines={1}>
                    {member.name ?? 'Member'}
                  </Text>
                  <Button
                    label="Unblock"
                    variant="ghost"
                    loading={busy === member.user_id}
                    onPress={() => unblock(member)}
                    style={styles.unblockBtn}
                  />
                </View>
              </View>
            ))}
          </Surface>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  body: { padding: spacing.lg },
  card: { paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  name: { flex: 1 },
  divider: { height: StyleSheet.hairlineWidth },
  unblockBtn: { paddingVertical: 8, paddingHorizontal: 14 },
});
