import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { SubscriptionPlan } from '@/api/types';
import { palette, radii } from '@/theme';
import { Text } from './Text';

/**
 * A small badge marking a member's PAID subscription tier, shown to other
 * members on their profile photo. Free / no plan renders nothing.
 *
 *  - `pill`  : icon + label, for the hero photo (ProfileDetail).
 *  - `corner`: compact icon-only disc, for small circular list avatars.
 */
type Variant = 'pill' | 'corner';

const CONFIG: Record<
  'gold' | 'premium',
  { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }
> = {
  // Gold is the top tier - a diamond on the gold accent.
  gold: { label: 'Gold', icon: 'diamond', bg: palette.gold, fg: palette.burgundyDeep },
  // Premium - a star on brand burgundy.
  premium: { label: 'Premium', icon: 'star', bg: palette.burgundy, fg: palette.cream },
};

export function PlanBadge({
  plan,
  variant = 'pill',
  size = 18,
  style,
}: {
  plan?: SubscriptionPlan | null;
  variant?: Variant;
  /** Diameter of the icon disc for the `corner` variant. */
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  if (plan !== 'gold' && plan !== 'premium') return null;
  const cfg = CONFIG[plan];

  if (variant === 'corner') {
    return (
      <View
        style={[
          styles.corner,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: cfg.bg,
          },
          style,
        ]}
      >
        <Ionicons name={cfg.icon} size={Math.round(size * 0.55)} color={cfg.fg} />
      </View>
    );
  }

  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg }, style]}>
      <Ionicons name={cfg.icon} size={12} color={cfg.fg} />
      <Text variant="label" color={cfg.fg} style={styles.pillText}>
        {cfg.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  pillText: { fontSize: 11, letterSpacing: 0.3 },
  corner: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: palette.white,
  },
});
