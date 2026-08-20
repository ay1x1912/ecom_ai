import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { ok, created } from '../../utils/respond.js';
import {
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
} from './service.js';

export const productIdParam = z.object({
  productId: z.coerce.number().int().positive(),
});

export const addItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  // Capped per request so one call cannot try to add a million units.
  quantity: z.coerce.number().int().min(1).max(100).default(1),
});

export const updateItemSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(100),
});

/**
 * The cart is always the caller's own — the user id comes from the token, so there
 * is no :userId in any of these paths and nothing to authorize beyond "logged in".
 */
export const cartRoutes = Router();

cartRoutes.use(authenticate);

cartRoutes.get(
  '/',
  asyncHandler(async (req, res) => ok(res, await getCart(req.user.id))),
);

cartRoutes.post(
  '/',
  validate({ body: addItemSchema }),
  asyncHandler(async (req, res) => created(res, await addItem(req.user.id, req.body))),
);

cartRoutes.put(
  '/:productId',
  validate({ params: productIdParam, body: updateItemSchema }),
  asyncHandler(async (req, res) =>
    ok(res, await updateItemQuantity(req.user.id, req.params.productId, req.body.quantity)),
  ),
);

cartRoutes.delete(
  '/:productId',
  validate({ params: productIdParam }),
  asyncHandler(async (req, res) => ok(res, await removeItem(req.user.id, req.params.productId))),
);

// Clear — declared after /:productId, but distinct enough that order does not matter.
cartRoutes.delete(
  '/',
  asyncHandler(async (req, res) => ok(res, await clearCart(req.user.id))),
);

export default cartRoutes;
