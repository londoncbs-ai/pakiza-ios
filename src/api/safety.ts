import { api } from './client';

export type ReportReason =
  | 'spam'
  | 'fake_profile'
  | 'harassment'
  | 'inappropriate_content'
  | 'underage'
  | 'scam'
  | 'other';

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'harassment', label: 'Harassment or abuse' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'spam', label: 'Spam or scam' },
  { value: 'fake_profile', label: 'Fake profile' },
  { value: 'scam', label: 'Asking for money' },
  { value: 'other', label: 'Something else' },
];

export const safetyApi = {
  report(reportedUserId: string, reason: ReportReason, description?: string, messageId?: string) {
    return api
      .post('/safety/reports', {
        reported_user_id: reportedUserId,
        reason,
        description: description || undefined,
        message_id: messageId || undefined,
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
