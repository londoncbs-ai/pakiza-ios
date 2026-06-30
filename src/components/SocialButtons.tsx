import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import { errorMessage } from '@/api/client';
import { socialApi } from '@/api/social';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { useAuth } from '@/store/auth';
import { palette, spacing } from '@/theme';

// Client ids come from EAS env (EXPO_PUBLIC_GOOGLE_*). webClientId is required so
// the backend (which verifies the audience) accepts the token.
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

/** Google + Apple sign-in. After auth the RootNavigator routes the member
 * (to onboarding if their profile is incomplete, else into the app). */
export function SocialButtons() {
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});
    }
  }, []);

  const google = async () => {
    setError(null);
    setBusy(true);
    try {
      await GoogleSignin.hasPlayServices();
      const res = await GoogleSignin.signIn();
      if (res.type !== 'success') return; // user cancelled
      const idToken = res.data.idToken;
      if (!idToken) throw new Error('Google did not return an ID token');
      await signIn(await socialApi.google(idToken));
    } catch (e) {
      setError(errorMessage(e, 'Google sign-in failed'));
    } finally {
      setBusy(false);
    }
  };

  const apple = async () => {
    setError(null);
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!cred.identityToken) throw new Error('Apple did not return an identity token');
      await signIn(await socialApi.apple(cred.identityToken));
    } catch (e) {
      if ((e as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return; // cancelled
      setError(errorMessage(e, 'Apple sign-in failed'));
    }
  };

  return (
    <View style={styles.wrap}>
      <Text variant="footnote" tone="onDarkMuted" center style={styles.or}>
        or continue with
      </Text>
      <Button label="Continue with Google" variant="outline" onPress={google} loading={busy} />
      {appleAvailable ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
          cornerRadius={12}
          style={styles.apple}
          onPress={apple}
        />
      ) : null}
      {error ? (
        <Text variant="footnote" color={palette.rose} center style={styles.err}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.lg, gap: spacing.sm },
  or: { marginBottom: spacing.xs },
  apple: { height: 48, width: '100%' },
  err: { marginTop: spacing.xs },
});
