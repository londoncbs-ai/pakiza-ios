import { api } from './client';

export type ReportReason =
  | 'spam'
  | 'fake_profile'
  | 'harassment'
  | 'inappropriate_content'
  | 'underage'
  | 'scam'
  | 'other';

export const safetyApi = {
  report(reportedUserId: string, reason: ReportReason, description?: string) {
    return api
      .post('/safety/reports', {
        reported_user_id: reportedUserId,
        reason,
        description: description || undefined,
      })
      .then((r) => r.data);
  },

  block(userId: string) {
    return api.post(`/safety/blocks/${userId}`).then((r) => r.data);
  },

  unblock(userId: string) {
    return api.delete(`/safety/blocks/${userId}`).then((r) => r.data);
  },

  listBlocks() {
    return api.get<string[]>('/safety/blocks').then((r) => r.data);
  },
};
