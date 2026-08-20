import { Router } from 'express';
import { z } from 'zod';
import { ORDER_STATUSES } from '../../models/index.js';
import { validate, listQuerySchema, idParamSchema } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireAdmin } from '../../middleware/requireRole.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { ok, created } from '../../utils/respond.js';
import { publicOrder } from '../../presenters/order.js';
import {
  createOrderFromCart,
  listAllOrders,
  listMyOrders,
  getOrderFor,
  updateOrderStatus,
  deleteOrder,
} from './service.js';

export const createSchema = z.object({
  // Which of the caller's saved addresses to ship to. No prices, no totals, no
  // items — all of that is derived server-side from the cart.
  addressId: z.coerce.number().int().positive(),
});

export const statusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

export const querySchema = listQuerySchema(['createdAt', 'total', 'status']).extend({
  status: z.enum(ORDER_STATUSES).optional(),
});

export const orderRoutes = Router();

orderRoutes.use(authenticate);

/** POST /api/orders — create from the caller's cart. */
orderRoutes.post(
  '/',
  validate({ body: createSchema }),
  asyncHandler(async (req, res) =>
    created(res, publicOrder(await createOrderFromCart(req.user.id, req.body))),
  ),
);

/**
 * GET /api/orders/my — the caller's own orders.
 *
 * Declared before /:id so the literal segment is not captured as an id.
 */
orderRoutes.get(
  '/my',
  validate({ query: querySchema }),
  asyncHandler(async (req, res) => {
    const { rows, meta } = await listMyOrders(req.user.id, req.query);
    return ok(res, rows.map(publicOrder), meta);
  }),
);

/** GET /api/orders — admin only: every order. */
orderRoutes.get(
  '/',
  requireAdmin,
  validate({ query: querySchema }),
  asyncHandler(async (req, res) => {
    const { rows, meta } = await listAllOrders(req.query);
    return ok(res, rows.map(publicOrder), meta);
  }),
);

/** GET /api/orders/:id — owner or admin. */
orderRoutes.get(
  '/:id',
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => ok(res, publicOrder(await getOrderFor(req.user, req.params.id)))),
);

/** PUT /api/orders/:id/status — admin advances; owner may only cancel while pending. */
orderRoutes.put(
  '/:id/status',
  validate({ params: idParamSchema, body: statusSchema }),
  asyncHandler(async (req, res) =>
    ok(res, publicOrder(await updateOrderStatus(req.user, req.params.id, req.body.status))),
  ),
);

/** DELETE /api/orders/:id — admin only. Orders are records; deleting is unusual. */
orderRoutes.delete(
  '/:id',
  requireAdmin,
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    await deleteOrder(req.params.id);
    return ok(res, { message: 'Order deleted successfully' });
  }),
);

export default orderRoutes;
