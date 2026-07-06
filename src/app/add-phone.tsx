import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { authApi } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { spacing } from '@/theme';

const E164 = /^\+[1-9]\d{7,14}$/;

/** Add + verify a phone for an account created without one (registration allows
 * skipping the number while SMS verification is disabled). */
export default function AddPhone() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('+44');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    if (!E164.test(phone.trim())) return setError('Enter your phone in full format, e.g. +447911123456');
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.addPhone(phone.trim());
      if (res.debug_otp) setOtp(res.debug_otp); // dev convenience
      setStep('otp');
    } catch (err) {
      setError(errorMessage(err, 'Could not send a code'));
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (otp.length !== 6) return setError('Enter the 6-digit code');
    setError(null);
    setLoading(true);
    try {
      await authApi.verifyPhone(phone.trim(), otp);
      router.back(); // back to the verification hub, which refreshes on focus
    } catch (err) {
      setError(errorMessage(err, 'Invalid or expired code'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={[styles.wrap, { paddingTop: insets.top + spacing.xl }]}>
        <Text variant="title" tone="default" style={styles.title}>
          {step === 'phone' ? 'Add your phone' : 'Enter the code'}
        </Text>
        <Text variant="callout" tone="muted" style={styles.subtitle}>
          {step === 'phone'
            ? 'Pakiza verifies every member by phone. We’ll text you a 6-digit code.'
            : `We sent a code to ${phone.trim()}.`}
        </Text>

        {step === 'phone' ? (
          <>
            <TextField
              label="Phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoCapitalize="none"
              placeholder="+447911123456"
              error={error}
            />
            <Button label="Send code" onPress={sendCode} loading={loading} style={{ marginTop: spacing.sm }} />
          </>
        ) : (
          <>
            <TextField
              label="6-digit code"
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="123456"
              error={error}
            />
            <Button label="Verify" onPress={verify} loading={loading} style={{ marginTop: spacing.sm }} />
            <Text
              variant="callout"
              tone="muted"
              center
              style={styles.change}
              onPress={() => { setStep('phone'); setError(null); }}
            >
              Use a different number
            </Text>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: spacing.xl },
  title: { marginBottom: spacing.sm },
  subtitle: { marginBottom: spacing.xl },
  change: { marginTop: spacing.lg },
});
