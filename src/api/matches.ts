import { api } from './client';
import type { MatchSummary, SwipeResult } from './types';

export const matchesApi = {
  like(userId: string, superlike = false) {
    return api
      .post<SwipeResult>(`/matches/like/${userId}`, null, { params: { superlike } })
      .then((r) => r.data);
  },

  pass(userId: string) {
    return api.post<SwipeResult>(`/matches/pass/${userId}`).then((r) => r.data);
  },

  list(page = 1, pageSize = 20) {
    return api
      .get<MatchSummary[]>('/matches', { params: { page, page_size: pageSize } })
      .then((r) => r.data);
  },

  unmatch(matchId: string) {
    return api.delete(`/matches/${matchId}`).then((r) => r.data);
  },
};
