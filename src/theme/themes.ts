/**
 * Light + dark semantic color schemes. Brand hues (burgundy / gold) stay
 * constant across both - only the surfaces and text adapt. Light uses a clean
 * white base (not the old cream); dark uses a warm near-black so the burgundy
 * and gold still feel at home.
 *
 * Components read these via useTheme().c - never hardcode bg/text/border.
 */
export interface ThemeColors {
  scheme: 'light' | 'dark';
  // backgrounds
  bg: string;            // app background
  surface: string;       // cards, sheets
  surfaceAlt: string;    // wells, inputs, pressed rows, secondary cards
  surfaceSunken: string; // deepest recessed fill
  // text
  text: string;          // primary
  textMuted: string;     // secondary
  textSubtle: string;    // tertiary / captions
  textOnAccent: string;  // text on burgundy/gold fills
  // lines & overlays
  border: string;        // hairlines
  borderStrong: string;  // dividers, outlined controls
  overlay: string;       // modal scrim
  // brand accent (burgundy family) - the primary highlight color. Gold is now
  // reserved for the logo only; use `accent` for labels, icons, selected states.
  accent: string;        // solid accent for icons / labels / highlights
  accentFaint: string;   // accent wash behind chips/icons
  goldFaint: string;     // gold wash (rare)
  // status
  danger: string;
  success: string;
}

export const lightColors: ThemeColors = {
  scheme: 'light',
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F6F3EE',
  surfaceSunken: '#EFEAE2',
  text: '#1F1714',
  textMuted: '#6E5F57',
  textSubtle: '#9A8E84',
  textOnAccent: '#FBF7EF',
  border: '#ECE5DA',
  borderStrong: '#DCD2C5',
  overlay: 'rgba(31,23,20,0.45)',
  accent: '#800020',
  accentFaint: 'rgba(128,0,32,0.07)',
  goldFaint: 'rgba(199,159,94,0.12)',
  danger: '#B00020',
  success: '#2F7D52',
};

export const darkColors: ThemeColors = {
  scheme: 'dark',
  bg: '#131011',
  surface: '#1D1819',
  surfaceAlt: '#272021',
  surfaceSunken: '#0E0B0C',
  text: '#F3ECE2',
  textMuted: '#B7AAA0',
  textSubtle: '#857A72',
  textOnAccent: '#FBF7EF',
  border: '#322A2B',
  borderStrong: '#463C3D',
  overlay: 'rgba(0,0,0,0.6)',
  // Pure burgundy is too dark to read on a dark surface, so the dark-mode accent
  // is a lighter rose drawn from the same red family.
  accent: '#D2697A',
  accentFaint: 'rgba(210,105,122,0.14)',
  goldFaint: 'rgba(199,159,94,0.14)',
  danger: '#E5707F',
  success: '#5FB783',
};

export const schemes = { light: lightColors, dark: darkColors } as const;
