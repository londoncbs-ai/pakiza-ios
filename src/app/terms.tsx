import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { fonts, palette, spacing } from '@/theme';

const SECTIONS: { h: string; p: string }[] = [
  {
    h: '1. Subscriptions & billing',
    p: 'Pakiza Premium and Gold are billed monthly to the payment method on file. Your subscription renews automatically at the end of each period until you cancel. You can cancel auto-renewal at any time from Profile then Pakiza Premium; you keep your benefits until the end of the paid period.',
  },
  {
    h: '2. Pricing & taxes',
    p: 'Prices are shown in your local currency and include applicable taxes where required. We may change prices with reasonable notice; changes apply to the next billing period.',
  },
  {
    h: '3. Refunds',
    p: 'Payments are non-refundable for partial periods, except where required by law or by the app store through which you purchased.',
  },
  {
    h: '4. Eligibility',
    p: 'You must be at least 18 years old and legally able to marry to use Pakiza. You agree to provide accurate information and to treat other members with respect.',
  },
  {
    h: '5. Conduct & safety',
    p: 'Harassment, fake profiles, and inappropriate content are prohibited. We may suspend or remove accounts that violate these terms. You can report or block any member at any time.',
  },
  {
    h: '6. Privacy',
    p: 'We process your data to provide matching and messaging. Sensitive fields such as caste are private by default and shown to others only with your consent. We do not sell your personal data.',
  },
  {
    h: '7. Marriage-intent platform',
    p: 'Pakiza is intended for people seeking marriage. Features such as the guardian (wali) option are provided to support that intent.',
  },
];

export default function Terms() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ width: 30 }}>
          <Ionicons name="chevron-back" size={26} color={palette.burgundy} />
        </Pressable>
        <Text style={styles.title}>Terms & billing</Text>
        <View style={{ width: 30 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
        <Text style={styles.intro}>
          Please read these terms. By subscribing you agree to them and to our billing agreement.
        </Text>
        {SECTIONS.map((s) => (
          <View key={s.h} style={styles.section}>
            <Text style={styles.h}>{s.h}</Text>
            <Text style={styles.p}>{s.p}</Text>
          </View>
        ))}
        <Text style={styles.foot}>Pakiza, where love finds purpose.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  title: { fontFamily: fonts.displaySemibold, fontSize: 22, color: palette.burgundy },
  intro: { fontFamily: fonts.body, fontSize: 14.5, color: palette.muted, lineHeight: 21, marginBottom: spacing.lg },
  section: { marginBottom: spacing.lg },
  h: { fontFamily: fonts.bodySemibold, fontSize: 16, color: palette.ink, marginBottom: 5 },
  p: { fontFamily: fonts.body, fontSize: 14, color: palette.ink, lineHeight: 21 },
  foot: { fontFamily: fonts.display, fontSize: 18, color: palette.burgundy, textAlign: 'center', marginTop: spacing.md },
});
