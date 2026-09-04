import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { matchAdvisorsApi } from '@/api/matchAdvisors';
import type { MatchAdvisorProfile } from '@/api/types';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { ToggleRow } from '@/components/ToggleRow';
import { palette, radii, shadow, spacing, useTheme } from '@/theme';

export default function CreateAdvisorRequestScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c, isDark } = useTheme();
  const params = useLocalSearchParams<{ advisorId?: string; name?: string }>();

  const [advisors, setAdvisors] = useState<MatchAdvisorProfile[]>([]);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string | null>(params.advisorId || null);
  const [selectedAdvisorName, setSelectedAdvisorName] = useState<string>(params.name || '');
  const [saving, setSaving] = useState(false);
  const [privateMode, setPrivateMode] = useState(true);

  const [form, setForm] = useState({
    request_title: 'Private Matchmaking Search',
    summary: '',
    partner_preferences: '',
    deal_breakers: '',
    preferred_location: '',
  });

  useEffect(() => {
    matchAdvisorsApi
      .listVerifiedAdvisors()
      .then((list) => {
        setAdvisors(list);
        if (!selectedAdvisorId && list.length > 0) {
          setSelectedAdvisorId(list[0].user_id);
          setSelectedAdvisorName(list[0].display_name);
        }
      })
      .catch(() => setAdvisors([]));
  }, []);

  const onChange = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async () => {
    if (!form.partner_preferences.trim()) {
      Alert.alert('Partner preferences needed', 'Please describe the qualities that matter most to you.');
      return;
    }

    setSaving(true);
    try {
      await matchAdvisorsApi.createRequest({
        advisor_id: selectedAdvisorId,
        request_title: form.request_title.trim() || 'Private Matchmaking Search',
        summary: form.summary.trim() || null,
        partner_preferences: form.partner_preferences.trim(),
        deal_breakers: form.deal_breakers.trim() || null,
        preferred_location: form.preferred_location.trim() || null,
        timeline_days: 30,
        max_budget_pence: 50000,
        privacy_mode: privateMode ? 'private' : 'public',
        find_for_me_enabled: true,
      });

      Alert.alert(
        'Advisor Booked',
        `Your request has been sent to ${selectedAdvisorName || 'your Match Advisor'}. Your £250 deposit is secured, and your profile is now in private search mode.`,
        [
          {
            text: 'View in Messages',
            onPress: () => router.push('/(app)/messages' as any),
          },
        ]
      );
    } catch (err) {
      Alert.alert('Could not book advisor', errorMessage(err, 'Please try again in a moment.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + spacing.sm, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Back + Header */}
        <View style={styles.headerRow}>
          <Button
            label="Back"
            variant="ghost"
            onPress={() => router.back()}
          />
          <Text variant="heading" tone="default">Book Match Advisor</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Selected Advisor Callout */}
        <Surface elevated style={styles.panel}>
          <Text variant="label" tone="accent" style={{ textTransform: 'uppercase', fontWeight: '800', letterSpacing: 0.8 }}>
            DEDICATED ADVISOR
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
            <Ionicons name="person-circle" size={32} color={palette.burgundy} style={{ marginRight: spacing.sm }} />
            <View style={{ flex: 1 }}>
              <Text variant="subhead" tone="default" style={{ fontWeight: '700' }}>
                {selectedAdvisorName || 'Selected Match Advisor'}
              </Text>
              <Text variant="label" tone="muted">Verified Private Specialist</Text>
            </View>
          </View>
        </Surface>

        {/* Flat Fee Transparency Panel */}
        <Surface elevated style={[styles.panel, { backgroundColor: palette.burgundy }]}>
          <View style={styles.priceRow}>
            <Text variant="label" style={{ color: palette.gold, fontWeight: '800', letterSpacing: 0.8 }}>
              STANDARD PRICING
            </Text>
            <Text variant="subhead" style={{ color: palette.gold, fontWeight: '800' }}>
              £500 Flat Fee
            </Text>
          </View>
          <View style={styles.splitRow}>
            <View style={styles.splitBox}>
              <Text variant="label" style={{ color: 'rgba(245,240,230,0.7)' }}>DUE TODAY</Text>
              <Text variant="heading" style={{ color: palette.cream, fontWeight: '800' }}>£250</Text>
              <Text variant="label" style={{ color: 'rgba(245,240,230,0.7)' }}>Deposit to begin</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.splitBox}>
              <Text variant="label" style={{ color: 'rgba(245,240,230,0.7)' }}>SUCCESS FEE</Text>
              <Text variant="heading" style={{ color: palette.cream, fontWeight: '800' }}>£250</Text>
              <Text variant="label" style={{ color: 'rgba(245,240,230,0.7)' }}>Only after partner found</Text>
            </View>
          </View>
        </Surface>

        {/* Privacy Setting */}
        <Surface elevated style={styles.panel}>
          <Text variant="heading" tone="burgundy" style={styles.sectionTitle}>Privacy Protection</Text>
          <ToggleRow
            label="Hide profile from public Discover"
            hint="While your Match Advisor actively searches for you, your profile remains completely hidden from the public feed."
            value={privateMode}
            onValueChange={setPrivateMode}
            onDark={false}
          />
        </Surface>

        {/* Preferences Form */}
        <Surface elevated style={styles.panel}>
          <Text variant="heading" tone="burgundy" style={styles.sectionTitle}>Your Match Criteria</Text>

          <TextField
            label="Partner preferences *"
            value={form.partner_preferences}
            onChangeText={(v) => onChange('partner_preferences', v)}
            placeholder="Age range, faith background, values, lifestyle, education, family..."
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            style={styles.textArea}
          />

          <TextField
            label="Deal breakers (optional)"
            value={form.deal_breakers}
            onChangeText={(v) => onChange('deal_breakers', v)}
            placeholder="Qualities or factors you will not consider..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={styles.textArea}
          />

          <TextField
            label="Preferred location"
            value={form.preferred_location}
            onChangeText={(v) => onChange('preferred_location', v)}
            placeholder="e.g. London, UK, or open to relocation"
          />

          <TextField
            label="Additional notes for advisor"
            value={form.summary}
            onChangeText={(v) => onChange('summary', v)}
            placeholder="Any background or specific timelines you have in mind..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={styles.textArea}
          />

          <View style={{ marginTop: spacing.lg }}>
            <Button
              label="Confirm & Book Advisor (£250 Deposit)"
              variant="primary"
              onPress={submit}
              loading={saving}
            />
            <Text variant="label" tone="muted" style={styles.disclaimer}>
              By confirming, you agree to the £500 flat fee service terms. The remaining £250 is only charged after your advisor finds your partner.
            </Text>
          </View>
        </Surface>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  panel: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.card,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: spacing.xs,
  },
  splitBox: {
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    width: 1,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  disclaimer: {
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 16,
  },
});
