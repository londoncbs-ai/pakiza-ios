import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { spacing, useTheme } from '@/theme';

/**
 * Branded empty state - a gold line-art mark, a headline, optional supporting
 * line and a single call to action. Replaces the bare one-line muted <Text>
 * empty states across Matches / Messages / Likes.
 */
export function EmptyState({
  icon = 'sparkles-outline',
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { c } = useTheme();
  return (
    <View style={styles.root}>
      <View style={[styles.badge, { backgroundColor: c.accentFaint }]}>
        <Ionicons name={icon} size={30} color={c.accent} />
      </View>
      <Text variant="heading" tone="accent" center style={{ marginBottom: spacing.sm }}>
        {title}
      </Text>
      {message ? (
        <Text variant="body" tone="muted" center style={styles.message}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} variant="primary" onPress={onAction} style={{ marginTop: spacing.xl, alignSelf: 'stretch' }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  badge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  message: { maxWidth: 300 },
});
