import { z } from 'zod';
import { listQuerySchema, idParamSchema } from '../../middleware/validate.js';

const id = z.coerce.number().int().positive();

export const productBodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).nullable().optional(),
  price: z.coerce.number().nonnegative().max(99_999_999),
  // Capped at 90: 100% would mean free. Matches the DB CHECK constraint.
  discountPercentage: z.coerce.number().int().min(0).max(90).default(0),
  stock: z.coerce.number().int().min(0).default(0),
  image: z.string().url().max(500),
  categoryId: id,
  brandId: id,
});

export const productUpdateSchema = productBodySchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

/**
 * Storefront query contract.
 *
 * sortBy is an enum, not a free string: interpolating a caller-supplied column
 * into ORDER BY is an injection vector that parameterised queries do not cover.
 */
export const productQuerySchema = listQuerySchema([
  'createdAt',
  'name',
  'price',
  'averageRating',
])
  .extend({
    categoryId: id.optional(),
    brandId: id.optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    inStock: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
  })
  .refine((q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice, {
    message: 'minPrice must be less than or equal to maxPrice',
    path: ['minPrice'],
  });

export const productIdParamSchema = idParamSchema;

export const productSlugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(220)
    .regex(/^[a-z0-9-]+$/, 'Invalid slug'),
});
