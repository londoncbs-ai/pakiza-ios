/**
 * Secure token storage. Wraps expo-secure-store (Keychain / Keystore) on
 * native and falls back to localStorage on web (where SecureStore is absent).
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS = 'pakiza.access_token';
const REFRESH = 'pakiza.refresh_token';

const isWeb = Platform.OS === 'web';

async function setItem(key: string, value: string) {
  if (isWeb) {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (isWeb) return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string) {
  if (isWeb) {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const tokenStore = {
  async save(accessToken: string, refreshToken: string) {
    await Promise.all([setItem(ACCESS, accessToken), setItem(REFRESH, refreshToken)]);
  },
  getAccess: () => getItem(ACCESS),
  getRefresh: () => getItem(REFRESH),
  async clear() {
    await Promise.all([deleteItem(ACCESS), deleteItem(REFRESH)]);
  },
};
