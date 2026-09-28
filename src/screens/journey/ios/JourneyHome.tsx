import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { matchesApi } from '@/api/matches';
import { meetingsApi } from '@/api/meetings';
import { profilesApi } from '@/api/profiles';
import type { MatchSummary, MeetingRequest, MyProfile, PublicProfile } from '@/api/types';
import { Button } from '@/components/Button';
import { ErrorState } from '@/components/ErrorState';
import { PreferencesSheet } from '@/components/PreferencesSheet';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { photoBlurRadius, primaryPhoto } from '@/lib/photos';
import { palette, radii, spacing, useTheme } from '@/theme';

/**
 * The iOS front door: a journey, not a feed.
 *
 * Marriage is a process with steps that involve other people, so the first
 * thing a member sees is where they are on that path and what the next step is.
 * Browsing profiles is one step of five, previewed below, and the things that
 * make Pakiza a matrimonial service - a personal matchmaker, meetings with a
 * wali present, community events and the Marriage Support Fund - sit beside it
 * rather than several taps away.
 *
 * Everything here is derived from data the API already returns; nothing is
 * stored client-side. Android keeps its own Discover - see (app)/discover.tsx.
 */

type StepState = 'done' | 'current' | 'upcoming';

interface Step {
  key: string;
  title: string;
  body: string;
  state: StepState;
  cta?: { label: string; onPress: () => void };
  secondary?: { label: string; onPress: () => void };
}

const INACTIVE_MEETING: MeetingRequest['status'][] = ['declined', 'cancelled'];

