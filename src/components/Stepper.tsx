import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { fonts, palette, radii } from '@/theme';

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

  const fg = onDark ? palette.cream : palette.ink;
  const display = value == null ? 'Any' : `${value}${suffix}`;

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: onDark ? 'rgba(245,240,230,0.85)' : palette.muted }]}>{label}</Text> : null}
      <View style={[styles.row, { borderColor: onDark ? 'rgba(245,240,230,0.18)' : palette.line, backgroundColor: onDark ? 'rgba(245,240,230,0.06)' : palette.white }]}>
        <Pressable onPress={dec} hitSlop={8} style={styles.btn}>
          <Ionicons name="remove" size={20} color={palette.burgundy} />
        </Pressable>
        <Text style={[styles.value, { color: fg }]}>{display}</Text>
        <Pressable onPress={inc} hitSlop={8} style={styles.btn}>
          <Ionicons name="add" size={20} color={palette.burgundy} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13, marginBottom: 7, marginLeft: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    borderWidth: 1.5,
    borderRadius: radii.sm + 4,
    paddingHorizontal: 6,
  },
  btn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(128,0,32,0.06)',
  },
  value: { fontFamily: fonts.bodySemibold, fontSize: 16 },
});
