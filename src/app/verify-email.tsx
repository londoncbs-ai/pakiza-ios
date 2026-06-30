import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { authApi } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { AuthScaffold } from '@/components/AuthScaffold';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { palette, spacing } from '@/theme';

type State = 'verifying' | 'success' | 'error';

/** Deep-link landing for the email verification link (pakiza://verify-email?token=...). */
export default function VerifyEmail() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [state, setState] = useState<State>('verifying');
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // verify-once guard (links are single-use)
    ran.current = true;
    if (!token) {
      setState('error');
      setMessage('This link is missing its verification token.');
      return;
    }
    authApi
      .verifyEmail(String(token))
      .then(() => setState('success'))
      .catch((err) => {
        setState('error');
        setMessage(errorMessage(err, 'This link is invalid or has expired.'));
      });
  }, [token]);

  return (
    <AuthScaffold
      showBack={false}
      title={state === 'success' ? 'Email verified' : state === 'error' ? "Couldn't verify" : 'Verifying your email'}
      subtitle={
        state === 'verifying'
          ? 'One moment…'
          : state === 'success'
            ? 'Thank you — your email address is now confirmed.'
            : message
      }
    >
      {state === 'verifying' ? (
        <View style={styles.center}>
          <ActivityIndicator color={palette.cream} />
        </View>
      ) : (
        <Button label="Continue" onPress={() => router.replace('/')} style={{ marginTop: spacing.lg }} />
      )}
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: spacing.xxl, alignItems: 'center' },
});
