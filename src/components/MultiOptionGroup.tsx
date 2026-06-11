import React from 'react';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { hexA, palette, radii, spacing, useTheme } from '@/theme';

interface Props {
  label?: string;
  options: { label: string; value: string }[];
  /** comma-separated selected values */
  value: string | null;
  onChange: (csv: string | null) => void;
  onDark?: boolean;
}

/** Multi-select chips that serialise to a comma-separated string (backend format). */
export function MultiOptionGroup({ label, options, value, onChange, onDark = false }: Props) {
  const { c } = useTheme();
  const selected = value ? value.split(',').map((s) => s.trim()).filter(Boolean) : [];

  const toggle = (v: string) => {
    const next = selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v];
    onChange(next.length ? next.join(',') : null);
  };

  const chipBg = onDark ? hexA(palette.cream, 0.08) : c.surfaceAlt;
  const chipBorder = onDark ? hexA(palette.cream, 0.22) : c.border;

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="footnote" color={onDark ? hexA(palette.cream, 0.85) : c.textMuted} style={styles.label}>
          {label}
        </Text>
      ) : null}
      <View style={styles.rowWrap}>
        {options.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <PressableScale
              key={opt.value}
              onPress={() => toggle(opt.value)}
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
                variant="footnote"
                color={active ? palette.cream : onDark ? palette.cream : c.text}
              >
                {opt.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { marginBottom: spacing.sm, marginLeft: spacing.xs },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 40,
    paddingHorizontal: 15,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
