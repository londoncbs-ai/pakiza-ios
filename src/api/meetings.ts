import { api } from './client';
import type {
  AcceptMeetingInput,
  CreateMeetingInput,
  MeetingCheckout,
  MeetingFeePayer,
  MeetingMessage,
  MeetingRequest,
  MeetingStatus,
} from './types';

export const meetingsApi = {
  create(body: CreateMeetingInput) {
    return api.post<MeetingRequest>('/meetings', body).then((r) => r.data);
  },

  listMine(status?: MeetingStatus) {
    return api
      .get<MeetingRequest[]>('/meetings/mine', { params: status ? { status } : {} })
      .then((r) => r.data);
  },

  get(id: string) {
    return api.get<MeetingRequest>(`/meetings/${id}`).then((r) => r.data);
  },

  accept(id: string, wali: AcceptMeetingInput) {
    return api.post<MeetingRequest>(`/meetings/${id}/accept`, wali).then((r) => r.data);
  },

  decline(id: string, reason?: string) {
    return api.post<MeetingRequest>(`/meetings/${id}/decline`, { reason }).then((r) => r.data);
  },

  cancel(id: string, reason?: string) {
    return api.post<MeetingRequest>(`/meetings/${id}/cancel`, { reason }).then((r) => r.data);
  },

  checkout(id: string) {
    return api.post<MeetingCheckout>(`/meetings/${id}/checkout`).then((r) => r.data);
  },

  confirmPaid(id: string, paymentIntentId?: string) {
    return api
      .post<MeetingRequest>(`/meetings/${id}/confirm-paid`, { payment_intent_id: paymentIntentId })
      .then((r) => r.data);
  },

  /** Choose who pays the fee. Allowed only while nobody has paid and the fee is not waived. */
  setPayment(id: string, feePayer: MeetingFeePayer) {
    return api
      .post<MeetingRequest>(`/meetings/${id}/payment`, { fee_payer: feePayer })
      .then((r) => r.data);
  },

  /** The coordination thread: both members + the Pakiza team. */
  listMessages(id: string) {
    return api.get<MeetingMessage[]>(`/meetings/${id}/messages`).then((r) => r.data);
  },

  postMessage(id: string, body: string) {
    return api.post<MeetingMessage>(`/meetings/${id}/messages`, { body }).then((r) => r.data);
  },

  /** Mark the coordination thread read so its unread count clears. */
  markThreadRead(id: string) {
    return api.post<{ message: string }>(`/meetings/${id}/messages/read`).then((r) => r.data);
  },
};
