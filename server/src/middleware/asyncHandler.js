/**
 * Express 4 does NOT forward rejected promises to error middleware — an async
 * handler that throws will leave the request hanging until it times out.
 * (Express 5 fixed this; we are pinned to 4.21.2.)
 *
 * Every async route handler must be wrapped in this. It is the easiest way in
 * this codebase to ship a silently broken endpoint.
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
