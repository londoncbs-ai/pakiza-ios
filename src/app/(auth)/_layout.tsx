import { Stack } from 'expo-router';

import { palette } from '@/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.burgundyDeep },
        animation: 'slide_from_right',
      }}
    />
  );
}
