/**
 * Native Stripe PaymentSheet wrapper for the flows where Stripe is
 * store-policy-compliant: charitable donations and meeting fees (real-world
 * services). Digital goods (subscriptions, boosts) must NEVER come through
 * here - they use native store billing.
 *
 * The backend checkout endpoints return {mode, client_secret,
 * publishable_key}. In 'stripe' mode we present the PaymentSheet and give
 * back the payment_intent_id for the server-side confirm/verify step. In
 * 'dev' mode (no Stripe keys locally) there is nothing to present.
 */

export type StripeCheckoutSession = {
  mode: string;
  client_secret: string | null;
  publishable_key: string | null;
};

/** Error thrown when the member closes the sheet without paying. */
export class PaymentCancelledError extends Error {
  constructor() {
    super('Payment cancelled');
    this.name = 'PaymentCancelledError';
  }
}

/**
 * Present the PaymentSheet for a checkout session. Resolves with the
 * payment_intent_id to send to the confirm endpoint (null in dev mode).
 */
export async function presentStripePayment(
  session: StripeCheckoutSession,
): Promise<string | null> {
  if (session.mode !== 'stripe') return null;
  if (!session.client_secret || !session.publishable_key) {
    throw new Error('Payment session is incomplete');
  }

  const stripe = require('@stripe/stripe-react-native');

  await stripe.initStripe({ publishableKey: session.publishable_key });

  const init = await stripe.initPaymentSheet({
    paymentIntentClientSecret: session.client_secret,
    merchantDisplayName: 'Pakiza',
  });
  if (init.error) throw new Error(init.error.message);

  const result = await stripe.presentPaymentSheet();
  if (result.error) {
    if (result.error.code === 'Canceled') throw new PaymentCancelledError();
    throw new Error(result.error.message);
  }

  // client_secret is "pi_xxx_secret_yyy"; the confirm endpoints want the
  // PaymentIntent id.
  return session.client_secret.split('_secret')[0];
}
