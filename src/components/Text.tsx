import React from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { palette, tint, typography, useTheme, type TypeRole } from '@/theme';

type Tone =
  | 'default'
  | 'muted'
  | 'subtle'
  | 'onDark'
  | 'onDarkMuted'
  | 'gold'
  | 'burgundy'
  | 'danger'
  | 'success';

export interface TextProps extends RNTextProps {
  /** Type-scale role. Defaults to `body`. */
  variant?: TypeRole;
  /** Semantic color, resolved against the active theme. Overridden by `color`. */
  tone?: Tone;
  /** Explicit color override (use sparingly; prefer `tone`). */
  color?: string;
  center?: boolean;
}

/**
 * The single text primitive. Renders through the type scale, caps Dynamic Type
 * per role, and resolves its color from the active theme so text adapts to
 * light/dark automatically. Over-photo tones (onDark*) stay constant.
 */
export function Text({ variant = 'body', tone = 'default', color, center, style, maxFontSizeMultiplier, ...rest }: TextProps) {
  const { c } = useTheme();
  const spec = typography[variant];

  const toneColor: Record<Tone, string> = {
    default: c.text,
    muted: c.textMuted,
    subtle: c.textSubtle,
    onDark: palette.cream,
    onDarkMuted: tint.onDarkSoft,
    gold: palette.gold,
    burgundy: palette.burgundy,
    danger: c.danger,
    success: c.success,
  };

  const base: TextStyle = {
    fontFamily: spec.fontFamily,
    fontSize: spec.fontSize,
    lineHeight: spec.lineHeight,
    letterSpacing: spec.letterSpacing,
    color: color ?? toneColor[tone],
  };
  if (spec.textTransform) base.textTransform = spec.textTransform;
  if (center) base.textAlign = 'center';

  return <RNText maxFontSizeMultiplier={maxFontSizeMultiplier ?? spec.maxScale} style={[base, style]} {...rest} />;
}
