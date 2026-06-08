import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
} from '@expo-google-fonts/cormorant-garamond';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';

import { AuthProvider, useAuth } from '@/store/auth';
import { palette } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    const root = segments[0]; // '(auth)' | '(app)' | '(onboarding)' | undefined (index)
    const onPublic = root === undefined || root === '(auth)';

    if (status === 'signedOut' && !onPublic) {
      router.replace('/');
    } else if (status === 'signedIn' && onPublic) {
      // The (app) gate forwards to onboarding/profile-setup if no profile exists yet.
      router.replace('/(app)/discover');
    }
    // When signed-in and inside (onboarding), leave the user there — the
    // onboarding flow itself advances to (app) when complete.
  }, [status, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.cream } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Cormorant: CormorantGaramond_500Medium,
    CormorantSemibold: CormorantGaramond_600SemiBold,
    Inter: Inter_400Regular,
    InterMedium: Inter_500Medium,
    InterSemibold: Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
