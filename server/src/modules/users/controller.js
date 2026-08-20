import { asyncHandler } from '../../middleware/asyncHandler.js';
import { ok, created, noContent } from '../../utils/respond.js';
import { badRequest } from '../../utils/AppError.js';
import { updateUserSelfSchema, updateUserAdminSchema } from './schema.js';
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} from './service.js';
import {
  listAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
} from './addressService.js';

/** GET /api/users — admin */
export const index = asyncHandler(async (req, res) => {
  const { users, meta } = await listUsers(req.query);
  return ok(res, users, meta);
});

/** GET /api/users/:id — self or admin */
export const show = asyncHandler(async (req, res) => {
  return ok(res, await getUser(req.params.id));
});

/** POST /api/users — admin */
export const store = asyncHandler(async (req, res) => {
  return created(res, await createUser(req.body));
});

/**
 * PUT /api/users/:id — self or admin
 *
 * The body is validated HERE rather than in the route, because which schema
 * applies depends on the caller: admins may set `role`, users may not. Validating
 * one permissive schema at the route and filtering afterwards is how privilege
 * escalation bugs get in.
 */
export const update = asyncHandler(async (req, res) => {
  const schema = req.user.role === 'admin' ? updateUserAdminSchema : updateUserSelfSchema;
  const result = schema.safeParse(req.body);

  if (!result.success) {
    throw badRequest(
      'Validation failed',
      result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }

  return ok(res, await updateUser(req.params.id, result.data));
});

/** DELETE /api/users/:id — admin */
export const destroy = asyncHandler(async (req, res) => {
  await deleteUser(req.params.id);
  return ok(res, { message: 'User deleted successfully' });
});

/** GET /api/users/:id/addresses — self or admin */
export const indexAddresses = asyncHandler(async (req, res) => {
  return ok(res, await listAddresses(req.params.id));
});

/** POST /api/users/:id/addresses — self or admin */
export const storeAddress = asyncHandler(async (req, res) => {
  return created(res, await addAddress(req.params.id, req.body));
});

/** PUT /api/users/:id/addresses/:addressId — self or admin */
export const updateAddressHandler = asyncHandler(async (req, res) => {
  const { id, addressId } = req.params;
  return ok(res, await updateAddress(id, addressId, req.body));
});

/** DELETE /api/users/:id/addresses/:addressId — self or admin */
export const destroyAddress = asyncHandler(async (req, res) => {
  const { id, addressId } = req.params;
  await deleteAddress(id, addressId);
  return noContent(res);
});
