import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { matchAdvisorsApi } from '@/api/matchAdvisors';
import type { MatchAdvisorProfile } from '@/api/types';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { ToggleRow } from '@/components/ToggleRow';
import { spacing, palette, radii } from '@/theme';

const defaultForm = {
  request_title: '',
  summary: '',
  partner_preferences: '',
  deal_breakers: '',
  preferred_location: '',
  timeline_days: '30',
  max_budget_pence: '0',
};

export default function FindForMeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [advisors, setAdvisors] = useState<MatchAdvisorProfile[]>([]);
  const [saving, setSaving] = useState(false);
  const [findForMeEnabled, setFindForMeEnabled] = useState(true);
  const [privateMode, setPrivateMode] = useState(true);
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    matchAdvisorsApi
      .listVerifiedAdvisors()
      .then(setAdvisors)
      .catch(() => setAdvisors([]));
  }, []);

  const onChange = (key: keyof typeof defaultForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async () => {
    if (!form.request_title.trim()) {
      Alert.alert('Add a short request title', 'Tell us what you are looking for in a few words.');
      return;
    }
    if (!form.partner_preferences.trim()) {
      Alert.alert('Add your partner preferences', 'Describe the qualities that matter most to you.');
      return;
    }

    setSaving(true);
    try {
      await matchAdvisorsApi.createRequest({
        request_title: form.request_title.trim(),
        summary: form.summary.trim() || null,
        partner_preferences: form.partner_preferences.trim(),
        deal_breakers: form.deal_breakers.trim() || null,
        preferred_location: form.preferred_location.trim() || null,
        timeline_days: Number(form.timeline_days) || 30,
        max_budget_pence: Number(form.max_budget_pence) || 0,
        privacy_mode: privateMode ? 'private' : 'public',
        find_for_me_enabled: findForMeEnabled,
      });
      Alert.alert(
        'Your request is live',
        'We have sent your preferences to the Match Advisor network. You will receive offers with timeline, fee and approach details.',
        [{ text: 'View Match Advisors', onPress: () => router.push('/') }],
      );
      setForm(defaultForm);
    } catch (err) {
      Alert.alert('Could not send request', errorMessage(err, 'Please try again in a moment.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text variant="footnote" tone="burgundy" style={styles.eyebrow}>Find for me</Text>
          <Text variant="title" tone="default" style={styles.title}>A calmer, private way to find the right match.</Text>
          <Text variant="body" tone="muted" style={styles.subtitle}>
            Your profile stays private while trusted Match Advisors help you shape the search, shortlist the strongest options,
            and keep the process respectful and structured.
          </Text>
        </View>

        <Surface elevated style={styles.panel}>
          <Text variant="heading" tone="burgundy" style={styles.sectionTitle}>How it works</Text>
          {[
            'Tell us what you want and your key preferences.',
            'We keep your profile private unless you choose otherwise.',
            'Verified Match Advisors send tailored offers with price, timeline and approach.',
            'You compare, pay securely and choose the advisor that feels right.',
          ].map((step, index) => (
            <View key={step} style={styles.stepRow}>
              <View style={styles.stepBadge}><Text variant="label" color={palette.cream}>{index + 1}</Text></View>
              <Text variant="body" tone="default" style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </Surface>

        <Surface elevated style={styles.panel}>
          <Text variant="heading" tone="burgundy" style={styles.sectionTitle}>Your privacy</Text>
          <ToggleRow
            label="Hide profile from public Discover"
            hint="While your advisor searches for you, your profile will be completely hidden from the public Discover feed."
            value={privateMode}
            onValueChange={setPrivateMode}
            onDark={false}
          />
          
        </Surface>

        <Surface elevated style={styles.panel}>
          <Text variant="heading" tone="burgundy" style={styles.sectionTitle}>Tell us what you need</Text>
          <TextField label="Request title" value={form.request_title} onChangeText={(v) => onChange('request_title', v)} placeholder="e.g. Calm, faith-aligned matches in London" />
          <TextField label="Summary" value={form.summary} onChangeText={(v) => onChange('summary', v)} placeholder="Share your goals, timeline and what matters most." multiline numberOfLines={4} textAlignVertical="top" style={styles.textArea} />
          <TextField label="Partner preferences" value={form.partner_preferences} onChangeText={(v) => onChange('partner_preferences', v)} placeholder="Age, faith, location, education, values, family background, lifestyle..." multiline numberOfLines={5} textAlignVertical="top" style={styles.textArea} />
          <TextField label="Deal breakers" value={form.deal_breakers} onChangeText={(v) => onChange('deal_breakers', v)} placeholder="Anything you would not consider." multiline numberOfLines={3} textAlignVertical="top" style={styles.textArea} />
          <TextField label="Preferred location" value={form.preferred_location} onChangeText={(v) => onChange('preferred_location', v)} placeholder="City, region or country" />
          <View style={styles.twoFields}>
            <TextField label="Timeline (days)" value={form.timeline_days} onChangeText={(v) => onChange('timeline_days', v)} keyboardType="number-pad" style={styles.halfField} />
            <TextField label="Budget (£)" value={form.max_budget_pence} onChangeText={(v) => onChange('max_budget_pence', v)} keyboardType="number-pad" style={styles.halfField} />
          </View>
          <Button label="Send my request" onPress={submit} loading={saving} />
        </Surface>

        <Surface elevated style={styles.panel}>
          <Text variant="heading" tone="burgundy" style={styles.sectionTitle}>Trusted Match Advisors</Text>
          {advisors.length === 0 ? (
            <Text variant="body" tone="muted">No verified advisors are live yet, but your request can still be reviewed as soon as one joins.</Text>
          ) : (
            advisors.slice(0, 3).map((advisor) => (
              <View key={advisor.id} style={styles.advisorCard}>
                <Text variant="callout" tone="default">{advisor.display_name}</Text>
                <Text variant="footnote" tone="muted">
                  {advisor.city ?? 'Remote'} · {advisor.response_time_hours}h response · {advisor.default_platform_fee_pct}% platform fee
                </Text>
              </View>
            ))
          )}
          <View style={{ marginTop: spacing.md }}>
            <Button label="Become a Match Advisor" variant="outlineAccent" onPress={() => router.push('/')} />
          </View>
        </Surface>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1.4 },
  title: { marginTop: spacing.xs, lineHeight: 34 },
  subtitle: { marginTop: spacing.sm, lineHeight: 24 },
  panel: { marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.lg, borderRadius: radii.lg },
  sectionTitle: { marginBottom: spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.burgundy,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  stepText: { flex: 1, lineHeight: 24 },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  twoFields: { flexDirection: 'row', gap: spacing.sm },
  halfField: { flex: 1 },
  advisorCard: {
    borderWidth: 1,
    borderColor: palette.burgundy,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
});
