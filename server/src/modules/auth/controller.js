import { asyncHandler } from '../../middleware/asyncHandler.js';
import { ok, created } from '../../utils/respond.js';
import { registerUser, loginUser, getProfile } from './service.js';

/** POST /api/auth/register */
export const register = asyncHandler(async (req, res) => {
  const result = await registerUser(req.body);
  return created(res, result);
});

/** POST /api/auth/login */
export const login = asyncHandler(async (req, res) => {
  const result = await loginUser(req.body);
  return ok(res, result);
});

/** GET /api/auth/profile */
export const profile = asyncHandler(async (req, res) => {
  const user = await getProfile(req.user.id);
  return ok(res, user);
});

/**
 * POST /api/auth/logout
 *
 * Stateless JWTs mean the server holds nothing to invalidate — the client discards
 * the token. This endpoint exists to give clients one place to call, and to be the
 * obvious hook if we later add a denylist or refresh-token revocation.
 */
export const logout = asyncHandler(async (_req, res) => {
  return ok(res, { message: 'Logged out successfully' });
});
