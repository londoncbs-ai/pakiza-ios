import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { authApi } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { identityApi } from '@/api/identity';
import { profilesApi } from '@/api/profiles';
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
  const [emailVerified, setEmailVerified] = useState(false);
  const [idVerified, setIdVerified] = useState(false);
  const [working, setWorking] = useState<null | 'id'>(null);

  const load = useCallback(async () => {
    try {
      const p = await profilesApi.getMine();
      setEmail(p?.email ?? null);
      setEmailVerified(!!p?.email_verified);
      setIdVerified(!!p?.is_id_verified);
    } catch {
      // keep current state
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const sendEmail = async () => {
    try {
      await authApi.sendEmailVerification();
      Alert.alert(
        'Check your inbox',
        `We've sent a verification link to ${email ?? 'your email'}. Open it, then come back and tap “Refresh”.`,
      );
    } catch (err) {
      Alert.alert('Could not send', errorMessage(err, 'Please try again.'));
    }
  };

  const verifyId = async () => {
    setWorking('id');
    try {
      const session = await identityApi.start();
      if (session.url) {
        await WebBrowser.openBrowserAsync(session.url); // Didit-hosted capture
      }
      // Wait for the decision (webhook is near-instant; dev auto-approves).
      for (let i = 0; i < 6; i++) {
        const st = await identityApi.status();
        if (st.is_id_verified) break;
        await new Promise((r) => setTimeout(r, 1500));
      }
      await load();
    } catch (err) {
      Alert.alert('Verification', errorMessage(err, 'Could not start ID verification.'));
    } finally {
      setWorking(null);
    }
  };

  const allDone = emailVerified && idVerified;
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
          Pakiza is a verified-only community. Complete all three steps to start matching.
        </Text>

        <Surface elevated style={styles.card}>
          <StepRow
            c={c}
            done
            icon="call-outline"
            title="Phone number"
            subtitle="Verified"
          />
          <Divider c={c} />
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
            done={idVerified}
            icon="card-outline"
            title="ID verification"
            subtitle={idVerified ? 'Verified' : 'Confirm your identity with a government ID'}
            action={
              idVerified ? undefined : (
                <Pressable onPress={verifyId} hitSlop={8} disabled={working === 'id'}>
                  <Text variant="callout" tone="accent">{working === 'id' ? 'Working…' : 'Verify'}</Text>
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
