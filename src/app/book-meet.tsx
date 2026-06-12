import { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { errorMessage } from '@/api/client';
import { meetingsApi } from '@/api/meetings';
import type { CreateMeetingInput, MeetingMode } from '@/api/types';
import { Button } from '@/components/Button';
import { DateTimeField } from '@/components/DateTimeField';
import { OptionGroup } from '@/components/OptionGroup';
import { Screen } from '@/components/Screen';
import { Surface } from '@/components/Surface';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { MEETING_MODE_LABEL, formatMeetingDateTime } from '@/lib/meetings';
import { haptics } from '@/lib/haptics';
import { radii, spacing, useTheme } from '@/theme';

const MODES = [
  { label: MEETING_MODE_LABEL.in_person, value: 'in_person' as MeetingMode },
  { label: MEETING_MODE_LABEL.online, value: 'online' as MeetingMode },
];

const SLIDES: { icon: keyof typeof Ionicons.glyphMap; title: string; line: string }[] = [
  {
    icon: 'people-circle-outline',
    title: 'Choose your match',
    line: 'Start a supervised meeting with someone you have matched with and begun chatting to.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Add your wali',
    line: 'A wali (guardian) is required. Share their details so they can be kept informed.',
  },
  {
    icon: 'sparkles-outline',
    title: 'We verify and arrange',
    line: 'Our team personally verifies your wali and arranges the meeting, in person or online.',
  },
  {
    icon: 'heart-circle-outline',
    title: 'Meet safely',
    line: 'Everything happens with care, respect and your wali present. No surprises.',
  },
];

const STEPS = ['Welcome', 'Meeting', 'Your wali', 'Review'] as const;

export default function BookMeet() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { conversationId, name } = useLocalSearchParams<{
    conversationId?: string;
    matchId?: string;
    name?: string;
  }>();

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  // Set when the backend reports an existing active meeting (HTTP 409).
  const [conflict, setConflict] = useState(false);

  // intro carousel paging (width from the window so the slides always render,
  // no dependence on an onLayout measurement that can stay 0).
  const { width: winW, height: winH } = useWindowDimensions();
  const slideHeight = Math.min(winH * 0.62, 560);
  const [slideIdx, setSlideIdx] = useState(0);
  const slidesRef = useRef<ScrollView>(null);
  const lastSlide = slideIdx >= SLIDES.length - 1;

  const goToSlide = (i: number) => {
    const clamped = Math.max(0, Math.min(i, SLIDES.length - 1));
    setSlideIdx(clamped);
    slidesRef.current?.scrollTo({ x: clamped * winW, animated: true });
    haptics.selection();
  };

  // form state
  const [mode, setMode] = useState<MeetingMode | null>('in_person');
  const [preferredAt, setPreferredAt] = useState<Date | null>(null);
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [waliName, setWaliName] = useState('');
  const [waliRelationship, setWaliRelationship] = useState('');
  const [waliPhone, setWaliPhone] = useState('');
  const [waliEmail, setWaliEmail] = useState('');

  const validateStep = (): string | null => {
    if (step === 1) {
      if (!mode) return 'Please choose how you would like to meet';
    }
    if (step === 2) {
      if (waliName.trim().length < 2) return "Please enter your wali's full name";
      if (waliRelationship.trim().length < 2) return 'Please tell us your wali relationship';
      if (waliPhone.trim().length < 6) return "Please enter your wali's phone number";
      if (waliEmail.trim() && !waliEmail.includes('@')) return 'Please enter a valid email or leave it blank';
    }
    return null;
  };

  const next = () => {
    const v = validateStep();
    if (v) return setError(v);
    setError(null);
    haptics.selection();
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => {
    setError(null);
    if (step === 0) {
      if (slideIdx > 0) goToSlide(slideIdx - 1);
      else router.back();
    } else {
      setStep((s) => s - 1);
    }
  };

  const submit = async () => {
    if (!conversationId) {
      setError('This match cannot be booked yet. Start a chat first.');
      return;
    }
    if (!mode) return;
    setError(null);
    setLoading(true);
    try {
      const payload: CreateMeetingInput = {
        conversation_id: String(conversationId),
        mode,
        proposed_at: preferredAt ? preferredAt.toISOString() : undefined,
        proposed_location: location.trim() || undefined,
        note: note.trim() || undefined,
        wali_name: waliName.trim(),
        wali_relationship: waliRelationship.trim(),
        wali_phone: waliPhone.trim(),
        wali_email: waliEmail.trim() || undefined,
      };
      await meetingsApi.create(payload);
      haptics.success();
      setDone(true);
      // Brief confirmation, then return to the chat where the card now appears.
      setTimeout(() => router.back(), 1400);
    } catch (err: any) {
      haptics.error();
      // An active meeting already exists with this match: offer a friendly route out.
      if (err?.response?.status === 409) {
        setConflict(true);
        setLoading(false);
        return;
      }
      setError(errorMessage(err, 'Could not send your request'));
      setLoading(false);
    }
  };

  const progress = useMemo(() => (step + 1) / STEPS.length, [step]);
  const isReview = step === STEPS.length - 1;

  if (conflict) {
    return (
      <Screen style={styles.doneWrap}>
        <View style={[styles.doneBadge, { backgroundColor: c.accentFaint }]}>
          <Ionicons name="calendar" size={42} color={c.accent} />
        </View>
        <Text variant="title" tone="default" center style={{ marginTop: spacing.lg }}>
          You already have a meeting
        </Text>
        <Text variant="body" tone="muted" center style={styles.doneBody}>
          You already have an active meeting with this match. You can view it, manage the payment and message the team from your meetings.
        </Text>
        <View style={styles.conflictActions}>
          <Button label="View my meetings" onPress={() => router.replace('/meetings')} style={{ alignSelf: 'stretch' }} />
          <Button label="Go back" variant="ghost" onPress={() => router.back()} style={{ alignSelf: 'stretch' }} />
        </View>
      </Screen>
    );
  }

  if (done) {
    return (
      <Screen style={styles.doneWrap}>
        <View style={[styles.doneBadge, { backgroundColor: c.accentFaint }]}>
          <Ionicons name="checkmark-circle" size={44} color={c.accent} />
        </View>
        <Text variant="title" tone="default" center style={{ marginTop: spacing.lg }}>
          Request sent
        </Text>
        <Text variant="body" tone="muted" center style={styles.doneBody}>
          Our team will verify your wali and arrange the meeting. You will be kept updated in this chat.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <Text variant="label" tone="accent">
            Step {step + 1} of {STEPS.length}
          </Text>
          <Text variant="title" tone="default" style={styles.title}>
            {step === 0 ? 'Book a meet' : STEPS[step]}
          </Text>
          {name && step > 0 ? (
            <Text variant="callout" tone="muted" style={styles.hint}>
              With {name}
            </Text>
          ) : null}
          <View style={[styles.track, { backgroundColor: c.surfaceAlt }]}>
            <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: c.accent }]} />
          </View>
        </View>

        {step === 0 ? (
          <View style={styles.carouselWrap}>
            <ScrollView
              ref={slidesRef}
              horizontal
              pagingEnabled
              scrollEnabled={false}
              showsHorizontalScrollIndicator={false}
              style={styles.carousel}
            >
              {SLIDES.map((s) => (
                <View key={s.title} style={[styles.slide, { width: winW, height: slideHeight }]}>
                  <View style={[styles.slideIcon, { backgroundColor: c.accentFaint }]}>
                    <Ionicons name={s.icon} size={56} color={c.accent} />
                  </View>
                  <Text variant="heading" tone="default" center style={styles.slideTitle}>
                    {s.title}
                  </Text>
                  <Text variant="body" tone="muted" center style={styles.slideLine}>
                    {s.line}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.dots}>
              {SLIDES.map((s, i) => (
                <View
                  key={s.title}
                  style={[
                    styles.dot,
                    { backgroundColor: i === slideIdx ? c.accent : c.borderStrong },
                  ]}
                />
              ))}
            </View>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {step === 1 ? (
              <>
                <OptionGroup
                  label="How would you like to meet?"
                  options={MODES}
                  value={mode}
                  onChange={setMode}
                  onDark={false}
                  clearable={false}
                />
                <DateTimeField
                  label="Preferred time (optional)"
                  value={preferredAt}
                  onChange={setPreferredAt}
                  onDark={false}
                />
                <TextField
                  label="Preferred location or city (optional)"
                  value={location}
                  onChangeText={setLocation}
                  placeholder={mode === 'online' ? 'e.g. a video call' : 'e.g. a cafe in London'}
                />
                <TextField
                  label="Note for the team (optional)"
                  value={note}
                  onChangeText={setNote}
                  placeholder="Anything we should know to arrange this well?"
                  multiline
                  style={styles.multiline}
                />
              </>
            ) : null}

            {step === 2 ? (
              <>
                <Surface elevated style={styles.waliNote}>
                  <View style={styles.waliNoteHead}>
                    <Ionicons name="shield-checkmark" size={18} color={c.accent} />
                    <Text variant="subhead" tone="default">A wali is required</Text>
                  </View>
                  <Text variant="footnote" tone="muted" style={styles.waliNoteBody}>
                    A wali (guardian) is required. Our team personally verifies these details and may contact your wali
                    before arranging the meeting.
                  </Text>
                </Surface>

                <TextField
                  label="Wali full name"
                  value={waliName}
                  onChangeText={setWaliName}
                  placeholder="e.g. Yusuf Khan"
                />
                <TextField
                  label="Relationship to you"
                  value={waliRelationship}
                  onChangeText={setWaliRelationship}
                  placeholder="e.g. Father, Brother, Uncle"
                />
                <TextField
                  label="Wali phone"
                  value={waliPhone}
                  onChangeText={setWaliPhone}
                  placeholder="e.g. +44 7700 900000"
                  keyboardType="phone-pad"
                />
                <TextField
                  label="Wali email (optional)"
                  value={waliEmail}
                  onChangeText={setWaliEmail}
                  placeholder="e.g. wali@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </>
            ) : null}

            {isReview ? (
              <Surface elevated style={styles.reviewCard}>
                <ReviewRow label="With" value={name ?? 'Your match'} />
                <Divider />
                <ReviewRow label="Mode" value={mode ? MEETING_MODE_LABEL[mode] : '-'} />
                <Divider />
                <ReviewRow label="Preferred time" value={formatMeetingDateTime(preferredAt?.toISOString()) ?? 'No preference'} />
                <Divider />
                <ReviewRow label="Location" value={location.trim() || 'To be arranged'} />
                {note.trim() ? (
                  <>
                    <Divider />
                    <ReviewRow label="Note" value={note.trim()} />
                  </>
                ) : null}
                <Divider />
                <ReviewRow label="Wali" value={waliName.trim()} />
                <Divider />
                <ReviewRow label="Relationship" value={waliRelationship.trim()} />
                <Divider />
                <ReviewRow label="Wali phone" value={waliPhone.trim()} />
                {waliEmail.trim() ? (
                  <>
                    <Divider />
                    <ReviewRow label="Wali email" value={waliEmail.trim()} />
                  </>
                ) : null}
              </Surface>
            ) : null}

            {error ? (
              <Text variant="footnote" tone="danger" center style={styles.error}>
                {error}
              </Text>
            ) : null}
          </ScrollView>
        )}

        <View
          style={[
            styles.footer,
            {
              backgroundColor: c.bg,
              borderTopColor: c.border,
              paddingBottom: insets.bottom + spacing.md,
            },
          ]}
        >
          <Button label="Back" variant="ghost" onPress={back} style={{ flex: 1 }} />
          <Button
            label={step === 0 ? (lastSlide ? 'Get started' : 'Next') : isReview ? 'Send request' : 'Continue'}
            onPress={() => {
              if (step === 0) {
                if (lastSlide) {
                  haptics.selection();
                  setStep(1);
                } else {
                  goToSlide(slideIdx + 1);
                }
              } else if (isReview) {
                submit();
              } else {
                next();
              }
            }}
            loading={loading}
            style={{ flex: 1.4 }}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text variant="footnote" tone="muted" style={styles.reviewLabel}>{label}</Text>
      <Text variant="callout" tone="default" style={styles.reviewValue}>{value}</Text>
    </View>
  );
}

function Divider() {
  const { c } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border }} />;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  title: { marginTop: spacing.xs },
  hint: { marginTop: spacing.xs },
  track: { height: 4, borderRadius: radii.pill, marginTop: spacing.lg, overflow: 'hidden' },
  fill: { height: 4, borderRadius: radii.pill },

  // carousel
  carouselWrap: { flex: 1, justifyContent: 'center' },
  carousel: { flexGrow: 0 },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl },
  slideIcon: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  slideTitle: { marginBottom: spacing.sm },
  slideLine: { lineHeight: 23, maxWidth: 320 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  dot: { width: 8, height: 8, borderRadius: 4 },

  // form
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  multiline: { height: 100, paddingTop: 14, textAlignVertical: 'top' },
  waliNote: { padding: spacing.lg, marginBottom: spacing.lg },
  waliNoteHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  waliNoteBody: { lineHeight: 19 },

  // review
  reviewCard: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  reviewRow: { paddingVertical: spacing.md, gap: 3 },
  reviewLabel: {},
  reviewValue: { lineHeight: 21 },

  error: { marginTop: spacing.md },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  // done
  doneWrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  doneBadge: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  doneBody: { marginTop: spacing.md, lineHeight: 23, maxWidth: 320 },
  conflictActions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.xl },
});
