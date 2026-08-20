import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireAdmin, requireSelfOrAdmin } from '../../middleware/requireRole.js';
import {
  userListQuerySchema,
  createUserSchema,
  userIdParamSchema,
  addressBodySchema,
  addressUpdateSchema,
  addressParamsSchema,
} from './schema.js';
import {
  index,
  show,
  store,
  update,
  destroy,
  indexAddresses,
  storeAddress,
  updateAddressHandler,
  destroyAddress,
} from './controller.js';

export const userRoutes = Router();

// Every route below requires a valid token.
userRoutes.use(authenticate);

// Collection — admin only.
userRoutes
  .route('/')
  .get(requireAdmin, validate({ query: userListQuerySchema }), index)
  .post(requireAdmin, validate({ body: createUserSchema }), store);

/**
 * Single user — self or admin.
 *
 * GET is gated too, which is stricter than backend-spec.md §7 (it allowed any
 * authenticated caller). Reading another customer's email and addresses is a
 * privacy leak, so ownership is required here as well.
 *
 * The update body is validated inside the controller, which chooses between the
 * self and admin schemas — see controller.js.
 */
userRoutes
  .route('/:id')
  .get(validate({ params: userIdParamSchema }), requireSelfOrAdmin(), show)
  .put(validate({ params: userIdParamSchema }), requireSelfOrAdmin(), update)
  .delete(requireAdmin, validate({ params: userIdParamSchema }), destroy);

// Address sub-resource — self or admin throughout.
userRoutes
  .route('/:id/addresses')
  .get(validate({ params: userIdParamSchema }), requireSelfOrAdmin(), indexAddresses)
  .post(
    validate({ params: userIdParamSchema, body: addressBodySchema }),
    requireSelfOrAdmin(),
    storeAddress,
  );

userRoutes
  .route('/:id/addresses/:addressId')
  .put(
    validate({ params: addressParamsSchema, body: addressUpdateSchema }),
    requireSelfOrAdmin(),
    updateAddressHandler,
  )
  .delete(
    validate({ params: addressParamsSchema }),
    requireSelfOrAdmin(),
    destroyAddress,
  );

export default userRoutes;
