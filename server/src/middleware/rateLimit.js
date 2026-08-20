import rateLimit from 'express-rate-limit';
import { isTest } from '../config/env.js';

/**
 * Login is a brute-force target, and registration is a spam target.
 *
 * Disabled under NODE_ENV=test: the suite makes dozens of legitimate logins in
 * seconds and would trip the limiter, turning real assertions into 429s. The
 * limiter is verified separately against a running server.
 */
const build = ({ windowMs, max, message }) =>
  isTest
    ? (req, res, next) => next()
    : rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        // Match the API's error envelope rather than the library's default body.
        handler: (req, res) => res.status(429).json({ error: { message } }),
      });

/** Tight: credential guessing. */
export const loginLimiter = build({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts. Please try again later.',
});

/** Looser, but still bounded: account creation. */
export const registerLimiter = build({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Too many accounts created from this address. Please try again later.',
});
