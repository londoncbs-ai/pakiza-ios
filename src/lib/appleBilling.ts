/**
 * Apple StoreKit subscription purchases (iOS only).
 *
 * Mirrors playBilling.ts: digital subscriptions on iOS MUST go through
 * Apple's billing. Flow: StoreKit purchase sheet -> grab the app receipt ->
 * send it to the backend, which verifies with Apple (verifyReceipt + shared
 * secret) and activates the plan -> finish the transaction. Server-side
 * verification happens BEFORE the transaction is finished, matching the
 * verify-then-acknowledge order used on Android.
 *
 * The library is required lazily so this module is inert on Android and in
 * environments without the native StoreKit module.
 */
import { Platform } from 'react-native';

import { subscriptionsApi } from '../api/subscriptions';
import type { Subscription, SubscriptionPlan } from '../api/types';

/** App Store product ids. Must match APPLE_PRODUCT_* on the backend. */
export const APPLE_SKUS: Partial<Record<SubscriptionPlan, string>> = {
  premium: 'pakiza_premium_monthly',
  gold: 'pakiza_gold_monthly',
};

export function appleBillingAvailable(): boolean {
  return Platform.OS === 'ios';
}

/**
 * Run the full purchase flow for a plan. Resolves with the activated
 * subscription from the backend, or rejects with a user-presentable Error
 * (message 'cancelled' when the member closed the sheet).
 */
export async function purchaseAppleSubscription(
  plan: SubscriptionPlan,
): Promise<Subscription> {
  if (!appleBillingAvailable()) throw new Error('StoreKit is iOS only');
  const sku = APPLE_SKUS[plan];
  if (!sku) throw new Error('This plan cannot be purchased yet');

  const IAP = require('react-native-iap');

  await IAP.initConnection();
  try {
    const products = await IAP.fetchProducts({ skus: [sku], type: 'subs' });
    if (!products?.length) {
      throw new Error('This plan is not available on the App Store right now');
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
      IAP.requestPurchase({ request: { apple: { sku } }, type: 'subs' }).catch(
        (err: any) => {
          cleanup();
          reject(err);
        },
      );
    });

    // The backend's Apple validation consumes the base64 app receipt
    // (latest transaction wins server-side).
    const receipt: string = await IAP.getReceiptDataIOS();
    if (!receipt) throw new Error('The App Store returned no receipt');

    const subscription = await subscriptionsApi.purchase(plan, 'app_store', receipt);

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
 * Restore: re-validate the current App Store receipt with the backend
 * (required by App Review; covers reinstall / device change). Resolves null
 * when there is nothing to restore.
 */
export async function restoreAppleSubscription(): Promise<Subscription | null> {
  if (!appleBillingAvailable()) return null;
  const IAP = require('react-native-iap');
  await IAP.initConnection();
  try {
    const purchases: any[] = (await IAP.getAvailablePurchases()) ?? [];
    const ours = purchases.filter((p) =>
      Object.values(APPLE_SKUS).includes(p?.productId ?? p?.ids?.[0]),
    );
    if (!ours.length) return null;
    const newest = ours.sort(
      (a, b) => (b?.transactionDate ?? 0) - (a?.transactionDate ?? 0),
    )[0];
    const receipt: string = await IAP.getReceiptDataIOS();
    if (!receipt) return null;
    const plan: SubscriptionPlan =
      (newest?.productId ?? '') === APPLE_SKUS.gold ? 'gold' : 'premium';
    return await subscriptionsApi.purchase(plan, 'app_store', receipt);
  } finally {
    try {
      await IAP.endConnection();
    } catch {
      // Ignore teardown failures.
    }
  }
}
