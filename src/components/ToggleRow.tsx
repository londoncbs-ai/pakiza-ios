import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Text } from './Text';
import { hexA, palette, spacing, useTheme } from '@/theme';

interface Props {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  onDark?: boolean;
}

export function ToggleRow({ label, hint, value, onValueChange, onDark = true }: Props) {
  const { c } = useTheme();
  const offTrack = onDark ? hexA(palette.cream, 0.2) : c.borderStrong;

  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text variant="callout" color={onDark ? palette.cream : c.text}>{label}</Text>
        {hint ? (
          <Text variant="footnote" color={onDark ? hexA(palette.cream, 0.6) : c.textMuted} style={styles.hint}>
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: offTrack, true: c.accent }}
        thumbColor={palette.cream}
        ios_backgroundColor={offTrack}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  text: { flex: 1, paddingRight: spacing.md },
  hint: { marginTop: 2, lineHeight: 17 },
});
