import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { errorMessage } from '@/api/client';
import { profilesApi } from '@/api/profiles';
import type { EducationLevel, PartnerPreferences } from '@/api/types';
import { Button } from './Button';
import { FormScroll } from './FormScroll';
import { MultiOptionGroup } from './MultiOptionGroup';
import { OptionGroup } from './OptionGroup';
import { Stepper } from './Stepper';
import { Surface } from './Surface';
import { Text } from './Text';
import { TextField } from './TextField';
import { palette, radii, spacing, useTheme } from '@/theme';

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
  const { c, isDark } = useTheme();
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
      <View style={[styles.root, { backgroundColor: c.bg }]}>
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.headerSide}>
            <Text variant="callout" tone="muted">Close</Text>
          </Pressable>
          <Text variant="heading" tone="default">Preferences</Text>
          <View style={styles.headerSide} />
        </View>

        {loading || !p ? (
          <View style={styles.center}>
            <ActivityIndicator color={c.accent} size="large" />
          </View>
        ) : (
          <FormScroll
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 100 }}
          >
            <View style={[styles.hintCard, { backgroundColor: c.accentFaint }]}>
              <Ionicons name="sparkles-outline" size={18} color={c.accent} style={styles.hintIcon} />
              <Text variant="footnote" tone="muted" style={styles.hintText}>
                These guide who you see and how we rank your matches.
              </Text>
            </View>

            <Section title="Age & height">
              <Surface elevated={!isDark} style={styles.card}>
                <View style={styles.rangeRow}>
                  <Stepper label="Min age" value={p.pref_min_age} onChange={(v) => set('pref_min_age', v)} min={18} max={80} />
                  <Stepper label="Max age" value={p.pref_max_age} onChange={(v) => set('pref_max_age', v)} min={18} max={80} />
                </View>
                <View style={[styles.rangeRow, styles.rangeRowLast]}>
                  <Stepper label="Min height (cm)" value={p.pref_min_height_cm} onChange={(v) => set('pref_min_height_cm', v)} min={120} max={220} step={1} />
                  <Stepper label="Max height (cm)" value={p.pref_max_height_cm} onChange={(v) => set('pref_max_height_cm', v)} min={120} max={220} step={1} />
                </View>
              </Surface>
            </Section>

            <Section title="Distance">
              <Surface elevated={!isDark} style={styles.card}>
                <Stepper label="Within (km)" value={p.pref_max_distance_km} onChange={(v) => set('pref_max_distance_km', v)} min={5} max={500} step={5} />
              </Surface>
            </Section>

            <Section title="Faith">
              <Surface elevated={!isDark} style={styles.card}>
                <MultiOptionGroup label="Religion (any of)" options={RELIGION} value={p.pref_religion} onChange={(v) => set('pref_religion', v)} onDark={false} />
                <TextField label="Denomination" value={p.pref_denomination ?? ''} onChangeText={(t) => set('pref_denomination', t || null)} placeholder="e.g. Sunni, Catholic" />
                <View style={[styles.rangeRow, styles.rangeRowLast]}>
                  <Stepper label="Religiosity min" value={p.pref_religiosity_min} onChange={(v) => set('pref_religiosity_min', v)} min={1} max={5} />
                  <Stepper label="Religiosity max" value={p.pref_religiosity_max} onChange={(v) => set('pref_religiosity_max', v)} min={1} max={5} />
                </View>
              </Surface>
            </Section>

            <Section title="Background">
              <Surface elevated={!isDark} style={styles.card}>
                <TextField label="Caste / biradari" value={p.pref_caste ?? ''} onChangeText={(t) => set('pref_caste', t || null)} placeholder="comma separated, blank = any" />
                <TextField label="Ethnicity" value={p.pref_ethnicity ?? ''} onChangeText={(t) => set('pref_ethnicity', t || null)} placeholder="comma separated, blank = any" />
                <TextField label="Countries (ISO codes)" value={p.pref_country_codes ?? ''} onChangeText={(t) => set('pref_country_codes', t || null)} placeholder="e.g. GB, AE, US" autoCapitalize="characters" />
                <View style={styles.lastField}>
                  <OptionGroup label="Minimum education" options={EDUCATION} value={p.pref_education_min} onChange={(v) => set('pref_education_min', v)} onDark={false} />
                </View>
              </Surface>
            </Section>

            <Section title="Family">
              <Surface elevated={!isDark} style={styles.card}>
                <MultiOptionGroup label="Marital status (any of)" options={MARITAL} value={p.pref_marital_status} onChange={(v) => set('pref_marital_status', v)} onDark={false} />
                <View style={styles.lastField}>
                  <MultiOptionGroup label="Wants children (any of)" options={WANTS} value={p.pref_wants_children} onChange={(v) => set('pref_wants_children', v)} onDark={false} />
                </View>
              </Surface>
            </Section>

            {error ? <Text variant="footnote" tone="danger" center style={styles.error}>{error}</Text> : null}
            <Button label="Save preferences" onPress={save} loading={saving} style={{ marginTop: spacing.sm }} />
          </FormScroll>
        )}
      </View>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="label" tone="accent" style={styles.sectionLabel}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSide: { width: 52 },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
  },
  hintIcon: { marginTop: 1 },
  hintText: { flex: 1, lineHeight: 19 },
  section: { marginBottom: spacing.xl },
  sectionLabel: { marginBottom: spacing.sm, marginLeft: spacing.xs },
  card: { padding: spacing.lg },
  rangeRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  rangeRowLast: { marginBottom: 0 },
  lastField: { marginBottom: -spacing.lg },
  error: { marginTop: spacing.md },
});
