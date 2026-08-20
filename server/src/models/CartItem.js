import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class CartItem extends Model {}

CartItem.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    cartId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    productId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    quantity: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      validate: { min: 1 },
    },
  },
  {
    sequelize,
    modelName: 'CartItem',
    tableName: 'cart_items',
    indexes: [{ unique: true, fields: ['cart_id', 'product_id'] }],
  },
);

/**
 * Deliberately NO price column.
 *
 * Cart prices join live from products, so a repriced item shows its current price.
 * Prices freeze at order creation (see OrderItem), not at add-to-cart — otherwise
 * a stale cart becomes a "but it said £8" dispute.
 */

export default CartItem;
