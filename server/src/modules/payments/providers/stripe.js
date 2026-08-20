/**
 * Placeholder so the app can boot with PAYMENT_PROVIDER=stripe and prove that the
 * mock settlement route is not registered. Implementing this is Phase 12.7:
 * fill in these two methods, add the signature-verified webhook route, and delete
 * the mock route. Nothing in the order flow changes.
 */
const notImplemented = () => {
  throw new Error(
    'Stripe provider is not implemented yet. See implementation.md 12.7.',
  );
};

export const stripeProvider = {
  name: 'stripe',
  createCheckoutSession: notImplemented,
  parseEvent: notImplemented,
};
