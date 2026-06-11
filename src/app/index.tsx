import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { BrandBackground } from '@/components/BrandBackground';
import { Button } from '@/components/Button';
import { Wordmark } from '@/components/Wordmark';
import { spacing } from '@/theme';

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <BrandBackground withMark>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.hero}>
          <Wordmark size={64} tagline="where love finds purpose" />
        </View>

        <View style={styles.actions}>
          <Button label="Begin our journey" variant="dark" onPress={() => router.push('/(auth)/sign-up')} />
          <Button
            label="I already have an account"
            variant="outline"
            onPress={() => router.push('/(auth)/sign-in')}
          />
        </View>
      </View>
    </BrandBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'flex-end' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: '40%' },
  actions: { width: '100%', gap: spacing.md },
});
