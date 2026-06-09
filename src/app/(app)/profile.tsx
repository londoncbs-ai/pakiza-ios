import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { profilesApi } from '@/api/profiles';
import type { MyProfile } from '@/api/types';
import { DetailRow } from '@/components/DetailRow';
import { EditProfileSheet } from '@/components/EditProfileSheet';
import { PreferencesSheet } from '@/components/PreferencesSheet';
import { label, titleCase } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { colors, fonts, palette, radii, shadow, spacing } from '@/theme';

const MAX_PHOTOS = 6;

export default function ProfileTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  // Locally-managed photo URIs (dev placeholder for picture management).
  const [photos, setPhotos] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      const p = await profilesApi.getMine();
      setProfile(p);
      // Seed the grid with any server photos that actually render (skip dev placeholders).
      const serverPhotos = (p?.photos ?? [])
        .map((ph) => ph.cdn_url)
        .filter((u) => !u.includes('cdn.example.com'));
      setPhotos((prev) => (prev.length ? prev : serverPhotos));
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const addPhoto = async () => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert('Photo limit', `You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (res.canceled) return;
    const uri = res.assets[0].uri;
    setPhotos((p) => [...p, uri]); // optimistic, local display
    profilesApi.uploadPhoto(uri).catch(() => {}); // best-effort dev upload
  };

  const removePhoto = (uri: string) => {
    setPhotos((p) => p.filter((u) => u !== uri));
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={palette.burgundy} size="large" />
      </View>
    );
  }

  const faith = profile ? [label.religion(profile.religion), profile.denomination].filter(Boolean).join(' · ') : '';
  const location = profile ? [profile.city, profile.country_name].filter(Boolean).join(', ') : '';

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>Profile</Text>

        {/* Identity card */}
        <View style={styles.identity}>
          {photos[0] ? (
            <Image source={{ uri: photos[0] }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitial}>{profile?.display_name?.[0] ?? '?'}</Text>
            </View>
          )}
          <Text style={styles.name}>
            {profile?.display_name}
            {profile?.age ? <Text style={styles.age}>, {profile.age}</Text> : null}
          </Text>
          {location ? <Text style={styles.loc}>{location}</Text> : null}

          <View style={styles.completion}>
            <Ionicons name="ribbon-outline" size={15} color={palette.gold} />
            <Text style={styles.completionText}>{profile?.profile_complete_pct ?? 0}% complete</Text>
          </View>

          <Pressable onPress={() => setEditing(true)} style={styles.editBtn}>
            <Ionicons name="create-outline" size={17} color={palette.cream} />
            <Text style={styles.editText}>Edit profile</Text>
          </Pressable>
        </View>

        {/* Photos */}
        <Section title="My photos">
          <View style={styles.photoGrid}>
            {photos.map((uri) => (
              <View key={uri} style={styles.photoTile}>
                <Image source={{ uri }} style={styles.photoImg} contentFit="cover" />
                <Pressable onPress={() => removePhoto(uri)} hitSlop={6} style={styles.removeBtn}>
                  <Ionicons name="close" size={14} color={palette.cream} />
                </Pressable>
              </View>
            ))}
            {photos.length < MAX_PHOTOS ? (
              <Pressable onPress={addPhoto} style={[styles.photoTile, styles.addTile]}>
                <Ionicons name="add" size={30} color={palette.burgundy} />
                <Text style={styles.addText}>Add</Text>
              </Pressable>
            ) : null}
          </View>
        </Section>

        {/* Details */}
        {profile ? (
          <Section title="About me">
            {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
            <View style={styles.card}>
              <DetailRow icon="moon-outline" label="Faith" value={faith || null} />
              <DetailRow icon="sparkles-outline" label="Religiosity" value={label.religiosity(profile.religiosity)} />
              <DetailRow
                icon="people-circle-outline"
                label="Caste / biradari"
                value={profile.caste ? `${titleCase(profile.caste)}${profile.caste_is_visible ? '' : '  ·  private'}` : null}
              />
              <DetailRow icon="briefcase-outline" label="Profession" value={profile.occupation} />
              <DetailRow icon="school-outline" label="Education" value={label.education(profile.education_level)} />
              <DetailRow icon="resize-outline" label="Height" value={label.height(profile.height_cm)} />
              <DetailRow icon="body-outline" label="Body type" value={label.bodyType(profile.body_type)} />
              <DetailRow icon="globe-outline" label="Ethnicity" value={titleCase(profile.ethnicity)} />
              <DetailRow icon="language-outline" label="Languages" value={label.languages(profile.languages_spoken)} />
              <DetailRow icon="heart-outline" label="Marital status" value={label.marital(profile.marital_status)} />
              <DetailRow icon="happy-outline" label="Has children" value={label.hasChildren(profile.has_children)} />
              <DetailRow icon="people-outline" label="Wants children" value={label.wantsChildren(profile.wants_children)} />
              <DetailRow icon="flame-outline" label="Smoking" value={label.smokeDrink(profile.smoking)} />
              <DetailRow icon="wine-outline" label="Drinking" value={label.smokeDrink(profile.drinking)} />
              <DetailRow icon="airplane-outline" label="Relocation" value={label.relocate(profile.willing_to_relocate)} />
            </View>
          </Section>
        ) : null}

        {/* Settings */}
        <Section title="Account">
          <View style={styles.card}>
            <SettingRow icon="options-outline" label="Partner preferences" onPress={() => setPrefsOpen(true)} />
            <View style={styles.divider} />
            <SettingRow icon="diamond-outline" label="Pakiza Premium" onPress={() => router.push('/premium')} />
            <View style={styles.divider} />
            <SettingRow icon="shield-checkmark-outline" label="Verify identity" onPress={() => router.push('/(onboarding)/id-verify')} />
            <View style={styles.divider} />
            <SettingRow icon="lock-closed-outline" label="Change password" onPress={() => router.push('/change-password')} />
            <View style={styles.divider} />
            <SettingRow icon="log-out-outline" label="Sign out" danger onPress={confirmSignOut} />
          </View>
        </Section>
      </ScrollView>

      {profile ? (
        <EditProfileSheet
          profile={profile}
          visible={editing}
          onClose={() => setEditing(false)}
          onSaved={(p) => {
            setProfile(p);
            setEditing(false);
          }}
        />
      ) : null}

      <PreferencesSheet visible={prefsOpen} onClose={() => setPrefsOpen(false)} />
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SettingRow({
  icon,
  label: text,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const color = danger ? colors.danger : palette.ink;
  return (
    <Pressable onPress={onPress} style={styles.settingRow}>
      <Ionicons name={icon} size={20} color={danger ? colors.danger : palette.burgundy} />
      <Text style={[styles.settingText, { color }]}>{text}</Text>
      <Ionicons name="chevron-forward" size={18} color={palette.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.cream },
  center: { alignItems: 'center', justifyContent: 'center' },
  h1: { fontFamily: fonts.display, fontSize: 32, color: palette.burgundy, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  identity: { alignItems: 'center', paddingHorizontal: spacing.lg },
  avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 2, borderColor: palette.gold },
  avatarPlaceholder: { backgroundColor: palette.sand, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: fonts.display, fontSize: 44, color: palette.burgundy },
  name: { fontFamily: fonts.display, fontSize: 30, color: palette.ink, marginTop: spacing.md },
  age: { fontFamily: fonts.display, fontSize: 26, color: palette.muted },
  loc: { fontFamily: fonts.body, fontSize: 14, color: palette.muted, marginTop: 2 },
  completion: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.sm },
  completionText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: palette.sienna },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: palette.burgundy,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: radii.pill,
    marginTop: spacing.lg,
  },
  editText: { fontFamily: fonts.bodySemibold, color: palette.cream, fontSize: 14.5 },
  section: { marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  sectionTitle: { fontFamily: fonts.displaySemibold, fontSize: 21, color: palette.burgundy, marginBottom: spacing.md },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoTile: { width: 104, height: 132, borderRadius: 12, overflow: 'hidden', backgroundColor: palette.white },
  photoImg: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(26,16,18,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: palette.line,
    borderStyle: 'dashed',
    gap: 2,
  },
  addText: { fontFamily: fonts.bodyMedium, fontSize: 12, color: palette.burgundy },
  bio: { fontFamily: fonts.body, fontSize: 15.5, lineHeight: 23, color: palette.ink, marginBottom: spacing.md },
  card: { backgroundColor: palette.white, borderRadius: radii.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, ...shadow.soft },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  settingText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15.5 },
  divider: { height: 1, backgroundColor: palette.line },
});
