import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { givingApi } from '@/api/giving';
import type { Application, Donation, Donor, FundSummary, ImpactEntry } from '@/api/types';
import { Button } from '@/components/Button';
import { ErrorState } from '@/components/ErrorState';
import { FeatureHint } from '@/components/FeatureHint';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { Text } from '@/components/Text';
import { BOOSTS_ENABLED, DONATIONS_ENABLED } from '@/lib/features';
import { formatPounds } from '@/lib/format';
import {
  APPLICATION_STATUS_HINT,
  APPLICATION_STATUS_LABEL,
  DONATION_STATUS_LABEL,
  applicationTone,
  donationTone,
  formatGivingDate,
  type GivingTone,
} from '@/lib/giving';
import { radii, spacing, useTheme } from '@/theme';

export default function Fund() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c, isDark } = useTheme();

  const [fund, setFund] = useState<FundSummary | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [stories, setStories] = useState<ImpactEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [f, d, a, dn, st] = await Promise.all([
        givingApi.fund(),
        givingApi.myDonations(),
        givingApi.myApplications(),
        givingApi.donors(),
        givingApi.stories(),
      ]);
      setFund(f);
      setDonations(d);
      setApplications(a);
      setDonors(dn);
      setStories(st);
    } catch (err) {
      setError(errorMessage(err, 'Could not load the fund'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const currency = fund?.currency ?? 'GBP';

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: c.border }]}>
        <Text variant="subhead" tone="default">Support Fund</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.accent} size="large" />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => { setLoading(true); load(); }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxxl }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
        >
          {/* Hero */}
          <View style={[styles.crest, { backgroundColor: c.accentFaint }]}>
            <Ionicons name="heart" size={22} color={c.accent} />
          </View>
          <Text variant="display" tone="default" style={styles.lead}>Marriage Support Fund</Text>
          <Text variant="callout" tone="muted" style={styles.sub}>
            A sadaqah jariyah from our community: helping couples in need cover the cost of a blessed,
            dignified marriage.
          </Text>

          {/* Headline: what the community has raised, and what is available to give now. */}
          <View style={styles.statGrid}>
            <Stat
              label="Raised together"
              value={formatPounds(fund?.total_raised_pence, currency)}
              icon="people-outline"
            />
            <Stat
              label="Available now"
              value={formatPounds(fund?.total_available_pence, currency)}
              icon="wallet-outline"
            />
            <Stat
              label="Marriages supported"
              value={String(fund?.marriages_supported ?? 0)}
              icon="heart-circle-outline"
            />
            <Stat
              label="Your giving"
              value={formatPounds(fund?.my_total_pence, currency)}
              icon="gift-outline"
            />
          </View>

          {/* CTAs. In-app donations are hidden until payments ship; donors can
              still give on the website and the fund page stays informational. */}
          {DONATIONS_ENABLED ? (
            <Button label="Donate" onPress={() => router.push('/donate')} style={styles.cta} />
          ) : null}
          <Button
            label="Apply for support"
            variant="secondary"
            onPress={() => router.push('/apply-support')}
            style={styles.cta}
          />

          {/* Stories of supported marriages (with images, like the news page) */}
          <Section title="Stories of supported marriages">
            {stories.length > 0 ? (
              <View style={styles.feed}>
                {stories.map((s) => (
                  <Surface key={s.id} style={isDark ? styles.storyCard : [styles.storyCard, styles.softShadow]}>
                    {s.image_url ? (
                      <Image source={{ uri: s.image_url }} style={styles.storyImage} contentFit="cover" transition={150} />
                    ) : null}
                    <View style={styles.storyBody}>
                      {s.title ? (
                        <Text variant="heading" tone="default" style={styles.storyTitle}>{s.title}</Text>
                      ) : null}
                      <Text variant="callout" tone="default" style={styles.storyBlurb}>{s.blurb}</Text>
                      <Text variant="footnote" tone="subtle" style={styles.storyMeta}>
                        {[s.city, formatGivingDate(s.supported_at)].filter(Boolean).join('  ·  ')}
                      </Text>
                    </View>
                  </Surface>
                ))}
              </View>
            ) : (
              <Surface alt style={styles.placeholder}>
                <Text variant="callout" tone="muted" center>
                  As the fund supports marriages, their stories will appear here, with the family's blessing.
                </Text>
              </Surface>
            )}
          </Section>

          {/* Donor wall */}
          <Section title="Our donors">
            {donors.length > 0 ? (
              <Surface style={styles.listCard}>
                {donors.map((d, i) => (
                  <View key={`${d.created_at}-${i}`}>
                    {i > 0 ? <View style={[styles.rowDivider, { backgroundColor: c.border }]} /> : null}
                    <View style={styles.giveRow}>
                      <View style={[styles.donorIcon, { backgroundColor: c.accentFaint }]}>
                        <Ionicons
                          name={d.name ? 'person-outline' : 'lock-closed-outline'}
                          size={15}
                          color={c.accent}
                        />
                      </View>
                      <View style={styles.giveLeft}>
                        <Text variant="subhead" tone="default" numberOfLines={1}>
                          {d.name ?? 'A secret donor'}
                        </Text>
                        <Text variant="footnote" tone="subtle" style={{ marginTop: 1 }}>
                          {formatGivingDate(d.created_at)}
                        </Text>
                      </View>
                      <Text variant="subhead" tone="accent">{formatPounds(d.amount_pence, currency)}</Text>
                    </View>
                  </View>
                ))}
              </Surface>
            ) : (
              <Surface alt style={styles.placeholder}>
                <Text variant="callout" tone="muted" center>
                  Be the first to give. Every gift, given sincerely, can change a life.
                </Text>
              </Surface>
            )}
          </Section>

          {/* Your giving */}
          <Section title="Your giving">
            {donations.length > 0 ? (
              <Surface style={styles.listCard}>
                {donations.map((d, i) => (
                  <View key={d.id}>
                    {i > 0 ? <View style={[styles.rowDivider, { backgroundColor: c.border }]} /> : null}
                    <View style={styles.giveRow}>
                      <View style={styles.giveLeft}>
                        <Text variant="subhead" tone="default">{formatPounds(d.amount_pence, d.currency)}</Text>
                        <Text variant="footnote" tone="subtle" style={{ marginTop: 1 }}>
                          {formatGivingDate(d.created_at)}
                          {d.is_anonymous ? '  ·  Secret donor' : ''}
                        </Text>
                      </View>
                      <Badge label={DONATION_STATUS_LABEL[d.status]} tone={donationTone(d.status)} />
                    </View>
                  </View>
                ))}
              </Surface>
            ) : (
              <Surface alt style={styles.placeholder}>
                <Text variant="callout" tone="muted" center>
                  You have not given yet. Even a small gift, given sincerely, can change a life.
                </Text>
              </Surface>
            )}
          </Section>

          {/* Your applications */}
          {applications.length > 0 ? (
            <Section title="Your applications">
              <Surface style={styles.listCard}>
                {applications.map((a, i) => (
                  <Pressable
                    key={a.id}
                    onPress={() => router.push({ pathname: '/apply-support', params: { id: a.id } })}
                  >
                    {i > 0 ? <View style={[styles.rowDivider, { backgroundColor: c.border }]} /> : null}
                    <View style={styles.giveRow}>
                      <View style={styles.giveLeft}>
                        <Text variant="subhead" tone="default" numberOfLines={1}>
                          Support application
                        </Text>
                        <Text variant="footnote" tone="subtle" style={{ marginTop: 1 }} numberOfLines={1}>
                          {APPLICATION_STATUS_HINT[a.status]}
                        </Text>
                      </View>
                      <Badge label={APPLICATION_STATUS_LABEL[a.status]} tone={applicationTone(a.status)} />
                    </View>
                  </Pressable>
                ))}
              </Surface>
            </Section>
          ) : null}

          {BOOSTS_ENABLED ? (
            <FeatureHint
              hintKey="support-fund-boost"
              icon="flash"
              text="New: boost your profile to the top of discovery for an hour."
              onPress={() => router.push('/boost')}
              style={styles.hint}
            />
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }) {
  const { c, isDark } = useTheme();
  return (
    <Surface style={isDark ? styles.stat : [styles.stat, styles.softShadow]}>
      <Ionicons name={icon} size={18} color={c.accent} />
      <Text variant="title" tone="default" style={styles.statValue}>{value}</Text>
      <Text variant="footnote" tone="muted">{label}</Text>
    </Surface>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="heading" tone="accent" style={{ marginBottom: spacing.md }}>{title}</Text>
      {children}
    </View>
  );
}

