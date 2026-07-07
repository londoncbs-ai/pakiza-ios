import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { authApi } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { palette, spacing, useTheme } from '@/theme';

export default function ChangeEmail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError('Enter a valid email address');
    if (!password) return setError('Enter your current password to confirm');
    setError(null);
    setSaving(true);
    try {
      await authApi.changeEmail(email.trim(), password);
      Alert.alert('Email updated', 'We sent a verification link to your new address.');
      router.back();
    } catch (err) {
      setError(errorMessage(err, 'Could not change email'));
      setSaving(false);
    }
  };

  return (
    <Screen keyboard>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ width: 30 }}>
          <Ionicons name="chevron-back" size={26} color={palette.burgundy} />
        </Pressable>
        <Text variant="heading" tone="burgundy">Change email</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text variant="callout" tone="muted" style={{ marginBottom: spacing.lg }}>
          Your email is private and never shown on your profile. We'll send a verification link to your new address.
        </Text>
        <TextField
          label="New email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextField
          label="Current password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Confirm with your password"
          error={error}
        />
        <Button label="Update email" onPress={submit} loading={saving} style={{ marginTop: spacing.sm }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  body: { padding: spacing.lg },
});
