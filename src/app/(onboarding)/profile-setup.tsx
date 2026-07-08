import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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
import { AcceptCheckbox } from '@/components/AcceptCheckbox';
import { Button } from '@/components/Button';
import { ChipMultiSelect } from '@/components/ChipMultiSelect';
import { DatePickerField } from '@/components/DatePickerField';
import { FormScroll } from '@/components/FormScroll';
import { OptionGroup } from '@/components/OptionGroup';
import { PressableScale } from '@/components/PressableScale';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { ToggleRow } from '@/components/ToggleRow';
import { palette, radii, spacing, useTheme } from '@/theme';

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

const ETHNICITIES = ['South Asian', 'Arab', 'Turkish', 'Somali', 'Persian', 'African', 'Kurdish', 'Malay', 'Mixed'];
const CASTES = ['Syed', 'Sheikh', 'Pathan', 'Mughal', 'Jat', 'Rajput', 'Gujjar', 'Arain', 'Awan', 'Ansari'];
const HOBBIES = ['Reading', 'Travel', 'Fitness', 'Cooking', 'Photography', 'Volunteering', 'Sports', 'Art', 'Music', 'Nature', 'Writing', 'Gardening', 'Calligraphy'];

const MAX_PHOTOS = 6;

const STEPS = ['About you', 'Faith', 'Background', 'Photos'] as const;
const STEP_HINTS = [
  'Tell us the essentials so we can introduce you well.',
  'Your faith and values guide every match we suggest.',
  'A few final details to round out your profile.',
  'Add your photos, then we’ll verify it’s really you.',
] as const;

