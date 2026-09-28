import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { Ionicons } from '@expo/vector-icons';

import { Text } from './Text';
import { ageFromDate, UNDER_AGE_MESSAGE } from '@/lib/age';
import { hexA, palette, radii, spacing, useTheme } from '@/theme';

interface Props {
  label?: string;
  value: Date | null;
  onChange: (d: Date) => void;
  onDark?: boolean;
  /**
   * A minimum age. When set, any past date can be picked and an age below the
   * minimum is answered with a clear message (rather than the picker quietly
   * refusing to go that far). The picker opens at the minimum age.
   */
  minAge?: number;
}

function fmt(d: Date) {
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

function yearsAgo(n: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d;
}

const minDate = yearsAgo(80);

export function DatePickerField({ label, value, onChange, onDark = true, minAge }: Props) {
  const { c, isDark } = useTheme();
  const [open, setOpen] = useState(false);

  // Without a minimum age the picker is capped at 18, as it always was.
  const openAt = yearsAgo(minAge ?? 18);
  const latest = minAge != null ? new Date() : openAt;
  const tooYoung = minAge != null && value != null && ageFromDate(value) < minAge;

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
            borderColor: tooYoung ? c.danger : open ? c.accent : restingBorder,
          },
        ]}
      >
        <Text variant="body" color={value ? valueColor : placeholderColor}>
          {value ? fmt(value) : 'Select your date of birth'}
        </Text>
      </Pressable>

      {minAge != null ? (
        tooYoung ? (
          <View style={styles.helperRow} accessibilityRole="alert">
            <Ionicons name="alert-circle" size={16} color={c.danger} style={styles.helperIcon} />
            <Text variant="footnote" tone="danger" style={styles.helperText}>{UNDER_AGE_MESSAGE}</Text>
          </View>
        ) : (
          <View style={styles.helperRow}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={onDark ? hexA(palette.cream, 0.6) : c.textSubtle}
              style={styles.helperIcon}
            />
            <Text variant="footnote" tone={onDark ? 'onDarkMuted' : 'subtle'} style={styles.helperText}>
              You must be {minAge} or older to use Pakiza.
            </Text>
          </View>
        )
      ) : null}

      {open ? (
        <View style={Platform.OS === 'ios' ? [styles.iosPicker, { backgroundColor: c.surfaceAlt }] : undefined}>
          <DateTimePicker
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            value={value ?? openAt}
            maximumDate={latest}
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
  helperRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: spacing.sm, marginLeft: spacing.xs },
  helperIcon: { marginTop: 1 },
  helperText: { flex: 1, lineHeight: 18 },
  iosPicker: {
    borderRadius: radii.card,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  done: { alignSelf: 'flex-end', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
});
