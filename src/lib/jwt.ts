/** Minimal, unverified JWT payload decode — only used to read `sub` (user id). */
export function jwtSub(token: string | null): string | null {
  if (!token) return null;
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    // atob is available in Hermes (RN 0.81+).
    const json = typeof atob === 'function' ? atob(b64) : '';
    return JSON.parse(json).sub ?? null;
  } catch {
    return null;
  }
}
