import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { authApi } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { AuthScaffold } from '@/components/AuthScaffold';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { fonts, palette, spacing } from '@/theme';

export default function SignUp() {
  const router = useRouter();
  const [phone, setPhone] = useState('+44');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = (): string | null => {
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) return 'Enter a valid phone in international format, e.g. +447911123456';
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
      const res = await authApi.register(phone.trim(), password, email.trim() || undefined);
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
        label="Phone number"
        onDark
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        placeholder="+44 7911 123456"
      />
      <TextField
        label="Email (optional)"
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

      <Text style={styles.foot}>
        Already have an account?{' '}
        <Text style={styles.link} onPress={() => router.replace('/(auth)/sign-in')}>
          Sign in
        </Text>
      </Text>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  foot: {
    fontFamily: fonts.body,
    color: 'rgba(245,240,230,0.75)',
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: 14,
  },
  link: { fontFamily: fonts.bodySemibold, color: palette.gold },
});
