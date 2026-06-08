import React, { useState } from 'react';
import {
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
import type {
  EducationLevel,
  MaritalStatus,
  MyProfile,
  UpdateProfileInput,
  WantsChildren,
} from '@/api/types';
import { Button } from './Button';
import { OptionGroup } from './OptionGroup';
import { TextField } from './TextField';
import { colors, fonts, palette, spacing } from '@/theme';

const EDUCATION = [
  { label: 'High school', value: 'high_school' as EducationLevel },
  { label: 'Some college', value: 'some_college' as EducationLevel },
  { label: "Bachelor's", value: 'bachelors' as EducationLevel },
  { label: "Master's", value: 'masters' as EducationLevel },
  { label: 'PhD', value: 'phd' as EducationLevel },
  { label: 'Professional', value: 'professional' as EducationLevel },
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
  const [bio, setBio] = useState(profile.bio ?? '');
  const [city, setCity] = useState(profile.city ?? '');
  const [occupation, setOccupation] = useState(profile.occupation ?? '');
  const [height, setHeight] = useState(profile.height_cm ? String(profile.height_cm) : '');
  const [denomination, setDenomination] = useState(profile.denomination ?? '');
  const [languages, setLanguages] = useState(profile.languages_spoken ?? '');
  const [education, setEducation] = useState<EducationLevel | null>((profile.education_level as EducationLevel) ?? null);
  const [marital, setMarital] = useState<MaritalStatus | null>((profile.marital_status as MaritalStatus) ?? null);
  const [wants, setWants] = useState<WantsChildren | null>((profile.wants_children as WantsChildren) ?? null);
  const [religiosity, setReligiosity] = useState<number | null>(profile.religiosity ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const patch: UpdateProfileInput = {
        bio: bio.trim() || undefined,
        city: city.trim() || undefined,
        occupation: occupation.trim() || undefined,
        height_cm: height ? Number(height) : undefined,
        denomination: denomination.trim() || undefined,
        languages_spoken: languages.trim() || undefined,
        education_level: education ?? undefined,
        marital_status: marital ?? undefined,
        wants_children: wants ?? undefined,
        religiosity: religiosity ?? undefined,
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
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>Edit profile</Text>
          <View style={{ width: 56 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 100 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TextField label="About you" value={bio} onChangeText={setBio} multiline placeholder="What are you looking for?" style={{ height: 100, paddingTop: 14, textAlignVertical: 'top' }} />
          <TextField label="City" value={city} onChangeText={setCity} placeholder="e.g. London" />
          <TextField label="Profession" value={occupation} onChangeText={setOccupation} placeholder="e.g. Pharmacist" />
          <TextField label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="number-pad" placeholder="e.g. 170" />
          <TextField label="Denomination" value={denomination} onChangeText={setDenomination} placeholder="e.g. Sunni" />
          <TextField label="Languages (comma separated)" value={languages} onChangeText={setLanguages} placeholder="e.g. en, ar, ur" />
          <OptionGroup label="Religiosity" options={RELIGIOSITY} value={religiosity} onChange={setReligiosity} onDark={false} />
          <OptionGroup label="Education" options={EDUCATION} value={education} onChange={setEducation} onDark={false} />
          <OptionGroup label="Marital status" options={MARITAL} value={marital} onChange={setMarital} onDark={false} />
          <OptionGroup label="Children" options={WANTS} value={wants} onChange={setWants} onDark={false} />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Save changes" onPress={save} loading={saving} style={{ marginTop: spacing.sm }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  cancel: { fontFamily: fonts.bodyMedium, color: palette.muted, fontSize: 15, width: 56 },
  title: { fontFamily: fonts.displaySemibold, fontSize: 22, color: palette.burgundy },
  error: { fontFamily: fonts.body, color: colors.danger, textAlign: 'center', marginTop: spacing.md },
});
