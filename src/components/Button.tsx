import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';

import { colors, fonts, palette, radii, shadow, useTheme } from '@/theme';
import { haptics } from '@/lib/haptics';

// 'outline' is cream (for dark/branded backgrounds); 'outlineAccent' is the
// theme accent (for light surfaces like cards) so it stays visible there.
type Variant = 'primary' | 'secondary' | 'dark' | 'outline' | 'outlineAccent' | 'ghost';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

const BG: Record<Variant, string> = {
  primary: palette.burgundy,
  secondary: palette.gold,
  dark: palette.navy,
  outline: 'transparent',
  outlineAccent: 'transparent',
  ghost: 'transparent',
};

const FG: Record<Variant, string> = {
  primary: palette.cream,
  secondary: palette.ink,
  dark: palette.cream,
  outline: palette.cream,
  outlineAccent: palette.burgundy,  // overridden by the theme accent at render
  ghost: palette.burgundy,
};

export function Button({ label, onPress, variant = 'primary', loading, disabled, style }: Props) {
  const { c } = useTheme();
  const isDisabled = disabled || loading;
  const isOutline = variant === 'outline' || variant === 'outlineAccent';
  // Accent outline follows the theme so it stays visible on light cards.
  const fg = variant === 'outlineAccent' ? c.accent : FG[variant];
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        if (!isDisabled) haptics.selection();
      }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: BG[variant] },
        variant === 'outline' && styles.outline,
        variant === 'outlineAccent' && { borderWidth: 1.5, borderColor: c.accent },
        !isOutline && variant !== 'ghost' && shadow.soft,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.label, { color: fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  outline: {
    borderWidth: 1.5,
    borderColor: 'rgba(245,240,230,0.7)',
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.5 },
  label: {
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
