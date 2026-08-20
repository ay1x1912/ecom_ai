import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export const CATEGORY_TYPES = ['featured', 'hot', 'top'];

export class Category extends Model {}

Category.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
      validate: { notEmpty: true },
    },
    image: { type: DataTypes.STRING(500), allowNull: true },
    categoryType: {
      type: DataTypes.ENUM(...CATEGORY_TYPES),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Category',
    tableName: 'categories',
  },
);

export default Category;
