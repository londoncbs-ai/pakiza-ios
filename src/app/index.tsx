import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
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
          <Button label="Begin our journey" variant="dark" onPress={() => router.push('/(auth)/sign-up')} />
          <Button
            label="I already have an account"
            variant="outline"
            onPress={() => router.push('/(auth)/sign-in')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2b0511' },
  container: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'flex-end' },
  actions: { width: '100%', gap: spacing.md },
});
