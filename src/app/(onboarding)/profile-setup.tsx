import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { profilesApi } from '@/api/profiles';
import type {
  CreateProfileInput,
  EducationLevel,
  Gender,
  MaritalStatus,
  Religion,
  WantsChildren,
} from '@/api/types';
import { BrandBackground } from '@/components/BrandBackground';
import { Button } from '@/components/Button';
import { DatePickerField } from '@/components/DatePickerField';
import { OptionGroup } from '@/components/OptionGroup';
import { TextField } from '@/components/TextField';
import { ToggleRow } from '@/components/ToggleRow';
import { fonts, palette, spacing } from '@/theme';

const GENDERS = [
  { label: 'Woman', value: 'female' as Gender },
  { label: 'Man', value: 'male' as Gender },
];
const RELIGIONS = [
  { label: 'Islam', value: 'islam' as Religion },
  { label: 'Christianity', value: 'christianity' as Religion },
  { label: 'Judaism', value: 'judaism' as Religion },
  { label: 'Hinduism', value: 'hinduism' as Religion },
  { label: 'Sikhism', value: 'sikhism' as Religion },
  { label: 'Buddhism', value: 'buddhism' as Religion },
  { label: 'Other', value: 'other' as Religion },
];
const RELIGIOSITY = [
  { label: 'Not practising', value: 1 },
  { label: 'Somewhat', value: 2 },
  { label: 'Moderate', value: 3 },
  { label: 'Practising', value: 4 },
  { label: 'Very devout', value: 5 },
];
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

const STEPS = ['About you', 'Faith', 'Background'] as const;

export default function ProfileSetup() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // form state
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [dob, setDob] = useState<Date | null>(null);
  const [city, setCity] = useState('');
  const [ethnicity, setEthnicity] = useState('');
  const [bio, setBio] = useState('');
  const [religion, setReligion] = useState<Religion | null>(null);
  const [denomination, setDenomination] = useState('');
  const [religiosity, setReligiosity] = useState<number | null>(null);
  const [caste, setCaste] = useState('');
  const [casteVisible, setCasteVisible] = useState(false);
  const [education, setEducation] = useState<EducationLevel | null>(null);
  const [occupation, setOccupation] = useState('');
  const [height, setHeight] = useState('');
  const [marital, setMarital] = useState<MaritalStatus | null>(null);
  const [wants, setWants] = useState<WantsChildren | null>(null);

  const validateStep = (): string | null => {
    if (step === 0) {
      if (name.trim().length < 2) return 'Please enter your name';
      if (!gender) return 'Please tell us who you are';
      if (!dob) return 'Please select your date of birth';
    }
    return null;
  };

  const next = () => {
    const v = validateStep();
    if (v) return setError(v);
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => {
    setError(null);
    if (step === 0) router.back();
    else setStep((s) => s - 1);
  };

  const submit = async () => {
    const v = validateStep();
    if (v) return setError(v);
    setError(null);
    setLoading(true);
    try {
      const payload: CreateProfileInput = {
        display_name: name.trim(),
        date_of_birth: dob!.toISOString().slice(0, 10),
        gender: gender!,
        city: city.trim() || undefined,
        ethnicity: ethnicity.trim() || undefined,
        bio: bio.trim() || undefined,
        religion: religion ?? undefined,
        denomination: denomination.trim() || undefined,
        religiosity: religiosity ?? undefined,
        caste: caste.trim() || undefined,
        caste_is_visible: caste.trim() ? casteVisible : undefined,
        education_level: education ?? undefined,
        occupation: occupation.trim() || undefined,
        height_cm: height ? Number(height) : undefined,
        marital_status: marital ?? undefined,
        wants_children: wants ?? undefined,
      };
      await profilesApi.create(payload);
      router.replace('/(onboarding)/id-verify');
    } catch (err) {
      setError(errorMessage(err, 'Could not save your profile'));
      setLoading(false);
    }
  };

  const progress = useMemo(() => (step + 1) / STEPS.length, [step]);
  const isLast = step === STEPS.length - 1;

  return (
    <BrandBackground>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <Text style={styles.step}>
            Step {step + 1} of {STEPS.length}
          </Text>
          <Text style={styles.title}>{STEPS[step]}</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress * 100}%` }]} />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 0 && (
            <>
              <TextField label="Your name" onDark value={name} onChangeText={setName} placeholder="e.g. Aisha" />
              <OptionGroup label="I am a…" options={GENDERS} value={gender} onChange={setGender} clearable={false} />
              <DatePickerField label="Date of birth" value={dob} onChange={setDob} />
              <TextField label="City (optional)" onDark value={city} onChangeText={setCity} placeholder="e.g. London" />
              <TextField label="Ethnicity (optional)" onDark value={ethnicity} onChangeText={setEthnicity} placeholder="e.g. South Asian, Arab, Turkish" />
            </>
          )}

          {step === 1 && (
            <>
              <OptionGroup label="Faith" options={RELIGIONS} value={religion} onChange={setReligion} />
              <TextField
                label="Denomination / sect (optional)"
                onDark
                value={denomination}
                onChangeText={setDenomination}
                placeholder="e.g. Sunni, Catholic, Reform"
              />
              <OptionGroup label="How religious are you?" options={RELIGIOSITY} value={religiosity} onChange={setReligiosity} />
              <TextField
                label="Caste / biradari (optional)"
                onDark
                value={caste}
                onChangeText={setCaste}
                placeholder="e.g. Jat, Rajput, Syed, Gotra…"
              />
              {caste.trim() ? (
                <ToggleRow
                  label="Show caste on my profile"
                  hint="Off by default. When off, your caste stays private and is used only for matching."
                  value={casteVisible}
                  onValueChange={setCasteVisible}
                />
              ) : null}
            </>
          )}

          {step === 2 && (
            <>
              <OptionGroup label="Education" options={EDUCATION} value={education} onChange={setEducation} />
              <TextField label="Profession (optional)" onDark value={occupation} onChangeText={setOccupation} placeholder="e.g. Pharmacist" />
              <TextField label="Height in cm (optional)" onDark value={height} onChangeText={setHeight} keyboardType="number-pad" placeholder="e.g. 170" />
              <OptionGroup label="Marital status" options={MARITAL} value={marital} onChange={setMarital} />
              <OptionGroup label="Children" options={WANTS} value={wants} onChange={setWants} />
              <TextField
                label="About you (optional)"
                onDark
                value={bio}
                onChangeText={setBio}
                placeholder="What are you looking for in a partner?"
                multiline
                style={{ height: 100, paddingTop: 14, textAlignVertical: 'top' }}
              />
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button label="Back" variant="outline" onPress={back} style={{ flex: 1 }} />
          <Button
            label={isLast ? 'Finish' : 'Continue'}
            onPress={isLast ? submit : next}
            loading={loading}
            style={{ flex: 1.4 }}
          />
        </View>
      </KeyboardAvoidingView>
    </BrandBackground>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  step: { fontFamily: fonts.bodyMedium, color: palette.goldSoft, fontSize: 13, letterSpacing: 0.5 },
  title: { fontFamily: fonts.display, color: palette.cream, fontSize: 34, marginTop: 2 },
  track: { height: 4, borderRadius: 2, backgroundColor: 'rgba(245,240,230,0.18)', marginTop: spacing.md, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, backgroundColor: palette.gold },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  error: { fontFamily: fonts.body, color: '#F0B7B0', textAlign: 'center', marginTop: spacing.sm },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
});
