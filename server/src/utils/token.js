import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * The payload carries the user id and NOTHING else.
 *
 * A JWT payload is base64, not encryption — anyone holding the token can read it.
 * The source project initially signed the whole user object and shipped the
 * password hash inside every token. Only the subject goes in; everything else is
 * looked up from the database on each request.
 */
export const signAuthToken = (userId) =>
  jwt.sign({ sub: String(userId) }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

export const verifyAuthToken = (token) => jwt.verify(token, env.JWT_SECRET);
