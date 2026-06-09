export { colors, palette } from './colors';

/** Font families - keys match the names registered in the root layout's useFonts(). */
export const fonts = {
  display: 'Cormorant', // Cormorant Garamond (serif) - headings & wordmark
  displaySemibold: 'CormorantSemibold',
  body: 'Inter', // sans - UI & body
  bodyMedium: 'InterMedium',
  bodySemibold: 'InterSemibold',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  card: 16,
  pill: 999,
  sm: 10,
} as const;

export const shadow = {
  card: {
    shadowColor: '#3D0010',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  soft: {
    shadowColor: '#3D0010',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;
