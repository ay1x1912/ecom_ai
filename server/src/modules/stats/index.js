import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireAdmin } from '../../middleware/requireRole.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { ok } from '../../utils/respond.js';
import { getStats } from './service.js';

/**
 * One reporting endpoint, not two.
 *
 * backend-spec.md §11 notes that the source project had both /stats and
 * /analytics, with the second never explained and heavily overlapping the first.
 * The admin dashboard needs one payload of a stable shape; splitting it would
 * mean two endpoints to secure, cache and keep in step.
 */
export const querySchema = z.object({
  topLimit: z.coerce.number().int().min(1).max(50).default(5),
  recentLimit: z.coerce.number().int().min(1).max(50).default(5),
});

export const statsRoutes = Router();

statsRoutes.get(
  '/',
  authenticate,
  requireAdmin,
  validate({ query: querySchema }),
  asyncHandler(async (req, res) => ok(res, await getStats(req.query))),
);

export default statsRoutes;
