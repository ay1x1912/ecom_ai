/**
 * Errors we raise deliberately, carrying the status the client should see.
 * Anything else reaching the error handler is treated as a 500.
 */
export class AppError extends Error {
  constructor(message, statusCode = 400, fields = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    if (fields) this.fields = fields;
    Error.captureStackTrace?.(this, AppError);
  }
}

export const badRequest = (msg, fields) => new AppError(msg, 400, fields);
export const unauthorized = (msg = 'Not authorized') => new AppError(msg, 401);
export const forbidden = (msg = 'Forbidden') => new AppError(msg, 403);
export const notFoundError = (msg = 'Not found') => new AppError(msg, 404);
export const conflict = (msg) => new AppError(msg, 409);
