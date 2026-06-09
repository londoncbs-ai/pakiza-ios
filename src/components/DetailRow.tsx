import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { fonts, palette, spacing } from '@/theme';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string | null;
}

/** Renders nothing when value is empty - safe to drop a long list of these in. */
export function DetailRow({ icon, label, value }: Props) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={18} color={palette.burgundy} />
      </View>
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
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
    backgroundColor: 'rgba(128,0,32,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  text: { flex: 1 },
  label: { fontFamily: fonts.body, fontSize: 12, color: palette.muted, letterSpacing: 0.3 },
  value: { fontFamily: fonts.bodyMedium, fontSize: 15.5, color: palette.ink, marginTop: 1 },
});
