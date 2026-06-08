import React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';

import { palette } from '@/theme';

const GRADIENT = require('@/assets/brand/gradient.png');
const GRADIENT_LOGO = require('@/assets/brand/gradient-logo.png');

/**
 * Full-bleed burgundy gradient background used across onboarding & auth.
 * `withMark` swaps in the gradient that includes the gold heart line-art.
 */
export function BrandBackground({
  children,
  withMark = false,
}: {
  children?: React.ReactNode;
  withMark?: boolean;
}) {
  return (
    <View style={styles.root}>
      <ImageBackground
        source={withMark ? GRADIENT_LOGO : GRADIENT}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.burgundyDeep },
});
