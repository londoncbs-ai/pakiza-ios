import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { fonts, palette, spacing } from '@/theme';

export function PolicyView({
  title,
  intro,
  sections,
}: {
  title: string;
  intro?: string;
  sections: { h: string; p: string }[];
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ width: 30 }}>
          <Ionicons name="chevron-back" size={26} color={palette.burgundy} />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <View style={{ width: 30 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
        {intro ? <Text style={styles.intro}>{intro}</Text> : null}
        {sections.map((s) => (
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
  title: { fontFamily: fonts.displaySemibold, fontSize: 21, color: palette.burgundy },
  intro: { fontFamily: fonts.body, fontSize: 14.5, color: palette.muted, lineHeight: 21, marginBottom: spacing.lg },
  section: { marginBottom: spacing.lg },
  h: { fontFamily: fonts.bodySemibold, fontSize: 16, color: palette.ink, marginBottom: 5 },
  p: { fontFamily: fonts.body, fontSize: 14, color: palette.ink, lineHeight: 21 },
  foot: { fontFamily: fonts.display, fontSize: 18, color: palette.burgundy, textAlign: 'center', marginTop: spacing.md },
});
