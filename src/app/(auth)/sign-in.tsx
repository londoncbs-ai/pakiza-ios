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

      <Text variant="callout" tone="onDarkMuted" center style={styles.foot}>
        New to Pakiza?{' '}
        <Text variant="callout" color={palette.rose} style={styles.link} onPress={() => router.replace('/(auth)/sign-up')}>
          Create an account
        </Text>
      </Text>
      <Text variant="footnote" tone="onDarkMuted" center style={styles.demo}>
        Demo login → +447900000000 · Password123
      </Text>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  foot: { marginTop: spacing.xl },
  link: { fontFamily: fonts.bodySemibold },
  demo: { marginTop: spacing.md, opacity: 0.75 },
});
