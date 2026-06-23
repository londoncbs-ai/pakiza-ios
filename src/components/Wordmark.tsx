import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { fonts, palette } from '@/theme';

// The real two-hearts brand mark. Gold as-is; used in the lockup beside "Pakiza".
const heartsMark = require('../../assets/brand/logo-hearts.png');

/**
 * The Pakiza brand lockup: the two-hearts mark above the serif "Pakiza"
 * wordmark, with an optional tagline. Mirrors the web Logo proportions
 * (mark height ~ size * 1.2, small gap).
 *
 * `showMark` controls whether the hearts mark renders. It defaults to true
 * for the smaller in-app lockups (header, modals, auth) but off for the large
 * onboarding usage, where the hearts are already baked into the full-screen
 * BrandBackground - so we avoid an obvious double logo. The default heuristic
 * (render only when size is small) can be overridden explicitly.
 */
export function Wordmark({
  size = 56,
  tagline,
  color = palette.cream,
  showMark = size <= 48,
}: {
  size?: number;
  tagline?: string;
  color?: string;
  showMark?: boolean;
}) {
  const markHeight = Math.round(size * 1.2);
  return (
    <View style={styles.wrap}>
      {showMark ? (
        <Image
          source={heartsMark}
          accessibilityRole="image"
          accessible={false}
          style={{ height: markHeight, width: markHeight, marginBottom: size * 0.18 }}
          resizeMode="contain"
        />
      ) : null}
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
