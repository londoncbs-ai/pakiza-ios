import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';

import type { DonationCheckoutInput } from '@/api/types';
import { Button } from '@/components/Button';
import { DonationSheet } from '@/components/DonationSheet';
import { FormScroll } from '@/components/FormScroll';
import { PressableScale } from '@/components/PressableScale';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { ToggleRow } from '@/components/ToggleRow';
import { PAYMENTS_ENABLED } from '@/lib/features';
import { formatPounds, poundsToPence } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { spacing, radii, useTheme } from '@/theme';

const PRESETS_PENCE = [500, 1000, 2500, 5000];
const MIN_PENCE = 100;
const MAX_PENCE = 1000000;
const MESSAGE_MAX = 280;

export default function Donate() {
  // In-app donations are disabled until payments ship; give on the website.
  if (!PAYMENTS_ENABLED) return <Redirect href="/(app)/fund" />;
  return <DonateScreen />;
}

function DonateScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c } = useTheme();

  const [preset, setPreset] = useState<number | null>(2500);
  const [custom, setCustom] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [message, setMessage] = useState('');
  const [checkout, setCheckout] = useState<DonationCheckoutInput | null>(null);

  const amountPence = useMemo(() => {
    if (custom.trim()) return poundsToPence(custom);
    return preset;
  }, [custom, preset]);

  const valid = amountPence != null && amountPence >= MIN_PENCE && amountPence <= MAX_PENCE;

  const onPreset = (value: number) => {
    haptics.selection();
    setCustom('');
    setPreset(value);
  };

  const proceed = () => {
    if (!valid || amountPence == null) {
      Alert.alert('Choose an amount', `Donations are between ${formatPounds(MIN_PENCE)} and ${formatPounds(MAX_PENCE)}.`);
      return;
    }
    haptics.light();
    setCheckout({
      amount_pence: amountPence,
      is_anonymous: anonymous,
      message: message.trim() ? message.trim() : undefined,
    });
  };

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
        <Text variant="subhead" tone="default">Donate</Text>
        <View style={styles.headerBtn} />
      </View>

      <FormScroll contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 120 }}>
        <Text variant="display" tone="default" style={styles.lead}>Give to the fund</Text>
        <Text variant="callout" tone="muted" style={styles.sub}>
          Your gift helps a couple in need start their married life with dignity. Choose an amount.
        </Text>

        <Text variant="footnote" tone="muted" style={styles.fieldLabel}>Amount</Text>
        <View style={styles.presets}>
          {PRESETS_PENCE.map((value) => {
            const active = !custom.trim() && preset === value;
            return (
              <PressableScale
                key={value}
                onPress={() => onPreset(value)}
                scaleTo={0.95}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? c.accent : c.surfaceAlt,
                    borderColor: active ? c.accent : c.border,
                  },
                ]}
              >
                <Text variant="subhead" color={active ? c.textOnAccent : c.text}>
                  {formatPounds(value)}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        <TextField
          label="Or enter your own amount (£)"
          value={custom}
          onChangeText={(t) => { setCustom(t); if (t.trim()) setPreset(null); }}
          keyboardType="decimal-pad"
          placeholder="e.g. 100"
          returnKeyType="done"
        />

        <View style={[styles.toggleWrap, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
          <ToggleRow
            label="Donate as a secret donor"
            hint="Your name is hidden from the donor wall. Allah knows your intention."
            value={anonymous}
            onValueChange={(v) => { haptics.selection(); setAnonymous(v); }}
            onDark={false}
          />
        </View>

        <TextField
          label={`Message (optional, ${MESSAGE_MAX} max)`}
          value={message}
          onChangeText={(t) => setMessage(t.slice(0, MESSAGE_MAX))}
          placeholder="A du'a or word of encouragement"
          multiline
          style={styles.messageInput}
          maxLength={MESSAGE_MAX}
        />

        <View style={[styles.assurance, { backgroundColor: c.accentFaint }]}>
          <Ionicons name="shield-checkmark-outline" size={18} color={c.accent} />
          <Text variant="footnote" tone="muted" style={styles.assuranceText}>
            100% of your gift goes to the Marriage Support Fund and is distributed by the Pakiza team
            to couples in genuine need.
          </Text>
        </View>
      </FormScroll>

      <View style={[styles.ctaBar, { backgroundColor: c.surface, borderTopColor: c.border, paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          label={valid && amountPence != null ? `Continue · ${formatPounds(amountPence)}` : 'Continue'}
          onPress={proceed}
          disabled={!valid}
        />
      </View>

      <DonationSheet
        input={checkout}
        visible={!!checkout}
        onClose={() => setCheckout(null)}
        onDonated={() => {
          setCheckout(null);
          haptics.success();
          Alert.alert(
            'JazakAllah khayr',
            'Your gift has been received. May Allah accept it and multiply your reward.',
            [{ text: 'Done', onPress: () => router.back() }]
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 30, alignItems: 'flex-start' },

  lead: { letterSpacing: -0.5, marginTop: spacing.sm },
  sub: { marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: 21 },

  fieldLabel: { marginBottom: spacing.sm, marginLeft: spacing.xs },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    flexGrow: 1,
    flexBasis: '22%',
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  toggleWrap: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    marginBottom: spacing.lg,
  },

  messageInput: { height: 96, paddingTop: spacing.md, textAlignVertical: 'top' },

  assurance: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  assuranceText: { flex: 1, lineHeight: 19 },

  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
