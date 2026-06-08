import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { profilesApi } from '@/api/profiles';
import type { Gender, Religion } from '@/api/types';
import { AuthScaffold } from '@/components/AuthScaffold';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { fonts, palette, radii, spacing } from '@/theme';

const GENDERS: { label: string; value: Gender }[] = [
  { label: 'Woman', value: 'female' },
  { label: 'Man', value: 'male' },
];

const RELIGIONS: { label: string; value: Religion }[] = [
  { label: 'Islam', value: 'islam' },
  { label: 'Christianity', value: 'christianity' },
  { label: 'Judaism', value: 'judaism' },
  { label: 'Hinduism', value: 'hinduism' },
  { label: 'Sikhism', value: 'sikhism' },
  { label: 'Buddhism', value: 'buddhism' },
  { label: 'Other', value: 'other' },
];

export default function ProfileSetup() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [dob, setDob] = useState('');
  const [city, setCity] = useState('');
  const [religion, setReligion] = useState<Religion | null>(null);
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = (): string | null => {
    if (name.trim().length < 2) return 'Please enter your name';
    if (!gender) return 'Please select who you are';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return 'Enter your date of birth as YYYY-MM-DD';
    const age = (Date.now() - new Date(dob).getTime()) / (365.25 * 864e5);
    if (isNaN(age) || age < 18) return 'You must be at least 18 years old';
    return null;
  };

  const onSubmit = async () => {
    const v = validate();
    if (v) return setError(v);
    setError(null);
    setLoading(true);
    try {
      await profilesApi.create({
        display_name: name.trim(),
        date_of_birth: dob,
        gender: gender!,
        city: city.trim() || undefined,
        bio: bio.trim() || undefined,
        religion: religion ?? undefined,
      });
      router.replace('/(app)/discover');
    } catch (err) {
      setError(errorMessage(err, 'Could not save your profile'));
      setLoading(false);
    }
  };

  return (
    <AuthScaffold
      title="Tell us about you"
      subtitle="A few details so we can find meaningful, purposeful matches."
      showBack={false}
    >
      <TextField label="Your name" onDark value={name} onChangeText={setName} placeholder="e.g. Aisha" />

      <Text style={styles.fieldLabel}>I am a…</Text>
      <View style={styles.row}>
        {GENDERS.map((g) => (
          <Chip key={g.value} label={g.label} active={gender === g.value} onPress={() => setGender(g.value)} grow />
        ))}
      </View>

      <View style={{ height: spacing.lg }} />
      <TextField label="Date of birth" onDark value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
      <TextField label="City (optional)" onDark value={city} onChangeText={setCity} placeholder="e.g. London" />

      <Text style={styles.fieldLabel}>Faith (optional)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {RELIGIONS.map((r) => (
          <Chip key={r.value} label={r.label} active={religion === r.value} onPress={() => setReligion(religion === r.value ? null : r.value)} />
        ))}
      </ScrollView>

      <View style={{ height: spacing.lg }} />
      <TextField
        label="About you (optional)"
        onDark
        value={bio}
        onChangeText={setBio}
        placeholder="What are you looking for in a partner?"
        multiline
        numberOfLines={3}
        style={{ height: 96, paddingTop: 14, textAlignVertical: 'top' }}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button label="Start exploring" onPress={onSubmit} loading={loading} style={{ marginTop: spacing.sm }} />
    </AuthScaffold>
  );
}

function Chip({
  label,
  active,
  onPress,
  grow,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  grow?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        grow && { flex: 1 },
        { backgroundColor: active ? palette.gold : 'rgba(245,240,230,0.08)', borderColor: active ? palette.gold : 'rgba(245,240,230,0.22)' },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? palette.ink : palette.cream }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: 'rgba(245,240,230,0.85)',
    marginBottom: 9,
    marginLeft: 4,
    letterSpacing: 0.2,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  chips: { gap: spacing.sm, paddingVertical: 2, paddingRight: spacing.lg },
  chip: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 14.5 },
  error: { fontFamily: fonts.body, color: '#F0B7B0', textAlign: 'center', marginTop: spacing.md },
});
