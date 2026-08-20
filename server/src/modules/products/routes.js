import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireAdmin } from '../../middleware/requireRole.js';
import {
  productBodySchema,
  productUpdateSchema,
  productQuerySchema,
  productIdParamSchema,
  productSlugParamSchema,
} from './schema.js';
import { index, show, showBySlug, store, update, destroy } from './controller.js';

export const productRoutes = Router();

// Public reads.
productRoutes.get('/', validate({ query: productQuerySchema }), index);

/**
 * The slug route is declared BEFORE /:id.
 *
 * Express matches in declaration order, so a literal segment that could also be
 * captured by a parameter has to come first — otherwise /products/slug/foo would
 * be read as id="slug".
 */
productRoutes.get('/slug/:slug', validate({ params: productSlugParamSchema }), showBySlug);
productRoutes.get('/:id', validate({ params: productIdParamSchema }), show);

// Admin writes.
productRoutes.post(
  '/',
  authenticate,
  requireAdmin,
  validate({ body: productBodySchema }),
  store,
);
productRoutes.put(
  '/:id',
  authenticate,
  requireAdmin,
  validate({ params: productIdParamSchema, body: productUpdateSchema }),
  update,
);
productRoutes.delete(
  '/:id',
  authenticate,
  requireAdmin,
  validate({ params: productIdParamSchema }),
  destroy,
);

export default productRoutes;
