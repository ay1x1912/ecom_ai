import { Router } from 'express';
import { z } from 'zod';
import { Category, CATEGORY_TYPES } from '../../models/index.js';
import { createCrudService } from '../../services/crudService.js';
import { createCrudController } from '../../controllers/crudController.js';
import { publicCategory } from '../../presenters/catalogue.js';
import { validate, listQuerySchema, idParamSchema } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireAdmin } from '../../middleware/requireRole.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { ok } from '../../utils/respond.js';

/**
 * categoryType is constrained in two places on purpose: z.enum here for a readable
 * 400, and a MySQL ENUM in the schema so nothing that bypasses the API can write
 * a bogus value. The admin UI is not trusted to constrain it.
 */
export const bodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  image: z.string().url().max(500).nullable().optional(),
  categoryType: z.enum(CATEGORY_TYPES),
});

export const updateSchema = bodySchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

export const querySchema = listQuerySchema(['name', 'createdAt']).extend({
  categoryType: z.enum(CATEGORY_TYPES).optional(),
});

export const categoryService = createCrudService(Category, {
  resourceName: 'Category',
  searchable: ['name'],
  sortable: ['name', 'createdAt'],
});

const controller = createCrudController(categoryService, publicCategory);

const indexCategories = asyncHandler(async (req, res) => {
  const { categoryType, ...query } = req.query;
  const { rows, meta } = await categoryService.list({
    ...query,
    where: categoryType ? { categoryType } : {},
  });
  return ok(res, rows.map(publicCategory), meta);
});

export const categoryRoutes = Router();

categoryRoutes.get('/', validate({ query: querySchema }), indexCategories);
categoryRoutes.get('/:id', validate({ params: idParamSchema }), controller.show);

categoryRoutes.post(
  '/',
  authenticate,
  requireAdmin,
  validate({ body: bodySchema }),
  controller.store,
);
categoryRoutes.put(
  '/:id',
  authenticate,
  requireAdmin,
  validate({ params: idParamSchema, body: updateSchema }),
  controller.update,
);
/**
 * Deleting a category that still has products is refused by the FK (ON DELETE
 * RESTRICT) and surfaces as a 400 from the error handler — the desired behaviour,
 * enforced by the database rather than by a check we might forget.
 */
categoryRoutes.delete(
  '/:id',
  authenticate,
  requireAdmin,
  validate({ params: idParamSchema }),
  controller.destroy,
);

export default categoryRoutes;
