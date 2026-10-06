import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { profilesApi } from '@/api/profiles';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { haptics } from '@/lib/haptics';
import { hexA, palette, radii, spacing } from '@/theme';

type DocType = 'passport' | 'driving_licence' | 'national_id';

const DOC_TYPES: { key: DocType; label: string }[] = [
  { key: 'passport', label: 'Passport' },
  { key: 'driving_licence', label: 'Driving licence' },
  { key: 'national_id', label: 'National ID card' },
];

/** Government photo ID upload (POST /profiles/me/verify-id). The photo goes to
 * our team, who check the date of birth and face before the account is
 * released; it is deleted as soon as they decide. Opened from the hub. */
export default function IdVerify() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [docType, setDocType] = useState<DocType | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      if (!perm.canAskAgain) Linking.openSettings();
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!res.canceled && res.assets[0]?.uri) setUri(res.assets[0].uri);
  };

  const choosePhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!res.canceled && res.assets[0]?.uri) setUri(res.assets[0].uri);
  };

  const submit = async () => {
    if (!docType || !uri || sending) return;
    setError(null);
    setSending(true);
    try {
      await profilesApi.verifyId(uri, docType);
      haptics.success();
      router.replace('/verify-account');
    } catch (err) {
      haptics.error();
      setError(errorMessage(err, "We couldn't upload your ID. Please try again."));
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.black}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + spacing.xxl,
          paddingBottom: insets.bottom + spacing.xl,
          paddingHorizontal: spacing.xl,
        }}
      >
        <Ionicons name="card-outline" size={52} color={palette.gold} style={{ alignSelf: 'center' }} />
        <Text variant="title" tone="onDark" center style={{ marginTop: spacing.lg }}>
          Confirm your age and identity
        </Text>
        <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
          <Point text="Upload a photo of a government ID that shows your face and your date of birth. Pakiza is for adults aged 18 and over." />
          <Point text="A member of our team checks it against your profile and your selfie. It is never shown on your profile or to other members." />
          <Point text="We delete the photo as soon as the check is done and keep only the result." />
          <Point text="We cannot accept Aadhaar cards. Please use a passport, driving licence or another national ID." />
        </View>

        <Text variant="callout" tone="onDark" style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
          Which document are you using?
        </Text>
        <View style={{ gap: spacing.sm }}>
          {DOC_TYPES.map((d) => {
            const on = docType === d.key;
            return (
              <Pressable
                key={d.key}
                onPress={() => setDocType(d.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={[styles.option, on && styles.optionOn]}
              >
                <Ionicons
                  name={on ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={on ? palette.gold : hexA(palette.cream, 0.5)}
                />
                <Text variant="callout" tone="onDark">{d.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {uri ? (
          <View style={{ marginTop: spacing.lg }}>
            <Image source={{ uri }} style={styles.preview} contentFit="contain" />
            <Pressable onPress={() => setUri(null)} hitSlop={10} style={styles.escape}>
              <Text variant="footnote" tone="onDarkMuted">Use a different photo</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
            <Button label="Take a photo of my ID" onPress={takePhoto} />
            <Pressable onPress={choosePhoto} hitSlop={10} style={styles.escape}>
              <Text variant="callout" tone="onDarkMuted">Choose from my photos</Text>
            </Pressable>
          </View>
        )}

        <View style={{ marginTop: 'auto', paddingTop: spacing.lg }}>
          {error ? (
            <Text variant="footnote" color={palette.rose} center style={{ marginBottom: spacing.md }}>{error}</Text>
          ) : null}
          {uri ? (
            <Button
              label="Send for review"
              onPress={() =>
                docType ? submit() : Alert.alert('Choose a document', 'Tell us which document this is first.')
              }
              loading={sending}
            />
          ) : null}
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.escape}>
            <Text variant="footnote" tone="onDarkMuted">Not now</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Point({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
      <Ionicons name="checkmark-circle" size={18} color={palette.gold} style={{ marginTop: 2 }} />
      <Text variant="callout" tone="onDarkMuted" style={{ flex: 1 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: palette.burgundyDeep },
  escape: { alignSelf: 'center', marginTop: spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: hexA(palette.cream, 0.18),
  },
  optionOn: { borderColor: palette.gold, backgroundColor: hexA(palette.gold, 0.1) },
  preview: { width: '100%', height: 220, borderRadius: radii.md, backgroundColor: hexA(palette.cream, 0.06) },
});
