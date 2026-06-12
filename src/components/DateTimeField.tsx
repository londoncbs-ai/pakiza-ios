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
  /** Earliest selectable date. Defaults to now. */
  minimumDate?: Date;
}

function fmt(d: Date) {
  return d.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * A future-dated date + time picker. On iOS we show an inline spinner that
 * walks through date then time; on Android the platform dialogs chain
 * (date, then time). Matches the themed look of DatePickerField / TextField.
 */
export function DateTimeField({ label, value, onChange, onDark = true, minimumDate }: Props) {
  const { c, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  // Android chains: first the date dialog, then the time dialog.
  const [androidStage, setAndroidStage] = useState<'date' | 'time'>('date');

  const min = minimumDate ?? new Date();

  const handle = (_e: DateTimePickerEvent, d?: Date) => {
    if (Platform.OS === 'android') {
      // dismissed
      if (_e.type === 'dismissed' || !d) {
        setOpen(false);
        setAndroidStage('date');
        return;
      }
      if (androidStage === 'date') {
        // Keep the chosen day, move on to pick the time.
        const base = value ?? min;
        const merged = new Date(d);
        merged.setHours(base.getHours(), base.getMinutes(), 0, 0);
        onChange(merged.getTime() < min.getTime() ? min : merged);
        setAndroidStage('time');
        return;
      }
      // time stage
      onChange(d.getTime() < min.getTime() ? min : d);
      setOpen(false);
      setAndroidStage('date');
      return;
    }
    // iOS: single datetime spinner, kept open until Done.
    if (d) onChange(d.getTime() < min.getTime() ? min : d);
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
        onPress={() => {
          setAndroidStage('date');
          setOpen((o) => !o);
        }}
        style={[
          styles.field,
          {
            backgroundColor: fieldBg,
            borderColor: open ? c.accent : restingBorder,
          },
        ]}
      >
        <Text variant="body" color={value ? valueColor : placeholderColor}>
          {value ? fmt(value) : 'Select a preferred time'}
        </Text>
      </Pressable>

      {open ? (
        <View style={Platform.OS === 'ios' ? [styles.iosPicker, { backgroundColor: c.surfaceAlt }] : undefined}>
          <DateTimePicker
            mode={Platform.OS === 'ios' ? 'datetime' : androidStage}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            value={value ?? min}
            minimumDate={androidStage === 'date' || Platform.OS === 'ios' ? min : undefined}
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
    minHeight: 54,
    borderRadius: radii.input,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    justifyContent: 'center',
  },
  iosPicker: {
    borderRadius: radii.card,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  done: { alignSelf: 'flex-end', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
});
