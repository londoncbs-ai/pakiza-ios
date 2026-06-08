import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fonts, palette, radii, spacing } from '@/theme';

export interface Option<T extends string | number> {
  label: string;
  value: T;
}

interface Props<T extends string | number> {
  label?: string;
  options: Option<T>[];
  value: T | null;
  onChange: (v: T | null) => void;
  onDark?: boolean;
  /** wrap into rows instead of horizontal scroll */
  wrap?: boolean;
  /** allow deselect by tapping the active option */
  clearable?: boolean;
}

export function OptionGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  onDark = true,
  wrap = true,
  clearable = true,
}: Props<T>) {
  const fg = onDark ? palette.cream : palette.ink;
  const chips = options.map((opt) => {
    const active = value === opt.value;
    return (
      <Pressable
        key={String(opt.value)}
        onPress={() => onChange(active && clearable ? null : opt.value)}
        style={[
          styles.chip,
          {
            backgroundColor: active ? palette.gold : onDark ? 'rgba(245,240,230,0.08)' : palette.white,
            borderColor: active ? palette.gold : onDark ? 'rgba(245,240,230,0.22)' : palette.line,
          },
        ]}
      >
        <Text style={[styles.chipText, { color: active ? palette.ink : fg }]}>{opt.label}</Text>
      </Pressable>
    );
  });

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: onDark ? 'rgba(245,240,230,0.85)' : palette.muted }]}>{label}</Text> : null}
      {wrap ? (
        <View style={styles.rowWrap}>{chips}</View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {chips}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13, marginBottom: 9, marginLeft: 4, letterSpacing: 0.2 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  scroll: { gap: spacing.sm, paddingRight: spacing.lg },
  chip: {
    minHeight: 42,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 14 },
});
