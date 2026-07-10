import { useCallback, useEffect, useRef, useState } from 'react';
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
import { haptics } from '@/lib/haptics';
import { useAuth } from '@/store/auth';
import { spacing, useTheme } from '@/theme';

const RESEND_SECONDS = 60;

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
  const [underReview, setUnderReview] = useState(false);

  // Resend cooldown + "link sent" feedback.
  const [cooldown, setCooldown] = useState(0);
  const [linkSent, setLinkSent] = useState(false);
  const emailVerifiedRef = useRef(false);
  const selfieVerifiedRef = useRef(false);

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
      setUnderReview(a.under_review ?? false);

      // Celebrate the moment a step flips to verified.
      if (a.email_verified && !emailVerifiedRef.current) haptics.success();
      if (a.is_selfie_verified && !selfieVerifiedRef.current) haptics.success();
      emailVerifiedRef.current = a.email_verified;
      selfieVerifiedRef.current = a.is_selfie_verified;
    } catch {
      // keep current state
    }
  }, []);

  // Tick the resend cooldown down once a second.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown > 0]);

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
    if (cooldown > 0) return;
    setCooldown(RESEND_SECONDS);
    try {
      await authApi.sendEmailVerification();
      setLinkSent(true);
    } catch (err) {
      // The server enforces its own one-minute cooldown; keep ours running on
      // 429 so the button matches, otherwise let the member retry immediately.
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status !== 429) setCooldown(0);
      Alert.alert('Could not send', errorMessage(err, 'Please try again.'));
    }
  };

  const allDone = (!phoneRequired || phoneVerified) && emailVerified && selfieVerified;
  // Verified members wait here while our team completes its final review of
  // the account; the 5s poll flips this the moment they are cleared.
  const cleared = allDone && !underReview;
  const finish = useCallback(() => {
    clearVerify();
    router.replace('/(app)/discover');
  }, [clearVerify, router]);

  // The moment everything is verified AND the team review is done, take the
  // member in by themselves.
  useEffect(() => {
    if (!cleared) return;
    haptics.success();
    const id = setTimeout(finish, 1400);
    return () => clearTimeout(id);
  }, [cleared, finish]);

  return (
    <Screen>
      <View style={[styles.wrap, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.lg }]}>
        <Text variant="title" tone="default" style={styles.title}>
          Finish verifying your account
        </Text>
        <Text variant="callout" tone="muted" style={styles.subtitle}>
          {allDone && underReview
            ? 'All your steps are complete.'
            : 'Pakiza is a verified-only community. Complete the steps below to start matching.'}
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
            subtitle={
              emailVerified
                ? 'Verified'
                : linkSent
                  ? `Link sent to ${email ?? 'your email'}. Tap it and this updates by itself.`
                  : email
                    ? `Verify ${email}`
                    : 'Verify your email'
            }
            action={
              emailVerified ? undefined : cooldown > 0 ? (
                <Text variant="callout" tone="muted">{`Resend in ${cooldown}s`}</Text>
              ) : (
                <Pressable onPress={sendEmail} hitSlop={8}>
                  <Text variant="callout" tone="accent">{linkSent ? 'Resend link' : 'Send link'}</Text>
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
                    // The selfie is compared against the profile photos, so
                    // route through profile setup until one exists. from=hub
                    // brings the member back here after the scan succeeds.
                    router.push(
                      photoReady
                        ? { pathname: '/(onboarding)/face-verify', params: { from: 'hub' } }
                        : '/(onboarding)/profile-setup',
                    )
                  }
                  hitSlop={8}
                >
                  <Text variant="callout" tone="accent">{photoReady ? 'Verify' : 'Set up'}</Text>
                </Pressable>
              )
            }
          />
        </Surface>

        {allDone && underReview ? (
          <Surface elevated style={styles.reviewCard}>
            <View style={[styles.rowIcon, { backgroundColor: c.accentFaint, alignSelf: 'center' }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={c.accent} />
            </View>
            <Text variant="callout" tone="default" center style={{ marginTop: spacing.sm }}>
              You're verified
            </Text>
            <Text variant="footnote" tone="muted" center style={{ marginTop: spacing.xs }}>
              Our team is completing a final check on your account, as we do for
              every new member. We'll email you as soon as it's done, and this
              screen will update by itself. Nothing more is needed from you.
            </Text>
          </Surface>
        ) : null}

        <View style={styles.actions}>
          {cleared ? (
            <>
              <Text variant="callout" tone="accent" style={styles.allset}>
                All verified. Taking you in...
              </Text>
              <Button label="Continue to Pakiza" onPress={finish} />
            </>
          ) : allDone ? null : (
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
  reviewCard: { padding: spacing.lg, marginTop: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  rowIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  actions: { marginTop: 'auto' },
  allset: { textAlign: 'center', marginBottom: spacing.md },
  signout: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
});
