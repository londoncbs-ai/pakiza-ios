import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

import { BrandBackground } from '@/components/BrandBackground';
import { Button } from '@/components/Button';
import { fonts, palette, spacing } from '@/theme';

export default function IdVerify() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selfie, setSelfie] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const takeSelfie = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      // Fall back to library if camera is unavailable (e.g. simulator).
      const lib = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
      if (!lib.canceled) setSelfie(lib.assets[0].uri);
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ cameraType: ImagePicker.CameraType.front, quality: 0.7 });
    if (!res.canceled) setSelfie(res.assets[0].uri);
  };

  const finish = () => router.replace('/(app)/discover');

  const verify = async () => {
    setVerifying(true);
    // Dev: identity verification is simulated and never blocks. In production
    // this would upload the selfie to POST /v1/profiles/me/verify-selfie.
    setTimeout(finish, 700);
  };

  return (
    <BrandBackground>
      <View style={[styles.container, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.body}>
          <View style={styles.badge}>
            {selfie ? (
              <Image source={{ uri: selfie }} style={styles.selfie} contentFit="cover" />
            ) : (
              <Ionicons name="shield-checkmark-outline" size={64} color={palette.gold} />
            )}
          </View>

          <Text style={styles.title}>Verify your identity</Text>
          <Text style={styles.subtitle}>
            A quick selfie keeps Pakiza safe and authentic. Your photo is used only to confirm
            it’s really you. It’s never shown on your profile.
          </Text>

          <Pressable onPress={takeSelfie} style={styles.captureRow}>
            <Ionicons name="camera-outline" size={20} color={palette.cream} />
            <Text style={styles.captureText}>{selfie ? 'Retake selfie' : 'Take a selfie'}</Text>
          </Pressable>

          <View style={styles.devNote}>
            <Ionicons name="construct-outline" size={14} color={palette.goldSoft} />
            <Text style={styles.devText}>Dev mode: verification is optional and can be skipped.</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            label={selfie ? 'Verify & continue' : 'Verify later'}
            onPress={selfie ? verify : finish}
            loading={verifying}
          />
          <Pressable onPress={finish} hitSlop={10} style={styles.skip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </View>
      </View>
    </BrandBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'space-between' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(245,240,230,0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(199,159,94,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  selfie: { width: '100%', height: '100%' },
  title: { fontFamily: fonts.display, fontSize: 36, color: palette.cream, textAlign: 'center' },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: 'rgba(245,240,230,0.75)',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(245,240,230,0.5)',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
  },
  captureText: { fontFamily: fonts.bodySemibold, color: palette.cream, fontSize: 15 },
  devNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xl },
  devText: { fontFamily: fonts.body, color: palette.goldSoft, fontSize: 12.5 },
  actions: { width: '100%' },
  skip: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
  skipText: { fontFamily: fonts.bodyMedium, color: 'rgba(245,240,230,0.7)', fontSize: 14.5 },
});
