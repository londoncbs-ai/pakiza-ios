import React, { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button } from './Button';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { haptics } from '@/lib/haptics';
import { hexA, palette, radii, spacing, useTheme } from '@/theme';

/**
 * Multi-select picker field. Replaces the old inline chip-wrap
 * (ChipMultiSelect): the field shows the current selection as brand pills
 * and opens a bottom sheet of large check rows to change it.
 *
 * Correctness note: the sheet owns its selection in LOCAL state and commits
 * once on Done. The old chips serialised every tap through the parent's
 * CSV round-trip, so a second tap could land before the first re-render on
 * slower devices and silently drop the earlier pick (the "single-select on
 * real phones" bug). Local ownership makes that race impossible.
 */

const MAX_ITEMS = 10;
// Server caps the stored CSV at 255 chars; stay safely under it.
const MAX_CSV_CHARS = 250;
const MAX_CUSTOM_LEN = 40;

interface Props {
  label: string;
  /** Sheet header; defaults to the field label. */
  sheetTitle?: string;
  /** Preset options shown as rows. Custom entries are allowed on top. */
  options: string[];
  /** Comma-separated selected values (backend format). */
  value: string | null;
  onChange: (csv: string | null) => void;
  /** Shown inside the field when nothing is selected. */
  placeholder?: string;
  /** Placeholder of the custom-entry input in the sheet. */
  addPlaceholder?: string;
  onDark?: boolean;
}

const parseCsv = (csv: string | null): string[] =>
  csv ? csv.split(',').map((s) => s.trim()).filter(Boolean) : [];
const toCsv = (arr: string[]): string | null => (arr.length ? arr.join(',') : null);

