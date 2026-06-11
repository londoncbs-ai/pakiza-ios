import React from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { palette, tint, typography, type TypeRole } from '@/theme';

type Tone = 'default' | 'muted' | 'onDark' | 'onDarkMuted' | 'gold' | 'burgundy' | 'danger' | 'success';

const TONE_COLOR: Record<Tone, string> = {
  default: palette.ink,
  muted: palette.muted,
  onDark: palette.cream,
  onDarkMuted: tint.onDarkSoft,
  gold: palette.gold,
  burgundy: palette.burgundy,
  danger: '#B00020',
  success: '#3C7A4B',
};

export interface TextProps extends RNTextProps {
  /** Type-scale role. Defaults to `body`. */
  variant?: TypeRole;
  /** Semantic color. Overridden by an explicit `color`. */
  tone?: Tone;
  /** Explicit color override (use sparingly; prefer `tone`). */
  color?: string;
  center?: boolean;
}

/**
 * The single text primitive. Always renders through the type scale and caps
 * Dynamic Type per role, so typography stays consistent and accessible.
 * Replaces ad-hoc `fontSize`/`fontFamily` on raw RN <Text>.
 */
export function Text({ variant = 'body', tone = 'default', color, center, style, maxFontSizeMultiplier, ...rest }: TextProps) {
  const spec = typography[variant];
  const base: TextStyle = {
    fontFamily: spec.fontFamily,
    fontSize: spec.fontSize,
    lineHeight: spec.lineHeight,
    letterSpacing: spec.letterSpacing,
    color: color ?? TONE_COLOR[tone],
  };
  if (spec.textTransform) base.textTransform = spec.textTransform;
  if (center) base.textAlign = 'center';

  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? spec.maxScale}
      style={[base, style]}
      {...rest}
    />
  );
}
