import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { fonts, palette, radii, tint, useTheme } from '@/theme';

interface Props extends TextInputProps {
  label?: string;
  /** Render the field on a dark (burgundy) background. */
  onDark?: boolean;
  error?: string | null;
}

export function TextField({ label, onDark, error, style, ...rest }: Props) {
  const { c } = useTheme();
  const [focused, setFocused] = useState(false);
  const labelColor = onDark ? tint.onDarkSoft : c.textMuted;

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: labelColor }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={onDark ? tint.onDarkFaint : c.textSubtle}
        style={[
          styles.input,
          {
            backgroundColor: onDark ? 'rgba(245,240,230,0.08)' : c.surfaceAlt,
            color: onDark ? palette.cream : c.text,
            borderColor: error
              ? palette.sienna
              : focused
                ? palette.gold
                : onDark
                  ? 'rgba(245,240,230,0.18)'
                  : c.border,
          },
          style,
        ]}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    marginBottom: 7,
    marginLeft: 4,
    letterSpacing: 0.2,
  },
  input: {
    height: 54,
    borderRadius: radii.sm + 4,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  error: {
    fontFamily: fonts.body,
    color: palette.sienna,
    fontSize: 12.5,
    marginTop: 5,
    marginLeft: 4,
  },
});