function Badge({ label, tone }: { label: string; tone: GivingTone }) {
  const { c } = useTheme();
  const bg: Record<GivingTone, string> = {
    pending: c.surfaceAlt,
    progress: c.accentFaint,
    good: c.accentFaint,
    ended: c.surfaceAlt,
  };
  const fg: Record<GivingTone, 'muted' | 'accent' | 'success'> = {
    pending: 'muted',
    progress: 'accent',
    good: 'success',
    ended: 'muted',
  };
  return (
    <View style={[styles.badge, { backgroundColor: bg[tone] }]}>
      <Text variant="label" tone={fg[tone]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  crest: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  lead: { letterSpacing: -0.5 },
  sub: { marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: 21 },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  stat: { flexGrow: 1, flexBasis: '46%', padding: spacing.lg, gap: spacing.xs },
  statValue: { marginTop: spacing.xs },
  softShadow: {
    shadowColor: '#3D0010',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },

  cta: { marginTop: spacing.lg },

  section: { marginTop: spacing.xl },

  feed: { gap: spacing.md },
  storyCard: { padding: 0, overflow: 'hidden' },
  storyImage: { width: '100%', height: 170 },
  storyBody: { padding: spacing.lg, gap: spacing.sm },
  storyTitle: {},
  storyBlurb: { lineHeight: 22 },
  storyMeta: {},

  listCard: { paddingHorizontal: spacing.lg },
  rowDivider: { height: StyleSheet.hairlineWidth },
  giveRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  giveLeft: { flex: 1 },
  donorIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

  placeholder: { padding: spacing.lg },

  badge: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radii.pill },

  hint: { marginTop: spacing.xl },
});
