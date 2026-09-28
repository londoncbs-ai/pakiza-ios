import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Text } from './Text';
import { MIN_AGE } from '@/lib/age';
import { hexA, palette, radii, spacing, useTheme } from '@/theme';

/**
 * A plain, professional statement of Pakiza's age restriction.
 *
 * Shown where someone decides to join (welcome, sign-up) so the rule is stated
 * up front rather than only enforced by a date picker. `onDark` is for the
 * poster and auth screens, which sit on a dark burgundy background whatever the
 * theme; otherwise it follows the light/dark theme. `compact` is the one-line
 * form for tight spaces.
 */
export function AgeNotice({
  onDark = false,
  compact = false,
  style,
}: {
  onDark?: boolean;
  compact?: boolean;
  style?: ViewStyle | ViewStyle[];
}) {
  const { c } = useTheme();

  const badgeBg = onDark ? palette.gold : c.accent;
  const badgeInk = onDark ? palette.burgundyDeep : c.textOnAccent;
  const box = onDark
    ? { backgroundColor: hexA(palette.cream, 0.08), borderColor: hexA(palette.cream, 0.18) }
    : { backgroundColor: c.accentFaint, borderColor: c.border };

  const label = `Adults only. Pakiza is for adults aged ${MIN_AGE} and over. Members under ${MIN_AGE} are not permitted.`;

  if (compact) {
    return (
      <View style={[styles.compact, style]} accessible accessibilityLabel={label}>
        <View style={[styles.badgeSm, { backgroundColor: badgeBg }]}>
          <Text variant="label" color={badgeInk} style={styles.badgeSmText} maxFontSizeMultiplier={1.2}>
            {MIN_AGE}+
          </Text>
        </View>
        <Text variant="footnote" tone={onDark ? 'onDarkMuted' : 'muted'} style={{ flexShrink: 1 }}>
          Adults only. Members under {MIN_AGE} are not permitted.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.box, box, style]} accessible accessibilityLabel={label}>
      <View style={[styles.badge, { backgroundColor: badgeBg }]}>
        <Text variant="subhead" color={badgeInk} style={styles.badgeText} maxFontSizeMultiplier={1.2}>
          {MIN_AGE}+
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="subhead" tone={onDark ? 'onDark' : 'default'}>Adults only</Text>
        <Text variant="footnote" tone={onDark ? 'onDarkMuted' : 'muted'} style={styles.body}>
          Pakiza is for adults aged {MIN_AGE} and over. Members under {MIN_AGE} are not permitted.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  badge: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontWeight: '700', letterSpacing: 0.2 },
  body: { marginTop: 2, lineHeight: 18 },

  compact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  badgeSm: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radii.pill },
  badgeSmText: { fontWeight: '700', fontSize: 11, letterSpacing: 0.2 },
});
