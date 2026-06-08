import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { fonts, palette } from '@/theme';

interface Props {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  onDark?: boolean;
}

export function ToggleRow({ label, hint, value, onValueChange, onDark = true }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={[styles.label, { color: onDark ? palette.cream : palette.ink }]}>{label}</Text>
        {hint ? (
          <Text style={[styles.hint, { color: onDark ? 'rgba(245,240,230,0.6)' : palette.muted }]}>{hint}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: onDark ? 'rgba(245,240,230,0.2)' : palette.line, true: palette.gold }}
        thumbColor={palette.cream}
        ios_backgroundColor={onDark ? 'rgba(245,240,230,0.2)' : palette.line}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  text: { flex: 1, paddingRight: 12 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 14.5 },
  hint: { fontFamily: fonts.body, fontSize: 12.5, marginTop: 2, lineHeight: 17 },
});
