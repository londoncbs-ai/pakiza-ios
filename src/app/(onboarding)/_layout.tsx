import { Stack } from 'expo-router';

import { palette } from '@/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.burgundyDeep },
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="profile-setup" />
      <Stack.Screen name="id-verify" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
