import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fonts, palette } from '@/theme';

/** The "Pakiza" serif wordmark, optionally with the tagline. */
export function Wordmark({
  size = 56,
  tagline,
  color = palette.cream,
}: {
  size?: number;
  tagline?: string;
  color?: string;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={[styles.word, { fontSize: size, color }]}>Pakiza</Text>
      {tagline ? <Text style={[styles.tagline, { color }]}>{tagline}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  word: {
    fontFamily: fonts.display,
    letterSpacing: 1,
    includeFontPadding: false,
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 14,
    letterSpacing: 1.5,
    marginTop: 2,
    opacity: 0.85,
  },
});