export default function JourneyHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();

  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mine, setMine] = useState<MyProfile | null>(null);
  const [prefsSet, setPrefsSet] = useState(false);
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [meetings, setMeetings] = useState<MeetingRequest[]>([]);
  const [intros, setIntros] = useState<PublicProfile[]>([]);
  const [prefsOpen, setPrefsOpen] = useState(false);

  const load = useCallback(async () => {
    const [mineR, prefsR, matchesR, meetingsR, introsR] = await Promise.allSettled([
      profilesApi.getMine(),
      profilesApi.getPreferences(),
      matchesApi.list(1, 50),
      meetingsApi.listMine(),
      profilesApi.discover(1, 5),
    ]);

    if (mineR.status === 'fulfilled' && mineR.value === null) {
      router.replace('/(onboarding)/profile-setup');
      return;
    }
    if (mineR.status === 'rejected') {
      setError(errorMessage(mineR.reason, 'Could not load your journey'));
      setLoaded(true);
      return;
    }

    setError(null);
    setMine(mineR.value);
    setPrefsSet(
      prefsR.status === 'fulfilled' ? Object.values(prefsR.value ?? {}).some((v) => v != null) : true
    );
    setMatches(matchesR.status === 'fulfilled' ? matchesR.value : []);
    setMeetings(meetingsR.status === 'fulfilled' ? meetingsR.value : []);
    setIntros(introsR.status === 'fulfilled' ? introsR.value : []);
    setLoaded(true);
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // ── The five steps, derived from what the member has actually done ───────

  const firstName = mine?.display_name?.split(' ')[0] ?? '';
  const chatMatch = matches.find((m) => m.conversation_id) ?? null;
  const liveMeetings = meetings.filter((m) => !INACTIVE_MEETING.includes(m.status));

  const done = {
    verified: !!mine?.is_selfie_verified,
    prefs: prefsSet,
    intros: matches.length > 0,
    meeting: liveMeetings.length > 0,
  };

  const raw: Omit<Step, 'state'>[] = [
    {
      key: 'verified',
      title: 'Verified',
      body: done.verified
        ? 'Your identity is confirmed, and so is everyone you meet here.'
        : 'Confirm your identity with a quick face scan. Every member is verified.',
      cta: done.verified ? undefined : { label: 'Verify now', onPress: () => router.push('/verify-account') },
    },
    {
      key: 'prefs',
      title: 'Who you are looking for',
      body: done.prefs
        ? 'Your preferences guide every introduction you receive.'
        : 'Share what matters to you - faith, family plans, education - so introductions are considered, not random.',
      cta: done.prefs ? undefined : { label: 'Set my preferences', onPress: () => setPrefsOpen(true) },
    },
    {
      key: 'intros',
      title: 'Considered introductions',
      body: done.intros
        ? `${matches.length} mutual ${matches.length === 1 ? 'interest' : 'interests'} so far.`
        : 'Review introductions chosen for you and express interest where it feels right. There is no swiping.',
      cta: done.intros ? undefined : { label: 'Review introductions', onPress: () => router.push('/introductions') },
    },
    {
      key: 'meeting',
      title: 'Meet with your wali present',
      body: done.meeting
        ? `${liveMeetings.length} ${liveMeetings.length === 1 ? 'meeting' : 'meetings'} arranged with our team.`
        : chatMatch
          ? `Talk with ${chatMatch.profile.display_name}, then arrange a supervised meeting. Our team verifies your wali first.`
          : 'When you and a match are ready, our team arranges a supervised meeting with a wali present.',
      cta:
        !done.meeting && chatMatch
          ? {
              label: 'Arrange a family meeting',
              onPress: () =>
                router.push({
                  pathname: '/book-meet',
                  params: {
                    conversationId: chatMatch.conversation_id!,
                    matchId: chatMatch.id,
                    name: chatMatch.profile.display_name,
                  },
                }),
            }
          : done.meeting
            ? { label: 'View my meetings', onPress: () => router.push('/meetings') }
            : undefined,
      secondary:
        !done.meeting && chatMatch
          ? {
              label: 'Say hello first',
              onPress: () =>
                router.push({
                  pathname: '/chat/[id]',
                  params: { id: chatMatch.conversation_id!, name: chatMatch.profile.display_name },
                }),
            }
          : undefined,
    },
    {
      key: 'together',
      title: 'Beginning your life together',
      body: 'The Marriage Support Fund is a community fund that helps couples afford to marry.',
      cta: { label: 'Explore the Fund', onPress: () => router.push('/(app)/fund') },
    },
  ];

  const doneByKey: Record<string, boolean> = {
    verified: done.verified,
    prefs: done.prefs,
    intros: done.intros,
    meeting: done.meeting,
    together: false,
  };
  const currentKey = raw.find((s) => !doneByKey[s.key])?.key;
  const steps: Step[] = raw.map((s) => ({
    ...s,
    state: doneByKey[s.key] ? 'done' : s.key === currentKey ? 'current' : 'upcoming',
  }));

  // ── Render ───────────────────────────────────────────────────────────────

  if (loaded && error) {
    return (
      <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <ErrorState message={error} onRetry={load} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + spacing.sm, paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text variant="label" tone="muted" style={styles.kicker}>YOUR PATH TO MARRIAGE</Text>
            <Text variant="title" tone="accent">{firstName ? `Welcome back, ${firstName}` : 'Welcome back'}</Text>
          </View>
          <HeaderIcon icon="bookmark-outline" label="Shortlist" onPress={() => router.push('/saved')} />
          <HeaderIcon icon="notifications-outline" label="Notifications" onPress={() => router.push('/notifications')} />
        </View>

        {!loaded ? (
          <View style={styles.section}>
            <Skeleton height={320} radius={radii.card} />
          </View>
        ) : (
          <View style={[styles.pathCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            {steps.map((s, i) => (
              <PathStep key={s.key} step={s} last={i === steps.length - 1} />
            ))}
          </View>
        )}

        {/* Today's introductions - a small, bounded set, not an endless feed. */}
        {loaded ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text variant="heading" tone="default">Today’s introductions</Text>
              {intros.length > 0 ? (
                <Pressable onPress={() => router.push('/introductions')} hitSlop={8} accessibilityRole="button">
                  <Text variant="footnote" tone="accent">See all</Text>
                </Pressable>
              ) : null}
            </View>

            {intros.length === 0 ? (
              <View style={[styles.emptyIntro, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                <Text variant="callout" tone="muted" center>
                  New introductions arrive as members join, matched to what you are looking for.
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.introRow}
                style={{ marginHorizontal: -spacing.lg }}
              >
                {intros.map((p) => (
                  <IntroCard key={p.user_id} profile={p} onPress={() => router.push('/introductions')} />
                ))}
              </ScrollView>
            )}
          </View>
        ) : null}

        {/* The service around the search. */}
        {loaded ? (
          <View style={styles.section}>
            <Text variant="heading" tone="default" style={{ marginBottom: spacing.md }}>Alongside your search</Text>
            <View style={[styles.rows, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Row
                icon="people-circle-outline"
                title="Personal matchmaker"
                sub="A dedicated advisor searches privately on your behalf."
                onPress={() => router.push('/(app)/advisors')}
              />
              <Row
                icon="shield-checkmark-outline"
                title="Family meetings"
                sub="Supervised meetings with your wali present, arranged by our team."
                onPress={() => router.push('/meetings')}
              />
              <Row
                icon="calendar-outline"
                title="Events"
                sub="Curated introductions and gatherings families are welcome at."
                onPress={() => router.push('/events')}
              />
              <Row
                icon="heart-circle-outline"
                title="Marriage Support Fund"
                sub="Give to, or apply for, help with the real cost of getting married."
                onPress={() => router.push('/(app)/fund')}
                last
              />
            </View>
          </View>
        ) : null}
      </ScrollView>

      <PreferencesSheet
        visible={prefsOpen}
        onClose={() => {
          setPrefsOpen(false);
          load();
        }}
      />
    </View>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────────

function HeaderIcon({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <PressableScale
      scaleTo={0.94}
      hitSlop={6}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.headerIcon, { backgroundColor: c.accentFaint }]}
    >
      <Ionicons name={icon} size={19} color={c.accent} />
    </PressableScale>
  );
}

const NODE = 26;

function PathStep({ step, last }: { step: Step; last: boolean }) {
  const { c } = useTheme();
  const { state } = step;
  const current = state === 'current';

  return (
    <View style={styles.stepRow}>
      <View style={styles.rail}>
        <View
          style={[
            styles.node,
            state === 'done' && { backgroundColor: c.accent, borderColor: c.accent },
            current && { backgroundColor: c.surface, borderColor: c.accent, borderWidth: 2.5 },
            state === 'upcoming' && { backgroundColor: c.surface, borderColor: c.borderStrong },
          ]}
        >
          {state === 'done' ? <Ionicons name="checkmark" size={15} color={palette.cream} /> : null}
          {current ? <View style={[styles.nodeDot, { backgroundColor: c.accent }]} /> : null}
        </View>
        {!last ? <View style={[styles.line, { backgroundColor: state === 'done' ? c.accent : c.border }]} /> : null}
      </View>

      <View style={[styles.stepBody, last && { paddingBottom: 0 }]}>
        <Text
          variant={current ? 'heading' : 'subhead'}
          tone={state === 'upcoming' ? 'muted' : current ? 'accent' : 'default'}
        >
          {step.title}
        </Text>
        <Text variant="footnote" tone="muted" style={styles.stepText}>{step.body}</Text>

        {step.cta && (current || state === 'done') ? (
          <View style={styles.stepActions}>
            <Button
              label={step.cta.label}
              onPress={step.cta.onPress}
              variant={current ? 'primary' : 'outline'}
              size="sm"
            />
            {step.secondary ? (
              <Button label={step.secondary.label} onPress={step.secondary.onPress} variant="ghost" size="sm" />
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function IntroCard({ profile, onPress }: { profile: PublicProfile; onPress: () => void }) {
  const { c } = useTheme();
  const photo = primaryPhoto(profile);
  const line = [profile.occupation, profile.city].filter(Boolean).join('  ·  ');
  const reason = profile.compatibility_reasons?.[0];

  return (
    <PressableScale
      scaleTo={0.97}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open introduction to ${profile.display_name}`}
      style={[styles.introCard, { backgroundColor: c.surface, borderColor: c.border }]}
    >
      {photo ? (
        <Image
          source={{ uri: photo.cdn_url }}
          style={styles.introPhoto}
          contentFit="cover"
          contentPosition="top center"
          blurRadius={photoBlurRadius(photo)}
        />
      ) : (
        <View style={[styles.introPhoto, styles.introPlaceholder]}>
          <Text variant="display" color={palette.goldSoft}>{profile.display_name[0]}</Text>
        </View>
      )}
      <View style={styles.introBody}>
        <Text variant="subhead" tone="default" numberOfLines={1}>
          {profile.display_name}
          {profile.age ? <Text variant="callout" tone="muted">{`, ${profile.age}`}</Text> : null}
        </Text>
        {line ? <Text variant="footnote" tone="muted" numberOfLines={1}>{line}</Text> : null}
        {reason ? (
          <View style={styles.reasonRow}>
            <Ionicons name="checkmark-circle" size={14} color={c.accent} />
            <Text variant="footnote" tone="accent" numberOfLines={2} style={{ flex: 1 }}>{reason}</Text>
          </View>
        ) : null}
      </View>
    </PressableScale>
  );
}

function Row({
  icon,
  title,
  sub,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
  onPress: () => void;
  last?: boolean;
}) {
  const { c } = useTheme();
  return (
    <PressableScale
      scaleTo={0.99}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={last ? styles.row : { ...styles.row, borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth }}
    >
      <View style={[styles.rowIcon, { backgroundColor: c.accentFaint }]}>
        <Ionicons name={icon} size={20} color={c.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="subhead" tone="default">{title}</Text>
        <Text variant="footnote" tone="muted" style={{ marginTop: 2 }}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={c.textSubtle} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  kicker: { letterSpacing: 1.6, marginBottom: 2 },
  headerIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },

  section: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.md },

  pathCard: {
    marginHorizontal: spacing.lg,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  stepRow: { flexDirection: 'row', gap: spacing.md },
  rail: { alignItems: 'center', width: NODE },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeDot: { width: 10, height: 10, borderRadius: 5 },
  line: { width: 2, flex: 1, marginVertical: 3, borderRadius: 1 },
  stepBody: { flex: 1, paddingBottom: spacing.lg },
  stepText: { marginTop: 3, lineHeight: 19 },
  stepActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },

  introRow: { paddingHorizontal: spacing.lg, gap: spacing.md },
  introCard: { width: 212, borderRadius: radii.card, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  introPhoto: { width: '100%', height: 150 },
  introPlaceholder: { backgroundColor: palette.burgundy, alignItems: 'center', justifyContent: 'center' },
  introBody: { padding: spacing.md, gap: 3 },
  reasonRow: { flexDirection: 'row', gap: 5, marginTop: spacing.xs, alignItems: 'flex-start' },
  emptyIntro: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg },

  rows: { borderRadius: radii.card, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  rowIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