export default function ProfileSetup() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // form state
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [dob, setDob] = useState<Date | null>(null);
  const [city, setCity] = useState('');
  const [ethnicity, setEthnicity] = useState('');   // CSV
  const [bio, setBio] = useState('');
  const [religion, setReligion] = useState<Religion | null>(null);
  const [denomination, setDenomination] = useState('');
  const [religiosity, setReligiosity] = useState<number | null>(null);
  const [caste, setCaste] = useState('');           // CSV
  const [casteVisible, setCasteVisible] = useState(false);
  const [education, setEducation] = useState<EducationLevel | null>(null);
  const [occupation, setOccupation] = useState('');
  const [height, setHeight] = useState('');
  const [marital, setMarital] = useState<MaritalStatus | null>(null);
  const [wants, setWants] = useState<WantsChildren | null>(null);
  const [hobbies, setHobbies] = useState('');        // CSV
  const [photos, setPhotos] = useState<string[]>([]);
  const [terms, setTerms] = useState(false);

  const addPhoto = async () => {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      orderedSelection: true,
    });
    if (res.canceled) return;
    setPhotos((p) => {
      const fresh = res.assets.map((a) => a.uri).filter((u, i, arr) => arr.indexOf(u) === i && !p.includes(u));
      return [...p, ...fresh].slice(0, MAX_PHOTOS);
    });
  };
  const removePhoto = (uri: string) => setPhotos((p) => p.filter((u) => u !== uri));

  const validateStep = (): string | null => {
    if (step === 0) {
      if (name.trim().length < 2) return 'Please enter your name';
      if (!gender) return 'Please tell us who you are';
      if (!dob) return 'Please select your date of birth';
    }
    if (step === 3) {
      if (photos.length < 1) return 'Please add at least one photo of yourself';
      if (!terms) return 'Please confirm the terms to continue';
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
      // Build the date from LOCAL parts (toISOString() would shift the day for
      // users west of UTC, changing the stored DOB by one).
      const d = dob!;
      const dobStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const payload: CreateProfileInput = {
        display_name: name.trim(),
        date_of_birth: dobStr,
        gender: gender!,
        city: city.trim() || undefined,
        ethnicity: ethnicity || undefined,
        bio: bio.trim() || undefined,
        religion: religion ?? undefined,
        denomination: denomination.trim() || undefined,
        religiosity: religiosity ?? undefined,
        caste: caste || undefined,
        caste_is_visible: caste ? casteVisible : undefined,
        hobbies: hobbies || undefined,
        education_level: education ?? undefined,
        occupation: occupation.trim() || undefined,
        height_cm: height ? Number(height) : undefined,
        marital_status: marital ?? undefined,
        wants_children: wants ?? undefined,
        terms_accepted: true,
      };
      try {
        await profilesApi.create(payload);
      } catch (err: any) {
        // 409 = the profile was already created on a previous (failed-upload) attempt.
        if (err?.response?.status !== 409) throw err;
      }
      // Upload photos in order (first becomes the primary + the selfie reference).
      let uploaded = 0;
      for (const uri of photos) {
        try { await profilesApi.uploadPhoto(uri); uploaded += 1; } catch { /* keep going */ }
      }
      // The selfie step compares against the primary photo, so we must have at
      // least one uploaded before advancing - otherwise the scan can never pass.
      if (uploaded === 0) {
        setError('We couldn’t upload your photos. Check your connection and try again.');
        setLoading(false);
        return;
      }
      router.replace('/(onboarding)/face-verify');
    } catch (err) {
      setError(errorMessage(err, 'Could not save your profile'));
      setLoading(false);
    }
  };

  const progress = useMemo(() => (step + 1) / STEPS.length, [step]);
  const isLast = step === STEPS.length - 1;

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text variant="label" tone="accent">
          Step {step + 1} of {STEPS.length}
        </Text>
        <Text variant="title" tone="default" style={styles.title}>
          {STEPS[step]}
        </Text>
        <Text variant="callout" tone="muted" style={styles.hint}>
          {STEP_HINTS[step]}
        </Text>
        <View style={[styles.track, { backgroundColor: c.surfaceAlt }]}>
          <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: c.accent }]} />
        </View>
      </View>

      <FormScroll contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}>
        {step === 0 && (
          <>
            <TextField label="Your name" value={name} onChangeText={setName} placeholder="e.g. Aisha" />
            <OptionGroup label="I am a…" options={GENDERS} value={gender} onChange={setGender} onDark={false} clearable={false} />
            <DatePickerField label="Date of birth" value={dob} onChange={setDob} onDark={false} />
            <TextField label="City (optional)" value={city} onChangeText={setCity} placeholder="e.g. London" />
            <ChipMultiSelect label="Ethnicity (optional)" options={ETHNICITIES} value={ethnicity || null} onChange={(v) => setEthnicity(v ?? '')} placeholder="Add your ethnicity" />
          </>
        )}

        {step === 1 && (
          <>
            <OptionGroup label="Faith" options={RELIGIONS} value={religion} onChange={setReligion} onDark={false} />
            <TextField
              label="Denomination / sect (optional)"
              value={denomination}
              onChangeText={setDenomination}
              placeholder="e.g. Sunni, Catholic, Reform"
            />
            <OptionGroup label="How religious are you?" options={RELIGIOSITY} value={religiosity} onChange={setReligiosity} onDark={false} />
            <ChipMultiSelect
              label="Caste / biradari (optional)"
              options={CASTES}
              value={caste || null}
              onChange={(v) => setCaste(v ?? '')}
              placeholder="e.g. Syed, Jat, Gotra…"
            />
            {caste ? (
              <ToggleRow
                label="Show caste on my profile"
                hint="Off by default. When off, your caste stays private and is used only for matching."
                value={casteVisible}
                onValueChange={setCasteVisible}
                onDark={false}
              />
            ) : null}
          </>
        )}

        {step === 2 && (
          <>
            <OptionGroup label="Education" options={EDUCATION} value={education} onChange={setEducation} onDark={false} />
            <TextField label="Profession (optional)" value={occupation} onChangeText={setOccupation} placeholder="e.g. Pharmacist" />
            <TextField label="Height in cm (optional)" value={height} onChangeText={setHeight} keyboardType="number-pad" placeholder="e.g. 170" />
            <OptionGroup label="Marital status" options={MARITAL} value={marital} onChange={setMarital} onDark={false} />
            <OptionGroup label="Children" options={WANTS} value={wants} onChange={setWants} onDark={false} />
            <ChipMultiSelect label="Hobbies & interests (optional)" options={HOBBIES} value={hobbies || null} onChange={(v) => setHobbies(v ?? '')} placeholder="Add a hobby" />
            <TextField
              label="About you (optional)"
              value={bio}
              onChangeText={setBio}
              placeholder="What are you looking for in a partner?"
              multiline
              style={{ height: 100, paddingTop: 14, textAlignVertical: 'top' }}
            />
          </>
        )}

        {step === 3 && (
          <>
            <Text variant="callout" tone="muted" style={{ marginBottom: spacing.md }}>
              Add at least one clear photo of yourself. Your first photo is your main picture — we’ll use it to verify your selfie next.
            </Text>
            <View style={styles.photoGrid}>
              {photos.map((uri) => (
                <View key={uri} style={styles.photoCell}>
                  <Image source={{ uri }} style={styles.photo} contentFit="cover" />
                  <PressableScale onPress={() => removePhoto(uri)} style={styles.photoRemove}>
                    <Ionicons name="close" size={14} color={palette.cream} />
                  </PressableScale>
                </View>
              ))}
              {photos.length < MAX_PHOTOS ? (
                <PressableScale
                  onPress={addPhoto}
                  style={[styles.photoCell, styles.photoAdd, { borderColor: c.borderStrong, backgroundColor: c.surfaceAlt }]}
                >
                  <Ionicons name="add" size={28} color={c.accent} />
                </PressableScale>
              ) : null}
            </View>
            <View style={{ marginTop: spacing.lg }}>
              <AcceptCheckbox checked={terms} onToggle={setTerms}>
                <Text variant="footnote" tone="muted">
                  I confirm the details I’ve provided are true and accurate, I am 18 or older, and I agree to the{' '}
                  <Text variant="footnote" tone="accent" onPress={() => router.push('/terms')}>Terms of Use</Text>
                  {' '}and{' '}
                  <Text variant="footnote" tone="accent" onPress={() => router.push('/privacy')}>Privacy Policy</Text>.
                </Text>
              </AcceptCheckbox>
            </View>
          </>
        )}

        {error ? (
          <Text variant="footnote" tone="danger" center style={styles.error}>
            {error}
          </Text>
        ) : null}
      </FormScroll>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: c.bg,
            borderTopColor: c.border,
            paddingBottom: insets.bottom + spacing.md,
          },
        ]}
      >
        <Button label="Back" variant="ghost" onPress={back} style={{ flex: 1 }} />
        <Button
          label={isLast ? 'Verify me' : 'Continue'}
          onPress={isLast ? submit : next}
          loading={loading}
          style={{ flex: 1.4 }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  title: { marginTop: spacing.xs },
  hint: { marginTop: spacing.xs },
  track: { height: 4, borderRadius: radii.pill, marginTop: spacing.lg, overflow: 'hidden' },
  fill: { height: 4, borderRadius: radii.pill },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  error: { marginTop: spacing.sm },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  photoCell: { width: 96, height: 128, borderRadius: radii.md, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  photoAdd: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed' },
  photoRemove: {
    position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(61,0,16,0.7)', alignItems: 'center', justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
