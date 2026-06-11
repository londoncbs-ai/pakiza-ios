import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { Text } from '@/components/Text';
import { haptics } from '@/lib/haptics';
import { palette, radii, spacing, useTheme } from '@/theme';

const TRUST_POINTS: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: 'eye-off-outline', text: 'Your selfie is never shown on your profile.' },
  { icon: 'people-outline', text: 'Verified members earn a trusted badge.' },
  { icon: 'lock-closed-outline', text: 'Used only to confirm it is really you.' },
];

export default function IdVerify() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const [selfie, setSelfie] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const takeSelfie = async () => {
    haptics.selection();
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
    <Screen>
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.lg },
        ]}
      >
        <View style={styles.body}>
          {/* Shield / selfie motif - the trust mark */}
          <Pressable onPress={takeSelfie} style={styles.badgeWrap}>
            <View
              style={[
                styles.badge,
                { backgroundColor: c.accentFaint, borderColor: c.accent },
              ]}
            >
              {selfie ? (
                <Image source={{ uri: selfie }} style={styles.selfie} contentFit="cover" />
              ) : (
                <Ionicons name="shield-checkmark" size={64} color={c.accent} />
              )}
            </View>
            {selfie ? (
              <View style={[styles.editTag, { backgroundColor: palette.burgundy, borderColor: c.bg }]}>
                <Ionicons name="camera" size={16} color={palette.cream} />
              </View>
            ) : null}
          </Pressable>

          <Text variant="title" tone="default" center style={styles.title}>
            A community you can trust
          </Text>
          <Text variant="callout" tone="muted" center style={styles.subtitle}>
            A quick selfie keeps Pakiza safe and authentic, so every member you meet is real.
          </Text>

          {/* Trust benefits */}
          <Surface elevated style={styles.trustCard}>
            {TRUST_POINTS.map((p, i) => (
              <View
                key={p.text}
                style={[
                  styles.trustRow,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
                ]}
              >
                <View style={[styles.trustIcon, { backgroundColor: c.accentFaint }]}>
                  <Ionicons name={p.icon} size={18} color={c.accent} />
                </View>
                <Text variant="callout" tone="default" style={styles.trustText}>
                  {p.text}
                </Text>
              </View>
            ))}
          </Surface>

          <Pressable
            onPress={takeSelfie}
            style={({ pressed }) => [
              styles.captureRow,
              { backgroundColor: c.surfaceAlt, borderColor: c.borderStrong },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="camera-outline" size={20} color={c.accent} />
            <Text variant="callout" tone="accent" style={styles.captureText}>
              {selfie ? 'Retake selfie' : 'Take a selfie'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.actions}>
          <Button
            label={selfie ? 'Verify & continue' : 'Verify later'}
            onPress={selfie ? verify : finish}
            loading={verifying}
          />
          <Pressable onPress={finish} hitSlop={10} style={styles.skip}>
            <Text variant="callout" tone="muted">Skip for now</Text>
          </Pressable>

          <View style={styles.devNote}>
            <Ionicons name="construct-outline" size={13} color={c.textSubtle} />
            <Text variant="footnote" tone="subtle">
              Dev mode: verification is optional and can be skipped.
            </Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'space-between' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badgeWrap: { marginBottom: spacing.xl },
  badge: {
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  selfie: { width: '100%', height: '100%' },
  editTag: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginBottom: spacing.sm },
  subtitle: { paddingHorizontal: spacing.sm, marginBottom: spacing.xl },
  trustCard: { width: '100%', paddingHorizontal: spacing.lg },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  trustIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustText: { flex: 1 },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: radii.pill,
  },
  captureText: { letterSpacing: 0.2 },
  actions: { width: '100%' },
  skip: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.xs },
  devNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.sm },
});
