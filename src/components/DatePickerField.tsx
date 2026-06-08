import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { fonts, palette, radii, spacing } from '@/theme';

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
  const [open, setOpen] = useState(false);

  const handle = (_e: DateTimePickerEvent, d?: Date) => {
    // On Android the dialog closes itself; on iOS we keep the inline spinner open.
    if (Platform.OS !== 'ios') setOpen(false);
    if (d) onChange(d);
  };

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={[styles.label, { color: onDark ? 'rgba(245,240,230,0.85)' : palette.muted }]}>{label}</Text>
      ) : null}

      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={[
          styles.field,
          {
            backgroundColor: onDark ? 'rgba(245,240,230,0.08)' : palette.white,
            borderColor: open ? palette.gold : onDark ? 'rgba(245,240,230,0.18)' : palette.line,
          },
        ]}
      >
        <Text style={[styles.value, { color: value ? (onDark ? palette.cream : palette.ink) : onDark ? 'rgba(245,240,230,0.45)' : palette.muted }]}>
          {value ? fmt(value) : 'Select your date of birth'}
        </Text>
      </Pressable>

      {open ? (
        <View style={Platform.OS === 'ios' ? styles.iosPicker : undefined}>
          <DateTimePicker
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            value={value ?? maxDate}
            maximumDate={maxDate}
            minimumDate={minDate}
            onChange={handle}
            themeVariant="light"
          />
          {Platform.OS === 'ios' ? (
            <Pressable onPress={() => setOpen(false)} style={styles.done}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13, marginBottom: 7, marginLeft: 4, letterSpacing: 0.2 },
  field: {
    height: 54,
    borderRadius: radii.sm + 4,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  value: { fontFamily: fonts.body, fontSize: 16 },
  iosPicker: {
    backgroundColor: palette.cream,
    borderRadius: radii.card,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  done: { alignSelf: 'flex-end', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  doneText: { fontFamily: fonts.bodySemibold, color: palette.burgundy, fontSize: 15 },
});
