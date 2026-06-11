import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { Text } from './Text';
import { hexA, palette, radii, spacing, useTheme } from '@/theme';

interface Props {
  label?: string;
  value: Date | null;
  onChange: (d: Date) => void;
  onDark?: boolean;
}

function fmt(d: Date) {
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

// Default the picker to a sensible adult age and cap at 18+.
const maxDate = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
})();
const minDate = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 80);
  return d;
})();

export function DatePickerField({ label, value, onChange, onDark = true }: Props) {
  const { c, isDark } = useTheme();
  const [open, setOpen] = useState(false);

  const handle = (_e: DateTimePickerEvent, d?: Date) => {
    // On Android the dialog closes itself; on iOS we keep the inline spinner open.
    if (Platform.OS !== 'ios') setOpen(false);
    if (d) onChange(d);
  };

  const fieldBg = onDark ? hexA(palette.cream, 0.08) : c.surfaceAlt;
  const restingBorder = onDark ? hexA(palette.cream, 0.18) : c.border;
  const placeholderColor = onDark ? hexA(palette.cream, 0.45) : c.textSubtle;
  const valueColor = onDark ? palette.cream : c.text;

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="footnote" color={onDark ? hexA(palette.cream, 0.85) : c.textMuted} style={styles.label}>
          {label}
        </Text>
      ) : null}

      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={[
          styles.field,
          {
            backgroundColor: fieldBg,
            borderColor: open ? c.accent : restingBorder,
          },
        ]}
      >
        <Text variant="body" color={value ? valueColor : placeholderColor}>
          {value ? fmt(value) : 'Select your date of birth'}
        </Text>
      </Pressable>

      {open ? (
        <View style={Platform.OS === 'ios' ? [styles.iosPicker, { backgroundColor: c.surfaceAlt }] : undefined}>
          <DateTimePicker
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            value={value ?? maxDate}
            maximumDate={maxDate}
            minimumDate={minDate}
            onChange={handle}
            themeVariant={isDark ? 'dark' : 'light'}
          />
          {Platform.OS === 'ios' ? (
            <Pressable onPress={() => setOpen(false)} style={styles.done}>
              <Text variant="callout" tone="accent">Done</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { marginBottom: spacing.xs + 3, marginLeft: spacing.xs },
  field: {
    height: 54,
    borderRadius: radii.input,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  iosPicker: {
    borderRadius: radii.card,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  done: { alignSelf: 'flex-end', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
});
