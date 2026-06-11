import React, { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { errorMessage } from '@/api/client';
import { safetyApi, type ReportReason } from '@/api/safety';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { haptics } from '@/lib/haptics';
import { palette, radii, spacing, useTheme } from '@/theme';

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
  const { c } = useTheme();
  const [mode, setMode] = useState<'menu' | 'report'>('menu');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setMode('menu');
    setBusy(false);
  };

  const dismiss = () => {
    onClose();
    reset();
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={dismiss}>
      <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={dismiss} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: c.surface,
            borderColor: c.border,
            paddingBottom: insets.bottom + spacing.md,
          },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: c.borderStrong }]} />

        {mode === 'menu' ? (
          <>
            <View style={styles.header}>
              <Text variant="heading" tone="default">{name ?? 'Options'}</Text>
              <Text variant="footnote" tone="subtle" style={styles.headerSub}>
                Keep your experience safe and respectful.
              </Text>
            </View>

            <View style={[styles.group, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
              <Row
                icon="flag-outline"
                label="Report profile"
                hint="Flag this profile for our team to review."
                onPress={() => { haptics.selection(); setMode('report'); }}
                disabled={busy}
              />
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <Row
                icon="ban-outline"
                label="Block"
                hint="They won’t see you and you won’t see them."
                danger
                onPress={block}
                disabled={busy}
              />
            </View>

            <PressableScale
              onPress={dismiss}
              haptic={false}
              style={[styles.cancel, { backgroundColor: c.surfaceAlt }]}
            >
              <Text variant="callout" tone="muted">Cancel</Text>
            </PressableScale>
          </>
        ) : (
          <>
            <View style={styles.header}>
              <Pressable onPress={() => { haptics.selection(); setMode('menu'); }} hitSlop={10} style={styles.back}>
                <Ionicons name="chevron-back" size={20} color={c.textMuted} />
                <Text variant="footnote" tone="muted">Back</Text>
              </Pressable>
              <Text variant="heading" tone="default" style={styles.reportTitle}>Why are you reporting?</Text>
              <Text variant="footnote" tone="subtle" style={styles.headerSub}>
                Your report is confidential.
              </Text>
            </View>

            <View style={[styles.group, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
              {REASONS.map((r, i) => (
                <React.Fragment key={r.value}>
                  {i > 0 ? <View style={[styles.divider, { backgroundColor: c.border }]} /> : null}
                  <Row
                    icon="alert-circle-outline"
                    label={r.label}
                    onPress={() => report(r.value)}
                    disabled={busy}
                  />
                </React.Fragment>
              ))}
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

function Row({
  icon,
  label,
  hint,
  onPress,
  danger,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const { c } = useTheme();
  const iconColor = danger ? c.danger : c.accent;
  const iconBg = danger
    ? c.scheme === 'dark'
      ? 'rgba(229,112,127,0.16)'
      : 'rgba(176,0,32,0.08)'
    : c.accentFaint;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={{ color: c.border }}
      style={({ pressed }) => [
        styles.row,
        pressed && !disabled ? { backgroundColor: c.surfaceSunken } : null,
        disabled ? { opacity: 0.5 } : null,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.rowText}>
        <Text variant="body" color={danger ? c.danger : c.text} style={styles.rowLabel}>
          {label}
        </Text>
        {hint ? (
          <Text variant="footnote" tone="subtle" style={styles.rowHint}>{hint}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.textSubtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: {
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    marginBottom: spacing.lg,
  },
  header: { marginBottom: spacing.lg, paddingHorizontal: spacing.xs },
  headerSub: { marginTop: spacing.xs },
  reportTitle: { marginTop: spacing.sm },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: -spacing.xs },
  group: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 56 + spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowLabel: { lineHeight: 21 },
  rowHint: { marginTop: 2, lineHeight: 17 },
  cancel: {
    marginTop: spacing.md,
    borderRadius: radii.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
});
