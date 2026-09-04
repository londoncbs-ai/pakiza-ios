import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { PressableScale } from './PressableScale';
import { palette, shadow } from '@/theme';

interface FABProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  style?: ViewStyle;
}

export function FAB({ icon, onPress, style }: FABProps) {
  return (
    <PressableScale
      style={[styles.fab, shadow.medium, style]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={24} color="white" />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.burgundy,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  }
});
