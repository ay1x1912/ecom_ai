import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Banner extends Model {}

Banner.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(120), allowNull: false, validate: { notEmpty: true } },
    title: { type: DataTypes.STRING(200), allowNull: true },
    // Display label, not an amount — see the migration note.
    startFrom: { type: DataTypes.STRING(100), allowNull: true },
    image: { type: DataTypes.STRING(500), allowNull: true },
    bannerType: { type: DataTypes.STRING(60), allowNull: true },
  },
  {
    sequelize,
    modelName: 'Banner',
    tableName: 'banners',
  },
);

export default Banner;
