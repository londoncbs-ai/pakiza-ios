import { useCallback, useState } from 'react';
import { FlatList, Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { matchAdvisorsApi } from '@/api/matchAdvisors';
import type { MatchAdvisorProfile, MatchAdvisorRequest } from '@/api/types';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonList } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { palette, radii, shadow, spacing, useTheme } from '@/theme';

export default function MatchAdvisorsDirectoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c, isDark } = useTheme();

  const [advisors, setAdvisors] = useState<MatchAdvisorProfile[]>([]);
  const [myRequests, setMyRequests] = useState<MatchAdvisorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [advList, reqList] = await Promise.all([
        matchAdvisorsApi.listVerifiedAdvisors(),
        matchAdvisorsApi.getMyRequests().catch(() => []),
      ]);
      setAdvisors(advList);
      setMyRequests(reqList);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const activeRequest = myRequests.find(
    (r) => r.status === 'open' || r.status === 'accepted' || r.status === 'active'
  );

  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top + spacing.sm }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="title" tone="accent">Match Advisors</Text>
        <Text variant="footnote" tone="muted">Personal, confidential matchmaking assistance</Text>
      </View>

      {loading ? (
        <SkeletonList />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : (
        <FlatList
          data={advisors}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={{ marginBottom: spacing.lg }}>
              {/* Flat Fee Transparency Banner */}
              <View style={[styles.pricingCard, { backgroundColor: palette.burgundy }]}>
                <View style={styles.badgeRow}>
                  <View style={styles.pill}>
                    <Text variant="label" style={styles.pillText}>STANDARD PRICING</Text>
                  </View>
                  <Text variant="callout" style={styles.pricingFigure}>£500 Flat Fee</Text>
                </View>
                <Text variant="heading" style={styles.pricingTitle}>£250 deposit upfront • £250 on success</Text>
                <Text variant="footnote" style={styles.pricingBody}>
                  Select a verified Match Advisor to lead your search. Your profile stays 100% private. The remaining £250 balance is only paid once we find your spouse.
                </Text>
              </View>

              {/* Active Search Banner (if user already has one) */}
              {activeRequest && (
                <View style={[styles.activeCard, { backgroundColor: c.surface, borderColor: c.border }, !isDark && shadow.soft]}>
                  <View style={{ flex: 1, marginRight: spacing.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.success }} />
                      <Text variant="label" tone="accent" style={{ textTransform: 'uppercase', fontWeight: '700' }}>Active Search</Text>
                    </View>
                    <Text variant="subhead" tone="default" numberOfLines={1}>{activeRequest.request_title}</Text>
                    <Text variant="footnote" tone="muted" style={{ marginTop: 2 }}>
                      Deposit Secured • {activeRequest.status.toUpperCase()}
                    </Text>
                  </View>
                  <Button
                    label="View Chat"
                    variant="outlineAccent"
                    onPress={() => {
                      if (activeRequest.selected_offer_id) {
                        router.push(`/advisor-chat/${activeRequest.selected_offer_id}` as any);
                      } else {
                        router.push('/(app)/messages' as any);
                      }
                    }}
                  />
                </View>
              )}

              <View style={{ marginTop: spacing.md, marginBottom: spacing.xs }}>
                <Text variant="heading" tone="default">Select Your Dedicated Advisor</Text>
                <Text variant="footnote" tone="muted">Choose an advisor to handle your search</Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.advisorCard, { backgroundColor: c.surface, borderColor: c.border }, !isDark && shadow.soft]}>
              <View style={styles.advisorTopRow}>
                <View style={styles.avatarWrap}>
                  {item.profile_photo_url ? (
                    <Image source={{ uri: item.profile_photo_url }} style={styles.avatarImg} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: palette.burgundy }]}>
                      <Text variant="heading" style={{ color: palette.cream }}>
                        {item.display_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text variant="subhead" tone="default" style={{ fontWeight: '700' }}>{item.display_name}</Text>
                    <Ionicons name="checkmark-circle" size={16} color={c.success} />
                  </View>
                  <Text variant="footnote" tone="accent" style={{ marginTop: 2 }}>
                    {item.headline || 'Private Matchmaking Specialist'}
                  </Text>
                  <Text variant="label" tone="muted" style={{ marginTop: 2 }}>
                    {item.city || 'United Kingdom'} • {item.years_experience} yrs experience
                  </Text>
                </View>
              </View>

              {item.bio && (
                <Text variant="body" tone="default" numberOfLines={3} style={{ marginTop: spacing.sm, lineHeight: 20 }}>
                  {item.bio}
                </Text>
              )}

              {item.expertise_tags && (
                <View style={styles.tagsRow}>
                  {item.expertise_tags.split(',').map((tag) => (
                    <View key={tag.trim()} style={[styles.tag, { backgroundColor: c.bg }]}>
                      <Text variant="label" tone="muted">{tag.trim()}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={[styles.cardFoot, { borderTopColor: c.border }]}>
                <View>
                  <Text variant="label" tone="muted">TOTAL SERVICE</Text>
                  <Text variant="callout" tone="accent" style={{ fontWeight: '700' }}>£500 (£250 deposit)</Text>
                </View>

                <Button
                  label="Select Advisor"
                  variant="primary"
                  onPress={() => {
                    router.push({
                      pathname: '/(app)/create-request',
                      params: {
                        advisorId: item.user_id,
                        name: item.display_name,
                      },
                    } as any);
                  }}
                />
              </View>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="people"
              title="No Advisors Found"
              message="Verified advisors will appear here shortly."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  pricingCard: {
    padding: spacing.lg,
    borderRadius: radii.card,
    marginBottom: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  pillText: {
    color: palette.gold,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  pricingFigure: {
    color: palette.gold,
    fontWeight: '700',
  },
  pricingTitle: {
    color: palette.cream,
    fontWeight: '700',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    lineHeight: 24,
  },
  pricingBody: {
    color: 'rgba(245, 240, 230, 0.88)',
    lineHeight: 18,
  },
  activeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
  },
  advisorCard: {
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.md,
  },
  advisorTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  cardFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
