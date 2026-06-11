/**
 * Motion tokens. Calm by default; the bouncy `joy` spring is reserved for the
 * single celebratory moment (mutual interest), never for routine UI.
 * Pair with useReducedMotion() to swap springs for short fades.
 */
export const springs = {
  calm: { damping: 20, stiffness: 200, mass: 1 },
  joy: { damping: 14, stiffness: 180, mass: 1 },
} as const;

export const durations = {
  fast: 150,
  base: 220,
  slow: 320,
} as const;
