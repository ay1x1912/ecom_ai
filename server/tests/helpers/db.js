import { sequelize } from '../../src/models/index.js';

/**
 * Wipe every table between tests.
 *
 * TRUNCATE is refused while foreign keys reference a table, so the checks come off
 * for the duration. This is safe here precisely because it only ever runs against
 * babymart_test — the guard is in tests/setup.js.
 */
export const truncateAll = async () => {
  const tables = [
    'order_items',
    'orders',
    'cart_items',
    'carts',
    'wishlist_items',
    'product_ratings',
    'products',
    'categories',
    'brands',
    'banners',
    'addresses',
    'users',
  ];

  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of tables) {
    await sequelize.query(`TRUNCATE TABLE \`${table}\``);
  }
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
};

export const closeDb = async () => {
  await sequelize.close();
};

export { sequelize };
