import { passport } from '../config/passport.js';
import { unauthorized } from '../utils/AppError.js';

/**
 * Wraps passport-jwt in a custom callback for two reasons:
 *
 *  1. Passport's default failure response is plain-text "Unauthorized", which
 *     would break our single response envelope.
 *  2. session: false is required — we are stateless, and without it Passport
 *     reaches for session middleware we deliberately do not mount.
 */
export const authenticate = (req, res, next) =>
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      const reason = info?.message ?? '';
      const message = /no auth token/i.test(reason)
        ? 'Not authorized, no token provided'
        : 'Not authorized, token invalid or expired';
      return next(unauthorized(message));
    }

    req.user = user;
    return next();
  })(req, res, next);

/**
 * Attaches req.user when a valid token is present, but does not reject when it is
 * absent. For endpoints that behave differently for signed-in users without
 * requiring it.
 */
export const optionalAuthenticate = (req, res, next) =>
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (err) return next(err);
    if (user) req.user = user;
    return next();
  })(req, res, next);
