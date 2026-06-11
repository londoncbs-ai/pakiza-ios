import { api } from './client';
import type { EventItem, RSVPStatus } from './types';

export const eventsApi = {
  list(category?: string) {
    return api.get<EventItem[]>('/events', { params: category ? { category } : {} }).then((r) => r.data);
  },

  mine() {
    return api.get<EventItem[]>('/events/mine').then((r) => r.data);
  },

  get(id: string) {
    return api.get<EventItem>(`/events/${id}`).then((r) => r.data);
  },

  rsvp(id: string, status: RSVPStatus = 'going') {
    return api.post<EventItem>(`/events/${id}/rsvp`, { status }).then((r) => r.data);
  },

  cancelRsvp(id: string) {
    return api.delete<EventItem>(`/events/${id}/rsvp`).then((r) => r.data);
  },
};
