import { api } from './client';
import type { AppNotification } from './types';

export const notificationsApi = {
  list(unreadOnly = false) {
    return api
      .get<AppNotification[]>('/notifications', { params: { unread_only: unreadOnly } })
      .then((r) => r.data);
  },

  markRead(id: string) {
    return api.patch(`/notifications/${id}/read`).then((r) => r.data);
  },

  markAllRead() {
    return api.post('/notifications/read-all').then((r) => r.data);
  },

  remove(id: string) {
    return api.delete(`/notifications/${id}`).then((r) => r.data);
  },
};
