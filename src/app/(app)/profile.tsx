import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';

import { authApi } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { profilesApi } from '@/api/profiles';
import type { MyProfile, Photo, UpdateProfileInput } from '@/api/types';
import { DetailRow } from '@/components/DetailRow';
import { EditProfileSheet } from '@/components/EditProfileSheet';
import { PreferencesSheet } from '@/components/PreferencesSheet';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { Text } from '@/components/Text';
import { ToggleRow } from '@/components/ToggleRow';
import { syncContactHashes } from '@/lib/contactPrivacy';
import { BOOSTS_ENABLED, SUBSCRIPTIONS_ENABLED } from '@/lib/features';
import { label, titleCase } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { sortedPhotos } from '@/lib/photos';
import { useAuth } from '@/store/auth';
import { fonts, palette, radii, spacing, useTheme, type ThemePreference } from '@/theme';

const MAX_PHOTOS = 6;

export default function ProfileTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const { c } = useTheme();

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  // Server photos are the source of truth (each carries an id so it can be
  // deleted); `uploading` holds local uris still being sent, shown as pending
  // tiles.
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState<string[]>([]);

  const load = useCallback(async (): Promise<MyProfile | null> => {
    try {
      const p = await profilesApi.getMine();
      setProfile(p);
      setPhotos(sortedPhotos(p?.photos).filter((ph) => !ph.cdn_url.includes('cdn.example.com')));
      return p;
    } catch {
      setProfile(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // After a photo change, if it cost the member their verified badge (the
  // server re-checks the gallery against the stored selfie), tell them and
  // offer to re-verify - a silent revocation is confusing.
  const afterPhotoChange = useCallback(async (wasVerified?: boolean) => {
    const p = await load();
    if (wasVerified && p && !p.is_selfie_verified) {
      Alert.alert(
        'Verify your photo again',
        'Your photos changed, so we need a quick new face scan to restore your verified badge.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Verify now', onPress: () => router.push('/(onboarding)/face-verify') },
        ],
      );
    }
  }, [load, router]);

  const addPhoto = async () => {
    const remaining = MAX_PHOTOS - (photos.length + uploading.length);
    if (remaining <= 0) {
      Alert.alert('Photo limit', `You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      orderedSelection: true,
    });
    if (res.canceled) return;
    const fresh = res.assets
      .map((a) => a.uri)
      .filter((u, i, arr) => arr.indexOf(u) === i)
      .slice(0, remaining);
    if (fresh.length === 0) return;
    const wasVerified = profile?.is_selfie_verified;
    setUploading((u) => [...u, ...fresh]);
    // One at a time so the server assigns primary/order correctly and the
    // selfie re-check runs per photo.
    for (const uri of fresh) {
      try {
        await profilesApi.uploadPhoto(uri);
      } catch (err) {
        Alert.alert('Upload failed', errorMessage(err, 'That photo could not be uploaded. Please try again.'));
      } finally {
        setUploading((u) => u.filter((x) => x !== uri));
      }
    }
    // Reload from the server so the tiles reflect what was actually saved, and
    // surface any verification change.
    await afterPhotoChange(wasVerified);
  };

  const removePhoto = (photo: Photo) => {
    Alert.alert('Remove photo', 'Remove this photo from your profile?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const wasVerified = profile?.is_selfie_verified;
          try {
            await profilesApi.deletePhoto(photo.id);
            await afterPhotoChange(wasVerified);
          } catch (err) {
            Alert.alert('Could not remove', errorMessage(err, 'Please try again.'));
          }
        },
      },
    ]);
  };

  const sendEmailVerify = async () => {
    try {
      await authApi.sendEmailVerification();
      Alert.alert('Check your inbox', `We've sent a verification link to ${profile?.email ?? 'your email'}.`);
    } catch (err) {
      Alert.alert('Could not send', errorMessage(err, 'Please try again in a moment.'));
    }
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  // Privacy toggles save straight away - members should not have to discover
  // them inside the edit sheet. Optimistic flip, reverted if the save fails.
  const setPrivacy = async (
    patch: Pick<UpdateProfileInput, 'photos_blurred' | 'hide_from_contacts'>,
  ) => {
    if (!profile) return;
    const prev = profile;
    // Turning hide-from-contacts on needs the phone book: hash the numbers on
    // device and upload before the flag goes live. Numbers themselves never
    // leave the phone. If access is denied, leave the toggle off rather than
    // saving a promise we cannot keep.
    if (patch.hide_from_contacts && !profile.hide_from_contacts) {
      const res = await syncContactHashes(profile.phone);
      if (res === 'permission-denied') {
        Alert.alert(
          'Contacts access needed',
          'To hide from your contacts, Pakiza needs contacts access. Only anonymous codes are uploaded, never names or numbers.',
        );
        return;
      }
    }
    setProfile({ ...profile, ...patch });
    try {
      const updated = await profilesApi.update(patch);
      setProfile(updated);
    } catch (err) {
      setProfile(prev);
      Alert.alert('Could not save', errorMessage(err, 'Please try again.'));
    }
  };

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={palette.burgundy} size="large" />
      </Screen>
    );
  }

  const faith = profile ? [label.religion(profile.religion), profile.denomination].filter(Boolean).join(' · ') : '';
  const location = profile ? [profile.city, profile.country_name].filter(Boolean).join(', ') : '';
  const pct = profile?.profile_complete_pct ?? 0;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="title" tone="burgundy" style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
          Profile
        </Text>

        {/* Identity card */}
        <Surface elevated style={styles.identity}>
          {photos[0] ? (
            <Image source={{ uri: photos[0].cdn_url }} style={[styles.avatar, { borderColor: c.accent }]} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, { borderColor: c.accent, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={styles.avatarInitial}>{profile?.display_name?.[0] ?? '?'}</Text>
            </View>
          )}
          <Text variant="title" tone="default" style={{ marginTop: spacing.md }}>
            {profile?.display_name}
            {profile?.age ? <Text variant="heading" tone="muted">{`, ${profile.age}`}</Text> : null}
          </Text>
          {location ? <Text variant="callout" tone="muted" style={{ marginTop: 2 }}>{location}</Text> : null}

          {/* Completion meter */}
          <View style={styles.meterRow}>
            <View style={[styles.meterTrack, { backgroundColor: c.surfaceAlt }]}>
              <View style={[styles.meterFill, { width: `${pct}%`, backgroundColor: c.accent }]} />
            </View>
            <Text variant="footnote" tone="muted">{pct}% complete</Text>
          </View>

          <Pressable onPress={() => { haptics.selection(); setEditing(true); }} style={styles.editBtn}>
            <Ionicons name="create-outline" size={17} color={palette.cream} />
            <Text variant="subhead" color={palette.cream}>Edit profile</Text>
          </Pressable>
        </Surface>

        {/* Photos */}
        <Section title="My photos">
          <View style={styles.photoGrid}>
            {photos.map((ph) => (
              <View key={ph.id} style={[styles.photoTile, { backgroundColor: c.surfaceAlt }]}>
                <Image source={{ uri: ph.cdn_url }} style={styles.photoImg} contentFit="cover" />
                <Pressable onPress={() => removePhoto(ph)} hitSlop={6} style={styles.removeBtn}>
                  <Ionicons name="close" size={14} color={palette.cream} />
                </Pressable>
              </View>
            ))}
            {uploading.map((uri) => (
              <View key={uri} style={[styles.photoTile, { backgroundColor: c.surfaceAlt }]}>
                <Image source={{ uri }} style={styles.photoImg} contentFit="cover" />
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator color={palette.cream} />
                </View>
              </View>
            ))}
            {photos.length + uploading.length < MAX_PHOTOS ? (
              <Pressable onPress={addPhoto} style={[styles.photoTile, styles.addTile, { borderColor: c.borderStrong }]}>
                <Ionicons name="add" size={30} color={palette.burgundy} />
                <Text variant="footnote" tone="burgundy">Add</Text>
              </Pressable>
            ) : null}
          </View>
        </Section>

        {/* Details */}
        {profile ? (
          <Section title="About me">
            {profile.bio ? <Text variant="body" tone="default" style={styles.bio}>{profile.bio}</Text> : null}
            <Surface elevated style={styles.card}>
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
            </Surface>
          </Section>
        ) : null}

        {/* Appearance */}
        <Section title="Appearance">
          <Surface elevated style={styles.cardPad}>
            <AppearanceToggle />
          </Surface>
        </Section>

        {/* Privacy */}
        {profile ? (
          <Section title="Privacy">
            <Surface elevated style={styles.cardPad}>
              <ToggleRow
                label="Blur my photos until matched"
                hint="Members you have not matched with see your photos blurred. Once you match, they see them clearly."
                value={profile.photos_blurred ?? false}
                onValueChange={(v) => setPrivacy({ photos_blurred: v })}
                onDark={false}
              />
              <ToggleRow
                label="Hide me from my phone contacts"
                hint="People in your phone book will not see your profile. Only anonymous codes are uploaded, never names or numbers."
                value={profile.hide_from_contacts ?? false}
                onValueChange={(v) => setPrivacy({ hide_from_contacts: v })}
                onDark={false}
              />
            </Surface>
          </Section>
        ) : null}

        {/* Account */}
        <Section title="Account">
          <Surface elevated style={styles.card}>
            <SettingRow icon="calendar-outline" label="My meetings" onPress={() => router.push('/meetings')} />
            <Divider />
            <SettingRow icon="options-outline" label="Partner preferences" onPress={() => setPrefsOpen(true)} />
            <Divider />
            {SUBSCRIPTIONS_ENABLED ? (
              <>
                <SettingRow icon="diamond-outline" label="Pakiza Premium" onPress={() => router.push('/premium')} />
                <Divider />
              </>
            ) : null}
            {BOOSTS_ENABLED || SUBSCRIPTIONS_ENABLED ? (
              <>
                <SettingRow icon="flash-outline" label="Boost my profile" onPress={() => router.push('/boost')} />
                <Divider />
              </>
            ) : null}
            <SettingRow icon="search-outline" label="Find for me" onPress={() => router.push('/(app)/find-for-me' as any)} />
            <Divider />
            <Divider />
            <SettingRow icon="heart-outline" label="Support a marriage" onPress={() => router.push('/fund')} />
            <Divider />
            {profile?.is_selfie_verified ? (
              <>
                <SettingRow
                  icon="shield-checkmark-outline"
                  label="Face verification"
                  badge="Verified"
                  onPress={() =>
                    Alert.alert(
                      'You are verified',
                      'Your face verification is complete. If you change your photos, we may ask you to verify again to keep the badge.',
                    )
                  }
                />
                <Divider />
              </>
            ) : (
              <>
                <SettingRow icon="scan-outline" label="Verify your face" onPress={() => router.push('/(onboarding)/face-verify')} />
                <Divider />
              </>
            )}
            {profile?.email && profile.email_verified === false ? (
              <>
                <SettingRow icon="alert-circle-outline" label="Verify your email" onPress={sendEmailVerify} />
                <Divider />
              </>
            ) : null}
            <SettingRow icon="mail-outline" label="Change email" onPress={() => router.push('/change-email')} />
            <Divider />
            <SettingRow icon="lock-closed-outline" label="Change password" onPress={() => router.push('/change-password')} />
            <Divider />
            <SettingRow icon="chatbubbles-outline" label="Help and support" onPress={() => router.push('/support')} />
            <Divider />
            <SettingRow icon="remove-circle-outline" label="Blocked members" onPress={() => router.push('/blocked-members')} />
            <Divider />
            <SettingRow icon="log-out-outline" label="Sign out" danger onPress={confirmSignOut} />
            <Divider />
            <SettingRow icon="trash-outline" label="Delete account" danger onPress={() => router.push('/delete-account')} />
          </Surface>
        </Section>

        <Section title="Policies">
          <Surface elevated style={styles.card}>
            <SettingRow icon="document-text-outline" label="Terms & billing" onPress={() => router.push('/terms')} />
            <Divider />
            <SettingRow icon="shield-outline" label="Privacy Policy" onPress={() => router.push('/privacy')} />
            <Divider />
            <SettingRow icon="people-circle-outline" label="Community Guidelines" onPress={() => router.push('/community')} />
          </Surface>
        </Section>
      </ScrollView>

      {profile ? (
        <EditProfileSheet
          profile={profile}
          visible={editing}
          onClose={() => setEditing(false)}
          onSaved={(p) => { setProfile(p); setEditing(false); }}
        />
      ) : null}

      <PreferencesSheet visible={prefsOpen} onClose={() => setPrefsOpen(false)} />
    </Screen>
  );
}

/** Light / Dark / System segmented control. */
function AppearanceToggle() {
  const { c, preference, setPreference } = useTheme();
  const opts: { key: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'light', label: 'Light', icon: 'sunny-outline' },
    { key: 'dark', label: 'Dark', icon: 'moon-outline' },
    { key: 'system', label: 'System', icon: 'phone-portrait-outline' },
  ];
  return (
    <View style={[styles.segment, { backgroundColor: c.surfaceAlt }]}>
      {opts.map((o) => {
        const active = preference === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => { haptics.selection(); setPreference(o.key); }}
            style={[styles.segmentItem, active && { backgroundColor: palette.burgundy }]}
          >
            <Ionicons name={o.icon} size={16} color={active ? palette.cream : c.textMuted} />
            <Text variant="footnote" color={active ? palette.cream : c.textMuted}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="heading" tone="burgundy" style={{ marginBottom: spacing.md }}>{title}</Text>
      {children}
    </View>
  );
}

function Divider() {
  const { c } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border }} />;
}

