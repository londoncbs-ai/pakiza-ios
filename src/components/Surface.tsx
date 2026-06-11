import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { radii, shadow, useTheme } from '@/theme';

/**
 * Themed card surface. Uses the active scheme's surface + border, with an
 * optional soft elevation. `alt` selects the secondary (slightly recessed) tone.
 */
export function Surface({
  children,
  style,
  alt = false,
  bordered = true,
  elevated = false,
}: {
  children?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  alt?: boolean;
  bordered?: boolean;
  elevated?: boolean;
}) {
  const { c, isDark } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: alt ? c.surfaceAlt : c.surface,
          borderRadius: radii.lg,
          borderWidth: bordered ? StyleSheet.hairlineWidth : 0,
          borderColor: c.border,
        },
        // Shadows read poorly on dark surfaces; lean on borders there instead.
        elevated && !isDark ? shadow.soft : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}
