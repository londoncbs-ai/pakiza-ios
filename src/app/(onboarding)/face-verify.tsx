import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { profilesApi } from '@/api/profiles';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/store/auth';
import { hexA, palette, spacing } from '@/theme';

const FRAME = 288;
const RADIUS = 30;

type Phase = 'camera' | 'analyzing' | 'success' | 'error';

/** Non-skippable AI-style face scan: verifies the live selfie matches the
 * member's uploaded profile photos (POST /profiles/me/verify-selfie). */
export default function FaceVerify() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { signOut } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [phase, setPhase] = useState<Phase>('camera');
  const [error, setError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  const scan = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    scan.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [reduceMotion, scan]);
  const scanStyle = useAnimatedStyle(() => ({ transform: [{ translateY: scan.value * (FRAME - 8) }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.3 + scan.value * 0.35 }));

  // Request permission ONLY on an explicit tap. Auto-requesting on every
  // `permission` change loops forever once denied (the hook returns a fresh
  // object each call). When it can no longer prompt, deep-link to Settings.
  const enableCamera = () => {
    if (permission && !permission.canAskAgain) Linking.openSettings();
    else requestPermission();
  };

  const capture = async () => {
    if (!cameraRef.current || phase === 'analyzing') return;
    setError(null);
    setPhase('analyzing');
    try {
      const shot = await cameraRef.current.takePictureAsync({ quality: 0.7, skipProcessing: true });
      if (!shot?.uri) throw new Error('Could not capture your photo');
      await profilesApi.verifySelfie(shot.uri);
      haptics.success();
      // Show the verified moment before moving on; back to the checklist when
      // the scan was opened from there, otherwise into the app.
      setPhase('success');
      setTimeout(() => {
        router.replace(from === 'hub' ? '/verify-account' : '/(app)/discover');
      }, 1600);
    } catch (err) {
      haptics.error();
      setError(errorMessage(err, "We couldn't verify your selfie. Make sure your face is well lit and centred, then try again."));
      setPhase('error');
    }
  };

  if (!permission) return <View style={styles.black} />;

  if (!permission.granted) {
    return (
      <View style={[styles.black, styles.center, { padding: spacing.xl }]}>
        <Ionicons name="scan-outline" size={52} color={palette.gold} />
        <Text variant="title" tone="onDark" center style={{ marginTop: spacing.lg }}>
          Face verification
        </Text>
        <Text variant="callout" tone="onDarkMuted" center style={{ marginTop: spacing.sm }}>
          Pakiza verifies every member with a quick face scan, so you know everyone here is real. We need camera access to continue.
        </Text>
        <Button
          label={permission.canAskAgain ? 'Enable camera' : 'Open settings'}
          onPress={enableCamera}
          style={{ marginTop: spacing.xl, alignSelf: 'stretch' }}
        />
        <Pressable onPress={signOut} hitSlop={10} style={{ marginTop: spacing.lg }}>
          <Text variant="footnote" tone="onDarkMuted">Sign out</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.black}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />
      <LinearGradient
        colors={[hexA(palette.burgundyDeep, 0.6), hexA(palette.burgundyDeep, 0.12), hexA(palette.burgundyDeep, 0.8)]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.overlay, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl }]}>
        <View>
          <Text variant="title" tone="onDark" center>Face verification</Text>
          <Text variant="callout" tone="onDarkMuted" center style={{ marginTop: spacing.xs }}>
            Centre your face in the frame — we’re checking it matches your photos.
          </Text>
        </View>

        <View style={styles.frameWrap}>
          <Animated.View style={[styles.glow, glowStyle]}>
            <LinearGradient colors={[palette.gold, palette.rose]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.glowFill} />
          </Animated.View>

          <View style={styles.frame}>
            {phase !== 'analyzing' && !reduceMotion ? (
              <Animated.View style={[styles.scanLine, scanStyle]}>
                <LinearGradient
                  colors={[hexA(palette.gold, 0), palette.gold, hexA(palette.gold, 0)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flex: 1 }}
                />
              </Animated.View>
            ) : null}
            {phase === 'analyzing' ? (
              <View style={styles.analyzing}>
                <ActivityIndicator color={palette.gold} />
                <Text variant="footnote" tone="onDark" style={{ marginTop: spacing.sm }}>Analysing…</Text>
              </View>
            ) : null}
            {phase === 'success' ? (
              <View style={styles.analyzing}>
                <View style={styles.successBadge}>
                  <Ionicons name="checkmark" size={44} color={palette.burgundyDeep} />
                </View>
                <Text variant="title" tone="onDark" center style={{ marginTop: spacing.md }}>
                  Verified
                </Text>
                <Text variant="footnote" tone="onDarkMuted" center style={{ marginTop: spacing.xs }}>
                  It matches. You now carry the verified badge.
                </Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
        </View>

        <View>
          {error ? (
            <Text variant="footnote" color={palette.rose} center style={{ marginBottom: spacing.md }}>{error}</Text>
          ) : null}
          {phase === 'success' ? (
            <Text variant="callout" tone="onDark" center>Taking you back...</Text>
          ) : (
            <Button label={phase === 'error' ? 'Try again' : 'Scan my face'} onPress={capture} loading={phase === 'analyzing'} />
          )}
          {phase === 'error' ? (
            <Pressable onPress={signOut} hitSlop={10} style={styles.escape}>
              <Text variant="footnote" tone="onDarkMuted">Having trouble? Sign out</Text>
            </Pressable>
          ) : (
            <Text variant="footnote" tone="onDarkMuted" center style={{ marginTop: spacing.md }}>
              Your selfie is only used to confirm it’s you — it’s never shown on your profile.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: palette.burgundyDeep },
  center: { alignItems: 'center', justifyContent: 'center' },
  escape: { alignSelf: 'center', marginTop: spacing.md },
  overlay: { flex: 1, justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl },
  frameWrap: { width: FRAME, height: FRAME, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: FRAME + 20, height: FRAME + 20, borderRadius: RADIUS + 10, overflow: 'hidden' },
  glowFill: { flex: 1 },
  frame: {
    width: FRAME, height: FRAME, borderRadius: RADIUS, overflow: 'hidden',
    backgroundColor: hexA(palette.cream, 0.03),
  },
  scanLine: { position: 'absolute', left: 8, right: 8, height: 3, borderRadius: 2 },
  analyzing: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: hexA(palette.burgundyDeep, 0.4) },
  successBadge: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: palette.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  corner: { position: 'absolute', width: 36, height: 36, borderColor: palette.gold, borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: RADIUS },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: RADIUS },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: RADIUS },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: RADIUS },
});
