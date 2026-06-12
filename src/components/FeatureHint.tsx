import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from './Text';
import { useHint } from '@/lib/hints';
import { haptics } from '@/lib/haptics';
import { radii, spacing, useTheme } from '@/theme';

/**
 * A tasteful inline banner that introduces a new feature. Persistently
 * dismissible: once closed, it stays gone (keyed in AsyncStorage via useHint).
 * Optionally tappable to take the member somewhere relevant.
 */
export function FeatureHint({
  hintKey,
  icon = 'sparkles',
  text,
  onPress,
  style,
}: {
  hintKey: string;
  icon?: keyof typeof Ionicons.glyphMap;
  text: string;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
}) {
  const { c } = useTheme();
  const { dismissed, dismiss } = useHint(hintKey);

  if (dismissed) return null;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.wrap, { backgroundColor: c.accentFaint, borderColor: c.border }, style]}
    >
      <View style={[styles.iconWrap, { backgroundColor: c.surface }]}>
        <Ionicons name={icon} size={16} color={c.accent} />
      </View>
      <Text variant="footnote" tone="default" style={styles.text}>
        {text}
      </Text>
      <Pressable
        onPress={() => {
          haptics.selection();
          dismiss();
        }}
        hitSlop={10}
        style={styles.close}
      >
        <Ionicons name="close" size={16} color={c.textSubtle} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, lineHeight: 18 },
  close: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
});
