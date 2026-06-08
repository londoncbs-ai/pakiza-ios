import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import type { PublicProfile } from '@/api/types';
import { fonts, palette, radii, shadow } from '@/theme';

function titleCase(s?: string | null) {
  if (!s) return null;
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

export function SwipeCard({ profile }: { profile: PublicProfile }) {
  const photo = profile.photos?.find((p) => p.is_primary)?.cdn_url ?? profile.photos?.[0]?.cdn_url;
  const faith = [titleCase(profile.religion), profile.denomination].filter(Boolean).join(' · ');
  const meta = [profile.city, profile.occupation].filter(Boolean).join('  ·  ');

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
        colors={['transparent', 'rgba(61,0,16,0.15)', 'rgba(61,0,16,0.92)']}
        locations={[0.4, 0.62, 1]}
        style={StyleSheet.absoluteFill}
      />

      {faith ? (
        <View style={styles.faithChip}>
          <Text style={styles.faithText}>{faith}</Text>
        </View>
      ) : null}

      <View style={styles.info}>
        <Text style={styles.name}>
          {profile.display_name}
          {profile.age ? <Text style={styles.age}>, {profile.age}</Text> : null}
        </Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
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
  faithChip: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(199,159,94,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  faithText: { fontFamily: fonts.bodySemibold, fontSize: 12.5, color: palette.ink, letterSpacing: 0.3 },
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
