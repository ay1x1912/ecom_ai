import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Brand extends Model {}

Brand.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
      validate: { notEmpty: true },
    },
    image: { type: DataTypes.STRING(500), allowNull: true },
  },
  {
    sequelize,
    modelName: 'Brand',
    tableName: 'brands',
  },
);

export default Brand;
