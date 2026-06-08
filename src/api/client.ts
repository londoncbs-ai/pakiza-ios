/**
 * Axios instance with JWT handling:
 *  • attaches the access token to every request
 *  • on a 401, transparently rotates the refresh token once and retries
 *  • if refresh fails, fires onUnauthorized() so the app can sign out
 */
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

import { API_V1 } from './config';
import { tokenStore } from '@/lib/storage';
import type { TokenResponse } from './types';

export const api = axios.create({
  baseURL: API_V1,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Registered by the AuthProvider so the client can force a sign-out.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

api.interceptors.request.use(async (config) => {
  const token = await tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh_token = await tokenStore.getRefresh();
  if (!refresh_token) return null;
  try {
    // bare axios (not `api`) to avoid the interceptor recursing
    const { data } = await axios.post<TokenResponse>(`${API_V1}/auth/refresh`, {
      refresh_token,
    });
    await tokenStore.save(data.access_token, data.refresh_token);
    return data.access_token;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retried?: boolean };
    const status = error.response?.status;

    if (status === 401 && original && !original._retried) {
      original._retried = true;
      refreshing = refreshing ?? refreshAccessToken();
      const newToken = await refreshing;
      refreshing = null;

      if (newToken) {
        original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
        return api(original);
      }
      await tokenStore.clear();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

/** Pull a human-readable message out of a FastAPI error response. */
export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  const e = err as AxiosError<{ detail?: unknown }>;
  const detail = e?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  if (e?.message === 'Network Error') {
    return 'Cannot reach the server. Is the backend running and on the same Wi-Fi?';
  }
  return fallback;
}
