import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from './Text';
import { palette, spacing, useTheme } from '@/theme';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string | null;
}

/** Renders nothing when value is empty - safe to drop a long list of these in. */
export function DetailRow({ icon, label, value }: Props) {
  const { c } = useTheme();
  if (!value) return null;
  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: c.accentFaint }]}>
        <Ionicons name={icon} size={18} color={palette.burgundy} />
      </View>
      <View style={styles.text}>
        <Text variant="footnote" tone="muted">{label}</Text>
        <Text variant="callout" tone="default" style={{ marginTop: 1 }}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  text: { flex: 1 },
});
