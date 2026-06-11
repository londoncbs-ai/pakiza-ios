import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { authApi } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { AuthScaffold } from '@/components/AuthScaffold';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { useAuth } from '@/store/auth';
import { fonts, hexA, palette, radii, spacing } from '@/theme';

const LENGTH = 6;

export default function Verify() {
  const { phone, debugOtp } = useLocalSearchParams<{ phone: string; debugOtp?: string }>();
  const { signIn } = useAuth();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Auto-fill the dev OTP so verification never blocks local testing.
  useEffect(() => {
    if (debugOtp) setCode(String(debugOtp).slice(0, LENGTH));
  }, [debugOtp]);

  const verify = async (value: string) => {
    if (value.length !== LENGTH) return setError('Enter the 6-digit code');
    setError(null);
    setLoading(true);
    try {
      const tokens = await authApi.verifyOtp(String(phone), value);
      await signIn(tokens); // root guard now routes to the app / profile setup
    } catch (err) {
      setError(errorMessage(err, 'Invalid or expired code'));
      setLoading(false);
    }
  };

  const resend = async () => {
    setError(null);
    try {
      const res = await authApi.resendOtp(String(phone));
      if (res.debug_otp) setCode(res.debug_otp.slice(0, LENGTH));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const digits = Array.from({ length: LENGTH }, (_, i) => code[i] ?? '');

  return (
    <AuthScaffold
      title="Verify your number"
      subtitle={`We sent a 6-digit code to ${phone}.`}
    >
      <Pressable onPress={() => inputRef.current?.focus()} style={styles.boxes}>
        {digits.map((d, i) => (
          <View key={i} style={[styles.box, code.length === i && styles.boxActive]}>
            <Text variant="title" tone="onDark" style={styles.boxText}>
              {d}
            </Text>
          </View>
        ))}
      </Pressable>

      {/* Hidden capture input */}
      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, LENGTH))}
        keyboardType="number-pad"
        maxLength={LENGTH}
        autoFocus
        style={styles.hidden}
      />

      {debugOtp ? (
        <Text variant="footnote" color={palette.rose} center style={styles.devHint}>
          Dev mode · code auto-filled ({debugOtp})
        </Text>
      ) : null}
      {error ? (
        <Text variant="footnote" color={palette.rose} center style={styles.error}>
          {error}
        </Text>
      ) : null}

      <Button label="Verify & continue" onPress={() => verify(code)} loading={loading} style={{ marginTop: spacing.lg }} />

      <Text variant="callout" tone="onDarkMuted" center style={styles.resend}>
        Didn’t get it?{' '}
        <Text variant="callout" color={palette.rose} style={styles.link} onPress={resend}>
          Resend code
        </Text>
      </Text>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  boxes: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  box: {
    width: 48,
    height: 58,
    borderRadius: radii.input,
    borderWidth: 1.5,
    borderColor: hexA(palette.cream, 0.22),
    backgroundColor: hexA(palette.cream, 0.06),
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderColor: palette.rose, backgroundColor: hexA(palette.cream, 0.1) },
  boxText: { fontSize: 26 },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  devHint: { marginTop: spacing.md },
  error: { marginTop: spacing.md },
  resend: { marginTop: spacing.xl },
  link: { fontFamily: fonts.bodySemibold },
});
