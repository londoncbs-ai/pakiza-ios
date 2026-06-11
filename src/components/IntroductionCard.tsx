import React, { useState } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import type { PublicProfile } from '@/api/types';
import { DetailRow } from './DetailRow';
import { SafetySheet } from './SafetySheet';
import { Text } from './Text';
import { label, titleCase } from '@/lib/format';
import { fonts, palette, radii, shadow, spacing, surfaces, tint, useTheme } from '@/theme';

/** Small uppercase section heading in gold. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text variant="label" tone="gold" style={styles.sectionLabel}>
      {children}
    </Text>
  );
}

/** Religiosity rendered as a 5-dot scale with its label. */
function Religiosity({ level }: { level: number }) {
  return (
    <View style={styles.religiosity}>
      <View style={styles.dots}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={[styles.relDot, i <= level && styles.relDotOn]} />
        ))}
      </View>
      <Text variant="callout" tone="default">{label.religiosity(level)}</Text>
    </View>
  );
}

/**
 * The considered, information-rich profile review that replaces the swipe card.
 * Values and the explained compatibility come before the photo decision; the
 * full detail that used to be a tap away is the default surface.
 */
export function IntroductionCard({
  profile,
  onActioned,
}: {
  profile: PublicProfile;
  onActioned?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const [width, setWidth] = useState(0);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [safetyOpen, setSafetyOpen] = useState(false);

  const photos = [...(profile.photos ?? [])].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.order_index - b.order_index
  );
  const heroH = width ? Math.min(width * 1.18, 460) : 360;

  const faith = [label.religion(profile.religion), profile.denomination].filter(Boolean).join(' · ');
  const location = [profile.city, profile.country_name].filter(Boolean).join(', ');
  const reasons = profile.compatibility_reasons ?? [];

  const intent = [
    label.marital(profile.marital_status),
    label.wantsChildren(profile.wants_children),
    profile.has_children != null ? label.hasChildren(profile.has_children) : null,
    label.relocate(profile.willing_to_relocate),
  ].filter(Boolean) as string[];

  const onPhotoScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    setPhotoIdx(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={[styles.card, { backgroundColor: c.surface }]} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {/* Hero photo pager */}
        <View style={[styles.hero, { height: heroH }]}>
          {photos.length > 0 && width > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onPhotoScroll}
              scrollEventThrottle={16}
            >
              {photos.map((p) => (
                <Image key={p.id} source={{ uri: p.cdn_url }} style={{ width, height: heroH }} contentFit="cover" transition={180} />
              ))}
            </ScrollView>
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
              <Text style={styles.placeholderText}>{profile.display_name?.[0] ?? '?'}</Text>
            </View>
          )}

          <LinearGradient colors={tint.scrim} locations={[0, 0.55, 1]} style={styles.heroScrim} pointerEvents="none" />

          {/* photo dots */}
          {photos.length > 1 ? (
            <View style={styles.dotsTop} pointerEvents="none">
              {photos.map((p, i) => (
                <View key={p.id} style={[styles.photoDot, i === photoIdx && styles.photoDotOn]} />
              ))}
            </View>
          ) : null}

          {profile.compatibility != null ? (
            <View style={styles.matchPill} pointerEvents="none">
              <Ionicons name="sparkles" size={12} color={palette.ink} />
              <Text variant="label" color={palette.ink} style={styles.matchPillText}>
                {profile.compatibility}% match
              </Text>
            </View>
          ) : null}

          <Pressable onPress={() => setSafetyOpen(true)} hitSlop={12} style={styles.kebab}>
            <Ionicons name="ellipsis-horizontal" size={20} color={palette.cream} />
          </Pressable>

          <View style={styles.heroInfo} pointerEvents="none">
            <Text variant="display" color={palette.white} style={styles.name}>
              {profile.display_name}
              {profile.age ? <Text variant="title" color={palette.cream}>{`, ${profile.age}`}</Text> : null}
            </Text>
            {location ? (
              <View style={styles.locRow}>
                <Ionicons name="location" size={14} color={palette.goldSoft} />
                <Text variant="callout" color={palette.goldSoft}>{location}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.body}>
          {/* Why you might match - the explained compatibility */}
          {reasons.length > 0 ? (
            <View style={styles.section}>
              <SectionLabel>Why you might match</SectionLabel>
              <View style={styles.reasonCard}>
                {reasons.map((r) => (
                  <View key={r} style={styles.reasonRow}>
                    <Ionicons name="checkmark-circle" size={18} color={palette.gold} />
                    <Text variant="callout" tone="default" style={styles.reasonText}>{r}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Looking for / intent */}
          {intent.length > 0 ? (
            <View style={styles.section}>
              <SectionLabel>Looking ahead</SectionLabel>
              <View style={styles.chipWrap}>
                {intent.map((t) => (
                  <View key={t} style={styles.intentChip}>
                    <Text variant="footnote" tone="burgundy">{t}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Faith & values */}
          {faith || profile.religiosity ? (
            <View style={styles.section}>
              <SectionLabel>Faith & values</SectionLabel>
              <View style={[styles.detailCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <DetailRow icon="moon-outline" label="Faith" value={faith || null} />
                {profile.religiosity ? (
                  <View style={styles.religiosityRow}>
                    <View style={styles.iconWrap}>
                      <Ionicons name="sparkles-outline" size={18} color={palette.burgundy} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="footnote" tone="muted">Practice</Text>
                      <Religiosity level={profile.religiosity} />
                    </View>
                  </View>
                ) : null}
                <DetailRow icon="people-circle-outline" label="Caste / biradari" value={titleCase(profile.caste)} />
              </View>
            </View>
          ) : null}

          {/* About */}
          {profile.bio ? (
            <View style={styles.section}>
              <SectionLabel>About {profile.display_name.split(' ')[0]}</SectionLabel>
              <Text variant="body" tone="default" style={styles.bio}>{profile.bio}</Text>
            </View>
          ) : null}

          {/* Background */}
          <View style={styles.section}>
            <SectionLabel>Background</SectionLabel>
            <View style={styles.detailCard}>
              <DetailRow icon="briefcase-outline" label="Profession" value={profile.occupation} />
              <DetailRow icon="school-outline" label="Education" value={label.education(profile.education_level)} />
              <DetailRow icon="globe-outline" label="Ethnicity" value={titleCase(profile.ethnicity)} />
              <DetailRow icon="language-outline" label="Languages" value={label.languages(profile.languages_spoken)} />
              <DetailRow icon="resize-outline" label="Height" value={label.height(profile.height_cm)} />
              <DetailRow icon="body-outline" label="Build" value={label.bodyType(profile.body_type)} />
            </View>
          </View>

          <Pressable onPress={() => setSafetyOpen(true)} style={styles.reportRow} hitSlop={8}>
            <Ionicons name="flag-outline" size={15} color={palette.muted} />
            <Text variant="footnote" tone="muted">Report or block {profile.display_name.split(' ')[0]}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <SafetySheet
        userId={profile.user_id}
        name={profile.display_name}
        visible={safetyOpen}
        onClose={() => setSafetyOpen(false)}
        onActioned={onActioned}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radii.card,
    overflow: 'hidden',
    backgroundColor: surfaces.raised,
    ...shadow.photo,
  },
  hero: { backgroundColor: palette.burgundyDark, justifyContent: 'flex-end' },
  heroScrim: { ...StyleSheet.absoluteFillObject },
  placeholder: { backgroundColor: palette.burgundy, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontFamily: fonts.display, fontSize: 96, color: palette.goldSoft },
  dotsTop: { position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', gap: 4 },
  photoDot: { flex: 1, height: 3, borderRadius: 2, backgroundColor: tint.onDarkFaint },
  photoDotOn: { backgroundColor: palette.cream },
  matchPill: {
    position: 'absolute',
    top: 24,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: tint.goldStrong,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  matchPillText: { letterSpacing: 0.3 },
  kebab: {
    position: 'absolute',
    top: 22,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tint.overlaySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: { padding: spacing.xl },
  name: { lineHeight: 44 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  section: { marginBottom: spacing.xl },
  sectionLabel: { marginBottom: spacing.sm },
  reasonCard: {
    backgroundColor: tint.goldFaint,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: tint.goldSoft,
    padding: spacing.lg,
    gap: spacing.md,
  },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reasonText: { flex: 1 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  intentChip: {
    backgroundColor: tint.burgundyFaint,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  detailCard: {
    backgroundColor: surfaces.raised,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  religiosityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: tint.burgundyFaint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  religiosity: { marginTop: 3, gap: 6 },
  dots: { flexDirection: 'row', gap: 5 },
  relDot: { width: 18, height: 6, borderRadius: 3, backgroundColor: tint.burgundySoft },
  relDotOn: { backgroundColor: palette.gold },
  bio: { lineHeight: 23 },
  reportRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.md, marginTop: -spacing.sm },
});
