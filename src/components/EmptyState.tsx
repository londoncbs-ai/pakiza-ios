import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { palette, spacing, tint } from '@/theme';

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
  return (
    <View style={styles.root}>
      <View style={styles.badge}>
        <Ionicons name={icon} size={30} color={palette.gold} />
      </View>
      <Text variant="heading" tone="burgundy" center style={{ marginBottom: spacing.sm }}>
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
    backgroundColor: tint.goldFaint,
    borderWidth: 1,
    borderColor: tint.goldSoft,
    marginBottom: spacing.lg,
  },
  message: { maxWidth: 300 },
});
