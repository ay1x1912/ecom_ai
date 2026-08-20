import { DataTypes, Model } from 'sequelize';
import bcrypt from 'bcrypt';
import { sequelize } from '../config/database.js';

const BCRYPT_COST = 12;

export class User extends Model {
  /**
   * Constant-time comparison against the stored hash.
   * Requires the password column, which the default scope excludes:
   *   User.scope('withPassword').findOne({ where: { email } })
   */
  async matchPassword(candidate) {
    if (!this.password) {
      throw new Error(
        'matchPassword called on a User loaded without the password column. ' +
          'Use User.scope("withPassword").',
      );
    }
    return bcrypt.compare(candidate, this.password);
  }

  get isAdmin() {
    return this.role === 'admin';
  }
}

User.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(120), allowNull: false, validate: { notEmpty: true } },
    email: {
      type: DataTypes.STRING(190),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
      set(value) {
        // Normalise so Alice@x.com and alice@x.com cannot both register.
        this.setDataValue('email', String(value).trim().toLowerCase());
      },
    },
    password: { type: DataTypes.STRING(255), allowNull: false },
    avatar: { type: DataTypes.STRING(500), allowNull: true },
    role: {
      type: DataTypes.ENUM('admin', 'user', 'deliveryman'),
      allowNull: false,
      defaultValue: 'user',
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    // Password is excluded by default so it cannot leak through a handler that
    // forgot to strip it. Opt in explicitly for login.
    defaultScope: { attributes: { exclude: ['password'] } },
    scopes: {
      withPassword: { attributes: { include: ['password'] } },
    },
  },
);

/**
 * Hash on write.
 *
 * The changed() guard is essential: without it, saving a user for any other
 * reason re-hashes the existing hash and locks the account out.
 *
 * CAVEAT: this fires for instance .save()/.create(), NOT for the static
 * User.update(). Always change passwords through an instance, or pass
 * { individualHooks: true }.
 */
User.addHook('beforeSave', async (user) => {
  if (!user.changed('password')) return;
  user.password = await bcrypt.hash(user.password, BCRYPT_COST);
});

export default User;
