import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/client';
import { profilesApi } from '@/api/profiles';
import type { EducationLevel, PartnerPreferences } from '@/api/types';
import { Button } from './Button';
import { MultiOptionGroup } from './MultiOptionGroup';
import { OptionGroup } from './OptionGroup';
import { Stepper } from './Stepper';
import { TextField } from './TextField';
import { colors, fonts, palette, spacing } from '@/theme';

const RELIGION = [
  { label: 'Islam', value: 'islam' },
  { label: 'Christianity', value: 'christianity' },
  { label: 'Judaism', value: 'judaism' },
  { label: 'Hinduism', value: 'hinduism' },
  { label: 'Sikhism', value: 'sikhism' },
  { label: 'Buddhism', value: 'buddhism' },
  { label: 'Other', value: 'other' },
];
const MARITAL = [
  { label: 'Single', value: 'single' },
  { label: 'Divorced', value: 'divorced' },
  { label: 'Widowed', value: 'widowed' },
  { label: 'Separated', value: 'separated' },
];
const WANTS = [
  { label: 'Wants', value: 'yes' },
  { label: 'Open', value: 'open' },
  { label: "Doesn't", value: 'no' },
];
const EDUCATION = [
  { label: 'High school', value: 'high_school' as EducationLevel },
  { label: 'Some college', value: 'some_college' as EducationLevel },
  { label: "Bachelor's", value: 'bachelors' as EducationLevel },
  { label: "Master's", value: 'masters' as EducationLevel },
  { label: 'PhD', value: 'phd' as EducationLevel },
];

export function PreferencesSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [p, setP] = useState<PartnerPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    profilesApi
      .getPreferences()
      .then(setP)
      .catch(() => setError('Could not load preferences'))
      .finally(() => setLoading(false));
  }, [visible]);

  const set = <K extends keyof PartnerPreferences>(key: K, val: PartnerPreferences[K]) =>
    setP((prev) => (prev ? { ...prev, [key]: val } : prev));

  const save = async () => {
    if (!p) return;
    setSaving(true);
    setError(null);
    try {
      await profilesApi.updatePreferences(p);
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not save preferences'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.cancel}>Close</Text>
          </Pressable>
          <Text style={styles.title}>Preferences</Text>
          <View style={{ width: 50 }} />
        </View>

        {loading || !p ? (
          <View style={styles.center}>
            <ActivityIndicator color={palette.burgundy} size="large" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 100 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.hint}>These guide who you see and how we rank your matches.</Text>

            <Text style={styles.section}>Age</Text>
            <View style={styles.rangeRow}>
              <Stepper label="Min" value={p.pref_min_age} onChange={(v) => set('pref_min_age', v)} min={18} max={80} />
              <Stepper label="Max" value={p.pref_max_age} onChange={(v) => set('pref_max_age', v)} min={18} max={80} />
            </View>

            <Text style={styles.section}>Height (cm)</Text>
            <View style={styles.rangeRow}>
              <Stepper label="Min" value={p.pref_min_height_cm} onChange={(v) => set('pref_min_height_cm', v)} min={120} max={220} step={1} />
              <Stepper label="Max" value={p.pref_max_height_cm} onChange={(v) => set('pref_max_height_cm', v)} min={120} max={220} step={1} />
            </View>

            <Text style={styles.section}>Distance</Text>
            <Stepper label="Within (km)" value={p.pref_max_distance_km} onChange={(v) => set('pref_max_distance_km', v)} min={5} max={500} step={5} />

            <Text style={styles.section}>Faith</Text>
            <MultiOptionGroup label="Religion (any of)" options={RELIGION} value={p.pref_religion} onChange={(v) => set('pref_religion', v)} />
            <TextField label="Denomination" value={p.pref_denomination ?? ''} onChangeText={(t) => set('pref_denomination', t || null)} placeholder="e.g. Sunni, Catholic" />
            <View style={styles.rangeRow}>
              <Stepper label="Religiosity min" value={p.pref_religiosity_min} onChange={(v) => set('pref_religiosity_min', v)} min={1} max={5} />
              <Stepper label="Religiosity max" value={p.pref_religiosity_max} onChange={(v) => set('pref_religiosity_max', v)} min={1} max={5} />
            </View>

            <Text style={styles.section}>Background</Text>
            <TextField label="Caste / biradari" value={p.pref_caste ?? ''} onChangeText={(t) => set('pref_caste', t || null)} placeholder="comma separated, blank = any" />
            <TextField label="Ethnicity" value={p.pref_ethnicity ?? ''} onChangeText={(t) => set('pref_ethnicity', t || null)} placeholder="comma separated, blank = any" />
            <TextField label="Countries (ISO codes)" value={p.pref_country_codes ?? ''} onChangeText={(t) => set('pref_country_codes', t || null)} placeholder="e.g. GB, AE, US" autoCapitalize="characters" />
            <OptionGroup label="Minimum education" options={EDUCATION} value={p.pref_education_min} onChange={(v) => set('pref_education_min', v)} />

            <Text style={styles.section}>Family</Text>
            <MultiOptionGroup label="Marital status (any of)" options={MARITAL} value={p.pref_marital_status} onChange={(v) => set('pref_marital_status', v)} />
            <MultiOptionGroup label="Wants children (any of)" options={WANTS} value={p.pref_wants_children} onChange={(v) => set('pref_wants_children', v)} />

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button label="Save preferences" onPress={save} loading={saving} style={{ marginTop: spacing.sm }} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.cream },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  cancel: { fontFamily: fonts.bodyMedium, color: palette.muted, fontSize: 15, width: 50 },
  title: { fontFamily: fonts.displaySemibold, fontSize: 22, color: palette.burgundy },
  hint: { fontFamily: fonts.body, fontSize: 13.5, color: palette.muted, marginBottom: spacing.lg, lineHeight: 19 },
  section: { fontFamily: fonts.displaySemibold, fontSize: 19, color: palette.burgundy, marginTop: spacing.md, marginBottom: spacing.sm },
  rangeRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  error: { fontFamily: fonts.body, color: colors.danger, textAlign: 'center', marginTop: spacing.md },
});
