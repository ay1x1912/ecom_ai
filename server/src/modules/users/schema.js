import { z } from 'zod';
import { listQuerySchema, idParamSchema } from '../../middleware/validate.js';

const ROLES = ['admin', 'user', 'deliveryman'];

const name = z.string().trim().min(2).max(120);
const email = z.string().trim().toLowerCase().email().max(190);
const password = z.string().min(8, 'Password must be at least 8 characters').max(128);
const avatar = z.string().url().max(500).nullable();

export const addressBodySchema = z.object({
  street: z.string().trim().min(1).max(255),
  city: z.string().trim().min(1).max(120),
  country: z.string().trim().min(1).max(120),
  postalCode: z.string().trim().min(1).max(20),
  note: z.string().trim().max(255).optional(),
  isDefault: z.boolean().optional(),
});

/** Update sends a subset; every field optional, but at least one required. */
export const addressUpdateSchema = addressBodySchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

export const userListQuerySchema = listQuerySchema(['createdAt', 'name', 'email']).extend({
  role: z.enum(ROLES).optional(),
});

/**
 * Admin-created users MAY set a role — this is the legitimate place for role
 * assignment, unlike public registration where the field is stripped entirely.
 */
export const createUserSchema = z.object({
  name,
  email,
  password,
  role: z.enum(ROLES).default('user'),
  addresses: z.array(addressBodySchema).max(10).optional(),
});

/**
 * Two update schemas for one route.
 *
 * The self schema has NO role field, so a user cannot promote themselves even
 * though they are legitimately allowed to edit their own record. The controller
 * picks the schema from the caller's role. This is the second half of the fix for
 * backend-spec.md defect #2 — the ownership check is the first half.
 */
const updateCommon = {
  name: name.optional(),
  email: email.optional(),
  password: password.optional(),
  avatar: avatar.optional(),
};

export const updateUserSelfSchema = z
  .object(updateCommon)
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

export const updateUserAdminSchema = z
  .object({ ...updateCommon, role: z.enum(ROLES).optional() })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

export const userIdParamSchema = idParamSchema;

export const addressParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  addressId: z.coerce.number().int().positive(),
});
