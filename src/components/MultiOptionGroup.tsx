import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, palette, radii } from '@/theme';

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
  const selected = value ? value.split(',').map((s) => s.trim()).filter(Boolean) : [];

  const toggle = (v: string) => {
    const next = selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v];
    onChange(next.length ? next.join(',') : null);
  };

  const fg = onDark ? palette.cream : palette.ink;

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: onDark ? 'rgba(245,240,230,0.85)' : palette.muted }]}>{label}</Text> : null}
      <View style={styles.rowWrap}>
        {options.map((opt) => {
          const active = selected.includes(opt.value);
          return (
            <Pressable
              key={opt.value}
              onPress={() => toggle(opt.value)}
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
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13, marginBottom: 9, marginLeft: 4, letterSpacing: 0.2 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 15, paddingVertical: 8, borderRadius: radii.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 13.5 },
});
