import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { hexA, palette, radii, spacing, useTheme } from '@/theme';

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
  const { c } = useTheme();

  // On dark backgrounds (onboarding over burgundy) we lean on cream + faint
  // washes; on themed surfaces we use the scheme tokens. Selected is always the
  // brand burgundy fill with cream text.
  const chipBg = onDark ? hexA(palette.cream, 0.08) : c.surfaceAlt;
  const chipBorder = onDark ? hexA(palette.cream, 0.22) : c.border;

  const chips = options.map((opt) => {
    const active = value === opt.value;
    return (
      <PressableScale
        key={String(opt.value)}
        onPress={() => onChange(active && clearable ? null : opt.value)}
        scaleTo={0.95}
        style={[
          styles.chip,
          {
            backgroundColor: active ? palette.burgundy : chipBg,
            borderColor: active ? palette.burgundy : chipBorder,
          },
        ]}
      >
        <Text
          variant="callout"
          color={active ? palette.cream : onDark ? palette.cream : c.text}
        >
          {opt.label}
        </Text>
      </PressableScale>
    );
  });

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="footnote" color={onDark ? hexA(palette.cream, 0.85) : c.textMuted} style={styles.label}>
          {label}
        </Text>
      ) : null}
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
  label: { marginBottom: spacing.sm, marginLeft: spacing.xs },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  scroll: { gap: spacing.sm, paddingRight: spacing.lg },
  chip: {
    minHeight: 42,
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
