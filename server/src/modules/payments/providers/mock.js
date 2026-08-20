import { randomUUID } from 'node:crypto';
import { env } from '../../../config/env.js';

/**
 * Mock payment provider.
 *
 * Implements the same interface a real gateway will, so swapping providers is an
 * adapter change rather than a rewrite of the order flow.
 *
 * The session id is persisted on the order as `payment_ref`, so settlement can
 * find the order later without any in-memory state — this survives a restart and
 * needs no cache.
 */
export const mockProvider = {
  name: 'mock',

  async createCheckoutSession(order) {
    const sessionId = `mock_sess_${randomUUID()}`;
    return {
      sessionId,
      // In a real integration this URL belongs to the gateway. Here it points at
      // a page the client app fakes, which then calls /api/payment/mock/settle.
      checkoutUrl: `${env.CLIENT_URL}/mock-checkout?session=${sessionId}&order=${order.orderNumber}`,
    };
  },

  /**
   * Normalise an inbound event into the shape settlement expects.
   * A real provider would verify a signature over the raw body here.
   */
  parseEvent(body) {
    return {
      eventId: body.eventId ?? `mock_evt_${body.sessionId}_${body.outcome}`,
      type: body.outcome === 'success' ? 'payment.succeeded' : 'payment.failed',
      sessionId: body.sessionId,
      paymentRef: body.sessionId,
    };
  },
};
