import React, { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { palette, radii, spacing, surfaces, tint } from '@/theme';

/** A single shimmering placeholder block. */
export function Skeleton({
  width = '100%',
  height = 14,
  radius = radii.xs,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const pulse = useSharedValue(0.5);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    pulse.value = withRepeat(withTiming(1, { duration: 750 }), -1, true);
  }, [pulse, reduced]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: reduced ? 0.6 : pulse.value }));

  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: tint.burgundyFaint }, animatedStyle, style]} />;
}

/** A full-bleed placeholder shaped like a discovery / introduction card. */
export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Skeleton height={220} radius={radii.card} style={{ marginBottom: spacing.lg }} />
      <Skeleton width="55%" height={24} radius={radii.sm} style={{ marginBottom: spacing.sm }} />
      <Skeleton width="38%" height={14} style={{ marginBottom: spacing.lg }} />
      <View style={styles.row}>
        <Skeleton width={90} height={28} radius={radii.pill} style={{ marginRight: spacing.sm }} />
        <Skeleton width={120} height={28} radius={radii.pill} />
      </View>
      <Skeleton height={14} style={{ marginTop: spacing.lg }} />
      <Skeleton width="80%" height={14} style={{ marginTop: spacing.sm }} />
    </View>
  );
}

/** A placeholder shaped like a list row (avatar + two text lines). */
export function SkeletonRow() {
  return (
    <View style={styles.rowCard}>
      <Skeleton width={58} height={58} radius={29} />
      <View style={styles.rowBody}>
        <Skeleton width="50%" height={18} radius={radii.xs} style={{ marginBottom: spacing.sm }} />
        <Skeleton width="72%" height={13} radius={radii.xs} />
      </View>
    </View>
  );
}

/** A list of row placeholders for loading states on Matches / Messages / Likes. */
export function SkeletonList({ count = 6 }: { count?: number }) {
  return (
    <View style={{ padding: spacing.lg }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: surfaces.raised,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
    padding: spacing.lg,
  },
  row: { flexDirection: 'row' },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: surfaces.raised,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
  },
  rowBody: { flex: 1, marginLeft: spacing.md },
});
