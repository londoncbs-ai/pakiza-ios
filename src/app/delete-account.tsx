import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { authApi } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/Button';
import { FormScroll } from '@/components/FormScroll';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/store/auth';
import { palette, spacing } from '@/theme';

export default function DeleteAccount() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const performDelete = async () => {
    setError(null);
    setDeleting(true);
    try {
      await authApi.deleteAccount(password);
      Alert.alert(
        'Account deleted',
        'Your account has been deleted. Your data will be fully erased from our systems within 30 days.',
      );
      await signOut();
    } catch (err) {
      setError(errorMessage(err, 'Could not delete your account'));
      setDeleting(false);
    }
  };

  const confirm = () => {
    if (!password) return setError('Enter your password to confirm');
    setError(null);
    Alert.alert(
      'Delete your account?',
      'This is permanent. Your profile, photos, matches and messages will be removed and cannot be recovered.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete my account', style: 'destructive', onPress: performDelete },
      ],
    );
  };

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ width: 30 }}>
          <Ionicons name="chevron-back" size={26} color={palette.burgundy} />
        </Pressable>
        <Text variant="heading" tone="burgundy">Delete account</Text>
        <View style={{ width: 30 }} />
      </View>

      <FormScroll contentContainerStyle={styles.body}>
        <Text style={styles.copy}>
          Deleting your account is permanent. Your profile and photos are taken down
          immediately, your matches and conversations are removed, and your personal
          data is erased from our systems within 30 days.
        </Text>
        <Text style={styles.copy}>
          If you would rather take a break, you can simply sign out instead.
        </Text>
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Confirm your password"
          error={error}
        />
        <Button
          label="Delete my account"
          onPress={confirm}
          loading={deleting}
          style={{ marginTop: spacing.sm }}
        />
      </FormScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  body: { padding: spacing.lg },
  copy: { marginBottom: spacing.md, lineHeight: 21 },
});
