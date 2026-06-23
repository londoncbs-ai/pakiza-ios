import { Linking, StyleSheet, View } from 'react-native';

import { AuthScaffold } from '@/components/AuthScaffold';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { useAuth } from '@/store/auth';
import { fonts, palette, spacing } from '@/theme';

const SUPPORT_EMAIL = 'support@pakiza.app';

const TITLES: Record<string, string> = {
  banned: 'Account suspended',
  deactivated: 'Account deactivated',
  deleted: 'Account deleted',
};

export default function Blocked() {
  const { block, signOut, clearBlock } = useAuth();
  const state = block?.state ?? 'banned';
  const title = TITLES[state] ?? 'Account suspended';
  const message =
    block?.message ?? 'Your account is no longer active. Please contact support for help.';

  const backToSignIn = async () => {
    await signOut();
    clearBlock();
  };

  return (
    <AuthScaffold title={title} subtitle={message} showBack={false}>
      <View style={styles.box}>
        <Text variant="callout" tone="onDarkMuted" center>
          If you believe this was a mistake, contact our team and we will review your account.
        </Text>
        <Text
          variant="callout"
          color={palette.rose}
          center
          style={styles.email}
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
        >
          {SUPPORT_EMAIL}
        </Text>
      </View>

      <Button label="Back to sign in" onPress={backToSignIn} style={{ marginTop: spacing.lg }} />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.sm, marginBottom: spacing.md },
  email: { marginTop: spacing.xs, fontFamily: fonts.bodySemibold },
});
