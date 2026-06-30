import { api } from './client';
import type { SubscriptionPlan } from './types';

/** A unified inbox row: a match chat, the support thread, or a meeting coordination thread. */
export interface InboxItem {
  kind: 'chat' | 'support' | 'meeting';
  id: string;
  title: string;
  /** The real last-message preview. */
  subtitle: string;
  avatar_url: string | null;
  /** The chat partner's active PAID tier (premium/gold) for the badge; chat rows only. */
  plan?: SubscriptionPlan | null;
  last_at: string | null;
  unread: number;
  /** An expo-router pathname: '/chat/[id]' | '/support' | '/meeting/[id]/chat'. */
  route: string;
  /** The value for the [id] param; null for support. */
  param_id: string | null;
}

export const inboxApi = {
  /** Already sorted by recent activity on the server. */
  list() {
    return api.get<InboxItem[]>('/inbox').then((r) => r.data);
  },

  /** Total unread across all chats. */
  unread() {
    return api.get<{ count: number }>('/inbox/unread').then((r) => r.data);
  },
};
