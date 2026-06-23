import { api } from './client';
import type {
  Application,
  ApplicationInput,
  Donation,
  DonationCheckout,
  DonationCheckoutInput,
  Donor,
  FundSummary,
  ImpactEntry,
  PayoutDetails,
} from './types';

export const givingApi = {
  /** Begin a donation. Returns {mode, client_secret?, publishable_key?, amount?, currency, donation_id}. */
  donateCheckout(body: DonationCheckoutInput) {
    return api.post<DonationCheckout>('/giving/donations/checkout', body).then((r) => r.data);
  },

  confirmDonation(donationId: string, paymentIntentId?: string) {
    return api
      .post<Donation>(`/giving/donations/${donationId}/confirm`, {
        payment_intent_id: paymentIntentId,
      })
      .then((r) => r.data);
  },

  myDonations() {
    return api.get<Donation[]>('/giving/donations/mine').then((r) => r.data);
  },

  fund() {
    return api.get<FundSummary>('/giving/fund').then((r) => r.data);
  },

  /** The donor wall - recent gifts; anonymous ones carry no name. */
  donors() {
    return api.get<Donor[]>('/giving/donors').then((r) => r.data);
  },

  /** Published funded-marriage stories (with images). */
  stories() {
    return api.get<ImpactEntry[]>('/giving/stories').then((r) => r.data);
  },

  apply(body: ApplicationInput) {
    return api.post<Application>('/giving/applications', body).then((r) => r.data);
  },

  myApplications() {
    return api.get<Application[]>('/giving/applications/mine').then((r) => r.data);
  },

  application(id: string) {
    return api.get<Application>(`/giving/applications/${id}`).then((r) => r.data);
  },

  /** Add or update the bank/payout details for one of my applications. */
  updatePayout(id: string, body: PayoutDetails) {
    return api.patch<Application>(`/giving/applications/${id}/payout`, body).then((r) => r.data);
  },
};
