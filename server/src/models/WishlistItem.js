import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class WishlistItem extends Model {}

WishlistItem.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    productId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  },
  {
    sequelize,
    modelName: 'WishlistItem',
    tableName: 'wishlist_items',
    indexes: [{ unique: true, fields: ['user_id', 'product_id'] }],
  },
);

/**
 * The unique constraint is what makes "add to wishlist" idempotent: findOrCreate
 * turns a duplicate add into a no-op instead of an error.
 *
 * Because this is a real join table, the course's POST /api/wishlist/products
 * batch-hydration endpoint is unnecessary — we JOIN products directly on read.
 */

export default WishlistItem;
