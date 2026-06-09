import { api } from './client';
import type { Subscription, SubscriptionPlan, SubscriptionStore } from './types';

export const subscriptionsApi = {
  getMine() {
    return api.get<Subscription>('/subscriptions/me').then((r) => r.data);
  },

  /** Begin payment. Returns {mode:'stripe'|'dev', client_secret?, publishable_key?, amount, currency}. */
  checkout(plan: SubscriptionPlan) {
    return api
      .post<{ mode: string; client_secret: string | null; publishable_key: string | null; amount: number | null; currency: string }>(
        '/subscriptions/checkout',
        null,
        { params: { plan } }
      )
      .then((r) => r.data);
  },

  purchase(plan: SubscriptionPlan, store: SubscriptionStore = 'stripe', receiptData = 'dev-receipt') {
    return api
      .post<Subscription>('/subscriptions', { plan, store, receipt_data: receiptData })
      .then((r) => r.data);
  },

  cancel() {
    return api.post('/subscriptions/cancel').then((r) => r.data);
  },
};
