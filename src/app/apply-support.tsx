import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { givingApi } from '@/api/giving';
import type { Application, ApplicationTimelineEntry, PayoutDetails } from '@/api/types';
import { Button } from '@/components/Button';
import { DetailRow } from '@/components/DetailRow';
import { ErrorState } from '@/components/ErrorState';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { formatPounds, poundsToPence } from '@/lib/format';
import {
  APPLICATION_STATUS_HINT,
  APPLICATION_STATUS_LABEL,
  formatGivingDate,
} from '@/lib/giving';
import { haptics } from '@/lib/haptics';
import { spacing, radii, useTheme } from '@/theme';

const STORY_MIN = 20;
const STORY_MAX = 4000;

type Region = 'GB' | 'US' | 'IBAN' | 'OTHER';
const REGIONS: { key: Region; label: string }[] = [
  { key: 'GB', label: 'UK' },
  { key: 'US', label: 'US' },
  { key: 'IBAN', label: 'Europe (IBAN)' },
  { key: 'OTHER', label: 'Other' },
];

interface BankForm {
  region: Region;
  accountHolder: string;
  bankName: string;
  iban: string;
  swiftBic: string;
  sortCode: string;
  accountNumber: string;
  routingNumber: string;
  country: string; // 2-letter, for IBAN/OTHER
  other: string;
}

const EMPTY_BANK: BankForm = {
  region: 'GB',
  accountHolder: '',
  bankName: '',
  iban: '',
  swiftBic: '',
  sortCode: '',
  accountNumber: '',
  routingNumber: '',
  country: '',
  other: '',
};

function bankFromApplication(a: Application): BankForm {
  const region: Region = a.iban
    ? 'IBAN'
    : a.routing_number
      ? 'US'
      : a.sort_code
        ? 'GB'
        : a.payout_details_other
          ? 'OTHER'
          : (a.payout_country === 'US' ? 'US' : a.payout_country === 'GB' ? 'GB' : 'GB');
  return {
    region,
    accountHolder: a.account_holder_name ?? '',
    bankName: a.bank_name ?? '',
    iban: a.iban ?? '',
    swiftBic: a.swift_bic ?? '',
    sortCode: a.sort_code ?? '',
    accountNumber: a.account_number ?? '',
    routingNumber: a.routing_number ?? '',
    country: a.payout_country && a.payout_country !== 'GB' && a.payout_country !== 'US' ? a.payout_country : '',
    other: a.payout_details_other ?? '',
  };
}

/** Build a PayoutDetails payload, or null when nothing usable was entered. */
function buildPayout(b: BankForm): PayoutDetails | null {
  const country = b.region === 'GB' ? 'GB' : b.region === 'US' ? 'US' : b.country.trim().toUpperCase();
  const base: PayoutDetails = {
    payout_country: country || undefined,
    account_holder_name: b.accountHolder.trim() || undefined,
    bank_name: b.bankName.trim() || undefined,
  };
  let identifier = false;
  if (b.region === 'GB') {
    base.sort_code = b.sortCode.trim() || undefined;
    base.account_number = b.accountNumber.trim() || undefined;
    identifier = Boolean(base.account_number);
  } else if (b.region === 'US') {
    base.routing_number = b.routingNumber.trim() || undefined;
    base.account_number = b.accountNumber.trim() || undefined;
    identifier = Boolean(base.account_number);
  } else if (b.region === 'IBAN') {
    base.iban = b.iban.trim() || undefined;
    base.swift_bic = b.swiftBic.trim() || undefined;
    identifier = Boolean(base.iban);
  } else {
    base.payout_details_other = b.other.trim() || undefined;
    identifier = Boolean(base.payout_details_other);
  }
  return identifier ? base : null;
}

