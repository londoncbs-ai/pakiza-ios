import React, { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { errorMessage } from '@/api/client';
import { safetyApi, type ReportReason } from '@/api/safety';
import { colors, fonts, palette, radii, spacing } from '@/theme';

const REASONS: { label: string; value: ReportReason }[] = [
  { label: 'Inappropriate content', value: 'inappropriate_content' },
  { label: 'Harassment', value: 'harassment' },
  { label: 'Fake profile', value: 'fake_profile' },
  { label: 'Spam', value: 'spam' },
  { label: 'Scam', value: 'scam' },
  { label: 'Underage', value: 'underage' },
  { label: 'Something else', value: 'other' },
];

export function SafetySheet({
  userId,
  name,
  visible,
  onClose,
  onActioned,
}: {
  userId: string;
  name?: string;
  visible: boolean;
  onClose: () => void;
  /** called after a successful block/report so the parent can dismiss the profile */
  onActioned?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'menu' | 'report'>('menu');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setMode('menu');
    setBusy(false);
  };

  const block = () => {
    Alert.alert(`Block ${name ?? 'this person'}?`, 'They won’t see you and you won’t see them.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await safetyApi.block(userId);
            onClose();
            reset();
            onActioned?.();
          } catch (err) {
            Alert.alert('Could not block', errorMessage(err));
            setBusy(false);
          }
        },
      },
    ]);
  };

  const report = async (reason: ReportReason) => {
    setBusy(true);
    try {
      await safetyApi.report(userId, reason);
      onClose();
      reset();
      Alert.alert('Report submitted', 'Thank you. Our team will review this profile.');
      onActioned?.();
    } catch (err) {
      Alert.alert('Could not report', errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { onClose(); reset(); }}>
      <Pressable style={styles.backdrop} onPress={() => { onClose(); reset(); }} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.grabber} />
        {mode === 'menu' ? (
          <>
            <Text style={styles.title}>{name ?? 'Options'}</Text>
            <Row icon="flag-outline" label="Report profile" onPress={() => setMode('report')} />
            <Row icon="ban-outline" label="Block" danger onPress={block} disabled={busy} />
            <Row icon="close-outline" label="Cancel" onPress={() => { onClose(); reset(); }} />
          </>
        ) : (
          <>
            <Text style={styles.title}>Why are you reporting?</Text>
            {REASONS.map((r) => (
              <Row key={r.value} icon="alert-circle-outline" label={r.label} onPress={() => report(r.value)} disabled={busy} />
            ))}
          </>
        )}
      </View>
    </Modal>
  );
}

function Row({
  icon,
  label,
  onPress,
  danger,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const color = danger ? colors.danger : palette.ink;
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.row, disabled && { opacity: 0.5 }]}>
      <Ionicons name={icon} size={20} color={danger ? colors.danger : palette.burgundy} />
      <Text style={[styles.rowText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(26,16,18,0.4)' },
  sheet: {
    backgroundColor: palette.cream,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: palette.line, marginBottom: spacing.md },
  title: { fontFamily: fonts.displaySemibold, fontSize: 20, color: palette.burgundy, marginBottom: spacing.sm, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 15, borderRadius: radii.sm },
  rowText: { fontFamily: fonts.bodyMedium, fontSize: 16 },
});
