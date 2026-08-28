import React from 'react';
import { StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { MyProfile, PublicProfile } from '@/api/types';
import { Text } from '@/components/Text';
import { label, titleCase } from '@/lib/format';
import { radii, spacing, useTheme } from '@/theme';

/**
 * The details a family actually asks about, as a two-column well of icon rows.
 *
 * Borrows the stat-grid geometry from the Fund tab so it reads as part of the
 * same app, and collapses to a single column at large Dynamic Type. A fact the
 * viewer shares gets a quiet tick beside it: a matchmaker's mark rather than a
 * graded meter, because a meter is a score and a score is a dating convention.
 *
 * Rows with no value are dropped entirely, so a sparse profile renders a
 * shorter well rather than a field of dashes.
 */

interface Fact {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | null;
  shared?: boolean;
}

function join(parts: (string | null | undefined)[], sep = '  ·  '): string | null {
  const kept = parts.filter(Boolean) as string[];
  return kept.length ? kept.join(sep) : null;
}

export function buildFacts(profile: PublicProfile, mine: MyProfile | null): Fact[] {
  const sameCity = !!(mine?.city && profile.city && mine.city.toLowerCase() === profile.city.toLowerCase());

  const all: Fact[] = [
    {
      key: 'faith',
      icon: 'moon-outline',
      label: 'Faith',
      value: join([label.religion(profile.religion), titleCase(profile.denomination)]),
      shared: !!(mine?.religion && profile.religion && mine.religion === profile.religion),
    },
    {
      key: 'age',
      icon: 'calendar-outline',
      label: 'Age',
      value: profile.age ? `${profile.age} years` : null,
    },
    {
      key: 'lives',
      icon: 'location-outline',
      label: 'Lives in',
      value: join([profile.city, profile.country_name], ', '),
      shared: sameCity,
    },
    {
      key: 'education',
      icon: 'school-outline',
      label: 'Education',
      value: label.education(profile.education_level),
      shared: !!(mine?.education_level && mine.education_level === profile.education_level),
    },
    { key: 'work', icon: 'briefcase-outline', label: 'Work', value: profile.occupation ?? null },
    {
      key: 'family',
      icon: 'home-outline',
      label: 'Family',
      value: join([label.marital(profile.marital_status), label.wantsChildren(profile.wants_children)]),
      shared: !!(mine?.wants_children && mine.wants_children === profile.wants_children),
    },
    {
      key: 'practice',
      icon: 'sparkles-outline',
      label: 'Practice',
      value: label.religiosity(profile.religiosity),
    },
    { key: 'height', icon: 'resize-outline', label: 'Height', value: label.height(profile.height_cm) },
    {
      key: 'languages',
      icon: 'chatbubbles-outline',
      label: 'Languages',
      value: label.languages(profile.languages_spoken),
    },
    { key: 'heritage', icon: 'people-outline', label: 'Heritage', value: titleCase(profile.ethnicity) },
    { key: 'community', icon: 'people-circle-outline', label: 'Community', value: titleCase(profile.caste) },
    { key: 'build', icon: 'body-outline', label: 'Build', value: label.bodyType(profile.body_type) },
    { key: 'interests', icon: 'color-palette-outline', label: 'Interests', value: profile.hobbies ?? null },
    { key: 'relocate', icon: 'airplane-outline', label: 'Relocation', value: label.relocate(profile.willing_to_relocate) },
  ];

  return all.filter((f) => !!f.value);
}

export function FactGrid({
  profile,
  mine,
  limit,
  style,
}: {
  profile: PublicProfile;
  mine: MyProfile | null;
  /** Cap the number of cells. Omit to show everything the profile has. */
  limit?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const { fontScale } = useWindowDimensions();
  const narrow = fontScale > 1.3;

  const facts = limit ? buildFacts(profile, mine).slice(0, limit) : buildFacts(profile, mine);
  if (facts.length === 0) return null;

  return (
    <View style={[styles.well, { backgroundColor: c.surfaceAlt, borderColor: c.border }, style]}>
      {facts.map((f) => (
        <View key={f.key} style={[styles.cell, { flexBasis: narrow ? '100%' : '46%' }]}>
          <View style={[styles.icon, { backgroundColor: c.accentFaint }]}>
            <Ionicons name={f.icon} size={15} color={c.accent} />
          </View>
          <View style={styles.text}>
            <Text variant="footnote" tone="muted">
              {f.label}
            </Text>
            <View style={styles.valueRow}>
              {f.shared ? (
                <Ionicons name="checkmark-circle" size={13} color={c.accent} style={styles.tick} />
              ) : null}
              <Text variant="callout" numberOfLines={2} style={styles.value}>
                {f.value}
              </Text>
            </View>
          </View>
        </View>
      ))}
      {facts.some((f) => f.shared) ? (
        <View style={styles.legend}>
          <Ionicons name="checkmark-circle" size={13} color={c.accent} />
          <Text variant="footnote" tone="subtle">Ticked details are ones you share.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  well: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  cell: { flexGrow: 1, flexDirection: 'row', gap: 10, alignItems: 'center' },
  icon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  valueRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 1 },
  tick: { marginRight: 4, marginTop: 3 },
  value: { flex: 1 },
  legend: { flexBasis: '100%', flexDirection: 'row', alignItems: 'center', gap: 6 },
});
