import { forbidden, unauthorized } from '../utils/AppError.js';

/**
 * Role gate. Runs AFTER authenticate.
 *
 * 403, not 401: the caller proved who they are, they simply are not permitted.
 * Collapsing the two makes client-side handling ambiguous — a 401 should prompt
 * re-login, a 403 never should.
 */
export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return next(unauthorized('Not authorized, no token provided'));
    if (!roles.includes(req.user.role)) {
      return next(forbidden(`Not authorized as ${roles.join(' or ')}`));
    }
    return next();
  };

export const requireAdmin = requireRole('admin');

/**
 * Ownership check for user-scoped resources: the user themselves, or an admin.
 *
 * This is the guard the source project wrote and then commented out, which left
 * any authenticated user able to edit any other user (backend-spec.md defect #2).
 */
export const isSelfOrAdmin = (req, targetUserId) =>
  req.user?.role === 'admin' || Number(req.user?.id) === Number(targetUserId);

export const requireSelfOrAdmin = (getTargetId = (req) => req.params.id) => (req, res, next) => {
  if (!req.user) return next(unauthorized('Not authorized, no token provided'));
  if (!isSelfOrAdmin(req, getTargetId(req))) {
    // Wording covers reads as well as writes — this guard protects both.
    return next(forbidden('You may only access your own account'));
  }
  return next();
};
