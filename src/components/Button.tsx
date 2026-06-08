import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';

import { colors, fonts, palette, radii, shadow } from '@/theme';

type Variant = 'primary' | 'secondary' | 'dark' | 'outline' | 'ghost';

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
  ghost: 'transparent',
};

const FG: Record<Variant, string> = {
  primary: palette.cream,
  secondary: palette.ink,
  dark: palette.cream,
  outline: palette.cream,
  ghost: palette.burgundy,
};

export function Button({ label, onPress, variant = 'primary', loading, disabled, style }: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: BG[variant] },
        variant === 'outline' && styles.outline,
        variant !== 'outline' && variant !== 'ghost' && shadow.soft,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={FG[variant]} />
      ) : (
        <Text style={[styles.label, { color: FG[variant] }]}>{label}</Text>
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