function SettingRow({
  icon,
  label: text,
  onPress,
  danger,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  badge?: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable onPress={() => { haptics.selection(); onPress(); }} style={styles.settingRow}>
      <Ionicons name={icon} size={20} color={danger ? c.danger : palette.burgundy} />
      <Text variant="callout" color={danger ? c.danger : c.text} style={{ flex: 1 }}>{text}</Text>
      {badge ? (
        <View style={[styles.settingBadge, { backgroundColor: c.accentFaint }]}>
          <Text variant="label" tone="accent">{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={c.textSubtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  identity: { alignItems: 'center', paddingVertical: spacing.xl, marginHorizontal: spacing.lg },
  avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 2, borderColor: palette.gold },
  avatarInitial: { fontFamily: fonts.display, fontSize: 44, color: palette.burgundy },
  meterRow: { alignItems: 'center', gap: 6, marginTop: spacing.md, width: '70%' },
  meterTrack: { height: 6, borderRadius: 3, width: '100%', overflow: 'hidden' },
  meterFill: { height: 6, borderRadius: 3, backgroundColor: palette.gold },
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
  section: { marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoTile: { width: 104, height: 132, borderRadius: 12, overflow: 'hidden' },
  photoImg: { width: '100%', height: '100%' },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,16,17,0.45)',
  },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(20,16,17,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', gap: 2 },
  bio: { lineHeight: 23, marginBottom: spacing.md },
  card: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  cardPad: { padding: spacing.md },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  settingBadge: { borderRadius: radii.pill, paddingHorizontal: 9, paddingVertical: 3 },
  segment: { flexDirection: 'row', borderRadius: radii.pill, padding: 4, gap: 4 },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radii.pill,
  },
});
