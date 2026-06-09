import { api } from './client';
import { API_BASE_URL } from './config';
import type { ChatMessage, Conversation } from './types';

export const chatApi = {
  listConversations() {
    return api.get<Conversation[]>('/conversations').then((r) => r.data);
  },

  getConversation(id: string) {
    return api.get<Conversation>(`/conversations/${id}`).then((r) => r.data);
  },

  /** Newest-first from the backend; the screen reverses for display. */
  getMessages(id: string, limit = 50) {
    return api
      .get<ChatMessage[]>(`/conversations/${id}/messages`, { params: { limit } })
      .then((r) => r.data);
  },

  sendMessage(id: string, content: string) {
    return api
      .post<ChatMessage>(`/conversations/${id}/messages`, { type: 'text', content })
      .then((r) => r.data);
  },

  markRead(id: string) {
    return api.patch(`/conversations/${id}/read`).then((r) => r.data);
  },
};

/** ws://<host>:8000/v1/conversations/ws/chat/{id}?token=<jwt> */
export function chatSocketUrl(conversationId: string, token: string): string {
  const ws = API_BASE_URL.replace(/^http/, 'ws');
  return `${ws}/v1/conversations/ws/chat/${conversationId}?token=${encodeURIComponent(token)}`;
}
