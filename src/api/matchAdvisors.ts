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

  checkoutDeposit(requestId: string) {
    return api.post<import('@/lib/stripeSheet').StripeCheckoutSession>(`/match-advisors/requests/${requestId}/deposit-checkout`).then((r) => r.data);
  },

  confirmDeposit(requestId: string, paymentIntentId?: string | null) {
    return api.post<MatchAdvisorRequest>(`/match-advisors/requests/${requestId}/deposit-confirm`, { payment_intent_id: paymentIntentId }).then((r) => r.data);
  },

  checkoutFinal(requestId: string) {
    return api.post<import('@/lib/stripeSheet').StripeCheckoutSession>(`/match-advisors/requests/${requestId}/final-checkout`).then((r) => r.data);
  },

  confirmFinal(requestId: string, paymentIntentId?: string | null) {
    return api.post<MatchAdvisorRequest>(`/match-advisors/requests/${requestId}/final-confirm`, { payment_intent_id: paymentIntentId }).then((r) => r.data);
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


  updateRequest(requestId: string, input: any) {
    return api.patch<MatchAdvisorRequest>(`/match-advisors/requests/${requestId}`, input).then((r) => r.data);
  },

  deleteRequest(requestId: string) {
    return api.delete(`/match-advisors/requests/${requestId}`).then((r) => r.data);
  },

  updateOffer(offerId: string, input: any) {
    return api.patch<MatchAdvisorOffer>(`/match-advisors/offers/${offerId}`, input).then((r) => r.data);
  },

  deleteOffer(offerId: string) {
    return api.delete(`/match-advisors/offers/${offerId}`).then((r) => r.data);
  },

  getReceivedOffers() {
    return api.get<MatchAdvisorOffer[]>('/match-advisors/offers/received').then((r) => r.data);
  },
  completeOffer(offerId: string, rating: number) {
    return api.post<MatchAdvisorOffer>(`/match-advisors/offers/${offerId}/complete?rating=${rating}`).then((r) => r.data);
  },
};

/**
 * Every non-terminal request status. Anything not in TERMINAL_SEARCH_STATUSES
 * counts against the platform's one-search-at-a-time policy, including
 * 'reviewing' and 'offered' - a member waiting on a decision, or waiting to
 * accept an offer, still has a search open. Getting this wrong lets someone
 * book a second advisor while their first request is still pending, which is
 * exactly what the policy exists to prevent.
 */
const TERMINAL_SEARCH_STATUSES = new Set(['completed', 'cancelled', 'expired']);

export function isOngoingSearchStatus(status?: string | null): boolean {
  return !!status && !TERMINAL_SEARCH_STATUSES.has(status.toLowerCase());
}

/** The one ongoing request, if any - the single source of truth for "does this member already have a search open?" */
export function findOngoingRequest(requests: MatchAdvisorRequest[]): MatchAdvisorRequest | null {
  return requests.find((r) => isOngoingSearchStatus(r.status)) ?? null;
}

export const getSearchStatusConfig = (status?: string) => {
  switch (status?.toLowerCase()) {
    case 'open':
      return {
        label: 'Awaiting an advisor',
        short: 'PENDING',
        color: '#8A7B72',
        bg: 'rgba(138, 123, 114, 0.12)',
        icon: 'hourglass-outline' as const,
        needsAction: false,
      };
    case 'reviewing':
      return {
        label: 'Under review',
        short: 'REVIEWING',
        color: '#8A7B72',
        bg: 'rgba(138, 123, 114, 0.12)',
        icon: 'search-outline' as const,
        needsAction: false,
      };
    case 'offered':
      return {
        label: 'New offer - your review needed',
        short: 'NEW OFFER',
        color: '#C79F5E',
        bg: 'rgba(199, 159, 94, 0.16)',
        icon: 'mail-unread' as const,
        needsAction: true,
      };
    case 'accepted':
      return {
        label: 'Advisor engaged',
        short: 'ENGAGED',
        color: '#800020',
        bg: 'rgba(128, 0, 32, 0.1)',
        icon: 'checkmark-circle' as const,
        needsAction: false,
      };
    case 'active':
      return {
        label: 'Search in progress',
        short: 'IN PROGRESS',
        color: '#2f7d52',
        bg: 'rgba(47, 125, 82, 0.12)',
        icon: 'compass' as const,
        needsAction: false,
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        short: 'CANCELLED',
        color: '#b00020',
        bg: 'rgba(176, 0, 32, 0.1)',
        icon: 'close-circle' as const,
        needsAction: false,
      };
    case 'completed':
      return {
        label: 'Spouse found',
        short: 'COMPLETE',
        color: '#C79F5E',
        bg: 'rgba(199, 159, 94, 0.16)',
        icon: 'heart-circle' as const,
        needsAction: false,
      };
    case 'expired':
      return {
        label: 'Inactive',
        short: 'INACTIVE',
        color: '#8A7B72',
        bg: 'rgba(138, 123, 114, 0.12)',
        icon: 'time' as const,
        needsAction: false,
      };
    default:
      return {
        label: 'In progress',
        short: 'ACTIVE',
        color: '#800020',
        bg: 'rgba(128, 0, 32, 0.1)',
        icon: 'ellipse' as const,
        needsAction: false,
      };
  }
};

export const getSearchDisplayTitle = (req: MatchAdvisorRequest) => {
  if (
    req.request_title &&
    !['private matchmaking search', 'private search'].includes(req.request_title.trim().toLowerCase())
  ) {
    return req.request_title;
  }
  if (req.advisor_name) {
    return `Search with ${req.advisor_name}${req.preferred_location ? ` • ${req.preferred_location}` : ''}`;
  }
  if (req.preferred_location) {
    return `Search • ${req.preferred_location}`;
  }
  return 'Personal Matchmaking Case';
};
