import { ZodError } from 'zod';
import {
  UniqueConstraintError,
  ForeignKeyConstraintError,
  ValidationError as SequelizeValidationError,
  DatabaseError,
} from 'sequelize';
import { AppError } from '../utils/AppError.js';
import { isProduction } from '../config/env.js';

/**
 * Friendly messages for our named unique constraints.
 *
 * Needed because Sequelize surfaces a composite index's *constraint name* as the
 * error path, so the raw value ("cart_items_cart_product_unique") is not something
 * to show a client. Keys must match the constraint names in src/migrations.
 */
const UNIQUE_CONSTRAINT_MESSAGES = {
  cart_items_cart_product_unique: 'That product is already in the cart',
  wishlist_items_user_product_unique: 'That product is already in the wishlist',
  product_ratings_product_user_unique: 'You have already reviewed this product',
  email: 'An account with this email already exists',
  users_email: 'An account with this email already exists',
  name: 'A record with this name already exists',
  slug: 'A record with this slug already exists',
  order_number: 'That order number already exists',
  payment_event_id: 'That payment event has already been processed',
};

/**
 * Single place where every error becomes a response.
 *
 * Mapping Sequelize's error classes explicitly is what retires the "bad id gives
 * a 500 cast error" problem (backend-spec.md defect #9) across the whole API
 * instead of endpoint by endpoint.
 */
// eslint-disable-next-line no-unused-vars -- Express identifies error middleware by arity
export const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let fields;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    fields = err.fields;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    fields = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
  } else if (err instanceof UniqueConstraintError) {
    statusCode = 409;
    // Sequelize's own message here is just "Validation error", so we build our
    // own. Note that for a COMPOSITE unique index, err.errors[].path is the
    // constraint NAME, not a column — hence the lookup table.
    const paths = err.errors?.map((e) => e.path).filter(Boolean) ?? [];
    const known = paths.map((p) => UNIQUE_CONSTRAINT_MESSAGES[p]).filter(Boolean);

    if (known.length) {
      message = known[0];
    } else if (paths.length && paths.every((p) => !p.includes('_unique'))) {
      message = `A record with this ${paths.join(', ')} already exists`;
    } else {
      message = 'That record already exists';
    }

    fields = paths.map((p) => ({ path: p, message: 'must be unique' }));
  } else if (err instanceof ForeignKeyConstraintError) {
    /**
     * Two opposite causes share this error class, and conflating them produces a
     * message that describes neither:
     *
     *   1452 ER_NO_REFERENCED_ROW_2  — inserting a row pointing at a missing parent
     *   1451 ER_ROW_IS_REFERENCED_2  — deleting a parent that children still use
     *
     * The second is a conflict with existing state, not a malformed request.
     */
    const code = err.parent?.code;

    if (code === 'ER_ROW_IS_REFERENCED_2' || err.parent?.errno === 1451) {
      statusCode = 409;
      message = 'This record is still in use by other records and cannot be deleted';
    } else {
      statusCode = 400;
      message = 'A referenced record does not exist';
    }
  } else if (err instanceof SequelizeValidationError) {
    statusCode = 400;
    message = 'Validation failed';
    fields = err.errors?.map((e) => ({ path: e.path, message: e.message }));
  } else if (err instanceof DatabaseError) {
    // Log the detail, return something generic — never leak SQL to a client.
    statusCode = 500;
    message = 'Database error';
  } else if (err?.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Malformed JSON body';
  } else if (err?.message === 'Not allowed by CORS') {
    statusCode = 403;
    message = 'Origin not allowed';
  }

  if (statusCode >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  }

  const body = { error: { message } };
  if (fields?.length) body.error.fields = fields;
  if (!isProduction && statusCode >= 500) body.error.stack = err?.stack;

  res.status(statusCode).json(body);
};
