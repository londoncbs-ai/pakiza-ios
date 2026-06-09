import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import type { PublicProfile } from '@/api/types';
import { label } from '@/lib/format';
import { fonts, palette, radii, shadow } from '@/theme';

function titleCase(s?: string | null) {
  if (!s) return null;
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

export function SwipeCard({ profile }: { profile: PublicProfile }) {
  const photos = profile.photos ?? [];
  const photo = photos.find((p) => p.is_primary)?.cdn_url ?? photos[0]?.cdn_url;
  const faith = [titleCase(profile.religion), profile.denomination].filter(Boolean).join(' · ');

  const chips: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [];
  if (profile.city) chips.push({ icon: 'location-outline', text: profile.city });
  if (profile.occupation) chips.push({ icon: 'briefcase-outline', text: profile.occupation });
  const edu = label.education(profile.education_level);
  if (edu) chips.push({ icon: 'school-outline', text: edu });

  return (
    <View style={styles.card}>
      {photo ? (
        <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
          <Text style={styles.placeholderText}>{profile.display_name?.[0] ?? '?'}</Text>
        </View>
      )}

      <LinearGradient
        colors={['rgba(61,0,16,0.25)', 'transparent', 'rgba(61,0,16,0.2)', 'rgba(61,0,16,0.95)']}
        locations={[0, 0.35, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* photo progress dots */}
      {photos.length > 1 ? (
        <View style={styles.dots}>
          {photos.map((p, i) => (
            <View key={p.id} style={[styles.dot, i === 0 && styles.dotActive]} />
          ))}
        </View>
      ) : null}

      {faith ? (
        <View style={styles.faithChip}>
          <Ionicons name="moon" size={11} color={palette.ink} />
          <Text style={styles.faithText}>{faith}</Text>
        </View>
      ) : null}

      {profile.compatibility != null ? (
        <View style={styles.matchChip}>
          <Text style={styles.matchPct}>{profile.compatibility}%</Text>
          <Text style={styles.matchLabel}>match</Text>
        </View>
      ) : null}

      <View style={styles.info}>
        <Text style={styles.name}>
          {profile.display_name}
          {profile.age ? <Text style={styles.age}>, {profile.age}</Text> : null}
        </Text>

        <View style={styles.chipRow}>
          {chips.map((c) => (
            <View key={c.text} style={styles.chip}>
              <Ionicons name={c.icon} size={12} color="rgba(245,240,230,0.95)" />
              <Text style={styles.chipText} numberOfLines={1}>{c.text}</Text>
            </View>
          ))}
        </View>

        {profile.bio ? (
          <Text style={styles.bio} numberOfLines={2}>
            {profile.bio}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radii.card + 6,
    overflow: 'hidden',
    backgroundColor: palette.burgundyDark,
    ...shadow.card,
  },
  placeholder: { backgroundColor: palette.burgundy, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontFamily: fonts.display, fontSize: 96, color: palette.goldSoft },
  dots: { position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', gap: 4 },
  dot: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(245,240,230,0.4)' },
  dotActive: { backgroundColor: palette.cream },
  faithChip: {
    position: 'absolute',
    top: 26,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(199,159,94,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  faithText: { fontFamily: fonts.bodySemibold, fontSize: 12.5, color: palette.ink, letterSpacing: 0.3 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245,240,230,0.16)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    maxWidth: '60%',
  },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: 'rgba(245,240,230,0.95)' },
  matchChip: {
    position: 'absolute',
    top: 26,
    right: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(61,0,16,0.55)',
    borderColor: palette.gold,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  matchPct: { fontFamily: fonts.bodySemibold, fontSize: 15, color: palette.goldSoft, lineHeight: 17 },
  matchLabel: { fontFamily: fonts.body, fontSize: 9.5, color: 'rgba(245,240,230,0.8)', letterSpacing: 1, textTransform: 'uppercase' },
  info: { position: 'absolute', left: 20, right: 20, bottom: 22 },
  name: { fontFamily: fonts.display, fontSize: 38, color: palette.white, lineHeight: 42 },
  age: { fontFamily: fonts.display, fontSize: 32, color: palette.cream },
  meta: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14.5,
    color: 'rgba(245,240,230,0.92)',
    marginTop: 4,
  },
  bio: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: 'rgba(245,240,230,0.85)',
    marginTop: 8,
    lineHeight: 20,
  },
});
