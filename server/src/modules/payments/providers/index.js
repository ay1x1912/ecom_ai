import { env } from '../../../config/env.js';
import { mockProvider } from './mock.js';
import { stripeProvider } from './stripe.js';

const registry = {
  mock: mockProvider,
  stripe: stripeProvider,
};

/**
 * Selected once, at startup. Nothing outside this folder imports a provider
 * directly — that is what keeps the swap cheap.
 */
export const paymentProvider = registry[env.PAYMENT_PROVIDER];

export const isMockProvider = env.PAYMENT_PROVIDER === 'mock';
