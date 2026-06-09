import { api } from './client';
import type { Subscription, SubscriptionPlan, SubscriptionStore } from './types';

export const subscriptionsApi = {
  getMine() {
    return api.get<Subscription>('/subscriptions/me').then((r) => r.data);
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
