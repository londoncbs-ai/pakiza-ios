import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { AgeNotice } from '@/components/AgeNotice';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { spacing } from '@/theme';

/**
 * Welcome screen, and the second half of the launch sequence. Android 12+
 * draws the system splash itself and only allows a background color plus a
 * small centered icon - a full-bleed splash image is not possible there. So
 * the full-screen brand poster (hearts + wordmark baked in) lives here
 * instead, filling the first screen the member sees after the splash.
 */
export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <Image
        source={require('../../assets/images/launch-poster.jpg')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.actions}>
          {/* What this is, before asking anyone to sign up. */}
          <View style={styles.pitch}>
            <Text variant="title" tone="onDark" center>
              Marriage, with family at the centre.
            </Text>
            <Text variant="callout" tone="onDarkMuted" center>
              Members are verified by our team. Meetings happen with a wali present. A community fund helps couples begin.
            </Text>
          </View>
          <Button label="Begin our journey" variant="dark" onPress={() => router.push('/(auth)/sign-up')} />
          <Button
            label="I already have an account"
            variant="outline"
            onDark
            onPress={() => router.push('/(auth)/sign-in')}
          />
          <AgeNotice compact onDark />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2b0511' },
  container: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'flex-end' },
  actions: { width: '100%', gap: spacing.md },
  pitch: { gap: spacing.sm, marginBottom: spacing.md },
});
