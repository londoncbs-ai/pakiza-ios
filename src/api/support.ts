import { api } from './client';
import { API_BASE_URL } from './config';
import type { SupportChatMessage, SupportThread } from './types';

export const supportApi = {
  /** My support thread + history (creates one on first use). */
  thread() {
    return api.get<SupportThread>('/support-chat').then((r) => r.data);
  },
  send(body: string) {
    return api.post<SupportChatMessage>('/support-chat', { body }).then((r) => r.data);
  },
  markRead() {
    return api.patch('/support-chat/read').then((r) => r.data);
  },
};

/** ws://<host>:8000/v1/support-chat/ws/{thread_id}?ticket=<single-use ticket> */
export function supportSocketUrl(threadId: string, ticket: string): string {
  const ws = API_BASE_URL.replace(/^http/, 'ws');
  return `${ws}/v1/support-chat/ws/${threadId}?ticket=${encodeURIComponent(ticket)}`;
}
