import React, { useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import type { PublicProfile } from '@/api/types';
import { DetailRow } from './DetailRow';
import { label, titleCase } from '@/lib/format';
import { colors, fonts, palette, radii, shadow, spacing } from '@/theme';

const { width: W } = Dimensions.get('window');
const HERO_H = Math.min(W * 1.15, 520);

export function ProfileDetail({
  profile,
  onClose,
  onLike,
  onPass,
}: {
  profile: PublicProfile;
  onClose: () => void;
  onLike?: () => void;
  onPass?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const photos = [...(profile.photos ?? [])].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.order_index - b.order_index
  );
  const [active, setActive] = useState(0);
  const hero = photos[active]?.cdn_url;

  const faith = [label.religion(profile.religion), profile.denomination].filter(Boolean).join(' · ');
  const location = [profile.city, profile.country_name].filter(Boolean).join(', ');

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: (onLike ? 110 : 40) + insets.bottom }}>
        <View style={styles.hero}>
          {hero ? (
            <Image source={{ uri: hero }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
              <Text style={styles.placeholderText}>{profile.display_name?.[0] ?? '?'}</Text>
            </View>
          )}
          <LinearGradient
            colors={['rgba(61,0,16,0.35)', 'transparent', 'transparent', 'rgba(61,0,16,0.95)']}
            locations={[0, 0.25, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />

          <Pressable onPress={onClose} hitSlop={12} style={[styles.close, { top: insets.top + 8 }]}>
            <Ionicons name="chevron-down" size={26} color={palette.cream} />
          </Pressable>

          <View style={styles.heroInfo}>
            <Text style={styles.name}>
              {profile.display_name}
              {profile.age ? <Text style={styles.age}>, {profile.age}</Text> : null}
            </Text>
            {location ? (
              <View style={styles.locRow}>
                <Ionicons name="location-outline" size={15} color={palette.goldSoft} />
                <Text style={styles.loc}>{location}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* photo thumbnails */}
        {photos.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
            {photos.map((p, i) => (
              <Pressable key={p.id} onPress={() => setActive(i)}>
                <Image
                  source={{ uri: p.cdn_url }}
                  style={[styles.thumb, active === i && styles.thumbActive]}
                  contentFit="cover"
                />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.body}>
          {profile.bio ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bio}>{profile.bio}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.card}>
              <DetailRow icon="moon-outline" label="Faith" value={faith || null} />
              <DetailRow icon="sparkles-outline" label="Religiosity" value={label.religiosity(profile.religiosity)} />
              <DetailRow icon="people-circle-outline" label="Caste / biradari" value={titleCase(profile.caste)} />
              <DetailRow icon="briefcase-outline" label="Profession" value={profile.occupation} />
              <DetailRow icon="school-outline" label="Education" value={label.education(profile.education_level)} />
              <DetailRow icon="resize-outline" label="Height" value={label.height(profile.height_cm)} />
              <DetailRow icon="body-outline" label="Body type" value={label.bodyType(profile.body_type)} />
              <DetailRow icon="globe-outline" label="Ethnicity" value={titleCase(profile.ethnicity)} />
              <DetailRow icon="language-outline" label="Languages" value={label.languages(profile.languages_spoken)} />
              <DetailRow icon="heart-outline" label="Marital status" value={label.marital(profile.marital_status)} />
              <DetailRow icon="happy-outline" label="Has children" value={label.hasChildren(profile.has_children)} />
              <DetailRow icon="people-outline" label="Wants children" value={label.wantsChildren(profile.wants_children)} />
            </View>
          </View>
        </View>
      </ScrollView>

      {onLike && onPass ? (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Pressable onPress={onPass} style={[styles.actionBtn, { width: 64, borderColor: palette.sienna }]}>
            <Ionicons name="close" size={26} color={palette.sienna} />
          </Pressable>
          <Pressable onPress={onLike} style={[styles.actionBtn, styles.likeBtn]}>
            <Ionicons name="heart" size={24} color={palette.cream} />
            <Text style={styles.likeText}>Like</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.cream },
  hero: { height: HERO_H, backgroundColor: palette.burgundyDark, justifyContent: 'flex-end' },
  placeholder: { backgroundColor: palette.burgundy, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontFamily: fonts.display, fontSize: 120, color: palette.goldSoft },
  close: {
    position: 'absolute',
    right: spacing.lg,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(26,16,18,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: { padding: spacing.xl },
  name: { fontFamily: fonts.display, fontSize: 42, color: palette.white },
  age: { fontFamily: fonts.display, fontSize: 36, color: palette.cream },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  loc: { fontFamily: fonts.bodyMedium, fontSize: 14.5, color: palette.goldSoft },
  thumbs: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  thumb: { width: 64, height: 80, borderRadius: 10, opacity: 0.6 },
  thumbActive: { opacity: 1, borderWidth: 2, borderColor: palette.gold },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontFamily: fonts.displaySemibold, fontSize: 22, color: palette.burgundy, marginBottom: spacing.sm },
  bio: { fontFamily: fonts.body, fontSize: 15.5, lineHeight: 23, color: palette.ink },
  card: { backgroundColor: palette.white, borderRadius: radii.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, ...shadow.soft },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: palette.cream,
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  actionBtn: {
    height: 56,
    borderRadius: radii.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  likeBtn: { flex: 1, backgroundColor: palette.burgundy, borderColor: palette.burgundy },
  likeText: { fontFamily: fonts.bodySemibold, color: palette.cream, fontSize: 16 },
});
