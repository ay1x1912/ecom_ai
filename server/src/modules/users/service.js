import { sequelize, User, Address } from '../../models/index.js';
import { createCrudService } from '../../services/crudService.js';
import { notFoundError } from '../../utils/AppError.js';
import { publicUser, publicUserWithAddresses } from '../../presenters/user.js';

/**
 * The generic half comes from the factory; the parts with real rules are written
 * out below. This is the composition pattern from implementation.md §2 — we take
 * pagination/search/sort for free and override where behaviour differs.
 */
const base = createCrudService(User, {
  resourceName: 'User',
  searchable: ['name', 'email'],
  sortable: ['createdAt', 'name', 'email'],
});

export const listUsers = async ({ role, ...query }) => {
  const { rows, meta } = await base.list({
    ...query,
    where: role ? { role } : {},
  });
  return { users: rows.map(publicUser), meta };
};

export const getUser = async (id) => {
  const user = await base.get(id, { include: [{ association: 'addresses' }] });
  return publicUserWithAddresses(user);
};

/** Admin-only creation: may set role and seed addresses. */
export const createUser = async ({ addresses = [], ...data }) =>
  sequelize.transaction(async (transaction) => {
    const user = await User.create(data, { transaction });

    if (addresses.length > 0) {
      // Exactly one default, even if the caller flagged several or none.
      const defaultIndex = Math.max(
        0,
        addresses.findIndex((a) => a.isDefault === true),
      );
      await Address.bulkCreate(
        addresses.map((a, i) => ({ ...a, userId: user.id, isDefault: i === defaultIndex })),
        { transaction, validate: true },
      );
    }

    const created = await User.findByPk(user.id, {
      include: [{ association: 'addresses' }],
      transaction,
    });
    return publicUserWithAddresses(created);
  });

/**
 * Update.
 *
 * Authorization (self-or-admin) is enforced by middleware before we get here, and
 * the role field is stripped for non-admins by the schema the controller selects.
 * This function trusts that its input is already permitted.
 */
export const updateUser = async (id, data) => {
  const user = await User.findByPk(id);
  if (!user) throw notFoundError('User not found');

  user.set(data);
  // Instance .save() so the password-hashing hook runs. User.update() would skip
  // it and store plaintext.
  await user.save();

  const fresh = await User.findByPk(id, { include: [{ association: 'addresses' }] });
  return publicUserWithAddresses(fresh);
};

/**
 * Delete.
 *
 * The cascade is declared in the schema: addresses, cart, cart items and wishlist
 * rows go with the user, while orders survive with user_id set to NULL so the
 * financial record is preserved (backend-spec.md defect #6).
 */
export const deleteUser = async (id) => {
  await base.remove(id);
  return true;
};
