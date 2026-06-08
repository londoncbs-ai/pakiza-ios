/**
 * API configuration.
 *
 * In development the backend runs on your Mac at port 8000. Rather than hard-code
 * the Mac's LAN IP (which changes whenever you switch network / DHCP renews), we
 * derive it from the host Expo is already serving the app from — that host IS your
 * Mac on the LAN, so the API and Metro always share the same address.
 *
 * Resolution order:
 *   1. EXPO_PUBLIC_API_URL (explicit override, e.g. a deployed backend)
 *   2. the Expo dev host (Metro) → http://<that-ip>:8000   ← normal dev case
 *   3. LAN_API fallback constant
 */
import Constants from 'expo-constants';

const BACKEND_PORT = 8000;
const LAN_API = 'http://192.168.3.125:8000'; // last-resort fallback

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function hostFromExpo(): string | null {
  // Covers Expo Go (debuggerHost) and dev-client (hostUri) across SDK versions.
  const C = Constants as any;
  const candidates: unknown[] = [
    C.expoConfig?.hostUri,
    C.expoGoConfig?.debuggerHost,
    C.manifest2?.extra?.expoGo?.debuggerHost,
    C.manifest?.debuggerHost,
  ];
  for (const c of candidates) {
    const host = typeof c === 'string' ? c.split(':')[0] : null;
    // Only trust a real LAN IPv4 — reject localhost and tunnel domains
    // (e.g. *.exp.direct), which can't reach the backend on :8000.
    if (host && IPV4.test(host) && host !== '127.0.0.1') return host;
  }
  return null;
}

function resolveBaseUrl(): string {
  const override = process.env.EXPO_PUBLIC_API_URL;
  if (override) return override.replace(/\/$/, '');

  const host = hostFromExpo();
  if (host) return `http://${host}:${BACKEND_PORT}`;

  return LAN_API;
}

export const API_BASE_URL = resolveBaseUrl();
export const API_V1 = `${API_BASE_URL}/v1`;

// Visible in the Metro/Expo terminal logs — confirms which host the app is calling.
console.log('[Pakiza] API base URL →', API_BASE_URL);
