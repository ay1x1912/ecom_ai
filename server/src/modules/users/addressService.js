import { sequelize, User, Address } from '../../models/index.js';
import { notFoundError } from '../../utils/AppError.js';
import { publicAddress } from '../../presenters/user.js';

/**
 * Enforces the invariant: a user with any addresses has exactly one default.
 *
 * This lives in the service, not a model hook, because MySQL 8 has no partial
 * unique index and the rule spans sibling rows. Always called inside the caller's
 * transaction so the invariant can never be observed half-applied.
 */
const ensureExactlyOneDefault = async (userId, transaction) => {
  const defaults = await Address.findAll({
    where: { userId, isDefault: true },
    order: [['id', 'ASC']],
    transaction,
  });

  if (defaults.length > 1) {
    // Keep the most recently flagged one; demote the rest.
    for (const stale of defaults.slice(0, -1)) {
      stale.isDefault = false;
      await stale.save({ transaction });
    }
    return;
  }

  if (defaults.length === 0) {
    // Deleting or un-flagging the default leaves the user without one — promote
    // their oldest remaining address.
    const fallback = await Address.findOne({
      where: { userId },
      order: [['id', 'ASC']],
      transaction,
    });
    if (fallback) {
      fallback.isDefault = true;
      await fallback.save({ transaction });
    }
  }
};

const assertUserExists = async (userId, transaction) => {
  const user = await User.findByPk(userId, { transaction });
  if (!user) throw notFoundError('User not found');
  return user;
};

export const listAddresses = async (userId) => {
  await assertUserExists(userId);
  const rows = await Address.findAll({ where: { userId }, order: [['id', 'ASC']] });
  return rows.map(publicAddress);
};

export const addAddress = async (userId, data) =>
  sequelize.transaction(async (transaction) => {
    await assertUserExists(userId, transaction);

    const existing = await Address.count({ where: { userId }, transaction });
    // A user's first address is always their default, whatever they asked for.
    const isDefault = data.isDefault === true || existing === 0;

    if (isDefault) {
      await Address.update({ isDefault: false }, { where: { userId }, transaction });
    }

    const address = await Address.create({ ...data, userId, isDefault }, { transaction });
    await ensureExactlyOneDefault(userId, transaction);

    await address.reload({ transaction });
    return publicAddress(address);
  });

export const updateAddress = async (userId, addressId, data) =>
  sequelize.transaction(async (transaction) => {
    await assertUserExists(userId, transaction);

    // Scoped by userId as well as id: without this, user A could edit user B's
    // address simply by knowing its id.
    const address = await Address.findOne({
      where: { id: addressId, userId },
      transaction,
    });
    if (!address) throw notFoundError('Address not found');

    if (data.isDefault === true) {
      await Address.update({ isDefault: false }, { where: { userId }, transaction });
    }

    address.set(data);
    await address.save({ transaction });
    await ensureExactlyOneDefault(userId, transaction);

    await address.reload({ transaction });
    return publicAddress(address);
  });

export const deleteAddress = async (userId, addressId) =>
  sequelize.transaction(async (transaction) => {
    await assertUserExists(userId, transaction);

    const address = await Address.findOne({
      where: { id: addressId, userId },
      transaction,
    });
    if (!address) throw notFoundError('Address not found');

    await address.destroy({ transaction });
    // If we just removed the default, this promotes the next one.
    await ensureExactlyOneDefault(userId, transaction);

    return true;
  });
