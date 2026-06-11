import type { TextStyle } from 'react-native';

import { fonts } from './fonts';

/**
 * One type scale, eight named roles. Replaces the 33 ad-hoc fontSizes that
 * used to live inline across screens. Anchored at 16px body on a Major Third
 * (1.25) rhythm. Serif (Cormorant) is reserved for display/title/heading;
 * everything functional uses Inter.
 *
 * Use via the <Text variant="..."> primitive, never by reaching for a raw size.
 */
export type TypeRole =
  | 'display'
  | 'title'
  | 'heading'
  | 'subhead'
  | 'body'
  | 'callout'
  | 'footnote'
  | 'label';

export interface TypeSpec {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  /** Cap on Dynamic Type scaling. Display lines stay tight; body text can grow more. */
  maxScale: number;
  textTransform?: TextStyle['textTransform'];
}

export const typography: Record<TypeRole, TypeSpec> = {
  // Editorial serif - reserved for the largest moments only.
  display: { fontFamily: fonts.display, fontSize: 40, lineHeight: 46, letterSpacing: 0.2, maxScale: 1.2 },
  title: { fontFamily: fonts.displaySemibold, fontSize: 30, lineHeight: 36, letterSpacing: 0.2, maxScale: 1.2 },
  heading: { fontFamily: fonts.displaySemibold, fontSize: 22, lineHeight: 28, letterSpacing: 0.2, maxScale: 1.25 },
  // Functional sans.
  subhead: { fontFamily: fonts.bodySemibold, fontSize: 17, lineHeight: 24, letterSpacing: 0.1, maxScale: 1.4 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, letterSpacing: 0, maxScale: 1.4 },
  callout: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, letterSpacing: 0, maxScale: 1.4 },
  footnote: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18, letterSpacing: 0.2, maxScale: 1.4 },
  label: {
    fontFamily: fonts.bodySemibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    maxScale: 1.3,
    textTransform: 'uppercase',
  },
} as const;
