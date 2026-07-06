import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { PublicProfile, SubscriptionPlan } from '@/api/types';
import { palette, radii } from '@/theme';
import { Text } from './Text';

/**
 * Small profile badges shown to other members on a profile photo:
 *
 *  - PlanBadge      : PAID subscription tier (gold diamond / premium star).
 *                     Free / no plan renders nothing.
 *  - VerifiedBadge  : the member passed the selfie verification check.
 *  - DonatedBadge   : the member made a (non-anonymous) Marriage Support Fund
 *                     donation. Label reads "Donated".
 *  - ProfileBadges  : convenience row composing all three from a profile.
 *
 * Variants:
 *  - `pill`  : icon + label, for the hero photo (cards / ProfileDetail).
 *  - `corner`: compact icon-only disc, for small circular list avatars.
 */
type Variant = 'pill' | 'corner';

interface BadgeConfig {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  fg: string;
}

const PLAN_CONFIG: Record<'gold' | 'premium', BadgeConfig> = {
  // Gold is the top tier - a diamond on the gold accent.
  gold: { label: 'Gold', icon: 'diamond', bg: palette.gold, fg: palette.burgundyDeep },
  // Premium - a star on brand burgundy.
  premium: { label: 'Premium', icon: 'star', bg: palette.burgundy, fg: palette.cream },
};

const VERIFIED_CONFIG: BadgeConfig = {
  label: 'Verified',
  icon: 'shield-checkmark',
  bg: palette.navy,
  fg: palette.cream,
};

const DONATED_CONFIG: BadgeConfig = {
  label: 'Donated',
  icon: 'heart',
  bg: palette.sienna,
  fg: palette.cream,
};

function Badge({
  cfg,
  variant = 'pill',
  size = 18,
  style,
}: {
  cfg: BadgeConfig;
  variant?: Variant;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
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
  return <Badge cfg={PLAN_CONFIG[plan]} variant={variant} size={size} style={style} />;
}

export function VerifiedBadge({
  show,
  variant = 'pill',
  size = 18,
  style,
}: {
  show?: boolean;
  variant?: Variant;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  if (!show) return null;
  return <Badge cfg={VERIFIED_CONFIG} variant={variant} size={size} style={style} />;
}

export function DonatedBadge({
  show,
  variant = 'pill',
  size = 18,
  style,
}: {
  show?: boolean;
  variant?: Variant;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  if (!show) return null;
  return <Badge cfg={DONATED_CONFIG} variant={variant} size={size} style={style} />;
}

/** All profile badges in one wrapping row. Renders nothing when none apply. */
export function ProfileBadges({
  profile,
  style,
}: {
  profile: Pick<PublicProfile, 'plan' | 'is_selfie_verified' | 'has_donated'>;
  style?: StyleProp<ViewStyle>;
}) {
  const hasPlan = profile.plan === 'gold' || profile.plan === 'premium';
  if (!hasPlan && !profile.is_selfie_verified && !profile.has_donated) return null;
  return (
    <View style={[styles.row, style]}>
      <VerifiedBadge show={profile.is_selfie_verified} />
      <PlanBadge plan={profile.plan} />
      <DonatedBadge show={profile.has_donated} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
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
