import { asyncHandler } from '../../middleware/asyncHandler.js';
import { ok, created } from '../../utils/respond.js';
import { publicProduct } from '../../presenters/catalogue.js';
import {
  listProducts,
  getProduct,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
} from './service.js';

/** GET /api/products — public */
export const index = asyncHandler(async (req, res) => {
  const { rows, meta } = await listProducts(req.query);
  return ok(res, rows.map(publicProduct), meta);
});

/** GET /api/products/:id — public */
export const show = asyncHandler(async (req, res) => {
  return ok(res, publicProduct(await getProduct(req.params.id)));
});

/**
 * GET /api/products/slug/:slug — public
 *
 * The storefront routes by slug, so it should not have to resolve an id first.
 */
export const showBySlug = asyncHandler(async (req, res) => {
  return ok(res, publicProduct(await getProductBySlug(req.params.slug)));
});

/** POST /api/products — admin */
export const store = asyncHandler(async (req, res) => {
  return created(res, publicProduct(await createProduct(req.body)));
});

/** PUT /api/products/:id — admin */
export const update = asyncHandler(async (req, res) => {
  return ok(res, publicProduct(await updateProduct(req.params.id, req.body)));
});

/** DELETE /api/products/:id — admin */
export const destroy = asyncHandler(async (req, res) => {
  await deleteProduct(req.params.id);
  return ok(res, { message: 'Product deleted successfully' });
});
