import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { matchAdvisorsApi } from '@/api/matchAdvisors';
import type { MatchAdvisorRequest } from '@/api/types';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonList } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { FAB } from '@/components/FAB';
import { fonts, palette, radii, shadow, spacing, useTheme } from '@/theme';

export default function FindForMeDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c, isDark } = useTheme();
  const [requests, setRequests] = useState<MatchAdvisorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRequests(await matchAdvisorsApi.getMyRequests());
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
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <Text variant="title" tone="accent">Find For Me</Text>
        <Text variant="footnote" tone="muted">Manage your private searches</Text>
      </View>

      {loading ? (
        <SkeletonList />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : requests.length === 0 ? (
        <EmptyState
          icon="search"
          title="No active requests"
          message="Start a private search to have our Match Advisors find the perfect match for you."
        />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <PressableScale
              style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, !isDark && shadow.soft]}
              /* request management handled here or via edit */
            >
              <View style={{ flex: 1 }}>
                <Text variant="subhead" tone="default" numberOfLines={1}>{item.request_title}</Text>
                <Text variant="footnote" tone="muted" style={{ marginTop: 2 }}>{item.status.toUpperCase()} • {item.timeline_days} days</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={c.textSubtle} />
            </PressableScale>
          )}
        />
      )}

      <FAB
        icon="add"
        onPress={() => router.push('/(app)/create-request' as any)}
        style={{ bottom: spacing.xxxl }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  }
});
