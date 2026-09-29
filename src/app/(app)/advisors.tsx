import { useCallback, useRef, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import {
  findOngoingRequest,
  getSearchDisplayTitle,
  getSearchStatusConfig,
  isOngoingSearchStatus,
  matchAdvisorsApi,
} from '@/api/matchAdvisors';
import type { MatchAdvisorProfile, MatchAdvisorRequest } from '@/api/types';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonList } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { palette, radii, shadow, spacing, useTheme } from '@/theme';

/**
 * Find for Me: a dedicated Match Advisor searches privately on the member's
 * behalf, for a flat £500 fee (£250 to begin, £250 on success). One search
 * runs at a time, so the whole screen is built around one question - where
 * is my search right now, and what, if anything, needs me?
 *
 * `findOngoingRequest` (api/matchAdvisors.ts) is the single source of truth
 * for "is a search open". It used to be reimplemented inline here and in
 * create-request.tsx, each missing 'reviewing' and 'offered' - which meant a
 * member with an unanswered offer could quietly book a second advisor,
 * breaking the one-search policy this whole screen exists to enforce.
 */
export default function MatchAdvisorsDirectoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c, isDark } = useTheme();

  const [advisors, setAdvisors] = useState<MatchAdvisorProfile[]>([]);
  const [myRequests, setMyRequests] = useState<MatchAdvisorRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'case' | 'browse'>('browse');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingAdvisor, setViewingAdvisor] = useState<MatchAdvisorProfile | null>(null);

  // Tracks the ongoing request we last showed the member, so a background
  // refresh (useFocusEffect fires on every return to this tab) never yanks
  // them off a deliberate "browse" visit. It DOES jump them to the case when
  // a search first opens, or when it newly needs their decision (an offer
  // just arrived) - both moments where staying on "browse" would bury
  // something that needs them.
  const shownOngoingKey = useRef<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [advList, reqList] = await Promise.all([
        matchAdvisorsApi.listVerifiedAdvisors(),
        matchAdvisorsApi.getMyRequests().catch(() => []),
      ]);
      setAdvisors(advList);
      setMyRequests(reqList);

      const ongoing = findOngoingRequest(reqList);
      const key = ongoing ? `${ongoing.id}:${ongoing.status}` : null;
      const justOpened = ongoing && shownOngoingKey.current === null;
      const justOffered = ongoing?.status === 'offered' && shownOngoingKey.current !== key;
      if (justOpened || justOffered) setActiveTab('case');
      shownOngoingKey.current = key;

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

  const ongoingReq = findOngoingRequest(myRequests);
  const activeReq = ongoingReq || myRequests[0] || null;
  const hasActiveSearch = Boolean(ongoingReq);

  const handleBookAdvisor = (advisor: MatchAdvisorProfile) => {
    if (hasActiveSearch && ongoingReq) {
      Alert.alert(
        'A search is already open',
        `You have an open search with ${getSearchDisplayTitle(ongoingReq)}. One private search runs at a time, so your advisor can give it their full attention - you can book someone new once this one closes.`,
        [
          { text: 'View my search', onPress: () => setActiveTab('case') },
          { text: 'OK', style: 'cancel' },
        ]
      );
      return;
    }
    setViewingAdvisor(null);
    router.push({
      pathname: '/(app)/create-request',
      params: { advisorId: advisor.user_id, name: advisor.display_name },
    } as any);
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top + spacing.sm }]}>
      <Header hasActiveSearch={hasActiveSearch} ongoingReq={ongoingReq} />

      <View style={styles.segmentBar}>
        <Segment
          label={hasActiveSearch ? 'My Search' : myRequests.length > 0 ? 'My Case' : 'How It Works'}
          active={activeTab === 'case'}
          dotColor={activeReq ? getSearchStatusConfig(activeReq.status).color : undefined}
          onPress={() => setActiveTab('case')}
        />
        <Segment label={`Advisors (${advisors.length})`} active={activeTab === 'browse'} onPress={() => setActiveTab('browse')} />
      </View>

      {loading ? (
        <SkeletonList />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : activeTab === 'case' ? (
        activeReq ? (
          <CaseTab
            activeReq={activeReq}
            otherRequests={myRequests.filter((r) => r.id !== activeReq.id)}
            onBrowse={() => setActiveTab('browse')}
          />
        ) : (
          <HowItWorksTab onBrowse={() => setActiveTab('browse')} />
        )
      ) : (
        <BrowseTab
          advisors={advisors}
          hasActiveSearch={hasActiveSearch}
          ongoingReq={ongoingReq}
          onViewCase={() => setActiveTab('case')}
          onOpenAdvisor={setViewingAdvisor}
          onBookAdvisor={handleBookAdvisor}
        />
      )}

      <AdvisorProfileModal
        advisor={viewingAdvisor}
        hasActiveSearch={hasActiveSearch}
        onClose={() => setViewingAdvisor(null)}
        onBook={handleBookAdvisor}
      />
    </View>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────

function Header({
  hasActiveSearch,
  ongoingReq,
}: {
  hasActiveSearch: boolean;
  ongoingReq: MatchAdvisorRequest | null;
}) {
  const { c } = useTheme();
  const needsAction = !!ongoingReq && getSearchStatusConfig(ongoingReq.status).needsAction;

  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text variant="title" tone="accent">Find for Me</Text>
        <View
          style={[
            styles.policyPill,
            { backgroundColor: needsAction ? 'rgba(199, 159, 94, 0.18)' : c.accentFaint },
          ]}
        >
          {needsAction ? <Ionicons name="mail-unread" size={11} color={palette.gold} /> : null}
          <Text
            variant="label"
            style={{ fontSize: 10, color: needsAction ? palette.burgundyDeep : c.accent }}
          >
            {needsAction ? 'Offer to review' : hasActiveSearch ? 'Search open' : 'One search at a time'}
          </Text>
        </View>
      </View>
      <Text variant="footnote" tone="muted">Personal matchmaking, from a dedicated advisor</Text>
    </View>
  );
}

