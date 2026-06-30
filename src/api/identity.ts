import { api } from './client';

export interface IdentityStart {
  provider: string;
  mode: string; // 'live' | 'dev'
  status: string;
  session_id: string | null;
  session_token: string | null;
  url: string | null; // hosted capture page to open
}

export interface IdentityStatus {
  is_id_verified: boolean;
  status: string | null;
  provider: string | null;
  document_type: string | null;
  document_country: string | null;
  decided_at: string | null;
}

export const identityApi = {
  /** Begin a document ID verification (Didit). Returns a hosted URL to open. */
  start() {
    return api.post<IdentityStart>('/identity/verify').then((r) => r.data);
  },
  /** Current ID-verification status / badge. */
  status() {
    return api.get<IdentityStatus>('/identity/me').then((r) => r.data);
  },
};
