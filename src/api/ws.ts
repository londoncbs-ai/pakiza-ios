import { api } from './client';

/**
 * Mint a short-lived, single-use ticket to authenticate a WebSocket connection.
 *
 * The JWT must never go in the WS URL: query strings leak into proxy / server
 * access logs and history. Instead we fetch a one-time ticket (valid ~30s,
 * single-use) over the normal authenticated HTTP client and connect with
 * `?ticket=`. Goes through the same axios instance, so token refresh on 401
 * still applies.
 */
export async function wsTicket(): Promise<string> {
  const { data } = await api.post<{ ticket: string }>('/auth/ws-ticket');
  return data.ticket;
}
