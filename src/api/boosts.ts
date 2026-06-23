import { api } from './client';
import type { BoostCheckout, BoostStatus } from './types';

export const boostsApi = {
  active() {
    return api.get<BoostStatus>('/boosts/active').then((r) => r.data);
  },

  /** Begin a boost. Returns {mode, client_secret?, publishable_key?, amount?, currency, boost_id}. */
  checkout() {
    return api.post<BoostCheckout>('/boosts/checkout').then((r) => r.data);
  },

  confirm(boostId: string, paymentIntentId?: string) {
    return api
      .post<BoostStatus>(`/boosts/${boostId}/confirm`, { payment_intent_id: paymentIntentId })
      .then((r) => r.data);
  },
};
