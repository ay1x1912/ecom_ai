import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Product } from './Product.js';

export class ProductRating extends Model {}

ProductRating.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    productId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    rating: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    comment: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    modelName: 'ProductRating',
    tableName: 'product_ratings',
  },
);

/**
 * products.average_rating and products.ratings_count are denormalised caches of
 * this table. Recomputing them lives here — in one place, hooked to the writes
 * that invalidate them — rather than in whichever controller happens to add a
 * review.
 *
 * The transaction is threaded through from options so the counters can never be
 * committed separately from the rating that changed them.
 */
const recomputeFor = async (productId, options = {}) => {
  if (!productId) return;
  const { transaction } = options;

  const [count, avg] = await Promise.all([
    ProductRating.count({ where: { productId }, transaction }),
    ProductRating.aggregate('rating', 'AVG', { where: { productId }, transaction }),
  ]);

  await Product.update(
    {
      ratingsCount: count,
      // aggregate() returns null when there are no rows left.
      averageRating: avg === null || Number.isNaN(Number(avg)) ? 0 : Number(avg).toFixed(2),
    },
    { where: { id: productId }, transaction },
  );
};

ProductRating.addHook('afterCreate', (row, options) => recomputeFor(row.productId, options));
ProductRating.addHook('afterUpdate', (row, options) => recomputeFor(row.productId, options));
ProductRating.addHook('afterDestroy', (row, options) => recomputeFor(row.productId, options));

export default ProductRating;
