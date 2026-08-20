import { Router } from 'express';
import { z } from 'zod';
import { Brand } from '../../models/index.js';
import { createCrudService } from '../../services/crudService.js';
import { createCrudController } from '../../controllers/crudController.js';
import { publicBrand } from '../../presenters/catalogue.js';
import { validate, listQuerySchema, idParamSchema } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireAdmin } from '../../middleware/requireRole.js';

/**
 * The simplest resource in the system, and the payoff for the CRUD factory:
 * schema, service, controller and routes in one short file.
 */

export const bodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  image: z.string().url().max(500).nullable().optional(),
});

export const updateSchema = bodySchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

export const querySchema = listQuerySchema(['name', 'createdAt']);

export const brandService = createCrudService(Brand, {
  resourceName: 'Brand',
  searchable: ['name'],
  sortable: ['name', 'createdAt'],
});

const controller = createCrudController(brandService, publicBrand);

export const brandRoutes = Router();

// Reads are public — the storefront needs them without a login.
brandRoutes.get('/', validate({ query: querySchema }), controller.index);
brandRoutes.get('/:id', validate({ params: idParamSchema }), controller.show);

// Writes are admin-only.
brandRoutes.post(
  '/',
  authenticate,
  requireAdmin,
  validate({ body: bodySchema }),
  controller.store,
);
brandRoutes.put(
  '/:id',
  authenticate,
  requireAdmin,
  validate({ params: idParamSchema, body: updateSchema }),
  controller.update,
);
brandRoutes.delete(
  '/:id',
  authenticate,
  requireAdmin,
  validate({ params: idParamSchema }),
  controller.destroy,
);

export default brandRoutes;
