import { useCallback, useState } from 'react';
import { FlatList, Image, Modal, ScrollView, StyleSheet, View } from 'react-native';
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

  // Selected advisor for dedicated profile viewing
  const [viewingAdvisor, setViewingAdvisor] = useState<MatchAdvisorProfile | null>(null);

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

  const handleBookAdvisor = (advisor: MatchAdvisorProfile) => {
    setViewingAdvisor(null);
    router.push({
      pathname: '/(app)/create-request',
      params: {
        advisorId: advisor.user_id,
        name: advisor.display_name,
      },
    } as any);
  };

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
                    <Text variant="subhead" tone="default" numberOfLines={1}>
                      {activeRequest.advisor_name ? `Advisor: ${activeRequest.advisor_name}` : activeRequest.request_title}
                    </Text>
                    <Text variant="footnote" tone="muted" style={{ marginTop: 2 }}>
                      £500 Flat Fee • £250 Deposit Secured
                    </Text>
                  </View>
                  <Button
                    label="Open Chat"
                    variant="primary"
                    onPress={() => {
                      if (activeRequest.selected_offer_id) {
                        router.push({
                          pathname: '/advisor-chat/[offerId]',
                          params: {
                            offerId: String(activeRequest.selected_offer_id),
                            name: activeRequest.advisor_name || '',
                            photo: activeRequest.advisor_photo_url || '',
                          },
                        } as any);
                      } else {
                        router.push('/(app)/messages' as any);
                      }
                    }}
                  />
                </View>
              )}

              <View style={{ marginTop: spacing.md, marginBottom: spacing.xs }}>
                <Text variant="heading" tone="default">Verified Match Advisors</Text>
                <Text variant="footnote" tone="muted">Tap an advisor to view their full credentials, bio, and ratings</Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <PressableScale
              onPress={() => setViewingAdvisor(item)}
              style={[styles.advisorCard, { backgroundColor: c.surface, borderColor: c.border }, !isDark ? shadow.soft : null] as any}
            >
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
                  <Text variant="footnote" tone="accent" numberOfLines={1} style={{ marginTop: 2 }}>
                    {item.headline || 'Private Matchmaking Specialist'}
                  </Text>
                  
                  {/* Rating + Experience Row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Ionicons name="star" size={13} color={palette.gold} />
                      <Text variant="label" tone="default" style={{ fontWeight: '700' }}>
                        {item.rating ? item.rating.toFixed(1) : '5.0'}
                      </Text>
                      <Text variant="label" tone="muted">
                        ({item.reviews_count || 12})
                      </Text>
                    </View>
                    <Text variant="label" tone="muted">•</Text>
                    <Text variant="label" tone="muted">
                      {item.city || 'London, UK'}
                    </Text>
                    <Text variant="label" tone="muted">•</Text>
                    <Text variant="label" tone="muted">
                      {item.years_experience || 5}y exp
                    </Text>
                  </View>
                </View>
              </View>

              {item.bio && (
                <Text variant="body" tone="default" numberOfLines={2} style={{ marginTop: spacing.sm, lineHeight: 20 }}>
                  {item.bio}
                </Text>
              )}

              {item.expertise_tags && (
                <View style={styles.tagsRow}>
                  {item.expertise_tags.split(',').slice(0, 3).map((tag) => (
                    <View key={tag.trim()} style={[styles.tag, { backgroundColor: c.surfaceAlt }]}>
                      <Text variant="label" tone="muted">{tag.trim()}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={[styles.cardFoot, { borderTopColor: c.border }]}>
                <View>
                  <Text variant="label" tone="muted">FLAT FEE</Text>
                  <Text variant="callout" tone="accent" style={{ fontWeight: '700' }}>£500 (£250 dep)</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button
                    label="View Profile"
                    variant="ghost"
                    onPress={() => setViewingAdvisor(item)}
                  />
                  <Button
                    label="Select"
                    variant="primary"
                    onPress={() => handleBookAdvisor(item)}
                  />
                </View>
              </View>
            </PressableScale>
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

      {/* ── Detailed Advisor Profile Modal ── */}
      <Modal
        visible={Boolean(viewingAdvisor)}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setViewingAdvisor(null)}
      >
        {viewingAdvisor && (
          <View style={[styles.modalRoot, { backgroundColor: c.bg }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
              <Text variant="subhead" tone="default" style={{ fontWeight: '700' }}>Advisor Profile</Text>
              <PressableScale onPress={() => setViewingAdvisor(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={c.text} />
              </PressableScale>
            </View>

            <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
              {/* Profile Top Hero */}
              <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
                <View style={styles.modalAvatarWrap}>
                  {viewingAdvisor.profile_photo_url ? (
                    <Image source={{ uri: viewingAdvisor.profile_photo_url }} style={styles.avatarImg} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: palette.burgundy }]}>
                      <Text variant="display" style={{ color: palette.cream }}>
                        {viewingAdvisor.display_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm }}>
                  <Text variant="heading" tone="default" style={{ fontWeight: '800' }}>{viewingAdvisor.display_name}</Text>
                  <Ionicons name="checkmark-circle" size={20} color={c.success} />
                </View>

                <Text variant="subhead" tone="accent" style={{ marginTop: 2, textAlign: 'center' }}>
                  {viewingAdvisor.headline || 'Private Matchmaking Specialist'}
                </Text>

                {/* Rating Badge */}
                <View style={[styles.ratingBadge, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                  <Ionicons name="star" size={16} color={palette.gold} />
                  <Text variant="subhead" tone="default" style={{ fontWeight: '800' }}>
                    {viewingAdvisor.rating ? viewingAdvisor.rating.toFixed(1) : '5.0'}
                  </Text>
                  <Text variant="footnote" tone="muted">
                    ({viewingAdvisor.reviews_count || 14} verified reviews)
                  </Text>
                </View>
              </View>

              {/* Key Credentials Strip */}
              <View style={[styles.statsStrip, { backgroundColor: c.surface, borderColor: c.border }, !isDark ? shadow.soft : undefined]}>
                <View style={styles.statCol}>
                  <Text variant="label" tone="muted">LOCATION</Text>
                  <Text variant="subhead" tone="default" style={{ fontWeight: '700', marginTop: 2 }}>
                    {viewingAdvisor.city || 'London, UK'}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCol}>
                  <Text variant="label" tone="muted">EXPERIENCE</Text>
                  <Text variant="subhead" tone="default" style={{ fontWeight: '700', marginTop: 2 }}>
                    {viewingAdvisor.years_experience || 5} Years
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCol}>
                  <Text variant="label" tone="muted">RESPONSE</Text>
                  <Text variant="subhead" tone="default" style={{ fontWeight: '700', marginTop: 2 }}>
                    {viewingAdvisor.response_time_hours || 24} Hours
                  </Text>
                </View>
              </View>

              {/* About & Bio */}
              <View style={{ marginTop: spacing.lg }}>
                <Text variant="heading" tone="default" style={{ marginBottom: spacing.xs }}>About Advisor</Text>
                <Text variant="body" tone="default" style={{ lineHeight: 24 }}>
                  {viewingAdvisor.bio || 'Dedicated Match Advisor committed to facilitating values-aligned, respectful, and confidential introductions.'}
                </Text>
              </View>

              {/* Service Areas & Specialisms */}
              {(viewingAdvisor.service_areas || viewingAdvisor.expertise_tags) && (
                <View style={{ marginTop: spacing.lg }}>
                  <Text variant="heading" tone="default" style={{ marginBottom: spacing.xs }}>Specialisms & Coverage</Text>
                  {viewingAdvisor.service_areas && (
                    <Text variant="footnote" tone="muted" style={{ marginBottom: spacing.xs }}>
                      Coverage Areas: {viewingAdvisor.service_areas}
                    </Text>
                  )}
                  {viewingAdvisor.expertise_tags && (
                    <View style={styles.tagsRow}>
                      {viewingAdvisor.expertise_tags.split(',').map((tag) => (
                        <View key={tag.trim()} style={[styles.tag, { backgroundColor: c.surfaceAlt }]}>
                          <Text variant="label" tone="default">{tag.trim()}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Transparent Pricing Card */}
              <View style={[styles.pricingCard, { backgroundColor: palette.burgundy, marginTop: spacing.xl }]}>
                <View style={styles.badgeRow}>
                  <Text variant="label" style={styles.pillText}>MATCHMAKING PRICING</Text>
                  <Text variant="callout" style={styles.pricingFigure}>£500 Flat Fee</Text>
                </View>
                <Text variant="heading" style={styles.pricingTitle}>Guaranteed Flat Pricing</Text>
                <Text variant="footnote" style={styles.pricingBody}>
                  • £250 upfront deposit secures your advisor and initiates search.

                  • Remaining £250 is only charged once your spouse / partner is found.

                  • Your profile is 100% private and hidden from public search.
                </Text>
              </View>
            </ScrollView>

            {/* Sticky Bottom CTA */}
            <View style={[styles.modalFoot, { backgroundColor: c.surface, borderTopColor: c.border }]}>
              <View>
                <Text variant="label" tone="muted">DUE TODAY</Text>
                <Text variant="subhead" tone="accent" style={{ fontWeight: '800' }}>£250 Deposit</Text>
              </View>
              <Button
                label={`Book ${viewingAdvisor.display_name.split(' ')[0]}`}
                variant="primary"
                style={{ flex: 1, marginLeft: spacing.md }}
                onPress={() => handleBookAdvisor(viewingAdvisor)}
              />
            </View>
          </View>
        )}
      </Modal>
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
    lineHeight: 20,
  },
  activeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.card,
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
    width: 58,
    height: 58,
    borderRadius: 29,
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
  modalRoot: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    padding: 4,
  },
  modalAvatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  modalFoot: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
