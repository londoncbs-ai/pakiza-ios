import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { authApi } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { AuthScaffold } from '@/components/AuthScaffold';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/store/auth';
import { fonts, palette, spacing } from '@/theme';

export default function SignIn() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!identifier.trim() || !password) return setError('Enter your phone/email and password');
    setError(null);
    setLoading(true);
    try {
      const tokens = await authApi.login(identifier.trim(), password);
      await signIn(tokens);
    } catch (err) {
      setError(errorMessage(err, 'Could not sign in'));
      setLoading(false);
    }
  };

  return (
    <AuthScaffold title="Welcome back" subtitle="Sign in to continue your search with purpose.">
      <TextField
        label="Phone or email"
        onDark
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        placeholder="+447911123456 or you@example.com"
      />
      <TextField
        label="Password"
        onDark
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Your password"
        error={error}
      />

      <Button label="Sign in" onPress={onSubmit} loading={loading} style={{ marginTop: spacing.sm }} />

      <Text style={styles.foot}>
        New to Pakiza?{' '}
        <Text style={styles.link} onPress={() => router.replace('/(auth)/sign-up')}>
          Create an account
        </Text>
      </Text>
      <Text style={styles.demo}>Demo login → +447900000000 · Password123</Text>
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
  demo: {
    fontFamily: fonts.body,
    color: 'rgba(245,240,230,0.45)',
    textAlign: 'center',
    marginTop: spacing.md,
    fontSize: 12,
  },
});
