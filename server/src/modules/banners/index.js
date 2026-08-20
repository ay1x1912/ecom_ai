import { Router } from 'express';
import { z } from 'zod';
import { Banner } from '../../models/index.js';
import { createCrudService } from '../../services/crudService.js';
import { createCrudController } from '../../controllers/crudController.js';
import { publicBanner } from '../../presenters/catalogue.js';
import { validate, listQuerySchema, idParamSchema } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireAdmin } from '../../middleware/requireRole.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { ok } from '../../utils/respond.js';

/**
 * Homepage marketing slots. Exists so promos are data an admin edits, not a
 * deploy — which is the whole reason the source project modelled them.
 */

export const bodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  title: z.string().trim().max(200).nullable().optional(),
  startFrom: z.string().trim().max(100).nullable().optional(),
  image: z.string().url().max(500).nullable().optional(),
  bannerType: z.string().trim().max(60).nullable().optional(),
});

export const updateSchema = bodySchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

export const querySchema = listQuerySchema(['createdAt', 'name']).extend({
  bannerType: z.string().trim().max(60).optional(),
});

export const bannerService = createCrudService(Banner, {
  resourceName: 'Banner',
  searchable: ['name', 'title'],
  sortable: ['createdAt', 'name'],
});

const controller = createCrudController(bannerService, publicBanner);

export const bannerRoutes = Router();

/**
 * index is overridden rather than taken from the factory, because bannerType is a
 * filter that has to become a `where` clause. An explicit handler is clearer than
 * middleware that rewrites req.query on its way past.
 */
const indexBanners = asyncHandler(async (req, res) => {
  const { bannerType, ...query } = req.query;
  const { rows, meta } = await bannerService.list({
    ...query,
    where: bannerType ? { bannerType } : {},
  });
  return ok(res, rows.map(publicBanner), meta);
});

bannerRoutes.get('/', validate({ query: querySchema }), indexBanners);
bannerRoutes.get('/:id', validate({ params: idParamSchema }), controller.show);

bannerRoutes.post(
  '/',
  authenticate,
  requireAdmin,
  validate({ body: bodySchema }),
  controller.store,
);
bannerRoutes.put(
  '/:id',
  authenticate,
  requireAdmin,
  validate({ params: idParamSchema, body: updateSchema }),
  controller.update,
);
bannerRoutes.delete(
  '/:id',
  authenticate,
  requireAdmin,
  validate({ params: idParamSchema }),
  controller.destroy,
);

export default bannerRoutes;
