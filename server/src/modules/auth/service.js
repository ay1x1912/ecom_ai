import bcrypt from 'bcrypt';
import { sequelize, User, Address } from '../../models/index.js';
import { signAuthToken } from '../../utils/token.js';
import { unauthorized, notFoundError } from '../../utils/AppError.js';
import { publicUser, publicUserWithAddresses } from '../../presenters/user.js';

/**
 * A valid bcrypt hash of a random string, compared against when no user matches.
 *
 * Without it, a login for an unknown email returns immediately while a login for a
 * known email spends ~250ms hashing — a timing side channel that reveals which
 * addresses are registered. Comparing against a decoy equalises the two paths.
 */
const DECOY_HASH = '$2b$12$YhTFizVUwNu8E0RMJU8syel7NR6.VbfbS18r/VEgO4TsqCLFJ.WY.';

export const registerUser = async ({ name, email, password, address }) => {
  // One transaction so a failed address insert cannot leave a user behind.
  return sequelize.transaction(async (transaction) => {
    const user = await User.create(
      // role is not accepted here — it defaults to 'user' in the model.
      { name, email, password },
      { transaction },
    );

    if (address) {
      await Address.create(
        // A user's first address is always their default.
        { ...address, userId: user.id, isDefault: true },
        { transaction },
      );
    }

    return { user: publicUser(user), token: signAuthToken(user.id) };
  });
};

export const loginUser = async ({ email, password }) => {
  const user = await User.scope('withPassword').findOne({ where: { email } });

  if (!user) {
    await bcrypt.compare(password, DECOY_HASH);
    // Identical message for unknown-email and wrong-password: distinguishing them
    // tells an attacker which addresses exist (backend-spec.md defect #11).
    throw unauthorized('Invalid email or password');
  }

  if (!(await user.matchPassword(password))) {
    throw unauthorized('Invalid email or password');
  }

  return { user: publicUser(user), token: signAuthToken(user.id) };
};

/**
 * Authoritative re-read of the caller's own record.
 *
 * Clients cache the user at login, but addresses, roles and details drift. This is
 * the endpoint that re-hydrates them.
 */
export const getProfile = async (userId) => {
  const user = await User.findByPk(userId, {
    include: [{ association: 'addresses' }],
  });
  if (!user) throw notFoundError('User not found');

  return publicUserWithAddresses(user);
};