export default function ApplySupport() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c } = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : undefined;

  // View mode (existing application) state.
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingBank, setSavingBank] = useState(false);

  // Form state.
  const [story, setStory] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [bank, setBank] = useState<BankForm>(EMPTY_BANK);
  const [terms, setTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (appId: string) => {
    setLoadError(null);
    try {
      const a = await givingApi.application(appId);
      setApplication(a);
      setBank(bankFromApplication(a));
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load your application'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) load(id);
  }, [id, load]);

  const storyLen = story.trim().length;
  const canSubmit = storyLen >= STORY_MIN && storyLen <= STORY_MAX && terms && !submitting;

  const submit = async () => {
    if (!terms) {
      Alert.alert('Please accept the terms', 'You need to accept the fund terms to apply.');
      return;
    }
    if (storyLen < STORY_MIN) {
      Alert.alert('Tell us your story', `Please share at least ${STORY_MIN} characters so the team understands your situation.`);
      return;
    }
    setSubmitting(true);
    try {
      const requested = amount.trim() ? poundsToPence(amount) : null;
      const payout = buildPayout(bank);
      await givingApi.apply({
        story: story.trim(),
        partner_name: partnerName.trim() || undefined,
        amount_requested_pence: requested != null ? requested : undefined,
        contact_phone: phone.trim() || undefined,
        city: city.trim() || undefined,
        terms_accepted: true,
        payout: payout ?? undefined,
      });
      haptics.success();
      Alert.alert(
        'Application received',
        'Your application has gone privately to the Pakiza team. We will be in touch after reviewing it.',
        [{ text: 'Done', onPress: () => router.replace('/fund') }]
      );
    } catch (err) {
      haptics.error();
      Alert.alert('Could not submit', errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const saveBank = async () => {
    if (!id) return;
    const payout = buildPayout(bank);
    if (!payout) {
      Alert.alert('Add your bank details', 'Enter an account number, IBAN or payout instructions so the team can send support.');
      return;
    }
    setSavingBank(true);
    try {
      const updated = await givingApi.updatePayout(id, payout);
      setApplication(updated);
      setBank(bankFromApplication(updated));
      haptics.success();
      Alert.alert('Saved', 'Your bank details are stored securely for the team.');
    } catch (err) {
      haptics.error();
      Alert.alert('Could not save', errorMessage(err));
    } finally {
      setSavingBank(false);
    }
  };

  // ── View mode: an existing application's status ────────────────────────────
  if (id) {
    const closed = application
      ? ['completed', 'declined', 'withdrawn'].includes(application.status)
      : false;
    return (
      <Screen keyboard>
        <Header title="Your application" onBack={() => router.back()} />
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={c.accent} size="large" />
          </View>
        ) : loadError || !application ? (
          <ErrorState message={loadError ?? 'Application not found'} onRetry={() => { setLoading(true); load(id); }} />
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxxl }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.statusCard, { backgroundColor: c.accentFaint }]}>
              <Text variant="label" tone="accent">{APPLICATION_STATUS_LABEL[application.status]}</Text>
              <Text variant="callout" tone="default" style={styles.statusHint}>
                {APPLICATION_STATUS_HINT[application.status]}
              </Text>
            </View>

            {/* Progress timeline */}
            {application.timeline.length > 0 ? (
              <>
                <Text variant="footnote" tone="muted" style={styles.sectionLabel}>Progress</Text>
                <Surface style={styles.detailCard}>
                  <Timeline entries={application.timeline} />
                </Surface>
              </>
            ) : null}

            <Surface style={styles.detailCard}>
              <DetailRow icon="calendar-outline" label="Submitted" value={formatGivingDate(application.created_at)} />
              <DetailRow icon="person-outline" label="Partner" value={application.partner_name} />
              <DetailRow icon="location-outline" label="City" value={application.city} />
              <DetailRow
                icon="cash-outline"
                label="Amount requested"
                value={application.amount_requested_pence != null ? formatPounds(application.amount_requested_pence) : null}
              />
              <DetailRow
                icon="gift-outline"
                label="Amount awarded"
                value={application.amount_awarded_pence != null ? formatPounds(application.amount_awarded_pence) : null}
              />
              <DetailRow
                icon="card-outline"
                label="Bank details"
                value={application.payout_details_provided_at ? 'On file' : 'Not provided yet'}
              />
            </Surface>

            <Text variant="footnote" tone="muted" style={styles.sectionLabel}>Your story</Text>
            <Surface alt style={styles.storyCard}>
              <Text variant="body" tone="default" style={styles.storyText}>{application.story}</Text>
            </Surface>

            {application.decline_reason ? (
              <>
                <Text variant="footnote" tone="muted" style={styles.sectionLabel}>Note from the team</Text>
                <Surface alt style={styles.storyCard}>
                  <Text variant="body" tone="default" style={styles.storyText}>{application.decline_reason}</Text>
                </Surface>
              </>
            ) : null}

            {/* Bank details editor (so support can be paid out) */}
            {!closed ? (
              <>
                <Text variant="footnote" tone="muted" style={styles.sectionLabel}>
                  Bank details for your support
                </Text>
                <Surface style={styles.storyCard}>
                  <Text variant="footnote" tone="muted" style={{ marginBottom: spacing.md, lineHeight: 18 }}>
                    These are shared only with the Pakiza finance team and used to send your support if approved.
                  </Text>
                  <BankFields bank={bank} setBank={setBank} />
                  <Button label="Save bank details" onPress={saveBank} loading={savingBank} style={{ marginTop: spacing.sm }} />
                </Surface>
              </>
            ) : null}
          </ScrollView>
        )}
      </Screen>
    );
  }

  // ── Form mode: submit a new application ────────────────────────────────────
  return (
    <Screen keyboard>
      <Header title="Apply for support" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="display" tone="default" style={styles.lead}>Ask for help</Text>
        <Text variant="callout" tone="muted" style={styles.sub}>
          If the cost of marriage is a barrier, the Marriage Support Fund may be able to help. Tell us
          your situation in your own words.
        </Text>

        <View style={[styles.privacy, { backgroundColor: c.accentFaint }]}>
          <Ionicons name="lock-closed-outline" size={18} color={c.accent} />
          <Text variant="footnote" tone="muted" style={styles.privacyText}>
            Your application and bank details go privately to the Pakiza team for review. They are never
            shown to other members and are handled with care and discretion.
          </Text>
        </View>

        <TextField
          label={`Your story (required, ${STORY_MIN}-${STORY_MAX} characters)`}
          value={story}
          onChangeText={(t) => setStory(t.slice(0, STORY_MAX))}
          placeholder="Share your situation and how the fund would help you marry."
          multiline
          style={styles.storyInput}
          maxLength={STORY_MAX}
        />
        <Text variant="footnote" tone="subtle" style={styles.counter}>
          {storyLen}/{STORY_MAX}
          {storyLen > 0 && storyLen < STORY_MIN ? `  ·  at least ${STORY_MIN}` : ''}
        </Text>

        <TextField label="Partner's name (optional)" value={partnerName} onChangeText={setPartnerName} placeholder="If you have someone in mind" />
        <TextField label="Amount you are requesting (£, optional)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="e.g. 500" />
        <TextField label="Contact phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="So the team can reach you" />
        <TextField label="City (optional)" value={city} onChangeText={setCity} placeholder="Where you are based" />

        {/* Bank details (optional now, can be added later) */}
        <Text variant="heading" tone="accent" style={styles.bankHeading}>Bank details (optional)</Text>
        <Text variant="footnote" tone="muted" style={styles.bankHint}>
          Where the fund would send support if your application is approved. You can also add this later.
        </Text>
        <BankFields bank={bank} setBank={setBank} />

        {/* Terms of service */}
        <Pressable style={styles.termsRow} onPress={() => { haptics.selection(); setTerms((v) => !v); }}>
          <Ionicons
            name={terms ? 'checkbox' : 'square-outline'}
            size={22}
            color={terms ? c.accent : c.textSubtle}
          />
          <Text variant="footnote" tone="muted" style={styles.termsText}>
            I have read and accept the{' '}
            <Text variant="footnote" tone="accent" onPress={() => router.push('/terms')}>Marriage Support Fund terms</Text>
            , and confirm the information I have given is true.
          </Text>
        </Pressable>
      </ScrollView>

      <View style={[styles.ctaBar, { backgroundColor: c.surface, borderTopColor: c.border, paddingBottom: insets.bottom + spacing.md }]}>
        <Button label="Submit application" onPress={submit} loading={submitting} disabled={!canSubmit} />
      </View>
    </Screen>
  );
}

