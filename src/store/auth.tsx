import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { authApi } from '@/api/auth';
import { setAccountBlockedHandler, setUnauthorizedHandler } from '@/api/client';
import { tokenStore } from '@/lib/storage';
import { jwtSub } from '@/lib/jwt';
import type { TokenResponse } from '@/api/types';

type Status = 'loading' | 'signedOut' | 'signedIn';

/** Set when the server reports the account is no longer usable. */
export interface AccountBlock {
  state: string; // 'banned' | 'deactivated' | 'deleted'
  message: string;
}

interface AuthContextValue {
  status: Status;
  userId: string | null;
  block: AccountBlock | null;
  signIn: (tokens: TokenResponse) => Promise<void>;
  signOut: () => Promise<void>;
  clearBlock: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [userId, setUserId] = useState<string | null>(null);
  const [block, setBlock] = useState<AccountBlock | null>(null);

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
    setBlock(null);
    setStatus('signedIn');
  }, []);

  const signOut = useCallback(async () => {
    const refresh = await tokenStore.getRefresh();
    if (refresh) {
      try {
        await authApi.logout(refresh);
      } catch {
        // ignore - clearing local tokens below is what matters
      }
    }
    await tokenStore.clear();
    setUserId(null);
    setBlock(null);
    setStatus('signedOut');
  }, []);

  const clearBlock = useCallback(() => setBlock(null), []);

  // Wire the axios client: force a sign-out when refresh fails, and surface an
  // account-state block (banned / deactivated / deleted) as a blocked screen.
  useEffect(() => {
    setUnauthorizedHandler(() => setStatus('signedOut'));
    setAccountBlockedHandler(async (state, message) => {
      // Drop the now-useless tokens, but keep status so the navigator routes to
      // the blocked screen (which explains why) rather than the sign-in flow.
      await tokenStore.clear();
      setBlock({ state, message });
    });
    return () => {
      setUnauthorizedHandler(null);
      setAccountBlockedHandler(null);
    };
  }, []);

  const value = useMemo(
    () => ({ status, userId, block, signIn, signOut, clearBlock }),
    [status, userId, block, signIn, signOut, clearBlock],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
