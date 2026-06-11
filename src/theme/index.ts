export { colors, palette, tint, surfaces, hexA } from './colors';
export { fonts } from './fonts';
export { typography } from './typography';
export type { TypeRole, TypeSpec } from './typography';
export { springs, durations } from './motion';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Radius scale - one coherent set, no more `radii.sm + 4` arithmetic. */
export const radii = {
  xs: 8,
  sm: 10,
  md: 12,
  input: 14, // text fields, steppers, pickers
  lg: 16,
  card: 20,
  pill: 999,
} as const;

/** A fully-rounded radius for an avatar/circle of a given size. */
export const avatarRadius = (size: number) => size / 2;

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
  /** Reserved for content floating over photography (e.g. the introduction card). */
  photo: {
    shadowColor: '#3D0010',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;
