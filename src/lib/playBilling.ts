/**
 * Google Play Billing subscription purchases (Android only).
 *
 * Policy note: on Android, digital subscriptions MUST go through Play
 * Billing - never Stripe. The flow: request the purchase via the Play
 * sheet, send the resulting purchase token to the backend, which verifies
 * it against the Play Developer API (subscriptionsv2) and activates the
 * plan, then acknowledge the purchase. Unacknowledged purchases are
 * auto-refunded by Google after 3 days, so acknowledge only after the
 * backend has accepted the token.
 *
 * The library is required lazily so this module is inert on iOS and in
 * environments without the native billing module.
 */
import { Platform } from 'react-native';

import { subscriptionsApi } from '../api/subscriptions';
import type { Subscription, SubscriptionPlan } from '../api/types';

/** Play Console product ids. Must match GOOGLE_PLAY_PRODUCT_* on the backend. */
export const PLAY_SKUS: Partial<Record<SubscriptionPlan, string>> = {
  premium: 'pakiza_premium_monthly',
  gold: 'pakiza_gold_monthly',
};

export function playBillingAvailable(): boolean {
  return Platform.OS === 'android';
}

/**
 * Run the full purchase flow for a plan. Resolves with the activated
 * subscription from the backend, or rejects with a user-presentable Error.
 */
export async function purchasePlaySubscription(
  plan: SubscriptionPlan,
): Promise<Subscription> {
  if (!playBillingAvailable()) throw new Error('Play Billing is Android only');
  const sku = PLAY_SKUS[plan];
  if (!sku) throw new Error('This plan cannot be purchased yet');

  const IAP = require('react-native-iap');

  await IAP.initConnection();
  try {
    const products = await IAP.fetchProducts({ skus: [sku], type: 'subs' });
    if (!products?.length) {
      throw new Error('This plan is not available on Google Play right now');
    }

    const purchase: any = await new Promise((resolve, reject) => {
      const subs: Array<{ remove: () => void }> = [];
      const cleanup = () => subs.forEach((s) => s.remove());
      subs.push(
        IAP.purchaseUpdatedListener((p: any) => {
          cleanup();
          resolve(p);
        }),
      );
      subs.push(
        IAP.purchaseErrorListener((e: any) => {
          cleanup();
          const cancelled =
            e?.code === 'E_USER_CANCELLED' || e?.code === 'user-cancelled';
          reject(new Error(cancelled ? 'cancelled' : e?.message || 'Purchase failed'));
        }),
      );
      IAP.requestPurchase({ request: { google: { skus: [sku] } }, type: 'subs' }).catch(
        (err: any) => {
          cleanup();
          reject(err);
        },
      );
    });

    const token: string | null =
      purchase?.purchaseToken ?? purchase?.purchaseTokenAndroid ?? null;
    if (!token) throw new Error('Google Play returned no purchase token');

    // Server-side verification + plan activation. Must succeed BEFORE we
    // acknowledge, so a failed activation is auto-refunded by Google.
    const subscription = await subscriptionsApi.purchase(plan, 'play_store', token);

    await IAP.finishTransaction({ purchase, isConsumable: false });
    return subscription;
  } finally {
    try {
      await IAP.endConnection();
    } catch {
      // Ignore teardown failures; connection is per-flow.
    }
  }
}

/**
 * Restore: re-validate the newest Play subscription purchase with the
 * backend (e.g. after reinstall). No-op resolve(null) when there is
 * nothing to restore.
 */
export async function restorePlaySubscription(): Promise<Subscription | null> {
  if (!playBillingAvailable()) return null;
  const IAP = require('react-native-iap');
  await IAP.initConnection();
  try {
    const purchases: any[] = (await IAP.getAvailablePurchases()) ?? [];
    const bySku = purchases.filter((p) =>
      Object.values(PLAY_SKUS).includes(p?.productId ?? p?.ids?.[0]),
    );
    if (!bySku.length) return null;
    const newest = bySku.sort(
      (a, b) => (b?.transactionDate ?? 0) - (a?.transactionDate ?? 0),
    )[0];
    const token = newest?.purchaseToken ?? newest?.purchaseTokenAndroid;
    if (!token) return null;
    const plan: SubscriptionPlan =
      (newest?.productId ?? '') === PLAY_SKUS.gold ? 'gold' : 'premium';
    return await subscriptionsApi.purchase(plan, 'play_store', token);
  } finally {
    try {
      await IAP.endConnection();
    } catch {
      // Ignore teardown failures.
    }
  }
}
