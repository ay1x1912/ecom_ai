import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Product extends Model {
  /** Unit price after discount, as a number. */
  get discountedPrice() {
    const price = Number(this.price);
    const pct = Number(this.discountPercentage ?? 0);
    return Number((price * (1 - pct / 100)).toFixed(2));
  }

  get inStock() {
    return Number(this.stock) > 0;
  }
}

Product.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      unique: true,
      validate: { notEmpty: true },
    },
    slug: { type: DataTypes.STRING(220), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    // DECIMAL comes back from mysql2 as a string to preserve precision. Wrap in
    // Number() for arithmetic, and never accumulate money in floats.
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    discountPercentage: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 90 },
    },
    stock: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    image: { type: DataTypes.STRING(500), allowNull: false },
    categoryId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    brandId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    // Maintained by ProductRating's hooks — do not set these by hand.
    averageRating: { type: DataTypes.DECIMAL(3, 2), allowNull: false, defaultValue: 0 },
    ratingsCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  },
  {
    sequelize,
    modelName: 'Product',
    tableName: 'products',
  },
);

export default Product;
