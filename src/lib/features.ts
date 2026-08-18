import { Platform } from 'react-native';

/**
 * Per-capability payment flags. The stores' rules differ by what is being
 * bought, so one global switch cannot work:
 *
 * - Subscriptions (Premium/Gold) are digital goods: Google/Apple REQUIRE
 *   native billing. Both are integrated: Play Billing on Android
 *   (src/lib/playBilling.ts) and StoreKit on iOS (src/lib/appleBilling.ts).
 *   Never show a Stripe sheet for these on either store or the app gets
 *   rejected.
 *
 * - Donations to the Marriage Support Fund are charitable giving, which
 *   both stores exempt from native billing: Stripe's PaymentSheet is
 *   allowed and used on both platforms.
 *
 * - Meeting fees pay for a real-world service (consumed outside the app),
 *   also exempt: Stripe PaymentSheet.
 *
 * - Boosts are digital consumables: they need native billing plus
 *   server-side one-time-product validation, which is not built yet.
 *   Keep hidden everywhere.
 */
export const SUBSCRIPTIONS_ENABLED =
  Platform.OS === 'android' || Platform.OS === 'ios';
export const DONATIONS_ENABLED = true;
export const MEETING_FEES_ENABLED = true;
export const BOOSTS_ENABLED = false;

/** @deprecated superseded by the per-capability flags above. */
export const PAYMENTS_ENABLED = false;
