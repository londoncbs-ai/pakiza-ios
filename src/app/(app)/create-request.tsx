import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { findOngoingRequest, getSearchDisplayTitle, matchAdvisorsApi } from '@/api/matchAdvisors';
import type { MatchAdvisorProfile, MatchAdvisorRequest } from '@/api/types';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { ToggleRow } from '@/components/ToggleRow';
import { presentStripePayment } from '@/lib/stripeSheet';
import { palette, radii, shadow, spacing, useTheme } from '@/theme';

export default function CreateAdvisorRequestScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c, isDark } = useTheme();
  const params = useLocalSearchParams<{ advisorId?: string; name?: string }>();

  const [advisors, setAdvisors] = useState<MatchAdvisorProfile[]>([]);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string | null>(params.advisorId || null);
  const [selectedAdvisorName, setSelectedAdvisorName] = useState<string>(params.name || '');
  const [activeRequest, setActiveRequest] = useState<MatchAdvisorRequest | null>(null);
  const [saving, setSaving] = useState(false);
  const [privateMode, setPrivateMode] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [form, setForm] = useState({
    request_title: '',
    summary: '',
    partner_preferences: '',
    deal_breakers: '',
    preferred_location: '',
  });

  useEffect(() => {
    Promise.all([
      matchAdvisorsApi.listVerifiedAdvisors().catch(() => []),
      matchAdvisorsApi.getMyRequests().catch(() => []),
    ]).then(([list, myReqs]) => {
      setAdvisors(list);
      if (!selectedAdvisorId && list.length > 0) {
        setSelectedAdvisorId(list[0].user_id);
        setSelectedAdvisorName(list[0].display_name);
      }
      const ongoing = findOngoingRequest(myReqs);
      if (ongoing) {
        setActiveRequest(ongoing);
      }
    });
  }, []);

  const onChange = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async () => {
    if (activeRequest) {
      Alert.alert(
        'Active Search in Progress',
        `You currently have an active matchmaking search underway (${getSearchDisplayTitle(activeRequest)}).\n\nPlatform policy allows one private search at a time so your advisor can dedicate full attention to your search. You can book a new advisor once your current search is completed.`,
        [
          { text: 'View Active Case', onPress: () => router.replace('/(app)/advisors' as any) },
          { text: 'OK', style: 'cancel' },
        ]
      );
      return;
    }
    if (!agreedToTerms) {
      Alert.alert('Agreement Required', 'You must read and agree to the Match Advisor terms before proceeding.');
      return;
    }
    if (!form.partner_preferences.trim()) {
      Alert.alert('Partner preferences needed', 'Please describe the qualities that matter most to you.');
      return;
    }

    setSaving(true);
    try {
      const generatedTitle =
        form.request_title.trim() ||
        (selectedAdvisorName ? `Search with ${selectedAdvisorName}` : 'Personal Search') +
          (form.preferred_location.trim() ? ` • ${form.preferred_location.trim()}` : '');

      const created = await matchAdvisorsApi.createRequest({
        advisor_id: selectedAdvisorId,
        request_title: generatedTitle,
        summary: form.summary.trim() || null,
        partner_preferences: form.partner_preferences.trim(),
        deal_breakers: form.deal_breakers.trim() || null,
        preferred_location: form.preferred_location.trim() || null,
        timeline_days: 30,
        max_budget_pence: 50000,
        privacy_mode: privateMode ? 'private' : 'public',
        find_for_me_enabled: true,
      });

      // Initiate Stripe payment for the £250 deposit. The request itself is
      // already created at this point; only the wording of the follow-up
      // alert depends on whether the deposit actually went through - it must
      // never claim "deposit secured" unless confirmDeposit truly succeeded,
      // whether the member cancelled the sheet or the payment simply failed
      // (declined card, dropped connection, server-side confirm error).
      try {
        const session = await matchAdvisorsApi.checkoutDeposit(created.id);
        const paymentIntentId = await presentStripePayment(session);
        await matchAdvisorsApi.confirmDeposit(created.id, paymentIntentId);
      } catch (payErr: any) {
        const cancelled = payErr?.name === 'PaymentCancelledError';
        if (!cancelled) console.warn('Deposit payment error:', payErr);
        Alert.alert(
          cancelled ? 'Deposit Pending' : 'Payment Could Not Be Completed',
          cancelled
            ? 'Your matchmaking request was created, but the £250 deposit has not yet been paid. You can complete payment at any time from your Case Hub.'
            : `Your matchmaking request was created, but ${errorMessage(payErr, 'the £250 deposit payment failed')}. Nothing has been charged. You can retry the deposit at any time from your Case Hub.`,
          [{ text: 'View Case', onPress: () => router.replace('/(app)/advisors' as any) }]
        );
        return;
      }

      Alert.alert(
        'Advisor Booked & Deposit Secured',
        `Your request has been sent to ${selectedAdvisorName || 'your Match Advisor'}. Your £250 deposit is confirmed, and your profile is now in private search mode.`,
        [
          {
            text: 'Open Advisor Chat',
            onPress: () => {
              if (created?.selected_offer_id) {
                router.replace({
                  pathname: '/advisor-chat/[offerId]',
                  params: {
                    offerId: String(created.selected_offer_id),
                    name: selectedAdvisorName || '',
                  },
                } as any);
              } else {
                router.replace('/(app)/advisors' as any);
              }
            },
          },
          {
            text: 'View Case',
            style: 'cancel',
            onPress: () => router.replace('/(app)/advisors' as any),
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

        {activeRequest ? (
          <Surface elevated style={[styles.panel, { alignItems: 'center', paddingVertical: spacing.xl }]}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: 'rgba(128, 0, 32, 0.1)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.md,
              }}
            >
              <Ionicons name="shield-checkmark" size={32} color={palette.burgundy} />
            </View>
            <Text variant="title" tone="accent" style={{ textAlign: 'center', marginBottom: spacing.xs }}>
              Active Search in Progress
            </Text>
            <Text variant="subhead" style={{ fontWeight: '800', textAlign: 'center', marginBottom: spacing.xs }}>
              {getSearchDisplayTitle(activeRequest)}
            </Text>
            <Text variant="footnote" tone="muted" style={{ textAlign: 'center', lineHeight: 22, marginBottom: spacing.lg, paddingHorizontal: spacing.md }}>
              Each member may run one private search at a time so your Match Advisor can dedicate full attention to your search. You can book another advisor once your current search is completed.
            </Text>
            <Button
              label="Go to My Active Search"
              variant="primary"
              style={{ width: '100%', marginBottom: spacing.sm }}
              onPress={() => router.replace('/(app)/advisors' as any)}
            />
            <Button
              label="Back to Directory"
              variant="outline"
              style={{ width: '100%' }}
              onPress={() => router.back()}
            />
          </Surface>
        ) : (
          <>
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
            label="Search name / Reference *"
            value={form.request_title}
            onChangeText={(v) => onChange('request_title', v)}
            placeholder={
              selectedAdvisorName
                ? `e.g. Search with ${selectedAdvisorName}`
                : 'e.g. London • Sunni Professional'
            }
          />
          <Text variant="footnote" tone="muted" style={{ marginTop: -spacing.xs, marginBottom: spacing.md, fontSize: 11 }}>
            Give your search a distinctive name to easily track it in your case list.
          </Text>

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
                        <View style={{ marginBottom: spacing.md, padding: spacing.md, backgroundColor: c.surfaceAlt, borderRadius: radii.md, borderWidth: 1, borderColor: c.border }}>
              <Text variant="subhead" style={{ fontWeight: '700', marginBottom: spacing.sm, color: c.text }}>Matchmaking Agreement Terms</Text>
              
              <View style={{ height: 150, backgroundColor: c.surface, borderRadius: radii.sm, padding: spacing.sm, borderWidth: 1, borderColor: c.border, marginBottom: spacing.md }}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                  <Text variant="footnote" tone="muted" style={{ lineHeight: 18 }}>
                    By engaging a Match Advisor on the Pakiza platform, you agree to the following legally binding terms:{"\n\n"}
                    1. FEE STRUCTURE: You agree to a total flat fee of £500 for matchmaking services. A non-refundable deposit of £250 is required immediately to initiate the search.{"\n\n"}
                    2. SUCCESS FEE: The remaining balance of £250 (the "Success Fee") is securely held in escrow. It will only be released to the Advisor if and when a mutually agreed partner is found, and BOTH you and the Advisor confirm completion of the case within the application.{"\n\n"}
                    3. PLATFORM EXCLUSIVITY: All payments must be processed exclusively through the Pakiza platform. You agree not to solicit, offer, or accept off-platform payments or side-agreements with any Match Advisor. Violating this clause will result in an immediate and permanent ban from the Pakiza network and forfeiture of all escrowed funds.{"\n\n"}
                    4. TIMELINES: The Advisor commits to a standard 30-day active search period. If no suitable match is found, you reserve the right to cancel the search without paying the final £250 Success Fee, though the initial deposit remains non-refundable for time spent.{"\n\n"}
                    5. DISPUTE RESOLUTION & MONITORING: In the event of misconduct, ghosting, or disagreement, you may escalate the case to Pakiza Trust & Safety. Pakiza reserves the right to make the final determination on escrow disbursements. For your protection, all chat messages, profile recommendations, and events between you and the Match Advisor are permanently logged, monitored, and may be reviewed by Pakiza Administrators.
                  </Text>
                </ScrollView>
              </View>
              
              <View style={{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: spacing.md }}>
                <ToggleRow
                  label="I have read and agree to the above terms"
                  value={agreedToTerms}
                  onValueChange={setAgreedToTerms}
                  onDark={false}
                />
              </View>
            </View>

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
        </>
        )}
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
