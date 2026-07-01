import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { hexA, palette, radii, spacing, useTheme } from '@/theme';

interface Props {
  label?: string;
  /** Preset chips the user can tap. They can also type their own. */
  options: string[];
  /** Comma-separated selected values (backend format). */
  value: string | null;
  onChange: (csv: string | null) => void;
  onDark?: boolean;
  placeholder?: string;
}

/** Multi-select chips (preset + custom free-text), serialised to a CSV string. */
export function ChipMultiSelect({
  label, options, value, onChange, onDark = false, placeholder = 'Add your own…',
}: Props) {
  const { c } = useTheme();
  const [custom, setCustom] = useState('');
  const selected = value ? value.split(',').map((s) => s.trim()).filter(Boolean) : [];

  const has = (v: string) => selected.some((s) => s.toLowerCase() === v.toLowerCase());
  const commit = (arr: string[]) => onChange(arr.length ? arr.join(',') : null);
  const toggle = (v: string) => commit(has(v) ? selected.filter((s) => s.toLowerCase() !== v.toLowerCase()) : [...selected, v]);
  const remove = (v: string) => commit(selected.filter((s) => s !== v));
  const addCustom = () => {
    // Commas are the CSV separator - collapse them so one entry stays one chip.
    const v = custom.trim().replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    if (v && !has(v)) commit([...selected, v]);
    setCustom('');
  };

  // User-entered values that aren't in the preset list get a removable chip.
  const customChips = selected.filter((s) => !options.some((o) => o.toLowerCase() === s.toLowerCase()));

  const chipBg = onDark ? hexA(palette.cream, 0.08) : c.surfaceAlt;
  const chipBorder = onDark ? hexA(palette.cream, 0.22) : c.border;
  const labelColor = onDark ? hexA(palette.cream, 0.85) : c.textMuted;
  const accent = onDark ? palette.rose : c.accent;

  return (
    <View style={styles.wrap}>
      {label ? <Text variant="footnote" color={labelColor} style={styles.label}>{label}</Text> : null}
      <View style={styles.rowWrap}>
        {options.map((opt) => {
          const active = has(opt);
          return (
            <PressableScale
              key={opt}
              onPress={() => toggle(opt)}
              scaleTo={0.95}
              style={[styles.chip, { backgroundColor: active ? palette.burgundy : chipBg, borderColor: active ? palette.burgundy : chipBorder }]}
            >
              <Text variant="footnote" color={active ? palette.cream : onDark ? palette.cream : c.text}>{opt}</Text>
            </PressableScale>
          );
        })}
        {customChips.map((v) => (
          <PressableScale
            key={v}
            onPress={() => remove(v)}
            scaleTo={0.95}
            style={[styles.chip, styles.chipCustom, { backgroundColor: palette.burgundy, borderColor: palette.burgundy }]}
          >
            <Text variant="footnote" color={palette.cream}>{v}</Text>
            <Ionicons name="close" size={13} color={palette.cream} style={{ marginLeft: 5 }} />
          </PressableScale>
        ))}
      </View>
      <View style={[styles.addRow, { borderColor: chipBorder, backgroundColor: chipBg }]}>
        <TextInput
          value={custom}
          onChangeText={setCustom}
          onSubmitEditing={addCustom}
          returnKeyType="done"
          maxLength={40}
          placeholder={placeholder}
          placeholderTextColor={onDark ? hexA(palette.cream, 0.45) : c.textSubtle}
          style={[styles.addInput, { color: onDark ? palette.cream : c.text }]}
        />
        <PressableScale onPress={addCustom} hitSlop={8} style={styles.addBtn}>
          <Ionicons name="add" size={20} color={accent} />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { marginBottom: spacing.sm, marginLeft: spacing.xs },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 40, paddingHorizontal: 15, paddingVertical: spacing.sm,
    borderRadius: radii.pill, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center',
  },
  chipCustom: { flexDirection: 'row' },
  addRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.input, paddingLeft: 14, paddingRight: 6,
  },
  addInput: { flex: 1, height: 46, fontSize: 15 },
  addBtn: { padding: 6 },
});
