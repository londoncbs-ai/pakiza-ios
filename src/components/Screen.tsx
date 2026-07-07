import React from 'react';
import { KeyboardAvoidingView, Platform, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

/**
 * Themed screen background. Paints the active theme's `bg` so every screen
 * adapts to light/dark without hardcoding a color.
 *
 * Pass `keyboard` on screens with text inputs: content is wrapped in a
 * KeyboardAvoidingView so the focused input stays visible above the keyboard.
 * iOS uses `padding`; Android relies on `softwareKeyboardLayoutMode: "resize"`
 * (set in app.json), which resizes the window for us.
 */
export function Screen({
  children,
  style,
  keyboard = false,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  keyboard?: boolean;
}) {
  const { c } = useTheme();
  return (
    <View style={[{ flex: 1, backgroundColor: c.bg }, style]}>
      {keyboard ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {children}
        </KeyboardAvoidingView>
      ) : (
        children
      )}
    </View>
  );
}
