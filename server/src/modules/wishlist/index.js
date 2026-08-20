import { Router } from 'express';
import { z } from 'zod';
import { WishlistItem, Product } from '../../models/index.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { ok, created } from '../../utils/respond.js';
import { notFoundError } from '../../utils/AppError.js';
import { publicProduct } from '../../presenters/catalogue.js';

/**
 * Wishlist.
 *
 * Note what is NOT here: the source project's `POST /api/wishlist/products` batch
 * hydration endpoint. It existed only because Mongo stored bare ids and the client
 * had to trade them for products. With a real join table we JOIN on read, so
 * GET /api/wishlist returns full products and that endpoint has no reason to exist.
 */

export const productIdParam = z.object({
  productId: z.coerce.number().int().positive(),
});

export const addSchema = z.object({
  productId: z.coerce.number().int().positive(),
});

const withProduct = [
  {
    association: 'product',
    include: [{ association: 'category' }, { association: 'brand' }],
  },
];

const listWishlist = async (userId) => {
  const rows = await WishlistItem.findAll({
    where: { userId },
    include: withProduct,
    order: [['createdAt', 'DESC']],
  });

  return rows
    // A product could have been deleted; skip orphans rather than emit nulls.
    .filter((row) => row.product)
    .map((row) => ({
      addedAt: row.createdAt,
      product: publicProduct(row.product),
    }));
};

export const wishlistRoutes = Router();

wishlistRoutes.use(authenticate);

wishlistRoutes.get(
  '/',
  asyncHandler(async (req, res) => ok(res, await listWishlist(req.user.id))),
);

/**
 * Idempotent by design: adding a product that is already there is a no-op, not an
 * error. The unique (user_id, product_id) constraint is what makes findOrCreate
 * safe under concurrency.
 */
wishlistRoutes.post(
  '/',
  validate({ body: addSchema }),
  asyncHandler(async (req, res) => {
    const { productId } = req.body;

    const product = await Product.findByPk(productId);
    if (!product) throw notFoundError('Product not found');

    const [, wasCreated] = await WishlistItem.findOrCreate({
      where: { userId: req.user.id, productId },
      defaults: { userId: req.user.id, productId },
    });

    const items = await listWishlist(req.user.id);
    // 201 when something was added, 200 when it was already present.
    return wasCreated ? created(res, items) : ok(res, items);
  }),
);

wishlistRoutes.delete(
  '/:productId',
  validate({ params: productIdParam }),
  asyncHandler(async (req, res) => {
    const deleted = await WishlistItem.destroy({
      where: { userId: req.user.id, productId: req.params.productId },
    });
    if (deleted === 0) throw notFoundError('Item not in wishlist');
    return ok(res, await listWishlist(req.user.id));
  }),
);

wishlistRoutes.delete(
  '/',
  asyncHandler(async (req, res) => {
    await WishlistItem.destroy({ where: { userId: req.user.id } });
    return ok(res, []);
  }),
);

export default wishlistRoutes;