export function MultiSelectField({
  label,
  sheetTitle,
  options,
  value,
  onChange,
  placeholder = 'Tap to choose',
  addPlaceholder = 'Add your own…',
  onDark = false,
}: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  // Sheet-local selection; seeded from the committed value each time the
  // sheet opens, committed upward exactly once on Done.
  const [draft, setDraft] = useState<string[]>([]);
  const [custom, setCustom] = useState('');

  const selected = useMemo(() => parseCsv(value), [value]);

  const openSheet = () => {
    setDraft(parseCsv(value));
    setCustom('');
    setOpen(true);
  };

  const commit = () => {
    onChange(toCsv(draft));
    setOpen(false);
  };

  const has = useCallback(
    (arr: string[], v: string) => arr.some((s) => s.toLowerCase() === v.toLowerCase()),
    [],
  );

  const roomFor = (arr: string[], v: string) =>
    arr.length < MAX_ITEMS && (toCsv([...arr, v]) ?? '').length <= MAX_CSV_CHARS;

  const toggleDraft = (v: string) => {
    haptics.selection();
    setDraft((prev) =>
      has(prev, v)
        ? prev.filter((s) => s.toLowerCase() !== v.toLowerCase())
        : roomFor(prev, v)
          ? [...prev, v]
          : prev,
    );
  };

  const addCustom = () => {
    // Commas are the CSV separator - collapse them so one entry stays one row.
    const v = custom.trim().replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    if (v) {
      setDraft((prev) => (!has(prev, v) && roomFor(prev, v) ? [...prev, v] : prev));
    }
    setCustom('');
  };

  const removeCommitted = (v: string) => {
    haptics.selection();
    onChange(toCsv(selected.filter((s) => s !== v)));
  };

  // Custom (non-preset) draft entries render as rows too, so they can be
  // unticked in place.
  const customRows = draft.filter((s) => !options.some((o) => o.toLowerCase() === s.toLowerCase()));
  const full = draft.length >= MAX_ITEMS || (toCsv(draft) ?? '').length > MAX_CSV_CHARS - 12;

  const labelColor = onDark ? hexA(palette.cream, 0.85) : c.textMuted;
  const fieldBg = onDark ? hexA(palette.cream, 0.08) : c.surfaceAlt;
  const fieldBorder = onDark ? hexA(palette.cream, 0.22) : c.border;

  return (
    <View style={styles.wrap}>
      <Text variant="footnote" color={labelColor} style={styles.label}>{label}</Text>

      {/* Closed field: selection pills + edit affordance */}
      <PressableScale
        onPress={openSheet}
        scaleTo={0.99}
        style={[styles.field, { backgroundColor: fieldBg, borderColor: fieldBorder }]}
      >
        <View style={styles.fieldInner}>
          {selected.length === 0 ? (
            <Text
              variant="body"
              color={onDark ? hexA(palette.cream, 0.45) : c.textSubtle}
              style={styles.placeholder}
            >
              {placeholder}
            </Text>
          ) : (
            <View style={styles.pillWrap}>
              {selected.map((v) => (
                <View key={v} style={styles.pill}>
                  <Text variant="footnote" color={palette.cream}>{v}</Text>
                  <Pressable onPress={() => removeCommitted(v)} hitSlop={8}>
                    <Ionicons name="close" size={13} color={hexA(palette.cream, 0.8)} style={styles.pillX} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          <Ionicons
            name="add-circle"
            size={22}
            color={onDark ? palette.rose : c.accent}
            style={styles.fieldIcon}
          />
        </View>
      </PressableScale>

      {/* Picker sheet */}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={() => setOpen(false)} />
        <KeyboardAvoidingView behavior="padding" style={styles.avoid} pointerEvents="box-none">
          <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={[styles.grabber, { backgroundColor: c.borderStrong }]} />

            <View style={styles.headRow}>
              <Text variant="heading" tone="default">{sheetTitle ?? label}</Text>
              <Text variant="footnote" tone="muted">{draft.length}/{MAX_ITEMS}</Text>
            </View>

            <ScrollView
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {[...options, ...customRows].map((opt) => {
                const active = has(draft, opt);
                const disabled = !active && full;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => !disabled && toggleDraft(opt)}
                    style={({ pressed }) => [
                      styles.row,
                      { borderBottomColor: c.border },
                      pressed && { backgroundColor: c.surfaceAlt },
                      disabled && styles.rowDisabled,
                    ]}
                  >
                    <Ionicons
                      name={active ? 'checkmark-circle' : 'ellipse-outline'}
                      size={24}
                      color={active ? c.accent : c.borderStrong}
                    />
                    <Text variant="callout" tone="default" style={styles.rowText}>{opt}</Text>
                  </Pressable>
                );
              })}

              {/* Custom entry */}
              <View style={[styles.addRow, { borderColor: fieldBorder, backgroundColor: fieldBg }]}>
                <TextInput
                  value={custom}
                  onChangeText={setCustom}
                  onSubmitEditing={addCustom}
                  returnKeyType="done"
                  maxLength={MAX_CUSTOM_LEN}
                  placeholder={full ? 'List is full' : addPlaceholder}
                  editable={!full}
                  placeholderTextColor={c.textSubtle}
                  style={[styles.addInput, { color: c.text }]}
                />
                <PressableScale onPress={addCustom} hitSlop={8} style={styles.addBtn}>
                  <Ionicons name="add" size={20} color={c.accent} />
                </PressableScale>
              </View>
            </ScrollView>

            <Button label="Done" onPress={commit} style={styles.done} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { marginBottom: spacing.sm, marginLeft: spacing.xs },
  field: {
    borderRadius: radii.input,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
    justifyContent: 'center',
  },
  fieldInner: {
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: 14, paddingRight: 10, paddingVertical: spacing.sm,
  },
  placeholder: { flex: 1 },
  pillWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  pill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: palette.burgundy, borderRadius: radii.pill,
    paddingLeft: 12, paddingRight: 8, paddingVertical: 6,
  },
  pillX: { marginLeft: 4 },
  fieldIcon: { marginLeft: spacing.sm },
  backdrop: { flex: 1 },
  avoid: { justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    maxHeight: '82%',
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: spacing.lg },
  headRow: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    minHeight: 54, borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xs,
  },
  rowDisabled: { opacity: 0.4 },
  rowText: { flex: 1 },
  addRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.input,
    paddingLeft: 14, paddingRight: 6, marginTop: spacing.md,
  },
  addInput: { flex: 1, height: 46, fontSize: 15 },
  addBtn: { padding: 6 },
  done: { marginTop: spacing.lg },
});
