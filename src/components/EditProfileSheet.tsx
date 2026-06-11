import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/client';
import { profilesApi } from '@/api/profiles';
import type {
  BodyType,
  EducationLevel,
  MaritalStatus,
  MyProfile,
  RelocationWillingness,
  SmokingDrinking,
  UpdateProfileInput,
  WantsChildren,
} from '@/api/types';
import { Button } from './Button';
import { OptionGroup } from './OptionGroup';
import { Surface } from './Surface';
import { Text } from './Text';
import { TextField } from './TextField';
import { ToggleRow } from './ToggleRow';
import { radii, spacing, useTheme } from '@/theme';

const EDUCATION = [
  { label: 'High school', value: 'high_school' as EducationLevel },
  { label: 'Some college', value: 'some_college' as EducationLevel },
  { label: "Bachelor's", value: 'bachelors' as EducationLevel },
  { label: "Master's", value: 'masters' as EducationLevel },
  { label: 'PhD', value: 'phd' as EducationLevel },
  { label: 'Professional', value: 'professional' as EducationLevel },
  { label: 'Vocational', value: 'vocational' as EducationLevel },
];
const MARITAL = [
  { label: 'Single', value: 'single' as MaritalStatus },
  { label: 'Divorced', value: 'divorced' as MaritalStatus },
  { label: 'Widowed', value: 'widowed' as MaritalStatus },
  { label: 'Separated', value: 'separated' as MaritalStatus },
];
const WANTS = [
  { label: 'Want children', value: 'yes' as WantsChildren },
  { label: 'Open to it', value: 'open' as WantsChildren },
  { label: "Don't want", value: 'no' as WantsChildren },
];
const BODY = [
  { label: 'Slim', value: 'slim' as BodyType },
  { label: 'Athletic', value: 'athletic' as BodyType },
  { label: 'Average', value: 'average' as BodyType },
  { label: 'Curvy', value: 'curvy' as BodyType },
  { label: 'Heavy set', value: 'heavy_set' as BodyType },
];
const LIFESTYLE = [
  { label: 'Never', value: 'never' as SmokingDrinking },
  { label: 'Occasionally', value: 'occasionally' as SmokingDrinking },
  { label: 'Regularly', value: 'regularly' as SmokingDrinking },
];
const RELOCATE = [
  { label: 'Yes', value: 'yes' as RelocationWillingness },
  { label: 'Maybe', value: 'maybe' as RelocationWillingness },
  { label: 'No', value: 'no' as RelocationWillingness },
];
const RELIGIOSITY = [
  { label: 'Not practising', value: 1 },
  { label: 'Somewhat', value: 2 },
  { label: 'Moderate', value: 3 },
  { label: 'Practising', value: 4 },
  { label: 'Very devout', value: 5 },
];

