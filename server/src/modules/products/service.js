import { Op } from 'sequelize';
import { Product } from '../../models/index.js';
import { createCrudService } from '../../services/crudService.js';
import { notFoundError } from '../../utils/AppError.js';
import { paginationMeta } from '../../utils/respond.js';

/** Category and brand are always joined — a product without them is not useful. */
const withRelations = [
  { association: 'category' },
  { association: 'brand' },
];

const base = createCrudService(Product, {
  resourceName: 'Product',
  searchable: ['name', 'description'],
  sortable: ['createdAt', 'name', 'price', 'averageRating'],
  defaultInclude: withRelations,
});

export const slugify = (value) =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 220);

const escapeLike = (value) => String(value).replace(/[\\%_]/g, '\\$&');

/**
 * List with the storefront's filters.
 *
 * Written out rather than taken from the factory because the price range and the
 * stock filter need real predicates. Everything here comes from a validated
 * schema, so no caller-supplied string reaches a query fragment.
 */
export const listProducts = async ({
  page,
  perPage,
  sortBy,
  sortOrder,
  search,
  categoryId,
  brandId,
  minPrice,
  maxPrice,
  inStock,
}) => {
  const where = {};

  if (categoryId) where.categoryId = categoryId;
  if (brandId) where.brandId = brandId;

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {
      ...(minPrice !== undefined ? { [Op.gte]: minPrice } : {}),
      ...(maxPrice !== undefined ? { [Op.lte]: maxPrice } : {}),
    };
  }

  if (inStock === true) where.stock = { [Op.gt]: 0 };
  if (inStock === false) where.stock = 0;

  if (search) {
    const like = { [Op.like]: `%${escapeLike(search)}%` };
    where[Op.or] = [{ name: like }, { description: like }];
  }

  const { rows, count } = await Product.findAndCountAll({
    where,
    include: withRelations,
    order: [[sortBy, sortOrder.toUpperCase()]],
    limit: perPage,
    offset: (page - 1) * perPage,
    // category/brand are belongsTo so they cannot multiply rows, but DISTINCT
    // keeps the count correct if a hasMany include is ever added here.
    distinct: true,
  });

  return { rows, meta: paginationMeta({ page, perPage, total: count }) };
};

export const getProduct = (id) => base.get(id);

export const getProductBySlug = async (slug) => {
  const product = await Product.findOne({ where: { slug }, include: withRelations });
  if (!product) throw notFoundError('Product not found');
  return product;
};

/**
 * Create.
 *
 * categoryId/brandId are not pre-checked: the FK constraint is the real guarantee,
 * and the error handler turns its failure into a clean 400. Pre-checking would add
 * a query and still leave a race.
 */
export const createProduct = async (data) => {
  const product = await Product.create({
    ...data,
    slug: slugify(data.name),
  });
  return base.get(product.id);
};

/**
 * Update.
 *
 * The slug is deliberately NOT regenerated on rename — existing URLs and any links
 * to them keep working. If a slug must change, that should be an explicit action
 * with a redirect, not a side effect of editing a name.
 */
export const updateProduct = async (id, data) => {
  const product = await base.get(id, { include: [] });
  product.set(data);
  await product.save();
  return base.get(id);
};

export const deleteProduct = async (id) => {
  await base.remove(id);
  return true;
};
