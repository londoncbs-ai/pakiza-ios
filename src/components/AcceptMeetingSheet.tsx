import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { errorMessage } from '@/api/client';
import { meetingsApi } from '@/api/meetings';
import type { MeetingRequest } from '@/api/types';
import { Button } from './Button';
import { Surface } from './Surface';
import { Text } from './Text';
import { TextField } from './TextField';
import { haptics } from '@/lib/haptics';
import { radii, spacing, useTheme } from '@/theme';

/**
 * Shown when the recipient accepts a meet request: they add their OWN wali
 * (a wali is required from both parties) and that confirms the acceptance.
 */
export function AcceptMeetingSheet({
  meetingId,
  matchName,
  visible,
  onClose,
  onAccepted,
}: {
  meetingId: string | null;
  matchName?: string | null;
  visible: boolean;
  onClose: () => void;
  onAccepted: (meeting: MeetingRequest) => void;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setName('');
    setRelationship('');
    setPhone('');
    setEmail('');
    setError(null);
    setLoading(false);
  };

  const close = () => {
    if (loading) return;
    reset();
    onClose();
  };

  const submit = async () => {
    if (!meetingId) return;
    if (name.trim().length < 2) return setError("Please enter your wali's full name");
    if (relationship.trim().length < 2) return setError('Please tell us your wali relationship');
    if (phone.trim().length < 6) return setError("Please enter your wali's phone number");
    if (email.trim() && !email.includes('@')) return setError('Please enter a valid email or leave it blank');
    setError(null);
    setLoading(true);
    try {
      const updated = await meetingsApi.accept(meetingId, {
        wali_name: name.trim(),
        wali_relationship: relationship.trim(),
        wali_phone: phone.trim(),
        wali_email: email.trim() || undefined,
      });
      haptics.success();
      reset();
      onAccepted(updated);
    } catch (err) {
      haptics.error();
      setError(errorMessage(err, 'Could not accept the request'));
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={close} />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        pointerEvents="box-none"
      >
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: c.surface,
            borderColor: c.border,
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: c.borderStrong }]} />
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text variant="title" tone="default">Accept the meeting</Text>
          <Text variant="callout" tone="muted" style={styles.sub}>
            {matchName ? `Add your wali to meet ${matchName}.` : 'Add your wali to accept.'}
          </Text>

          <Surface elevated style={styles.note}>
            <View style={styles.noteHead}>
              <Ionicons name="shield-checkmark" size={18} color={c.accent} />
              <Text variant="subhead" tone="default">A wali is required</Text>
            </View>
            <Text variant="footnote" tone="muted" style={styles.noteBody}>
              Both members bring a wali (guardian). Our team personally verifies these details and may contact your
              wali before the meeting.
            </Text>
          </Surface>

          <TextField label="Wali full name" value={name} onChangeText={setName} placeholder="e.g. Fatima Begum" />
          <TextField
            label="Relationship to you"
            value={relationship}
            onChangeText={setRelationship}
            placeholder="e.g. Mother, Sister, Uncle"
          />
          <TextField
            label="Wali phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. +44 7700 900000"
            keyboardType="phone-pad"
          />
          <TextField
            label="Wali email (optional)"
            value={email}
            onChangeText={setEmail}
            placeholder="e.g. wali@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {error ? (
            <Text variant="footnote" tone="danger" center style={styles.error}>{error}</Text>
          ) : null}

          <Button label="Accept with this wali" onPress={submit} loading={loading} style={styles.submit} />
          <Button label="Not now" variant="ghost" onPress={close} disabled={loading} />
        </ScrollView>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject },
  kav: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: radii.pill, marginBottom: spacing.lg },
  sub: { marginTop: spacing.xs, marginBottom: spacing.lg },
  note: { padding: spacing.lg, marginBottom: spacing.lg },
  noteHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  noteBody: { lineHeight: 19 },
  error: { marginBottom: spacing.sm },
  submit: { marginTop: spacing.sm },
});
