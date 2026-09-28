import { useCallback, useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { getSearchDisplayTitle, getSearchStatusConfig, matchAdvisorsApi } from '@/api/matchAdvisors';
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
  const [activeTab, setActiveTab] = useState<'case' | 'browse'>('browse');
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
      if (reqList.some((r) => r.status === 'open' || r.status === 'accepted' || r.status === 'active')) {
        setActiveTab('case');
      }
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

  const ongoingReq =
    myRequests.find((r) => r.status === 'open' || r.status === 'accepted' || r.status === 'active') || null;
  const activeReq = ongoingReq || myRequests[0] || null;
  const hasActiveSearch = Boolean(ongoingReq);

  const handleBookAdvisor = (advisor: MatchAdvisorProfile) => {
    if (hasActiveSearch) {
      Alert.alert(
        'Active Search in Progress',
        `You currently have an active matchmaking search underway (${getSearchDisplayTitle(activeReq)}).\n\nPlatform policy allows one private search at a time so your advisor can dedicate full attention to your search. You can book a new advisor once your current search is completed.`,
        [
          { text: 'View Current Search', onPress: () => setActiveTab('case') },
          { text: 'OK', style: 'cancel' },
        ]
      );
      return;
    }
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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="title" tone="accent">Find for Me</Text>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: radii.pill,
              backgroundColor: hasActiveSearch ? 'rgba(34, 197, 94, 0.12)' : 'rgba(128, 0, 32, 0.08)',
              borderWidth: 1,
              borderColor: hasActiveSearch ? 'rgba(34, 197, 94, 0.3)' : 'rgba(128, 0, 32, 0.2)',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: hasActiveSearch ? '#16a34a' : palette.burgundy,
              }}
            />
            <Text
              variant="label"
              style={{
                fontSize: 10,
                fontWeight: '800',
                color: hasActiveSearch ? '#16a34a' : palette.burgundy,
                letterSpacing: 0.4,
              }}
            >
              {hasActiveSearch ? '1 ACTIVE SEARCH' : '1 SEARCH POLICY'}
            </Text>
          </View>
        </View>
        <Text variant="footnote" tone="muted">Personal matchmaking • Dedicated 1-on-1 advisor</Text>
      </View>

      {/* Segmented Controller (Always Visible) */}
      <View style={styles.segmentBar}>
        <Pressable
          onPress={() => setActiveTab('case')}
          style={[
            styles.segmentBtn,
            {
              backgroundColor: activeTab === 'case' ? palette.burgundy : c.surfaceAlt,
              borderColor: activeTab === 'case' ? palette.burgundy : c.borderStrong,
            },
            !isDark && shadow.soft,
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {activeReq && (
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  backgroundColor: getSearchStatusConfig(activeReq.status).color,
                }}
              />
            )}
            <Text
              variant="subhead"
              style={{
                fontWeight: '800',
                color: activeTab === 'case' ? palette.cream : c.text,
              }}
            >
              {hasActiveSearch ? 'My Active Search' : myRequests.length > 0 ? 'My Case' : 'How It Works'}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('browse')}
          style={[
            styles.segmentBtn,
            {
              backgroundColor: activeTab === 'browse' ? palette.burgundy : c.surfaceAlt,
              borderColor: activeTab === 'browse' ? palette.burgundy : c.borderStrong,
            },
            !isDark && shadow.soft,
          ]}
        >
          <Text
            variant="subhead"
            style={{
              fontWeight: '800',
              color: activeTab === 'browse' ? palette.cream : c.text,
            }}
          >
            Advisors ({advisors.length})
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <SkeletonList />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : activeTab === 'case' ? (
        activeReq ? (
          <ScrollView
            contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Main Active Case Card */}
            <View
              style={[
                styles.caseCard,
                { backgroundColor: c.surface, borderColor: c.border },
                !isDark ? shadow.card : undefined,
              ]}
            >
            {(() => {
              const statusCfg = getSearchStatusConfig(activeReq.status);
              const isClosedOrCancelled =
                activeReq.status === 'cancelled' ||
                activeReq.status === 'completed' ||
                activeReq.status === 'expired';
              return (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: radii.pill,
                        backgroundColor: statusCfg.bg,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <View
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 4,
                          backgroundColor: statusCfg.color,
                        }}
                      />
                      <Text
                        variant="label"
                        style={{
                          fontWeight: '800',
                          color: statusCfg.color,
                          letterSpacing: 0.5,
                          fontSize: 10,
                        }}
                      >
                        {statusCfg.label}
                      </Text>
                    </View>
                    <Text variant="footnote" tone="muted">
                      #{String(activeReq.id).slice(0, 8).toUpperCase()}
                    </Text>
                  </View>

                  <Text variant="heading" style={{ fontWeight: '800', marginTop: 4, marginBottom: 2 }}>
                    {getSearchDisplayTitle(activeReq)}
                  </Text>
                  <Text variant="footnote" tone="muted" style={{ marginBottom: spacing.md }}>
                    Confidential search handled by dedicated Match Advisor
                  </Text>

                  {/* Status Announcement Banner if not active */}
                  {activeReq.status === 'cancelled' && (
                    <View
                      style={{
                        backgroundColor: 'rgba(194, 65, 12, 0.08)',
                        borderRadius: radii.md,
                        padding: spacing.sm,
                        borderWidth: 1,
                        borderColor: 'rgba(194, 65, 12, 0.25)',
                        marginBottom: spacing.md,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.xs,
                      }}
                    >
                      <Ionicons name="alert-circle" size={18} color={palette.sienna} />
                      <Text variant="footnote" style={{ color: palette.sienna, flex: 1, fontWeight: '600' }}>
                        This search was cancelled. Deposit settled according to platform terms.
                      </Text>
                    </View>
                  )}
                  {activeReq.status === 'completed' && (
                    <View
                      style={{
                        backgroundColor: 'rgba(217, 119, 6, 0.08)',
                        borderRadius: radii.md,
                        padding: spacing.sm,
                        borderWidth: 1,
                        borderColor: 'rgba(217, 119, 6, 0.25)',
                        marginBottom: spacing.md,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.xs,
                      }}
                    >
                      <Ionicons name="checkmark-circle" size={18} color={palette.gold} />
                      <Text variant="footnote" style={{ color: palette.gold, flex: 1, fontWeight: '600' }}>
                        Spouse found! Case successfully concluded.
                      </Text>
                    </View>
                  )}
                  {activeReq.status === 'expired' && (
                    <View
                      style={{
                        backgroundColor: 'rgba(100, 116, 139, 0.08)',
                        borderRadius: radii.md,
                        padding: spacing.sm,
                        borderWidth: 1,
                        borderColor: 'rgba(100, 116, 139, 0.25)',
                        marginBottom: spacing.md,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.xs,
                      }}
                    >
                      <Ionicons name="time" size={18} color="#64748b" />
                      <Text variant="footnote" style={{ color: '#64748b', flex: 1, fontWeight: '600' }}>
                        This search period has concluded and is currently inactive.
                      </Text>
                    </View>
                  )}

                  {/* Advisor Strip */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: spacing.sm,
                      backgroundColor: c.surfaceAlt,
                      borderRadius: radii.md,
                      marginBottom: spacing.md,
                      borderWidth: 1,
                      borderColor: c.border,
                    }}
                  >
                    {activeReq.advisor_photo_url ? (
                      <Image
                        source={{ uri: activeReq.advisor_photo_url }}
                        style={{ width: 50, height: 50, borderRadius: 25, marginRight: spacing.sm }}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={{
                          width: 50,
                          height: 50,
                          borderRadius: 25,
                          backgroundColor: palette.burgundy,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: spacing.sm,
                        }}
                      >
                        <Ionicons name="shield-checkmark" size={24} color={palette.cream} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text variant="subhead" style={{ fontWeight: '700' }}>
                          {activeReq.advisor_name || 'Assigned Match Advisor'}
                        </Text>
                        <Ionicons name="checkmark-circle" size={16} color={c.success} />
                      </View>
                      <Text variant="footnote" tone="accent" style={{ marginTop: 2 }}>
                        {isClosedOrCancelled ? 'Private Matchmaker' : 'Private Matchmaker • £250 Deposit Secured'}
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    {isClosedOrCancelled ? (
                      <Button
                        label="Book New Search"
                        variant="primary"
                        style={{ flex: 1 }}
                        onPress={() => setActiveTab('browse')}
                      />
                    ) : activeReq.selected_offer_id ? (
                      <Button
                        label="Message Advisor"
                        variant="primary"
                        style={{ flex: 1 }}
                        onPress={() =>
                          router.push({
                            pathname: '/advisor-chat/[offerId]',
                            params: {
                              offerId: String(activeReq.selected_offer_id),
                              name: activeReq.advisor_name || '',
                              photo: activeReq.advisor_photo_url || '',
                            },
                          } as any)
                        }
                      />
                    ) : null}
                    <Button
                      label="Case Details"
                      variant="outline"
                      style={{ flex: 1 }}
                      onPress={() =>
                        router.push({
                          pathname: '/(app)/requests/[id]',
                          params: { id: activeReq.id },
                        } as any)
                      }
                    />
                  </View>
                </>
              );
            })()}
          </View>

          {/* Stepper Card */}
          <View
            style={[
              styles.caseCard,
              { backgroundColor: c.surface, borderColor: c.border },
              !isDark ? shadow.soft : undefined,
            ]}
          >
            <Text variant="subhead" style={{ fontWeight: '800', marginBottom: spacing.md }}>
              Search Progress
            </Text>
            <View style={styles.stepperWrap}>
              <View style={styles.stepItem}>
                <View style={[styles.stepDot, { backgroundColor: c.success }]}>
                  <Ionicons name="checkmark" size={13} color="#FFF" />
                </View>
                <Text variant="label" style={{ fontSize: 10, fontWeight: '700', textAlign: 'center' }}>Deposit</Text>
                <Text variant="footnote" tone="muted" style={{ fontSize: 10 }}>£250 Paid</Text>
              </View>
              <View style={[styles.stepLine, { backgroundColor: c.success }]} />
              <View style={styles.stepItem}>
                <View style={[styles.stepDot, { backgroundColor: palette.burgundy }]}>
                  <Text variant="label" style={{ color: '#FFF', fontWeight: '800', fontSize: 11 }}>2</Text>
                </View>
                <Text variant="label" style={{ fontSize: 10, fontWeight: '700', textAlign: 'center' }}>Consultation</Text>
                <Text variant="footnote" tone="muted" style={{ fontSize: 10 }}>In Progress</Text>
              </View>
              <View style={[styles.stepLine, { backgroundColor: c.border }]} />
              <View style={styles.stepItem}>
                <View style={[styles.stepDot, { backgroundColor: c.border }]}>
                  <Text variant="label" style={{ color: c.textMuted, fontWeight: '800', fontSize: 11 }}>3</Text>
                </View>
                <Text variant="label" tone="muted" style={{ fontSize: 10, textAlign: 'center' }}>Sourcing</Text>
                <Text variant="footnote" tone="muted" style={{ fontSize: 10 }}>Vetting</Text>
              </View>
              <View style={[styles.stepLine, { backgroundColor: c.border }]} />
              <View style={styles.stepItem}>
                <View style={[styles.stepDot, { backgroundColor: c.border }]}>
                  <Text variant="label" style={{ color: c.textMuted, fontWeight: '800', fontSize: 11 }}>4</Text>
                </View>
                <Text variant="label" tone="muted" style={{ fontSize: 10, textAlign: 'center' }}>Spouse</Text>
                <Text variant="footnote" tone="muted" style={{ fontSize: 10 }}>£250 Due</Text>
              </View>
            </View>
          </View>

          {/* Criteria & Confidentiality Card */}
          <View
            style={[
              styles.caseCard,
              { backgroundColor: c.surface, borderColor: c.border },
              !isDark ? shadow.soft : undefined,
            ]}
          >
            <Text variant="subhead" style={{ fontWeight: '800', marginBottom: spacing.xs }}>
              Preferences & Criteria
            </Text>
            <Text variant="footnote" tone="muted" style={{ lineHeight: 20, marginBottom: spacing.sm }}>
              {activeReq.partner_preferences || 'Your preferences are active and handled with 100% discretion.'}
            </Text>
            {activeReq.preferred_location && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Ionicons name="location-outline" size={15} color={c.accent} />
                <Text variant="footnote" tone="default" style={{ fontWeight: '600' }}>
                  Target Location: {activeReq.preferred_location}
                </Text>
              </View>
            )}
          </View>

          {/* Other Searches if user has more than 1 */}
          {myRequests.length > 1 && (
            <View style={{ marginTop: spacing.sm, marginBottom: spacing.md }}>
              <Text variant="subhead" tone="muted" style={{ fontWeight: '800', fontSize: 11, letterSpacing: 0.8, marginBottom: spacing.xs }}>
                SEARCH HISTORY
              </Text>
              {myRequests
                .filter((r) => r.id !== activeReq.id)
                .map((req) => {
                  const itemBadge = getSearchStatusConfig(req.status);
                  return (
                    <PressableScale
                      key={req.id}
                      onPress={() =>
                        router.push({
                          pathname: '/(app)/requests/[id]',
                          params: { id: req.id },
                        } as any)
                      }
                      style={[
                        styles.activeCard,
                        { backgroundColor: c.surface, borderColor: c.border, marginBottom: 8 },
                        !isDark && shadow.soft,
                      ] as any}
                    >
                      <View style={{ flex: 1, marginRight: spacing.md }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <View
                            style={{
                              paddingHorizontal: 7,
                              paddingVertical: 2,
                              borderRadius: radii.pill,
                              backgroundColor: itemBadge.bg,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: itemBadge.color }} />
                            <Text style={{ fontSize: 10, fontWeight: '800', color: itemBadge.color }}>
                              {itemBadge.short}
                            </Text>
                          </View>
                          <Text variant="footnote" tone="muted" style={{ fontSize: 11 }}>
                            #{String(req.id).slice(0, 8).toUpperCase()}
                          </Text>
                        </View>
                        <Text variant="subhead" tone="default" numberOfLines={1} style={{ fontWeight: '700' }}>
                          {getSearchDisplayTitle(req)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
                    </PressableScale>
                  );
                })}
            </View>
          )}

          {/* Browse Directory CTA */}
          <Button
            label="Browse All Advisors Directory"
            variant="outline"
            style={{ marginTop: spacing.sm }}
            onPress={() => setActiveTab('browse')}
          />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.caseCard,
              { backgroundColor: c.surface, borderColor: c.border },
              !isDark ? shadow.card : undefined,
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.xs }}>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: radii.pill,
                  backgroundColor: 'rgba(128, 0, 32, 0.1)',
                }}
              >
                <Text variant="label" style={{ color: palette.burgundy, fontWeight: '800', fontSize: 11 }}>
                  ONE SEARCH AT A TIME POLICY
                </Text>
              </View>
            </View>

            <Text variant="title" tone="accent" style={{ marginTop: spacing.xs, marginBottom: 4 }}>
              Private Matchmaking Hub
            </Text>
            <Text variant="footnote" tone="muted" style={{ lineHeight: 20, marginBottom: spacing.md }}>
              Find for Me pairs you with 1 dedicated, verified Match Advisor. To maintain complete discretion and dedicated individual attention, you run one confidential search at a time until your spouse is found.
            </Text>

            <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: spacing.sm, backgroundColor: c.surfaceAlt, borderRadius: radii.md }}>
                <Ionicons name="person" size={22} color={palette.burgundy} />
                <View style={{ flex: 1 }}>
                  <Text variant="subhead" style={{ fontWeight: '700' }}>Dedicated Individual Search</Text>
                  <Text variant="footnote" tone="muted">Your advisor dedicates focus to your criteria with zero competing requests.</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: spacing.sm, backgroundColor: c.surfaceAlt, borderRadius: radii.md }}>
                <Ionicons name="eye-off" size={22} color={palette.burgundy} />
                <View style={{ flex: 1 }}>
                  <Text variant="subhead" style={{ fontWeight: '700' }}>100% Private & Hidden</Text>
                  <Text variant="footnote" tone="muted">Your profile is hidden from the public feed while your advisor actively searches.</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: spacing.sm, backgroundColor: c.surfaceAlt, borderRadius: radii.md }}>
                <Ionicons name="shield-checkmark" size={22} color={palette.burgundy} />
                <View style={{ flex: 1 }}>
                  <Text variant="subhead" style={{ fontWeight: '700' }}>Standard Flat £500 Fee</Text>
                  <Text variant="footnote" tone="muted">£250 deposit to begin • £250 success fee only after your spouse is found.</Text>
                </View>
              </View>
            </View>

            <Button
              label="Choose Advisor & Start Search"
              variant="primary"
              onPress={() => setActiveTab('browse')}
            />
          </View>
        </ScrollView>
      )
    ) : (
      <FlatList
        data={advisors}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.lg }}>
            {hasActiveSearch && ongoingReq ? (
              <View
                style={{
                  backgroundColor: 'rgba(128, 0, 32, 0.08)',
                  borderColor: palette.burgundy,
                  borderWidth: 1.5,
                  borderRadius: radii.card,
                  padding: spacing.md,
                  marginBottom: spacing.md,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ionicons name="shield-checkmark" size={18} color={palette.burgundy} />
                  <Text variant="subhead" style={{ fontWeight: '800', color: palette.burgundy }}>
                    Active Search Underway (1 Search Policy)
                  </Text>
                </View>
                <Text variant="footnote" tone="default" style={{ lineHeight: 18, marginBottom: spacing.sm }}>
                  You currently have an active search with {ongoingReq.advisor_name || 'your Match Advisor'}. Each member may run one private search at a time.
                </Text>
                <Button
                  label="View My Active Search"
                  variant="primary"
                  onPress={() => setActiveTab('case')}
                />
              </View>
            ) : (
              <View
                style={{
                  backgroundColor: 'rgba(128, 0, 32, 0.05)',
                  borderColor: 'rgba(128, 0, 32, 0.2)',
                  borderWidth: 1.5,
                  borderRadius: radii.card,
                  padding: spacing.md,
                  marginBottom: spacing.md,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ionicons name="sparkles" size={18} color={palette.burgundy} />
                  <Text variant="subhead" style={{ fontWeight: '800', color: palette.burgundy }}>
                    Find for Me — 1 Search at a Time
                  </Text>
                </View>
                <Text variant="footnote" tone="default" style={{ lineHeight: 18, marginBottom: spacing.xs }}>
                  Every member is paired with 1 dedicated Match Advisor for 1 search at a time. Browse accredited advisors below to start your private search.
                </Text>
              </View>
            )}

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
                <Text variant="footnote" tone="accent" style={{ marginTop: 2 }}>{item.headline || 'Verified Match Advisor'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="star" size={13} color={palette.gold} />
                    <Text variant="label" style={{ fontWeight: '700' }}>{item.rating ? Number(item.rating).toFixed(1) : 'New'}</Text>
                  </View>
                  {/* Only what the advisor has actually recorded - never a made-up figure. */}
                  {item.years_experience > 0 ? (
                    <Text variant="label" tone="muted">
                      {item.years_experience}y exp
                    </Text>
                  ) : null}
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
                  variant="outline"
                  size="sm"
                  onPress={() => setViewingAdvisor(item)}
                />
                <Button
                  label={hasActiveSearch ? 'In Progress' : 'Book Advisor'}
                  variant={hasActiveSearch ? 'outline' : 'primary'}
                  size="sm"
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
                  {viewingAdvisor.reviews_count > 0 ? (
                    <>
                      <Ionicons name="star" size={16} color={palette.gold} />
                      <Text variant="subhead" tone="default" style={{ fontWeight: '800' }}>
                        {viewingAdvisor.rating.toFixed(1)}
                      </Text>
                      <Text variant="footnote" tone="muted">
                        ({viewingAdvisor.reviews_count} verified {viewingAdvisor.reviews_count === 1 ? 'review' : 'reviews'})
                      </Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="shield-checkmark" size={16} color={palette.burgundy} />
                      <Text variant="subhead" tone="accent" style={{ fontWeight: '800' }}>
                        New Advisor
                      </Text>
                      <Text variant="footnote" tone="muted">
                        (0 verified reviews)
                      </Text>
                    </>
                  )}
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
                    {viewingAdvisor.years_experience > 0 ? `${viewingAdvisor.years_experience} Years` : 'New advisor'}
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
                label={hasActiveSearch ? 'Case Already Active' : `Book ${viewingAdvisor.display_name.split(' ')[0]}`}
                variant={hasActiveSearch ? 'outline' : 'primary'}
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
  segmentBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
  caseCard: {
    padding: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  stepItem: {
    alignItems: 'center',
    width: 68,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginBottom: 16,
    marginHorizontal: 2,
  },
});
