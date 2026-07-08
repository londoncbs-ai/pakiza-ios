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
import { RealtimeProvider } from '@/store/realtime';
import { ScreenshotGuard } from '@/components/ScreenshotGuard';
import { ThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { status, block, verifyRequired } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { c } = useTheme();

  useEffect(() => {
    if (status === 'loading') return;

    const root = segments[0]; // '(auth)' | '(app)' | '(onboarding)' | 'blocked' | undefined (index)

    // An account-state block (banned / deactivated / deleted) takes precedence:
    // hold the user on the blocked screen until they choose to return to sign in.
    if (block) {
      if (root !== 'blocked') router.replace('/blocked');
      return;
    }

    // The email-verify deep-link landing is reachable in any auth state - don't
    // bounce a signed-out user to '/' or a signed-in user to the app mid-verify.
    if (root === 'verify-email') return;

    // Legal pages are public: the sign-up consent line links to them before an
    // account exists, and stores require them to be readable pre-registration.
    if (root === 'terms' || root === 'privacy' || root === 'community') return;

    // A signed-in member who hasn't finished the verification steps is held on
    // the verification hub - but must be able to REACH the screens that complete
    // each step (the hub, the add-phone flow, and onboarding: profile + the
    // selfie scan). Bouncing those back to the hub would make them unreachable.
    const onVerifyRoute = root === 'verify-account' || root === 'add-phone' || root === '(onboarding)';
    if (status === 'signedIn' && verifyRequired && !onVerifyRoute) {
      router.replace('/verify-account');
      return;
    }
    if (onVerifyRoute) return;

    const onPublic = root === undefined || root === '(auth)';

    if (status === 'signedOut' && !onPublic) {
      router.replace('/');
    } else if (status === 'signedIn' && onPublic) {
      // The (app) gate forwards to onboarding/profile-setup if no profile exists yet.
      router.replace('/(app)/discover');
    }
    // When signed-in and inside (onboarding), leave the user there - the
    // onboarding flow itself advances to (app) when complete.
  }, [status, block, verifyRequired, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="blocked" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="book-meet" />
      <Stack.Screen name="meeting/[id]" />
      <Stack.Screen name="meeting/[id]/chat" />
      <Stack.Screen name="meetings" />
      <Stack.Screen name="support-fund" />
      <Stack.Screen name="donate" />
      <Stack.Screen name="apply-support" />
      <Stack.Screen name="boost" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="premium" />
      <Stack.Screen name="change-password" />
      <Stack.Screen name="change-email" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="verify-account" />
      <Stack.Screen name="add-phone" />
      <Stack.Screen name="likes" />
      <Stack.Screen name="saved" />
      <Stack.Screen name="events" />
      <Stack.Screen name="event/[id]" />
      <Stack.Screen name="news" />
      <Stack.Screen name="article/[id]" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="community" />
      <Stack.Screen name="support" />
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
        <ThemeProvider>
          <AuthProvider>
            <ThemedStatusBar />
            <RealtimeProvider>
              <RootNavigator />
            </RealtimeProvider>
            <ScreenshotGuard />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}
