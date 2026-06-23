import { api } from './client';
import { API_BASE_URL } from './config';
import type { ChatMessage, Conversation, MessageType } from './types';

/** Body for sending a message - text, an image, or a voice note. */
export interface SendMessageInput {
  type: MessageType;
  content?: string | null;
  media_s3_key?: string | null;
  media_duration_secs?: number | null;
  reply_to_id?: string | null;
}

/** Result of uploading a chat attachment - the stored key plus a presigned GET url. */
export interface MediaUploadResult {
  media_s3_key: string;
  media_url: string;
}

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

  /**
   * Send a message. Pass a string for a quick text message, or an input object
   * for image / voice / replies: { type, content?, media_s3_key?, media_duration_secs?, reply_to_id? }.
   */
  sendMessage(id: string, input: string | SendMessageInput) {
    const body: SendMessageInput =
      typeof input === 'string' ? { type: 'text', content: input } : input;
    return api
      .post<ChatMessage>(`/conversations/${id}/messages`, body)
      .then((r) => r.data);
  },

  /**
   * Upload a chat attachment (multipart). `fileUri` is a local file URI from the
   * image picker / audio recorder. Images are moderated server-side; audio is not.
   * Returns the stored S3 key (to attach to a message) plus a presigned GET url.
   */
  uploadMedia(convId: string, fileUri: string, mimeType: string, fileName: string) {
    const form = new FormData();
    form.append('file', { uri: fileUri, name: fileName, type: mimeType } as any);
    return api
      .post<MediaUploadResult>(`/conversations/${convId}/media`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  markRead(id: string) {
    return api.patch(`/conversations/${id}/read`).then((r) => r.data);
  },
};

/** ws://<host>:8000/v1/conversations/ws/chat/{id}?ticket=<single-use ticket> */
export function chatSocketUrl(conversationId: string, ticket: string): string {
  const ws = API_BASE_URL.replace(/^http/, 'ws');
  return `${ws}/v1/conversations/ws/chat/${conversationId}?ticket=${encodeURIComponent(ticket)}`;
}