function BankFields({ bank, setBank }: { bank: BankForm; setBank: React.Dispatch<React.SetStateAction<BankForm>> }) {
  const { c } = useTheme();
  const set = (patch: Partial<BankForm>) => setBank((b) => ({ ...b, ...patch }));
  return (
    <View>
      <View style={styles.chips}>
        {REGIONS.map((r) => {
          const active = bank.region === r.key;
          return (
            <Pressable
              key={r.key}
              onPress={() => { haptics.selection(); set({ region: r.key }); }}
              style={[
                styles.chip,
                { borderColor: active ? c.accent : c.border, backgroundColor: active ? c.accentFaint : 'transparent' },
              ]}
            >
              <Text variant="footnote" tone={active ? 'accent' : 'muted'}>{r.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <TextField label="Account holder name" value={bank.accountHolder} onChangeText={(t) => set({ accountHolder: t })} placeholder="Name on the account" />
      <TextField label="Bank name (optional)" value={bank.bankName} onChangeText={(t) => set({ bankName: t })} placeholder="e.g. Barclays" />

      {bank.region === 'GB' ? (
        <>
          <TextField label="Sort code" value={bank.sortCode} onChangeText={(t) => set({ sortCode: t })} placeholder="00-00-00" />
          <TextField label="Account number" value={bank.accountNumber} onChangeText={(t) => set({ accountNumber: t })} keyboardType="number-pad" placeholder="8 digits" />
        </>
      ) : bank.region === 'US' ? (
        <>
          <TextField label="Routing number" value={bank.routingNumber} onChangeText={(t) => set({ routingNumber: t })} keyboardType="number-pad" placeholder="9 digits" />
          <TextField label="Account number" value={bank.accountNumber} onChangeText={(t) => set({ accountNumber: t })} keyboardType="number-pad" placeholder="Account number" />
        </>
      ) : bank.region === 'IBAN' ? (
        <>
          <TextField label="Country code (2 letters)" value={bank.country} onChangeText={(t) => set({ country: t.slice(0, 2) })} autoCapitalize="characters" placeholder="e.g. FR" />
          <TextField label="IBAN" value={bank.iban} onChangeText={(t) => set({ iban: t })} autoCapitalize="characters" placeholder="IBAN" />
          <TextField label="SWIFT / BIC (optional)" value={bank.swiftBic} onChangeText={(t) => set({ swiftBic: t })} autoCapitalize="characters" placeholder="BIC" />
        </>
      ) : (
        <>
          <TextField label="Country code (2 letters)" value={bank.country} onChangeText={(t) => set({ country: t.slice(0, 2) })} autoCapitalize="characters" placeholder="e.g. PK" />
          <TextField
            label="Bank / payout instructions"
            value={bank.other}
            onChangeText={(t) => set({ other: t })}
            placeholder="Account number, bank, branch and any details the team needs"
            multiline
            style={{ height: 90, paddingTop: spacing.md, textAlignVertical: 'top' }}
          />
        </>
      )}
    </View>
  );
}

function Timeline({ entries }: { entries: ApplicationTimelineEntry[] }) {
  const { c } = useTheme();
  return (
    <View style={styles.timeline}>
      {entries.map((e, i) => {
        const last = i === entries.length - 1;
        return (
          <View key={`${e.at}-${i}`} style={styles.tlRow}>
            <View style={styles.tlRail}>
              <View style={[styles.tlDot, { backgroundColor: last ? c.accent : c.border }]} />
              {!last ? <View style={[styles.tlLine, { backgroundColor: c.border }]} /> : null}
            </View>
            <View style={styles.tlBody}>
              <Text variant="subhead" tone={last ? 'accent' : 'default'}>{e.label}</Text>
              <Text variant="footnote" tone="subtle">{formatGivingDate(e.at)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: c.border }]}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.headerBtn}>
        <Ionicons name="chevron-back" size={26} color={c.text} />
      </Pressable>
      <Text variant="subhead" tone="default">{title}</Text>
      <View style={styles.headerBtn} />
    </View>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  lead: { letterSpacing: -0.5, marginTop: spacing.sm },
  sub: { marginTop: spacing.sm, marginBottom: spacing.lg, lineHeight: 21 },

  privacy: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  privacyText: { flex: 1, lineHeight: 19 },

  storyInput: { height: 160, paddingTop: spacing.md, textAlignVertical: 'top' },
  counter: { marginTop: -spacing.md, marginBottom: spacing.lg, marginLeft: spacing.xs },

  bankHeading: { marginTop: spacing.lg, marginBottom: spacing.xs },
  bankHint: { marginBottom: spacing.md, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radii.pill, borderWidth: 1 },

  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.lg },
  termsText: { flex: 1, lineHeight: 19 },

  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  // View mode
  statusCard: { borderRadius: radii.lg, padding: spacing.lg, gap: spacing.xs },
  statusHint: { lineHeight: 21 },
  detailCard: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, marginTop: spacing.lg },
  sectionLabel: { marginTop: spacing.xl, marginBottom: spacing.sm, marginLeft: spacing.xs },
  storyCard: { padding: spacing.lg, marginTop: spacing.lg },
  storyText: { lineHeight: 23 },

  // Timeline
  timeline: { paddingVertical: spacing.sm },
  tlRow: { flexDirection: 'row', gap: spacing.md },
  tlRail: { width: 16, alignItems: 'center' },
  tlDot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  tlLine: { width: 2, flex: 1, marginVertical: 2 },
  tlBody: { flex: 1, paddingBottom: spacing.lg },
});
