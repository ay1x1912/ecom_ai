import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export class Address extends Model {}

Address.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    street: { type: DataTypes.STRING(255), allowNull: false, validate: { notEmpty: true } },
    city: { type: DataTypes.STRING(120), allowNull: false, validate: { notEmpty: true } },
    country: { type: DataTypes.STRING(120), allowNull: false, validate: { notEmpty: true } },
    // String, not number — leading zeros are significant.
    postalCode: { type: DataTypes.STRING(20), allowNull: false, validate: { notEmpty: true } },
    isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    note: { type: DataTypes.STRING(255), allowNull: true },
  },
  {
    sequelize,
    modelName: 'Address',
    tableName: 'addresses',
  },
);

/**
 * The "exactly one default address" rule is NOT a model hook.
 *
 * MySQL 8 has no partial unique index, so it can't be expressed as a constraint,
 * and enforcing it needs to clear the flag on sibling rows — a multi-row operation
 * that belongs in a transaction owned by the service layer.
 * See modules/users/addressService.js.
 */

export default Address;
