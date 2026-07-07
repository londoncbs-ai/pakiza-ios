import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { authApi } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { AuthScaffold } from '@/components/AuthScaffold';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { fonts, palette, spacing } from '@/theme';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const value = email.trim().toLowerCase();
    if (!EMAIL.test(value)) return setError('Enter the email address on your account');
    setError(null);
    setLoading(true);
    try {
      // Always succeeds generically (the server never reveals whether the email exists).
      await authApi.forgotPassword(value);
      setSentTo(value);
    } catch (err) {
      setError(errorMessage(err, 'Could not send the reset link'));
    } finally {
      setLoading(false);
    }
  };

  if (sentTo) {
    return (
      <AuthScaffold
        title="Check your inbox"
        subtitle={`We sent a password reset link to ${sentTo}. Open it, choose a new password, then sign in here.`}
      >
        <Button
          label="Back to sign in"
          onPress={() => router.replace('/(auth)/sign-in')}
          style={{ marginTop: spacing.sm }}
        />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold
      title="Reset your password"
      subtitle="Enter the email on your account and we'll send you a link to set a new password."
    >
      <TextField
        label="Email"
        onDark
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="you@example.com"
        error={error}
      />

      <Button label="Send reset link" onPress={onSubmit} loading={loading} style={{ marginTop: spacing.sm }} />

      <Text variant="callout" tone="onDarkMuted" center style={styles.foot}>
        Remembered it?{' '}
        <Text variant="callout" color={palette.rose} style={styles.link} onPress={() => router.replace('/(auth)/sign-in')}>
          Back to sign in
        </Text>
      </Text>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  foot: { marginTop: spacing.xl },
  link: { fontFamily: fonts.bodySemibold },
});
