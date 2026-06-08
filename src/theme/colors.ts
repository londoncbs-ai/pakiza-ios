/**
 * Pakiza brand palette — burgundy + gold, warm and editorial.
 * Mirrors the Visual Identity spec.
 */
export const palette = {
  burgundy: '#800020', // primary
  gold: '#C79F5E', // accent
  sand: '#D2B48C', // light surface
  sienna: '#A0522D', // supporting warm
  navy: '#1A2B3D', // dark surface / CTA
  cream: '#F5F0E6', // app light background
  white: '#FFFFFF',

  // derived shades
  burgundyDark: '#5C0017',
  burgundyDeep: '#3D0010',
  goldSoft: '#E2C892',
  ink: '#2A1A1E', // near-black warm text
  muted: '#8A7B72', // secondary text on light
  line: '#E6DCCB', // hairline on cream
  overlay: 'rgba(26,16,18,0.55)',
} as const;

export const colors = {
  primary: palette.burgundy,
  accent: palette.gold,
  surface: palette.cream,
  card: palette.white,
  dark: palette.navy,

  textOnDark: palette.cream,
  textOnLight: palette.ink,
  textMutedOnLight: palette.muted,
  textMutedOnDark: 'rgba(245,240,230,0.7)',

  like: palette.burgundy,
  pass: palette.muted,
  superlike: palette.gold,

  danger: '#B00020',
  success: '#3C7A4B',
} as const;
