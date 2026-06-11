import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { hexA, palette, radii, spacing, useTheme } from '@/theme';

interface Props {
  label?: string;
  value: number | null;
  onChange: (v: number | null) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  /** when true, decrementing below min yields null ("Any") */
  nullable?: boolean;
  onDark?: boolean;
}

export function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = '',
  nullable = true,
  onDark = false,
}: Props) {
  const { c } = useTheme();

  const dec = () => {
    if (value == null) return;
    const n = value - step;
    if (nullable && n < min) onChange(null);
    else onChange(Math.max(min, n));
  };
  const inc = () => {
    if (value == null) onChange(min);
    else onChange(Math.min(max, value + step));
  };

  const display = value == null ? 'Any' : `${value}${suffix}`;

  const fieldBg = onDark ? hexA(palette.cream, 0.06) : c.surfaceAlt;
  const fieldBorder = onDark ? hexA(palette.cream, 0.18) : c.border;
  const btnBg = onDark ? hexA(palette.cream, 0.1) : c.accentFaint;
  const iconColor = onDark ? palette.cream : c.accent;

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="footnote" color={onDark ? hexA(palette.cream, 0.85) : c.textMuted} style={styles.label}>
          {label}
        </Text>
      ) : null}
      <View style={[styles.row, { borderColor: fieldBorder, backgroundColor: fieldBg }]}>
        <PressableScale onPress={dec} hitSlop={8} scaleTo={0.9} style={[styles.btn, { backgroundColor: btnBg }]}>
          <Ionicons name="remove" size={20} color={iconColor} />
        </PressableScale>
        <Text variant="subhead" color={onDark ? palette.cream : c.text}>{display}</Text>
        <PressableScale onPress={inc} hitSlop={8} scaleTo={0.9} style={[styles.btn, { backgroundColor: btnBg }]}>
          <Ionicons name="add" size={20} color={iconColor} />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  label: { marginBottom: spacing.xs + 3, marginLeft: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.input,
    paddingHorizontal: spacing.xs + 2,
  },
  btn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
