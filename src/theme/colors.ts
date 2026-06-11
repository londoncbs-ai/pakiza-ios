/**
 * Pakiza brand palette - burgundy + gold, warm and editorial.
 * Mirrors the Visual Identity spec.
 */

/**
 * Apply an alpha channel to a hex color. The single source of truth for
 * translucency - replaces the ad-hoc rgba() literals that used to be
 * scattered across components. Accepts #RGB or #RRGGBB.
 */
export function hexA(hex: string, alpha: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

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
  rose: '#D2697A', // lighter red, for accents on dark surfaces (over photos / dark overlays)
  goldSoft: '#E2C892',
  ink: '#2A1A1E', // near-black warm text
  muted: '#6E5F57', // secondary text on light (darkened from #8A7B72 to meet WCAG AA)
  line: '#E6DCCB', // hairline on cream
  overlay: 'rgba(26,16,18,0.55)',
} as const;

/**
 * Named translucency + surface tints. Every alpha brand color flows from here
 * so there are no raw rgba() literals in component files.
 */
export const tint = {
  burgundyFaint: hexA(palette.burgundy, 0.06), // chip / row fills on cream
  burgundySoft: hexA(palette.burgundy, 0.1),
  burgundyMed: hexA(palette.burgundy, 0.18),
  goldFaint: hexA(palette.gold, 0.12),
  goldSoft: hexA(palette.gold, 0.22),
  goldStrong: hexA(palette.gold, 0.95),
  lineSoft: hexA(palette.ink, 0.06),
  onDarkSoft: hexA(palette.cream, 0.7),
  onDarkFaint: hexA(palette.cream, 0.45),
  overlaySoft: hexA(palette.burgundyDeep, 0.2),
  overlayStrong: hexA(palette.burgundyDeep, 0.55),
  // Bottom-up scrim for photos: transparent at top, deep burgundy at base.
  scrim: [hexA(palette.burgundyDeep, 0), hexA(palette.burgundyDeep, 0.25), hexA(palette.burgundyDeep, 0.85)] as const,
} as const;

/** Tonal elevation - three surface tones rather than stacked shadows. */
export const surfaces = {
  base: palette.cream, // app background
  raised: palette.white, // cards, sheets
  sunken: '#EDE4D3', // wells, inputs, pressed rows
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
  textMutedOnDark: tint.onDarkSoft,

  like: palette.burgundy,
  pass: palette.muted,
  superlike: palette.gold,

  danger: '#B00020',
  success: '#3C7A4B',
} as const;
