import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { authApi } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { AuthScaffold } from '@/components/AuthScaffold';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/store/auth';
import { fonts, palette, spacing } from '@/theme';

export default function SignUp() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = (): string | null => {
    // Phone is optional; validate the format only when one is entered.
    if (phone.trim() && !/^\+[1-9]\d{7,14}$/.test(phone.trim()))
      return 'Enter a valid phone in international format, e.g. +447911123456';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return 'Enter a valid email address';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) return 'Password needs an uppercase letter';
    if (!/\d/.test(password)) return 'Password needs a number';
    return null;
  };

  const onSubmit = async () => {
    const v = validate();
    if (v) return setError(v);
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.register(phone.trim() || null, password, email.trim());
      if (res.otp_required === false) {
        // No OTP step (SMS verification disabled): sign straight in.
        const tokens = await authApi.login(email.trim(), password);
        await signIn(tokens);
        return;
      }
      router.push({
        pathname: '/(auth)/verify',
        params: { phone: phone.trim(), debugOtp: res.debug_otp ?? '' },
      });
    } catch (err) {
      setError(errorMessage(err, 'Could not create your account'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold title="Create your account" subtitle="Begin your journey to a purposeful match.">
      <TextField
        label="Phone number (optional)"
        onDark
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        placeholder="+44 7911 123456"
      />
      <TextField
        label="Email"
        onDark
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="you@example.com"
      />
      <TextField
        label="Password"
        onDark
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="At least 8 chars, 1 capital, 1 number"
        error={error}
      />

      <Button label="Continue" onPress={onSubmit} loading={loading} style={{ marginTop: spacing.sm }} />

      <Text variant="callout" tone="onDarkMuted" center style={styles.foot}>
        Already have an account?{' '}
        <Text variant="callout" color={palette.rose} style={styles.link} onPress={() => router.replace('/(auth)/sign-in')}>
          Sign in
        </Text>
      </Text>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  foot: { marginTop: spacing.xl },
  link: { fontFamily: fonts.bodySemibold },
});
