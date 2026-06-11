import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Screen } from './Screen';
import { Surface } from './Surface';
import { Text } from './Text';
import { radii, spacing, useTheme } from '@/theme';

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
  const { c } = useTheme();

  return (
    <Screen>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs, borderBottomColor: c.border }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={[styles.backBtn, { backgroundColor: c.surfaceAlt }]}
        >
          <Ionicons name="chevron-back" size={22} color={c.accent} />
        </Pressable>
        <Text variant="subhead" tone="default" numberOfLines={1} style={styles.headerTitle}>
          {title}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: insets.bottom + spacing.xxxl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title block */}
        <Text variant="title" tone="default">{title}</Text>
        {intro ? (
          <Text variant="body" tone="muted" style={styles.intro}>{intro}</Text>
        ) : null}

        {/* Sections */}
        <View style={styles.sections}>
          {sections.map((s) => (
            <Surface key={s.h} elevated style={styles.section}>
              <Text variant="subhead" tone="default" style={styles.h}>{s.h}</Text>
              <Text variant="callout" tone="muted" style={styles.p}>{s.p}</Text>
            </Surface>
          ))}
        </View>

        {/* Footer tagline */}
        <Text variant="footnote" tone="accent" center style={styles.foot}>
          Pakiza, where love finds purpose.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', marginHorizontal: spacing.sm },
  intro: { marginTop: spacing.sm, lineHeight: 23 },
  sections: { marginTop: spacing.xl, gap: spacing.md },
  section: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  h: { marginBottom: spacing.xs },
  p: { lineHeight: 23 },
  foot: { marginTop: spacing.xxl },
});
