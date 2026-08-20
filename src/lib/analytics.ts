/**
 * Meta (Facebook) analytics.
 *
 * A thin, crash-proof layer over react-native-fbsdk-next: the rest of the app
 * never touches the SDK directly, and analytics can never break a user flow.
 * The native module is required lazily (like lib/stripeSheet.ts) so a build
 * without it - Expo Go, web - simply no-ops instead of crashing at import.
 *
 * initAnalytics() runs once at startup. On iOS it asks for App Tracking
 * Transparency and tells the SDK whether it may use the advertising identifier,
 * then initializes the SDK. App install / app activate events flow automatically
 * from there (autoLogAppEventsEnabled in app.json); business events (sign-up,
 * verified, subscribe/purchase) are logged explicitly via the helpers below.
 */
import { Platform } from 'react-native';

let started = false;

function fbsdk(): any | null {
  try {
    return require('react-native-fbsdk-next');
  } catch {
    return null; // native module absent (Expo Go / web)
  }
}

export async function initAnalytics(): Promise<void> {
  if (started) return;
  started = true;
  const fb = fbsdk();
  if (!fb) return;
  try {
    if (Platform.OS === 'ios') {
      // The SDK may only attach the IDFA once the member allows tracking.
      const { requestTrackingPermissionsAsync } = await import('expo-tracking-transparency');
      const { status } = await requestTrackingPermissionsAsync();
      fb.Settings.setAdvertiserTrackingEnabled(status === 'granted');
    }
    fb.Settings.initializeSDK();
  } catch {
    // Analytics must never block or crash the app.
  }
}

/** Log a standard or custom Meta app event. Safe to call anywhere. */
export function logEvent(
  name: string,
  valueToSum?: number,
  params?: Record<string, string | number>,
): void {
  const fb = fbsdk();
  if (!fb) return;
  try {
    if (valueToSum != null && params) fb.AppEventsLogger.logEvent(name, valueToSum, params);
    else if (valueToSum != null) fb.AppEventsLogger.logEvent(name, valueToSum);
    else if (params) fb.AppEventsLogger.logEvent(name, params);
    else fb.AppEventsLogger.logEvent(name);
  } catch {
    /* ignore */
  }
}

/** Log a purchase for value optimization (amount in major units, e.g. pounds). */
export function logPurchase(
  amount: number,
  currency = 'GBP',
  params?: Record<string, string | number>,
): void {
  const fb = fbsdk();
  if (!fb) return;
  try {
    fb.AppEventsLogger.logPurchase(amount, currency, params);
  } catch {
    /* ignore */
  }
}

function stdName(key: string, fallback: string): string {
  const fb = fbsdk();
  return fb?.AppEventsLogger?.AppEvents?.[key] ?? fallback;
}

// ── Funnel events (drive the campaign) ────────────────────────────────────────
// Standard events use the SDK's canonical names so Ads Manager can optimize for
// them; a custom "Verified" event marks the matrimonial identity check.

/** A new member finished registration. */
export function logRegistration(): void {
  logEvent(stdName('CompletedRegistration', 'fb_mobile_complete_registration'));
}

/** A member passed the face verification check (custom, high-intent milestone). */
export function logVerified(): void {
  logEvent('Verified');
}

/**
 * A subscription was purchased. Logs both Subscribe (subs-only optimization)
 * and a Purchase value event tagged type=subscription (so Purchase covers all
 * value). Amount is in pounds.
 */
export function logSubscribe(amountPounds: number, plan: string): void {
  logEvent(stdName('Subscribe', 'Subscribe'), amountPounds, { fb_currency: 'GBP', plan });
  logPurchase(amountPounds, 'GBP', { type: 'subscription', plan });
}

/**
 * A donation to the Marriage Support Fund succeeded. Logs both Donate
 * (donations-only optimization) and a Purchase value event tagged
 * type=donation. Amount is in pounds.
 */
export function logDonation(amountPounds: number): void {
  logEvent(stdName('Donate', 'Donate'), amountPounds, { fb_currency: 'GBP' });
  logPurchase(amountPounds, 'GBP', { type: 'donation' });
}
