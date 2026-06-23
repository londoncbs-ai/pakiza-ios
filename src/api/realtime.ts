import { API_BASE_URL } from './config';

/**
 * The global per-user WebSocket. The server streams one frame per notification:
 *   { "type": "notification", "payload": { id, type, title, body, payload, created_at } }
 * where the inner `payload` is the deep-link object (screen, conversation_id,
 * meeting_id, tab, ...). The socket is read-only; any text sent is a keepalive.
 *
 * ws://<host>:8000/v1/ws/user?ticket=<single-use ticket>
 */
export function userSocketUrl(ticket: string): string {
  const ws = API_BASE_URL.replace(/^http/, 'ws');
  return `${ws}/v1/ws/user?ticket=${encodeURIComponent(ticket)}`;
}