export function EditProfileSheet({
  profile,
  visible,
  onClose,
  onSaved,
}: {
  profile: MyProfile;
  visible: boolean;
  onClose: () => void;
  onSaved: (p: MyProfile) => void;
}) {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const [bio, setBio] = useState(profile.bio ?? '');
  const [city, setCity] = useState(profile.city ?? '');
  const [country, setCountry] = useState(profile.country_name ?? '');
  const [ethnicity, setEthnicity] = useState(profile.ethnicity ?? '');
  const [occupation, setOccupation] = useState(profile.occupation ?? '');
  const [educationField, setEducationField] = useState(profile.education_field ?? '');
  const [height, setHeight] = useState(profile.height_cm ? String(profile.height_cm) : '');
  const [weight, setWeight] = useState(profile.weight_kg ? String(profile.weight_kg) : '');
  const [body, setBody] = useState<BodyType | null>(profile.body_type ?? null);
  const [denomination, setDenomination] = useState(profile.denomination ?? '');
  const [caste, setCaste] = useState(profile.caste ?? '');
  const [casteVisible, setCasteVisible] = useState(profile.caste_is_visible ?? false);
  const [languages, setLanguages] = useState(profile.languages_spoken ?? '');
  const [education, setEducation] = useState<EducationLevel | null>((profile.education_level as EducationLevel) ?? null);
  const [marital, setMarital] = useState<MaritalStatus | null>((profile.marital_status as MaritalStatus) ?? null);
  const [hasChildren, setHasChildren] = useState<boolean>(profile.has_children ?? false);
  const [wants, setWants] = useState<WantsChildren | null>((profile.wants_children as WantsChildren) ?? null);
  const [smoking, setSmoking] = useState<SmokingDrinking | null>(profile.smoking ?? null);
  const [drinking, setDrinking] = useState<SmokingDrinking | null>(profile.drinking ?? null);
  const [relocate, setRelocate] = useState<RelocationWillingness | null>(profile.willing_to_relocate ?? null);
  const [religiosity, setReligiosity] = useState<number | null>(profile.religiosity ?? null);
  const [photosBlurred, setPhotosBlurred] = useState<boolean>(profile.photos_blurred ?? true);
  const [hideContacts, setHideContacts] = useState<boolean>(profile.hide_from_contacts ?? false);
  const [incognito, setIncognito] = useState<boolean>(profile.incognito_mode ?? false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const patch: UpdateProfileInput = {
        bio: bio.trim() || undefined,
        city: city.trim() || undefined,
        country_name: country.trim() || undefined,
        ethnicity: ethnicity.trim() || undefined,
        occupation: occupation.trim() || undefined,
        education_field: educationField.trim() || undefined,
        height_cm: height ? Number(height) : undefined,
        weight_kg: weight ? Number(weight) : undefined,
        body_type: body ?? undefined,
        denomination: denomination.trim() || undefined,
        caste: caste.trim() || undefined,
        caste_is_visible: casteVisible,
        languages_spoken: languages.trim() || undefined,
        education_level: education ?? undefined,
        marital_status: marital ?? undefined,
        has_children: hasChildren,
        wants_children: wants ?? undefined,
        smoking: smoking ?? undefined,
        drinking: drinking ?? undefined,
        willing_to_relocate: relocate ?? undefined,
        religiosity: religiosity ?? undefined,
        photos_blurred: photosBlurred,
        hide_from_contacts: hideContacts,
        incognito_mode: incognito,
      };
      const updated = await profilesApi.update(patch);
      onSaved(updated);
    } catch (err) {
      setError(errorMessage(err, 'Could not save changes'));
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={[styles.root, { backgroundColor: c.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.headerSide}>
            <Text variant="subhead" tone="muted">Cancel</Text>
          </Pressable>
          <Text variant="heading" tone="default">Edit profile</Text>
          <View style={styles.headerSide} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 120, gap: spacing.lg }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Section title="About you">
            <TextField label="Bio" value={bio} onChangeText={setBio} multiline placeholder="What are you looking for?" style={{ height: 100, paddingTop: 14, textAlignVertical: 'top' }} />
            <TextField label="City" value={city} onChangeText={setCity} placeholder="e.g. London" />
            <TextField label="Country" value={country} onChangeText={setCountry} placeholder="e.g. United Kingdom" />
            <TextField label="Ethnicity" value={ethnicity} onChangeText={setEthnicity} placeholder="e.g. South Asian, Arab" />
            <View style={styles.row}>
              <View style={styles.half}><TextField label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="number-pad" placeholder="170" /></View>
              <View style={styles.half}><TextField label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="number-pad" placeholder="optional" /></View>
            </View>
            <OptionGroup label="Body type" options={BODY} value={body} onChange={setBody} onDark={false} />
          </Section>

          <Section title="Faith">
            <TextField label="Denomination" value={denomination} onChangeText={setDenomination} placeholder="e.g. Sunni" />
            <OptionGroup label="Religiosity" options={RELIGIOSITY} value={religiosity} onChange={setReligiosity} onDark={false} />
            <TextField label="Caste / biradari" value={caste} onChangeText={setCaste} placeholder="e.g. Jat, Rajput, Syed…" />
            <ToggleRow label="Show caste on my profile" hint="When off, caste stays private and is used only for matching." value={casteVisible} onValueChange={setCasteVisible} onDark={false} />
          </Section>

          <Section title="Background">
            <TextField label="Profession" value={occupation} onChangeText={setOccupation} placeholder="e.g. Pharmacist" />
            <OptionGroup label="Education" options={EDUCATION} value={education} onChange={setEducation} onDark={false} />
            <TextField label="Field of study" value={educationField} onChangeText={setEducationField} placeholder="e.g. Medicine" />
            <TextField label="Languages (comma separated)" value={languages} onChangeText={setLanguages} placeholder="e.g. en, ar, ur" />
          </Section>

          <Section title="Lifestyle & family">
            <OptionGroup label="Marital status" options={MARITAL} value={marital} onChange={setMarital} onDark={false} />
            <ToggleRow label="I have children" value={hasChildren} onValueChange={setHasChildren} onDark={false} />
            <OptionGroup label="Want children" options={WANTS} value={wants} onChange={setWants} onDark={false} />
            <OptionGroup label="Smoking" options={LIFESTYLE} value={smoking} onChange={setSmoking} onDark={false} />
            <OptionGroup label="Drinking" options={LIFESTYLE} value={drinking} onChange={setDrinking} onDark={false} />
            <OptionGroup label="Willing to relocate" options={RELOCATE} value={relocate} onChange={setRelocate} onDark={false} />
          </Section>

          <Section title="Privacy">
            <ToggleRow label="Blur my photos until matched" value={photosBlurred} onValueChange={setPhotosBlurred} onDark={false} />
            <ToggleRow label="Hide me from my phone contacts" value={hideContacts} onValueChange={setHideContacts} onDark={false} />
            <ToggleRow label="Incognito mode" hint="Browse without leaving profile-view notifications." value={incognito} onValueChange={setIncognito} onDark={false} />
          </Section>

          {error ? <Text variant="footnote" tone="danger" center>{error}</Text> : null}
          <Button label="Save changes" onPress={save} loading={saving} style={{ marginTop: spacing.xs }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="label" tone="accent" style={styles.sectionLabel}>{title}</Text>
      <Surface style={styles.sectionCard}>{children}</Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSide: { width: 56 },
  section: { gap: spacing.sm },
  sectionLabel: { marginLeft: spacing.xs },
  sectionCard: { padding: spacing.lg, paddingBottom: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
});
