import { z } from 'zod';

const email = z.string().trim().toLowerCase().email().max(190);
const password = z.string().min(8, 'Password must be at least 8 characters').max(128);

/**
 * Public registration.
 *
 * `role` IS DELIBERATELY ABSENT. z.object strips unknown keys, so a request
 * containing role: "admin" has it silently removed before it reaches the model.
 * That closes the self-promotion hole in the source project, where role came
 * straight from the request body (backend-spec.md defect #1).
 *
 * Roles are assigned by an admin via POST /api/users, or by the seeder.
 */
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  email,
  password,
  // Optional first address, matching the source project's register payload.
  address: z
    .object({
      street: z.string().trim().min(1).max(255),
      city: z.string().trim().min(1).max(120),
      country: z.string().trim().min(1).max(120),
      postalCode: z.string().trim().min(1).max(20),
      note: z.string().trim().max(255).optional(),
    })
    .optional(),
});

export const loginSchema = z.object({
  email,
  // No length rule on login: the requirement belongs at registration, and
  // enforcing it here would tell an attacker their guess was too short to be real.
  password: z.string().min(1, 'Password is required'),
});
