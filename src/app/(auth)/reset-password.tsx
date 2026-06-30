import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { authApi } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { AuthScaffold } from '@/components/AuthScaffold';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { palette, spacing } from '@/theme';

export default function ResetPassword() {
  const router = useRouter();
  const { phone, debugOtp } = useLocalSearchParams<{ phone: string; debugOtp?: string }>();

  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-fill the dev OTP so reset never blocks local testing.
  useEffect(() => {
    if (debugOtp) setOtp(String(debugOtp).slice(0, 6));
  }, [debugOtp]);

  const onSubmit = async () => {
    if (otp.length !== 6) return setError('Enter the 6-digit code we texted you');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (!/[A-Z]/.test(password)) return setError('Password must contain an uppercase letter');
    if (!/\d/.test(password)) return setError('Password must contain a number');
    if (password !== confirm) return setError('Passwords do not match');

    setError(null);
    setLoading(true);
    try {
      await authApi.resetPassword(String(phone), otp, password);
      router.replace({ pathname: '/(auth)/sign-in', params: { reset: '1' } });
    } catch (err) {
      setError(errorMessage(err, 'Could not reset your password'));
      setLoading(false);
    }
  };

  return (
    <AuthScaffold
      title="Set a new password"
      subtitle={`Enter the code sent to ${phone ?? 'your phone'} and choose a new password.`}
    >
      <TextField
        label="6-digit code"
        onDark
        value={otp}
        onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="123456"
      />
      <TextField
        label="New password"
        onDark
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="At least 8 characters"
      />
      <TextField
        label="Confirm new password"
        onDark
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        placeholder="Re-enter your password"
        error={error}
      />

      {debugOtp ? (
        <Text variant="footnote" color={palette.rose} center style={styles.devHint}>
          Dev mode · code auto-filled ({debugOtp})
        </Text>
      ) : null}

      <Button label="Reset password" onPress={onSubmit} loading={loading} style={{ marginTop: spacing.sm }} />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  devHint: { marginBottom: spacing.md },
});
