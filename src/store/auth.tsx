import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { authApi } from '@/api/auth';
import { setAccountBlockedHandler, setUnauthorizedHandler, setVerificationRequiredHandler } from '@/api/client';
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
  verifyRequired: boolean; // phone/email/id not yet all verified
  signIn: (tokens: TokenResponse) => Promise<void>;
  signOut: () => Promise<void>;
  clearBlock: () => void;
  clearVerify: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Whether any verification step is still pending for this account, or null
 * when it cannot be determined right now (offline, expired session) - in that
 * case the API gate's 403 handler flips the flag later instead.
 *
 * This must be known BEFORE status turns signedIn: the navigator routes on
 * both together. Discovering it lazily via the first rejected API call sent
 * fresh members into the app for a beat, showed the verification hub, then
 * Discover's "no profile yet" redirect yanked them off it a second later.
 */
async function fetchVerifyRequired(): Promise<boolean | null> {
  try {
    const me = await authApi.me();
    return (
      (me.phone_verification_required && !me.phone_verified) ||
      !me.email_verified ||
      !me.is_selfie_verified ||
      me.under_review
    );
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [userId, setUserId] = useState<string | null>(null);
  const [block, setBlock] = useState<AccountBlock | null>(null);
  const [verifyRequired, setVerifyRequired] = useState(false);

  // Restore session on cold start.
  useEffect(() => {
    (async () => {
      const token = await tokenStore.getAccess();
      setUserId(jwtSub(token));
      if (token) {
        const v = await fetchVerifyRequired();
        if (v !== null) setVerifyRequired(v);
      }
      setStatus(token ? 'signedIn' : 'signedOut');
    })();
  }, []);

  const signIn = useCallback(async (tokens: TokenResponse) => {
    await tokenStore.save(tokens.access_token, tokens.refresh_token);
    setUserId(jwtSub(tokens.access_token));
    setBlock(null);
    const v = await fetchVerifyRequired();
    if (v !== null) setVerifyRequired(v);
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
    setVerifyRequired(false);
    setStatus('signedOut');
  }, []);

  const clearBlock = useCallback(() => setBlock(null), []);
  const clearVerify = useCallback(() => setVerifyRequired(false), []);

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
    // The member is signed in but hasn't finished phone/email/id verification.
    setVerificationRequiredHandler(() => setVerifyRequired(true));
    return () => {
      setUnauthorizedHandler(null);
      setAccountBlockedHandler(null);
      setVerificationRequiredHandler(null);
    };
  }, []);

  const value = useMemo(
    () => ({ status, userId, block, verifyRequired, signIn, signOut, clearBlock, clearVerify }),
    [status, userId, block, verifyRequired, signIn, signOut, clearBlock, clearVerify],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
