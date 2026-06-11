import React from 'react';
import { View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

/**
 * Themed screen background. Paints the active theme's `bg` so every screen
 * adapts to light/dark without hardcoding a color.
 */
export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[] }) {
  const { c } = useTheme();
  return <View style={[{ flex: 1, backgroundColor: c.bg }, style]}>{children}</View>;
}
