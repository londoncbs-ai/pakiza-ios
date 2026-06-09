import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { authApi } from '@/api/auth';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { fonts, palette, spacing } from '@/theme';

export default function ChangePassword() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (next.length < 8) return setError('New password must be at least 8 characters');
    if (!/[A-Z]/.test(next) || !/\d/.test(next)) return setError('Include an uppercase letter and a number');
    if (next !== confirm) return setError('New passwords don’t match');
    setError(null);
    setSaving(true);
    try {
      await authApi.changePassword(current, next);
      Alert.alert('Password updated', 'Your password has been changed.');
      router.back();
    } catch (err) {
      setError(errorMessage(err, 'Could not change password'));
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ width: 30 }}>
          <Ionicons name="chevron-back" size={26} color={palette.burgundy} />
        </Pressable>
        <Text style={styles.title}>Change password</Text>
        <View style={{ width: 30 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          <TextField label="Current password" value={current} onChangeText={setCurrent} secureTextEntry placeholder="Current password" />
          <TextField label="New password" value={next} onChangeText={setNext} secureTextEntry placeholder="At least 8 chars, 1 capital, 1 number" />
          <TextField label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Re-enter new password" error={error} />
          <Button label="Update password" onPress={submit} loading={saving} style={{ marginTop: spacing.sm }} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  title: { fontFamily: fonts.displaySemibold, fontSize: 22, color: palette.burgundy },
  body: { padding: spacing.lg },
});
