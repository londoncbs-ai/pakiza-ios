import { Stack } from 'expo-router';

import { palette } from '@/theme';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.cream },
      }}
    >
      <Stack.Screen name="discover" />
      <Stack.Screen name="matches" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="profile-setup" options={{ animation: 'fade' }} />
    </Stack>
  );
}
