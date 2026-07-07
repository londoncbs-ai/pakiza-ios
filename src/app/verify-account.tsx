import { useCallback, useState } from 'react';
import { Alert, AppState, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { authApi } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { Text } from '@/components/Text';
import { useAuth } from '@/store/auth';
import { spacing, useTheme } from '@/theme';

export default function VerifyAccount() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { clearVerify, signOut } = useAuth();

  const [email, setEmail] = useState<string | null>(null);
  const [phoneRequired, setPhoneRequired] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [selfieVerified, setSelfieVerified] = useState(false);
  const [photoReady, setPhotoReady] = useState(true);

  const load = useCallback(async () => {
    try {
      // /auth/me never 404s, so the checklist renders correctly even before
      // the profile exists (unlike /profiles/me).
      const a = await authApi.me();
      setEmail(a.email);
      setPhoneRequired(a.phone_verification_required);
      setPhoneVerified(a.phone_verified);
      setEmailVerified(a.email_verified);
      setSelfieVerified(a.is_selfie_verified);
      setPhotoReady(a.profile_complete && a.has_primary_photo);
    } catch {
      // keep current state
    }
  }, []);

  // The email link is opened in the mail app/browser, so this screen cannot
  // know when verification lands. While focused: poll every 5s, and reload
  // immediately when the app returns to the foreground - the tick appears by
  // itself, no manual refresh needed.
  useFocusEffect(
    useCallback(() => {
      load();
      const poll = setInterval(load, 5000);
      const sub = AppState.addEventListener('change', (s) => {
        if (s === 'active') load();
      });
      return () => {
        clearInterval(poll);
        sub.remove();
      };
    }, [load]),
  );

  const sendEmail = async () => {
    try {
      await authApi.sendEmailVerification();
      Alert.alert(
        'Check your inbox',
        `We've sent a verification link to ${email ?? 'your email'}. Open it and this screen will update by itself.`,
      );
    } catch (err) {
      Alert.alert('Could not send', errorMessage(err, 'Please try again.'));
    }
  };

  const allDone = (!phoneRequired || phoneVerified) && emailVerified && selfieVerified;
  const finish = () => {
    clearVerify();
    router.replace('/(app)/discover');
  };

  return (
    <Screen>
      <View style={[styles.wrap, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.lg }]}>
        <Text variant="title" tone="default" style={styles.title}>
          Finish verifying your account
        </Text>
        <Text variant="callout" tone="muted" style={styles.subtitle}>
          Pakiza is a verified-only community. Complete the steps below to start matching.
        </Text>

        <Surface elevated style={styles.card}>
          {phoneRequired ? (
            <>
              <StepRow
                c={c}
                done={phoneVerified}
                icon="call-outline"
                title="Phone number"
                subtitle={phoneVerified ? 'Verified' : 'Add and verify your phone'}
                action={
                  phoneVerified ? undefined : (
                    <Pressable onPress={() => router.push('/add-phone')} hitSlop={8}>
                      <Text variant="callout" tone="accent">Add</Text>
                    </Pressable>
                  )
                }
              />
              <Divider c={c} />
            </>
          ) : null}
          <StepRow
            c={c}
            done={emailVerified}
            icon="mail-outline"
            title="Email address"
            subtitle={emailVerified ? 'Verified' : email ? `Verify ${email}` : 'Verify your email'}
            action={
              emailVerified ? undefined : (
                <Pressable onPress={sendEmail} hitSlop={8}>
                  <Text variant="callout" tone="accent">Send link</Text>
                </Pressable>
              )
            }
          />
          <Divider c={c} />
          <StepRow
            c={c}
            done={selfieVerified}
            icon="scan-outline"
            title="Face verification"
            subtitle={
              selfieVerified
                ? 'Verified'
                : photoReady
                  ? 'A quick face scan to confirm it’s you'
                  : 'Add your profile and photos first'
            }
            action={
              selfieVerified ? undefined : (
                <Pressable
                  onPress={() =>
                    // The selfie is compared against the primary profile photo,
                    // so route through profile setup until one exists.
                    router.push(photoReady ? '/(onboarding)/face-verify' : '/(onboarding)/profile-setup')
                  }
                  hitSlop={8}
                >
                  <Text variant="callout" tone="accent">{photoReady ? 'Verify' : 'Set up'}</Text>
                </Pressable>
              )
            }
          />
        </Surface>

        <View style={styles.actions}>
          {allDone ? (
            <Button label="Continue to Pakiza" onPress={finish} />
          ) : (
            <Button label="Refresh status" variant="outline" onPress={load} />
          )}
          <Pressable onPress={signOut} hitSlop={10} style={styles.signout}>
            <Text variant="callout" tone="muted">Sign out</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

function StepRow({
  c, done, icon, title, subtitle, action,
}: {
  c: ReturnType<typeof useTheme>['c'];
  done: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: done ? c.accentFaint : c.surfaceAlt }]}>
        <Ionicons name={done ? 'checkmark' : icon} size={20} color={done ? c.accent : c.textMuted} />
      </View>
      <View style={styles.rowText}>
        <Text variant="callout" tone="default">{title}</Text>
        <Text variant="footnote" tone="muted">{subtitle}</Text>
      </View>
      {action}
    </View>
  );
}

function Divider({ c }: { c: ReturnType<typeof useTheme>['c'] }) {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border }} />;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: spacing.xl },
  title: { marginBottom: spacing.sm },
  subtitle: { marginBottom: spacing.xl },
  card: { paddingHorizontal: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  rowIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  actions: { marginTop: 'auto' },
  signout: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
});
