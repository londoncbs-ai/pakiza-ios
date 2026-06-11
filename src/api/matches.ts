import { api } from './client';
import type { MatchSummary, PublicProfile, Quota, SwipeResult } from './types';

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

  /** Gold feature — 402 if the user isn't Gold. */
  likesReceived() {
    return api.get<PublicProfile[]>('/matches/likes-received').then((r) => r.data);
  },

  /** How many people have liked you (all tiers) — powers the upsell. */
  likesCount() {
    return api.get<{ count: number }>('/matches/likes-count').then((r) => r.data.count);
  },

  /** Premium feature — 402 if no boosts remaining. */
  boost() {
    return api.post('/matches/boost').then((r) => r.data);
  },

  /** Premium feature — undo last swipe; returns the profile to show again. 402 if free. */
  rewind() {
    return api.post<PublicProfile>('/matches/rewind').then((r) => r.data);
  },

  /** Remaining likes and matches for the current user. */
  quota() {
    return api.get<Quota>('/matches/quota').then((r) => r.data);
  },
};
