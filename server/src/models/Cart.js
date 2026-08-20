import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Cart extends Model {}

Cart.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    // Unique in the DB: one cart per user. Create lazily with findOrCreate.
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, unique: true },
  },
  {
    sequelize,
    modelName: 'Cart',
    tableName: 'carts',
  },
);

export default Cart;
