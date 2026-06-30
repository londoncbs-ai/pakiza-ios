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

const E164 = /^\+[1-9]\d{7,14}$/;

export default function ForgotPassword() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const value = phone.trim();
    if (!E164.test(value)) return setError('Enter your phone in full format, e.g. +447911123456');
    setError(null);
    setLoading(true);
    try {
      // Always succeeds generically (the server never reveals whether the number exists).
      const res = await authApi.forgotPassword(value);
      router.push({
        pathname: '/(auth)/reset-password',
        params: { phone: value, debugOtp: res.debug_otp ?? undefined },
      });
    } catch (err) {
      setError(errorMessage(err, 'Could not send a reset code'));
      setLoading(false);
    }
  };

  return (
    <AuthScaffold
      title="Reset your password"
      subtitle="Enter your phone number and we’ll text you a 6-digit code to set a new password."
    >
      <TextField
        label="Phone number"
        onDark
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoCapitalize="none"
        placeholder="+447911123456"
        error={error}
      />

      <Button label="Send reset code" onPress={onSubmit} loading={loading} style={{ marginTop: spacing.sm }} />

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
