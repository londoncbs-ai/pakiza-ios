import React, { useEffect, useState } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenCapture from 'expo-screen-capture';
import { Ionicons } from '@expo/vector-icons';

import { Button } from './Button';
import { Text } from './Text';
import { palette, radii, spacing } from '@/theme';

/**
 * App-wide screenshot guard.
 *
 * Android: preventScreenCaptureAsync() sets FLAG_SECURE, which hard-blocks
 * screenshots and screen recording outright.
 *
 * iOS: Apple does not let an app block screenshots, but it DOES notify us right
 * after one is taken. We catch that and cover the whole app with a full-screen
 * privacy warning the member has to dismiss, so a screenshot can't pass quietly.
 *
 * Mounted once near the root (see app/_layout.tsx). The overlay is a top-level
 * Modal, so it sits above every screen including discover.
 */
export function ScreenshotGuard() {
  const [warned, setWarned] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // expo-screen-capture has no web implementation - calling it there
    // crashes the whole app at the root layout.
    if (Platform.OS === 'web') return;
    ScreenCapture.preventScreenCaptureAsync().catch(() => {});
    const sub = ScreenCapture.addScreenshotListener(() => setWarned(true));
    return () => {
      sub.remove();
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    };
  }, []);

  return (
    <Modal
      visible={warned}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => setWarned(false)}
    >
      <View
        style={[
          styles.backdrop,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
        ]}
      >
        <View style={styles.iconRing}>
          <Ionicons name="eye-off" size={40} color={palette.cream} />
        </View>
        <Text variant="title" color={palette.white} center style={styles.title}>
          Please keep this private
        </Text>
        <Text variant="body" color={palette.cream} center style={styles.body}>
          To protect our members, photos and conversations on Pakiza shouldn't be
          screenshotted, recorded or shared. Let's keep everyone safe.
        </Text>
        <Button label="I understand" variant="outline" onPress={() => setWarned(false)} style={styles.btn} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: palette.burgundyDeep,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  iconRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.burgundy,
    borderWidth: 1,
    borderColor: palette.gold,
  },
  title: { marginTop: spacing.sm },
  body: { maxWidth: 320, opacity: 0.92 },
  btn: { marginTop: spacing.md, minWidth: 200, borderRadius: radii.pill },
});
