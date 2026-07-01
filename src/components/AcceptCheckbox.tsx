import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { PressableScale } from './PressableScale';
import { haptics } from '@/lib/haptics';
import { hexA, palette, spacing, useTheme } from '@/theme';

interface Props {
  checked: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
  onDark?: boolean;
}

/** On-brand terms/consent checkbox row. */
export function AcceptCheckbox({ checked, onToggle, children, onDark = false }: Props) {
  const { c } = useTheme();
  const onColor = onDark ? palette.rose : c.accent;
  const offColor = onDark ? hexA(palette.cream, 0.55) : c.textSubtle;
  return (
    <PressableScale
      onPress={() => { haptics.selection(); onToggle(!checked); }}
      scaleTo={0.98}
      style={styles.row}
    >
      <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={24} color={checked ? onColor : offColor} />
      <View style={styles.text}>{children}</View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.sm },
  text: { flex: 1 },
});
