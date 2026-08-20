import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { ok, created } from '../../utils/respond.js';
import { publicOrder } from '../../presenters/order.js';
import { paymentProvider, isMockProvider } from './providers/index.js';
import {
  createCheckoutSession,
  settleOrderPaid,
  settleOrderFailed,
  findOrderBySession,
} from './service.js';

export const checkoutSchema = z.object({
  orderId: z.coerce.number().int().positive(),
});

export const mockSettleSchema = z.object({
  sessionId: z.string().min(1).max(190),
  outcome: z.enum(['success', 'failure']),
  // Optional so a caller can force a duplicate delivery and observe idempotency.
  eventId: z.string().min(1).max(190).optional(),
});

export const paymentRoutes = Router();

/** POST /api/payment/checkout-session */
paymentRoutes.post(
  '/checkout-session',
  authenticate,
  validate({ body: checkoutSchema }),
  asyncHandler(async (req, res) =>
    created(res, await createCheckoutSession(req.user, req.body.orderId)),
  ),
);

/**
 * POST /api/payment/mock/settle — DEVELOPMENT ONLY
 *
 * Stands in for the gateway's webhook. It is deliberately unauthenticated,
 * because that is the shape a real webhook has, which keeps the settlement path
 * we exercise here identical to the one a real provider will drive.
 *
 * An endpoint that marks orders paid without taking money is a free-checkout
 * exploit if it ever reaches production, so it is guarded three ways:
 *
 *   1. this route is only registered when PAYMENT_PROVIDER === 'mock';
 *   2. env validation refuses to boot with mock while NODE_ENV=production;
 *   3. a test asserts it 404s when the provider is anything else.
 */
if (isMockProvider) {
  paymentRoutes.post(
    '/mock/settle',
    validate({ body: mockSettleSchema }),
    asyncHandler(async (req, res) => {
      const event = paymentProvider.parseEvent(req.body);
      const order = await findOrderBySession(event.sessionId);

      const settle = event.type === 'payment.succeeded' ? settleOrderPaid : settleOrderFailed;

      const { order: settled, alreadyProcessed } = await settle({
        orderId: order.id,
        paymentRef: event.paymentRef,
        eventId: event.eventId,
        provider: paymentProvider.name,
      });

      return ok(res, {
        // Lets a caller (and our tests) see that a replay changed nothing.
        alreadyProcessed,
        order: publicOrder(settled),
      });
    }),
  );
}

export default paymentRoutes;
