import React, { useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import type { PublicProfile } from '@/api/types';
import { DetailRow } from './DetailRow';
import { SafetySheet } from './SafetySheet';
import { Text } from './Text';
import { label, titleCase } from '@/lib/format';
import { sortedPhotos } from '@/lib/photos';
import { fonts, palette, radii, shadow, spacing, tint, useTheme } from '@/theme';

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
  const { c, isDark } = useTheme();
  const photos = sortedPhotos(profile.photos);
  const [active, setActive] = useState(0);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const hero = photos[active]?.cdn_url;

  const faith = [label.religion(profile.religion), profile.denomination].filter(Boolean).join(' · ');
  const location = [profile.city, profile.country_name].filter(Boolean).join(', ');

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
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
            colors={tint.scrim}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <Pressable onPress={onClose} hitSlop={12} style={[styles.close, { top: insets.top + 8 }]}>
            <Ionicons name="chevron-down" size={26} color={palette.cream} />
          </Pressable>
          <Pressable onPress={() => setSafetyOpen(true)} hitSlop={12} style={[styles.kebab, { top: insets.top + 8 }]}>
            <Ionicons name="ellipsis-horizontal" size={22} color={palette.cream} />
          </Pressable>

          <View style={styles.heroInfo} pointerEvents="box-none">
            {profile.compatibility != null ? (
              <View style={[styles.matchPill, { backgroundColor: palette.burgundy }]} pointerEvents="none">
                <Ionicons name="sparkles" size={12} color={palette.cream} />
                <Text variant="label" color={palette.cream} style={styles.matchPillText}>
                  {profile.compatibility}% match
                </Text>
              </View>
            ) : null}
            <Text variant="display" color={palette.white} style={styles.name}>
              {profile.display_name}
              {profile.age ? <Text variant="title" color={palette.cream}>{`, ${profile.age}`}</Text> : null}
            </Text>
            {location ? (
              <View style={styles.locRow}>
                <Ionicons name="location" size={14} color={palette.cream} />
                <Text variant="callout" color={palette.cream}>{location}</Text>
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
                  style={[
                    styles.thumb,
                    { backgroundColor: c.surfaceAlt },
                    active === i && [styles.thumbActive, { borderColor: c.accent }],
                  ]}
                  contentFit="cover"
                />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.body}>
          {profile.bio ? (
            <View style={styles.section}>
              <Text variant="label" tone="accent" style={styles.sectionLabel}>About {profile.display_name.split(' ')[0]}</Text>
              <Text variant="body" tone="default" style={styles.bio}>{profile.bio}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text variant="label" tone="accent" style={styles.sectionLabel}>Details</Text>
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, !isDark && shadow.soft]}>
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
        <View
          style={[
            styles.actionBar,
            { backgroundColor: c.bg, borderTopColor: c.border, paddingBottom: insets.bottom + spacing.sm },
          ]}
        >
          <Pressable onPress={onPass} style={[styles.actionBtn, styles.passBtn, { borderColor: c.borderStrong }]}>
            <Ionicons name="close" size={26} color={c.textMuted} />
          </Pressable>
          <Pressable onPress={onLike} style={[styles.actionBtn, styles.likeBtn]}>
            <Ionicons name="heart" size={24} color={palette.cream} />
            <Text variant="subhead" color={palette.cream}>Like</Text>
          </Pressable>
        </View>
      ) : null}

      <SafetySheet
        userId={profile.user_id}
        name={profile.display_name}
        visible={safetyOpen}
        onClose={() => setSafetyOpen(false)}
        onActioned={onClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { height: HERO_H, backgroundColor: palette.burgundyDark, justifyContent: 'flex-end' },
  placeholder: { backgroundColor: palette.burgundy, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontFamily: fonts.display, fontSize: 120, color: palette.cream },
  close: {
    position: 'absolute',
    right: spacing.lg,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: tint.overlaySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kebab: {
    position: 'absolute',
    right: spacing.lg + 46,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: tint.overlaySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: { padding: spacing.xl },
  matchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radii.pill,
    marginBottom: spacing.md,
  },
  matchPillText: { letterSpacing: 0.3 },
  name: { lineHeight: 46 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  thumbs: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  thumb: { width: 64, height: 80, borderRadius: radii.md, opacity: 0.55 },
  thumbActive: { opacity: 1, borderWidth: 2 },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  section: { marginBottom: spacing.xl },
  sectionLabel: { marginBottom: spacing.sm },
  bio: { lineHeight: 23 },
  card: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    height: 56,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  passBtn: { width: 64, borderWidth: 1.5 },
  likeBtn: { flex: 1, backgroundColor: palette.burgundy },
});
