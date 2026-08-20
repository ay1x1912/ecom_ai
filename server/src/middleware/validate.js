import { z } from 'zod';

/**
 * Zod validation for body / params / query.
 *
 * Two details do real work here:
 *
 * 1. We REASSIGN req[key] to the parsed result. That means downstream code sees
 *    coerced types (page is a number, not "1") and — critically — unknown keys
 *    are stripped. That stripping is our mass-assignment defence: a client can
 *    POST `role: "admin"` all it likes, it never reaches the model.
 *
 * 2. Query strings are always strings, so query schemas need z.coerce.
 */
export const validate = (schemas) => (req, res, next) => {
  for (const key of ['body', 'params', 'query']) {
    const schema = schemas[key];
    if (!schema) continue;

    const result = schema.safeParse(req[key]);

    if (!result.success) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          fields: result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
      });
    }

    req[key] = result.data;
  }

  return next();
};

/**
 * Shared pagination/sorting query schema.
 *
 * perPage is capped deliberately: without a ceiling, ?perPage=1000000 is a free
 * denial-of-service. `sortable` is an allow-list because interpolating a
 * user-supplied column into ORDER BY is an injection vector that parameterised
 * queries do not cover.
 */
export const listQuerySchema = (sortable = ['createdAt']) =>
  z.object({
    page: z.coerce.number().int().positive().default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.enum(sortable).default(sortable[0]),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
    search: z.string().trim().min(1).max(120).optional(),
  });

/** Numeric route id, coerced and validated. */
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
