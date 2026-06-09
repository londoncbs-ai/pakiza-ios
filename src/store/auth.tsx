import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { authApi } from '@/api/auth';
import { setUnauthorizedHandler } from '@/api/client';
import { tokenStore } from '@/lib/storage';
import { jwtSub } from '@/lib/jwt';
import type { TokenResponse } from '@/api/types';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: Status;
  userId: string | null;
  signIn: (tokens: TokenResponse) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [userId, setUserId] = useState<string | null>(null);

  // Restore session on cold start.
  useEffect(() => {
    (async () => {
      const token = await tokenStore.getAccess();
      setUserId(jwtSub(token));
      setStatus(token ? 'signedIn' : 'signedOut');
    })();
  }, []);

  const signIn = useCallback(async (tokens: TokenResponse) => {
    await tokenStore.save(tokens.access_token, tokens.refresh_token);
    setUserId(jwtSub(tokens.access_token));
    setStatus('signedIn');
  }, []);

  const signOut = useCallback(async () => {
    const refresh = await tokenStore.getRefresh();
    if (refresh) {
      try {
        await authApi.logout(refresh);
      } catch {
        // ignore — clearing local tokens below is what matters
      }
    }
    await tokenStore.clear();
    setUserId(null);
    setStatus('signedOut');
  }, []);

  // Let the axios client force a sign-out when refresh fails.
  useEffect(() => {
    setUnauthorizedHandler(() => setStatus('signedOut'));
    return () => setUnauthorizedHandler(null);
  }, []);

  const value = useMemo(() => ({ status, userId, signIn, signOut }), [status, userId, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