function Segment({
  label,
  active,
  dotColor,
  onPress,
}: {
  label: string;
  active: boolean;
  dotColor?: string;
  onPress: () => void;
}) {
  const { c, isDark } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[
        styles.segmentBtn,
        { backgroundColor: active ? palette.burgundy : c.surfaceAlt, borderColor: active ? palette.burgundy : c.borderStrong },
        !isDark && shadow.soft,
      ]}
    >
      <View style={styles.segmentInner}>
        {dotColor ? <View style={[styles.segmentDot, { backgroundColor: dotColor }]} /> : null}
        <Text variant="subhead" style={{ fontWeight: '700', color: active ? palette.cream : c.text }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

// ── Shared pieces ────────────────────────────────────────────────────────────

/** Dot + label, coloured per-status. The one place a request's status becomes words. */
function StatusChip({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' }) {
  const cfg = getSearchStatusConfig(status);
  const small = size === 'sm';
  return (
    <View style={[styles.statusChip, { backgroundColor: cfg.bg }]}>
      <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
      <Text variant="label" style={{ fontSize: small ? 9.5 : 10.5, color: cfg.color }}>
        {small ? cfg.short : cfg.label}
      </Text>
    </View>
  );
}

/** The flat-fee structure, shown consistently wherever a price is quoted. */
function FeeBreakdown({ tone = 'surface' }: { tone?: 'surface' | 'brand' }) {
  const { c } = useTheme();
  const onBrand = tone === 'brand';
  return (
    <View
      style={[
        styles.feeCard,
        onBrand ? { backgroundColor: palette.burgundy } : { backgroundColor: c.surfaceAlt, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <View style={styles.feeHead}>
        <Text variant="footnote" style={{ color: onBrand ? 'rgba(245,240,230,0.75)' : c.textSubtle }}>
          A standard flat fee
        </Text>
        <Text variant="heading" style={{ color: onBrand ? palette.cream : c.text }}>£500</Text>
      </View>
      <View style={[styles.feeDivider, { backgroundColor: onBrand ? 'rgba(245,240,230,0.18)' : c.border }]} />
      <View style={styles.feeRow}>
        <Text variant="callout" style={{ color: onBrand ? 'rgba(245,240,230,0.9)' : c.textMuted }}>To begin your search</Text>
        <Text variant="callout" style={{ fontWeight: '700', color: onBrand ? palette.cream : c.text }}>£250</Text>
      </View>
      <View style={styles.feeRow}>
        <Text variant="callout" style={{ color: onBrand ? 'rgba(245,240,230,0.9)' : c.textMuted }}>Only once your spouse is found</Text>
        <Text variant="callout" style={{ fontWeight: '700', color: onBrand ? palette.cream : c.text }}>£250</Text>
      </View>
    </View>
  );
}

/** The four-step search journey, computed from what has actually happened. */
function ProgressStepper({ req }: { req: MatchAdvisorRequest }) {
  const { c } = useTheme();
  const ended = req.status === 'cancelled' || req.status === 'expired';
  // Each step is DONE once it's actually finished, CURRENT while it's under
  // way, never the other way round - "sourcing has started" is not the same
  // fact as "sourcing is done", and status 'active' means the former.
  const depositPaid = !!req.deposit_paid;
  const matchedDone = ['accepted', 'active', 'completed'].includes(req.status);
  const sourcingDone = req.status === 'completed';
  const sourcingCurrent = req.status === 'active';
  const spouseFound = req.status === 'completed';

  type StepState = 'done' | 'current' | 'pending';
  const state = (done: boolean, current: boolean): StepState => (done ? 'done' : ended ? 'pending' : current ? 'current' : 'pending');

  const steps: { label: string; sub: string; state: StepState }[] = [
    { label: 'Deposit', sub: depositPaid ? '£250 paid' : '£250 due', state: state(depositPaid, !depositPaid) },
    { label: 'Matched', sub: matchedDone ? 'Engaged' : 'Pending', state: state(matchedDone, depositPaid && !matchedDone) },
    { label: 'Sourcing', sub: sourcingDone ? 'Complete' : sourcingCurrent ? 'Underway' : 'Not started', state: state(sourcingDone, sourcingCurrent) },
    // No distinct "current" moment for this step - the API has nothing between
    // "sourcing" and "completed" to say a match is pending confirmation.
    { label: 'Spouse', sub: spouseFound ? 'Found' : 'Final £250', state: state(spouseFound, false) },
  ];

  return (
    <View style={styles.stepperWrap}>
      {steps.map((s, i) => (
        <View key={s.label} style={styles.stepUnit}>
          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                s.state === 'done' && { backgroundColor: c.success },
                s.state === 'current' && { backgroundColor: palette.burgundy },
                s.state === 'pending' && { backgroundColor: c.surfaceAlt, borderWidth: 1.5, borderColor: c.border },
              ]}
            >
              {s.state === 'done' ? (
                <Ionicons name="checkmark" size={13} color="#FFF" />
              ) : (
                <Text variant="label" style={{ fontSize: 11, color: s.state === 'current' ? palette.cream : c.textSubtle }}>
                  {i + 1}
                </Text>
              )}
            </View>
            <Text variant="label" style={{ fontSize: 10, textAlign: 'center', color: s.state === 'pending' ? c.textSubtle : c.text }}>
              {s.label}
            </Text>
            <Text variant="footnote" tone="muted" style={{ fontSize: 10 }} numberOfLines={1}>
              {s.sub}
            </Text>
          </View>
          {i < steps.length - 1 ? (
            <View style={[styles.stepLine, { backgroundColor: steps[i + 1].state !== 'pending' || s.state === 'done' ? c.success : c.border }]} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

// ── Case tab ─────────────────────────────────────────────────────────────────

function CaseTab({
  activeReq,
  otherRequests,
  onBrowse,
}: {
  activeReq: MatchAdvisorRequest;
  otherRequests: MatchAdvisorRequest[];
  onBrowse: () => void;
}) {
  const router = useRouter();
  const { c, isDark } = useTheme();
  const cfg = getSearchStatusConfig(activeReq.status);
  const ended = ['cancelled', 'completed', 'expired'].includes(activeReq.status);

  const bannerCopy: Partial<Record<MatchAdvisorRequest['status'], { icon: keyof typeof Ionicons.glyphMap; text: string }>> = {
    cancelled: { icon: 'information-circle', text: 'This search was cancelled. Any deposit was settled according to the Match Advisor terms.' },
    completed: { icon: 'heart-circle', text: 'Congratulations - this search concluded successfully.' },
    expired: { icon: 'time', text: 'This search period has ended and is no longer active.' },
  };
  const banner = bannerCopy[activeReq.status];

  return (
    <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
      {activeReq.status === 'offered' ? (
        <View style={[styles.offerBanner, { borderColor: palette.gold }]}>
          <View style={styles.offerBannerIcon}>
            <Ionicons name="mail-unread" size={20} color={palette.burgundyDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="subhead" style={{ fontWeight: '800', color: palette.burgundyDeep }}>
              {activeReq.advisor_name ? `${activeReq.advisor_name} sent you an offer` : 'You have a new offer'}
            </Text>
            <Text variant="footnote" style={{ color: palette.burgundyDeep, marginTop: 2, lineHeight: 17 }}>
              Review the terms and accept to begin your search.
            </Text>
          </View>
        </View>
      ) : null}

      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, !isDark && shadow.card]}>
        <View style={styles.caseTopRow}>
          <StatusChip status={activeReq.status} />
          <Text variant="footnote" tone="muted">#{String(activeReq.id).slice(0, 8).toUpperCase()}</Text>
        </View>

        <Text variant="heading" style={{ marginTop: spacing.sm }}>{getSearchDisplayTitle(activeReq)}</Text>
        <Text variant="footnote" tone="muted" style={{ marginTop: 2, marginBottom: spacing.md }}>
          Handled in confidence by a dedicated Match Advisor
        </Text>

        {banner ? (
          <View style={[styles.noticeRow, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
            <Ionicons name={banner.icon} size={17} color={cfg.color} />
            <Text variant="footnote" style={{ flex: 1, color: c.textMuted, lineHeight: 18 }}>{banner.text}</Text>
          </View>
        ) : null}

        {activeReq.advisor_name ? (
          <View style={[styles.advisorStrip, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
            {activeReq.advisor_photo_url ? (
              <Image source={{ uri: activeReq.advisor_photo_url }} style={styles.advisorStripAvatar} contentFit="cover" />
            ) : (
              <View style={[styles.advisorStripAvatar, styles.advisorStripAvatarFallback]}>
                <Ionicons name="shield-checkmark" size={22} color={palette.cream} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <View style={styles.rowGap}>
                <Text variant="subhead" style={{ fontWeight: '700' }}>{activeReq.advisor_name}</Text>
                <Ionicons name="checkmark-circle" size={15} color={c.success} />
              </View>
              <Text variant="footnote" tone="accent" style={{ marginTop: 1 }}>
                {ended ? 'Your Match Advisor' : activeReq.deposit_paid ? 'Deposit secured' : 'Deposit due'}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          {ended ? (
            <Button label="Book a New Search" variant="primary" style={styles.flex1} onPress={onBrowse} />
          ) : activeReq.status === 'offered' || activeReq.selected_offer_id == null ? (
            <Button
              label="Review & Open Case"
              variant="primary"
              style={styles.flex1}
              onPress={() => router.push({ pathname: '/(app)/requests/[id]', params: { id: activeReq.id } } as any)}
            />
          ) : (
            <Button
              label="Message Advisor"
              variant="primary"
              style={styles.flex1}
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
          )}
          {ended ? null : (
            <Button
              label="Case Details"
              variant="outline"
              style={styles.flex1}
              onPress={() => router.push({ pathname: '/(app)/requests/[id]', params: { id: activeReq.id } } as any)}
            />
          )}
        </View>
      </View>

      {!ended ? (
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, !isDark && shadow.soft]}>
          <Text variant="subhead" style={{ fontWeight: '700', marginBottom: spacing.sm }}>Search progress</Text>
          <ProgressStepper req={activeReq} />
        </View>
      ) : null}

      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, !isDark && shadow.soft]}>
        <Text variant="subhead" style={{ fontWeight: '700', marginBottom: spacing.xs }}>Preferences & criteria</Text>
        <Text variant="footnote" tone="muted" style={{ lineHeight: 19 }}>
          {activeReq.partner_preferences || 'Shared with your advisor in confidence.'}
        </Text>
        {activeReq.preferred_location ? (
          <View style={[styles.rowGap, { marginTop: spacing.sm }]}>
            <Ionicons name="location-outline" size={15} color={c.accent} />
            <Text variant="footnote" style={{ fontWeight: '600' }}>Preferred location: {activeReq.preferred_location}</Text>
          </View>
        ) : null}
      </View>

      {otherRequests.length > 0 ? (
        <View style={{ marginBottom: spacing.md }}>
          <Text variant="label" tone="muted" style={{ marginBottom: spacing.xs }}>Search history</Text>
          {otherRequests.map((req) => (
            <PressableScale
              key={req.id}
              onPress={() => router.push({ pathname: '/(app)/requests/[id]', params: { id: req.id } } as any)}
              style={{ ...styles.historyRow, backgroundColor: c.surface, borderColor: c.border, ...(isDark ? null : shadow.soft) }}
            >
              <View style={{ flex: 1, marginRight: spacing.md }}>
                <StatusChip status={req.status} size="sm" />
                <Text variant="subhead" tone="default" numberOfLines={1} style={{ fontWeight: '700', marginTop: 6 }}>
                  {getSearchDisplayTitle(req)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.textSubtle} />
            </PressableScale>
          ))}
        </View>
      ) : null}

      <Button label="Browse All Advisors" variant="outline" onPress={onBrowse} />
    </ScrollView>
  );
}

function HowItWorksTab({ onBrowse }: { onBrowse: () => void }) {
  const { c, isDark } = useTheme();
  const points: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
    { icon: 'person', title: 'One dedicated advisor', body: 'Your search has their full attention - no competing requests.' },
    { icon: 'eye-off', title: 'Completely private', body: 'Your profile is hidden from the public feed while your advisor searches.' },
    { icon: 'shield-checkmark', title: 'A clear flat fee', body: 'No surprises - the breakdown below is the whole cost.' },
  ];
  return (
    <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, !isDark && shadow.card]}>
        <Text variant="title" tone="accent" style={{ marginBottom: 4 }}>Private matchmaking</Text>
        <Text variant="footnote" tone="muted" style={{ lineHeight: 20, marginBottom: spacing.lg }}>
          Find for Me pairs you with one verified Match Advisor. To give your search real attention and complete discretion, one confidential search runs at a time, until your spouse is found.
        </Text>

        <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
          {points.map((p) => (
            <View key={p.title} style={[styles.pointRow, { backgroundColor: c.surfaceAlt }]}>
              <Ionicons name={p.icon} size={20} color={palette.burgundy} />
              <View style={{ flex: 1 }}>
                <Text variant="subhead" style={{ fontWeight: '700' }}>{p.title}</Text>
                <Text variant="footnote" tone="muted" style={{ marginTop: 1 }}>{p.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <FeeBreakdown />
        <Button label="Choose an Advisor" variant="primary" style={{ marginTop: spacing.lg }} onPress={onBrowse} />
      </View>
    </ScrollView>
  );
}

// ── Browse tab ───────────────────────────────────────────────────────────────

function BrowseTab({
  advisors,
  hasActiveSearch,
  ongoingReq,
  onViewCase,
  onOpenAdvisor,
  onBookAdvisor,
}: {
  advisors: MatchAdvisorProfile[];
  hasActiveSearch: boolean;
  ongoingReq: MatchAdvisorRequest | null;
  onViewCase: () => void;
  onOpenAdvisor: (a: MatchAdvisorProfile) => void;
  onBookAdvisor: (a: MatchAdvisorProfile) => void;
}) {
  const { c, isDark } = useTheme();

  return (
    <FlatList
      data={advisors}
      keyExtractor={(a) => a.id}
      contentContainerStyle={styles.scrollBody}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.lg }}>
          {hasActiveSearch && ongoingReq ? (
            <View style={[styles.notice, { backgroundColor: c.accentFaint, borderColor: palette.burgundy }]}>
              <View style={styles.rowGap}>
                <Ionicons name="shield-checkmark" size={17} color={palette.burgundy} />
                <Text variant="subhead" style={{ fontWeight: '700', color: palette.burgundy }}>A search is already open</Text>
              </View>
              <Text variant="footnote" style={{ lineHeight: 18, marginTop: 4, marginBottom: spacing.sm, color: c.text }}>
                You're working with {ongoingReq.advisor_name || 'your Match Advisor'}. One private search runs at a time.
              </Text>
              <Button label="View My Search" variant="primary" onPress={onViewCase} />
            </View>
          ) : (
            <View style={[styles.notice, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
              <Text variant="subhead" style={{ fontWeight: '700' }}>Every advisor here is verified</Text>
              <Text variant="footnote" tone="muted" style={{ lineHeight: 18, marginTop: 4 }}>
                Tap an advisor to see their credentials, or book directly to begin your private search.
              </Text>
            </View>
          )}

          <FeeBreakdown tone="brand" />

          <View style={{ marginTop: spacing.md }}>
            <Text variant="heading">Verified Match Advisors</Text>
            <Text variant="footnote" tone="muted">Tap an advisor for their full credentials and reviews</Text>
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <AdvisorCard
          advisor={item}
          hasActiveSearch={hasActiveSearch}
          onOpen={() => onOpenAdvisor(item)}
          onBook={() => onBookAdvisor(item)}
        />
      )}
      ListEmptyComponent={
        <EmptyState icon="people" title="No advisors yet" message="Verified advisors will appear here shortly." />
      }
    />
  );
}

function AdvisorCard({
  advisor,
  hasActiveSearch,
  onOpen,
  onBook,
}: {
  advisor: MatchAdvisorProfile;
  hasActiveSearch: boolean;
  onOpen: () => void;
  onBook: () => void;
}) {
  const { c, isDark } = useTheme();
  const isNew = advisor.reviews_count <= 0;

  return (
    <PressableScale
      onPress={onOpen}
      style={{ ...styles.card, backgroundColor: c.surface, borderColor: c.border, ...(isDark ? null : shadow.soft) }}
    >
      <View style={styles.advisorTopRow}>
        <Avatar name={advisor.display_name} photoUrl={advisor.profile_photo_url} size={58} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <View style={styles.rowGap}>
            <Text variant="subhead" style={{ fontWeight: '700' }}>{advisor.display_name}</Text>
            <Ionicons name="checkmark-circle" size={15} color={c.success} />
          </View>
          <Text variant="footnote" tone="accent" style={{ marginTop: 2 }}>{advisor.headline || 'Verified Match Advisor'}</Text>
          <View style={[styles.rowGap, { marginTop: 4, gap: 10 }]}>
            {isNew ? (
              <Text variant="label" tone="accent" style={{ fontSize: 10 }}>New advisor</Text>
            ) : (
              <View style={styles.rowGap}>
                <Ionicons name="star" size={13} color={palette.gold} />
                <Text variant="label" style={{ fontSize: 10 }}>{Number(advisor.rating).toFixed(1)} ({advisor.reviews_count})</Text>
              </View>
            )}
            {advisor.years_experience > 0 ? (
              <Text variant="label" tone="muted" style={{ fontSize: 10 }}>{advisor.years_experience}y experience</Text>
            ) : null}
          </View>
        </View>
      </View>

      {advisor.bio ? (
        <Text variant="callout" numberOfLines={2} style={{ marginTop: spacing.sm, lineHeight: 20 }}>{advisor.bio}</Text>
      ) : null}

      {advisor.expertise_tags ? (
        <View style={styles.tagsRow}>
          {advisor.expertise_tags.split(',').slice(0, 3).map((tag) => (
            <View key={tag.trim()} style={[styles.tag, { backgroundColor: c.surfaceAlt }]}>
              <Text variant="label" tone="muted" style={{ fontSize: 9.5 }}>{tag.trim()}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={[styles.cardFoot, { borderTopColor: c.border }]}>
        <View>
          <Text variant="label" tone="muted" style={{ fontSize: 9.5 }}>Flat fee</Text>
          <Text variant="callout" tone="accent" style={{ fontWeight: '700' }}>£500 (£250 to begin)</Text>
        </View>
        <View style={styles.rowGap}>
          <Button label="Profile" variant="outline" size="sm" onPress={onOpen} />
          <Button label={hasActiveSearch ? 'In progress' : 'Book'} variant={hasActiveSearch ? 'outline' : 'primary'} size="sm" onPress={onBook} />
        </View>
      </View>
    </PressableScale>
  );
}

function Avatar({ name, photoUrl, size }: { name: string; photoUrl?: string | null; size: number }) {
  return photoUrl ? (
    <Image source={{ uri: photoUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />
  ) : (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text variant={size > 70 ? 'display' : 'heading'} style={{ color: palette.cream }}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

// ── Advisor profile modal ────────────────────────────────────────────────────

function AdvisorProfileModal({
  advisor,
  hasActiveSearch,
  onClose,
  onBook,
}: {
  advisor: MatchAdvisorProfile | null;
  hasActiveSearch: boolean;
  onClose: () => void;
  onBook: (a: MatchAdvisorProfile) => void;
}) {
  const { c, isDark } = useTheme();
  if (!advisor) return null;
  const hasReviews = advisor.reviews_count > 0;

  return (
    <Modal visible={Boolean(advisor)} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { backgroundColor: c.bg }]}>
        <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
          <Text variant="subhead" style={{ fontWeight: '700' }}>Advisor profile</Text>
          <PressableScale onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={c.text} />
          </PressableScale>
        </View>

        <ScrollView contentContainerStyle={styles.modalBody}>
          <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
            <Avatar name={advisor.display_name} photoUrl={advisor.profile_photo_url} size={96} />

            <View style={[styles.rowGap, { marginTop: spacing.sm }]}>
              <Text variant="heading">{advisor.display_name}</Text>
              <Ionicons name="checkmark-circle" size={19} color={c.success} />
            </View>
            <Text variant="subhead" tone="accent" style={{ marginTop: 2, textAlign: 'center' }}>
              {advisor.headline || 'Private Matchmaking Specialist'}
            </Text>

            <View style={[styles.ratingBadge, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
              {hasReviews ? (
                <>
                  <Ionicons name="star" size={16} color={palette.gold} />
                  <Text variant="subhead" style={{ fontWeight: '800' }}>{Number(advisor.rating).toFixed(1)}</Text>
                  <Text variant="footnote" tone="muted">
                    ({advisor.reviews_count} {advisor.reviews_count === 1 ? 'review' : 'reviews'})
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={16} color={palette.burgundy} />
                  <Text variant="subhead" tone="accent" style={{ fontWeight: '800' }}>New advisor</Text>
                </>
              )}
            </View>
          </View>

          <View style={[styles.statsStrip, { backgroundColor: c.surface, borderColor: c.border }, !isDark && shadow.soft]}>
            <StatCol label="Location" value={advisor.city || 'United Kingdom'} />
            <View style={[styles.statDivider, { backgroundColor: c.border }]} />
            <StatCol label="Experience" value={advisor.years_experience > 0 ? `${advisor.years_experience} years` : 'New advisor'} />
            <View style={[styles.statDivider, { backgroundColor: c.border }]} />
            <StatCol label="Response" value={`${advisor.response_time_hours || 24}h`} />
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <Text variant="heading" style={{ marginBottom: spacing.xs }}>About</Text>
            <Text variant="body" style={{ lineHeight: 24 }}>
              {advisor.bio || 'A dedicated Match Advisor, committed to values-aligned, respectful and confidential introductions.'}
            </Text>
          </View>

          {advisor.service_areas || advisor.expertise_tags ? (
            <View style={{ marginTop: spacing.lg }}>
              <Text variant="heading" style={{ marginBottom: spacing.xs }}>Coverage & specialisms</Text>
              {advisor.service_areas ? (
                <Text variant="footnote" tone="muted" style={{ marginBottom: spacing.xs }}>{advisor.service_areas}</Text>
              ) : null}
              {advisor.expertise_tags ? (
                <View style={styles.tagsRow}>
                  {advisor.expertise_tags.split(',').map((tag) => (
                    <View key={tag.trim()} style={[styles.tag, { backgroundColor: c.surfaceAlt }]}>
                      <Text variant="label" style={{ fontSize: 10 }}>{tag.trim()}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={{ marginTop: spacing.xl }}>
            <FeeBreakdown tone="brand" />
          </View>
        </ScrollView>

        <View style={[styles.modalFoot, { backgroundColor: c.surface, borderTopColor: c.border }]}>
          <View>
            <Text variant="label" tone="muted" style={{ fontSize: 9.5 }}>Due today</Text>
            <Text variant="subhead" tone="accent" style={{ fontWeight: '800' }}>£250 deposit</Text>
          </View>
          <Button
            label={hasActiveSearch ? 'Search already open' : `Book ${advisor.display_name.split(' ')[0]}`}
            variant={hasActiveSearch ? 'outline' : 'primary'}
            style={{ flex: 1, marginLeft: spacing.md }}
            onPress={() => onBook(advisor)}
          />
        </View>
      </View>
    </Modal>
  );
}

function StatCol({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCol}>
      <Text variant="label" tone="muted" style={{ fontSize: 9.5 }}>{label}</Text>
      <Text variant="subhead" style={{ fontWeight: '700', marginTop: 2 }} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex1: { flex: 1 },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  policyPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.pill },

  segmentBar: { flexDirection: 'row', paddingHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  segmentBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, borderWidth: 1.5 },
  segmentInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  segmentDot: { width: 7, height: 7, borderRadius: 3.5 },

  scrollBody: { padding: spacing.md, paddingBottom: 120 },

  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: radii.pill },
  statusDot: { width: 6, height: 6, borderRadius: 3 },

  card: { padding: spacing.lg, borderRadius: radii.card, borderWidth: 1, marginBottom: spacing.md },

  offerBanner: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', backgroundColor: 'rgba(199, 159, 94, 0.14)', borderWidth: 1.5, borderRadius: radii.card, padding: spacing.md, marginBottom: spacing.md },
  offerBannerIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center' },

  caseTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  noticeRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', borderRadius: radii.md, borderWidth: 1, padding: spacing.sm, marginBottom: spacing.md },

  advisorStrip: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderRadius: radii.md, borderWidth: 1, marginBottom: spacing.md, gap: spacing.sm },
  advisorStripAvatar: { width: 46, height: 46, borderRadius: 23 },
  advisorStripAvatarFallback: { backgroundColor: palette.burgundy, alignItems: 'center', justifyContent: 'center' },

  actionRow: { flexDirection: 'row', gap: spacing.sm },

  stepperWrap: { flexDirection: 'row', alignItems: 'flex-start' },
  stepUnit: { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
  stepItem: { alignItems: 'center', width: 76 },
  stepDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  stepLine: { flex: 1, height: 2, marginTop: 11, marginHorizontal: -4 },

  historyRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radii.card, borderWidth: StyleSheet.hairlineWidth, marginBottom: spacing.sm },

  notice: { borderRadius: radii.card, borderWidth: 1.5, padding: spacing.md, marginBottom: spacing.md },
  pointRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', padding: spacing.sm, borderRadius: radii.md },

  feeCard: { borderRadius: radii.card, padding: spacing.lg, marginBottom: spacing.md },
  feeHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  feeDivider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.sm },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },

  advisorTopRow: { flexDirection: 'row', alignItems: 'center' },
  avatarFallback: { backgroundColor: palette.burgundy, alignItems: 'center', justifyContent: 'center' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.pill },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },

  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  closeBtn: { padding: 4 },
  modalBody: { padding: spacing.lg, paddingBottom: 120 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radii.pill, borderWidth: StyleSheet.hairlineWidth, marginTop: spacing.sm },
  statsStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderRadius: radii.card, borderWidth: StyleSheet.hairlineWidth },
  statCol: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, height: 28 },
  modalFoot: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, paddingBottom: spacing.xl, borderTopWidth: StyleSheet.hairlineWidth },
});
