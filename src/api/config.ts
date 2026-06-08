/**
 * API configuration.
 *
 * The dev backend runs on your Mac at port 8000. We default to the Mac's
 * LAN IP so the same URL works from the iOS simulator, Android emulator,
 * AND a physical phone on the same Wi-Fi (Expo Go).
 *
 * Override at runtime with EXPO_PUBLIC_API_URL if your IP changes.
 */
const LAN_API = 'http://192.168.168.244:8000';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? LAN_API;

export const API_V1 = `${API_BASE_URL}/v1`;
