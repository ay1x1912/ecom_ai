import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class OrderItem extends Model {
  get lineTotal() {
    return Number((Number(this.price) * Number(this.quantity)).toFixed(2));
  }
}

OrderItem.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    orderId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    // Nullable: ON DELETE SET NULL. Deleting a product must not delete history.
    productId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },

    // Snapshot columns. These are the record — the product row is only a link.
    name: { type: DataTypes.STRING(200), allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, validate: { min: 0 } },
    quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, validate: { min: 1 } },
    image: { type: DataTypes.STRING(500), allowNull: true },
  },
  {
    sequelize,
    modelName: 'OrderItem',
    tableName: 'order_items',
  },
);

export default OrderItem;
