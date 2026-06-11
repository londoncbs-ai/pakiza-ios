import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { palette, spacing, tint } from '@/theme';

/**
 * Standard error state. Wraps the real <Button> for retry rather than the
 * hand-rolled retry pills that were duplicated across screens.
 */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.root}>
      <View style={styles.badge}>
        <Ionicons name="cloud-offline-outline" size={28} color={palette.burgundy} />
      </View>
      <Text variant="subhead" tone="burgundy" center style={{ marginBottom: spacing.xs }}>
        {title}
      </Text>
      {message ? (
        <Text variant="callout" tone="muted" center style={styles.message}>
          {message}
        </Text>
      ) : null}
      {onRetry ? (
        <Button label="Try again" variant="primary" onPress={onRetry} style={styles.retry} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tint.burgundyFaint,
    marginBottom: spacing.lg,
  },
  message: { maxWidth: 300, marginBottom: spacing.sm },
  retry: { marginTop: spacing.lg, alignSelf: 'stretch' },
});
