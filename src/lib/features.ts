/**
 * v1 ships without in-app purchases. Premium and Boost are digital goods, so
 * both stores require native IAP (StoreKit / Play Billing) for them - the
 * Stripe-based sheets cannot be shown on a store build. Flip this on only
 * once real IAP is integrated and the products exist in App Store Connect
 * and the Play Console.
 *
 * While off: purchase screens redirect away, upsell CTAs are hidden, and
 * meeting-fee payment buttons are hidden (do not attach fees to meetings
 * until this is on).
 */
export const PAYMENTS_ENABLED = false;
