import { api } from './client';
import type {
  MatchAdvisorOffer,
  MatchAdvisorOfferInput,
  MatchAdvisorProfile,
  MatchAdvisorProfileInput,
  MatchAdvisorRequest,
  MatchAdvisorRequestInput,
} from './types';

export const matchAdvisorsApi = {
  listVerifiedAdvisors() {
    return api.get<MatchAdvisorProfile[]>('/match-advisors/advisors').then((r) => r.data);
  },

  getMyProfile() {
    return api.get<MatchAdvisorProfile>('/match-advisors/advisors/me').then((r) => r.data).catch((err) => {
      if (err?.response?.status === 404) return null;
      throw err;
    });
  },

  createProfile(input: MatchAdvisorProfileInput) {
    return api.post<MatchAdvisorProfile>('/match-advisors/advisors', input).then((r) => r.data);
  },

  submitVerification(input: { id_document_type: string; id_document_url: string; selfie_photo_url: string; consent_confirmed: boolean }) {
    return api.post<MatchAdvisorProfile>('/match-advisors/advisors/verification', input).then((r) => r.data);
  },

  createRequest(input: MatchAdvisorRequestInput) {
    return api.post<MatchAdvisorRequest>('/match-advisors/requests', input).then((r) => r.data);
  },

  getMyRequests() {
    return api.get<MatchAdvisorRequest[]>('/match-advisors/requests/me').then((r) => r.data);
  },

  getRequest(requestId: string) {
    return api.get<MatchAdvisorRequest>(`/match-advisors/requests/${requestId}`).then((r) => r.data);
  },

  listOffers(requestId: string) {
    return api.get<MatchAdvisorOffer[]>(`/match-advisors/requests/${requestId}/offers`).then((r) => r.data);
  },

  getOffer(offerId: string) {
    return api.get<MatchAdvisorOffer>(`/match-advisors/offers/${offerId}`).then((r) => r.data);
  },

  acceptOffer(offerId: string, accepted = true) {
    return api.post<MatchAdvisorOffer>(`/match-advisors/offers/${offerId}/accept`, { accepted }).then((r) => r.data);
  },

  payOffer(offerId: string, feePence: number) {
    return api.post<MatchAdvisorOffer>(`/match-advisors/offers/${offerId}/pay`, { fee_pence: feePence }).then((r) => r.data);
  },

  createOffer(input: MatchAdvisorOfferInput) {
    return api.post<MatchAdvisorOffer>('/match-advisors/offers', input).then((r) => r.data);
  },

  getOfferMessages(offerId: string) {
    return api.get<import('./types').MatchAdvisorOfferMessage[]>(`/match-advisors/offers/${offerId}/messages`).then((r) => r.data);
  },

  sendOfferMessage(offerId: string, input: import('./types').MatchAdvisorOfferMessageInput) {
    return api.post<import('./types').MatchAdvisorOfferMessage>(`/match-advisors/offers/${offerId}/messages`, input).then((r) => r.data);
  },
};
