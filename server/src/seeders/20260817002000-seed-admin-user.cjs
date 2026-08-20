'use strict';

const bcrypt = require('bcrypt');

/**
 * The first admin comes from here, NOT from the register endpoint.
 *
 * Public registration ignores any submitted `role` precisely so nobody can
 * self-promote (backend-spec.md defect #1). That makes a seeded admin the
 * legitimate bootstrap path.
 *
 * bulkInsert bypasses model hooks, so the hash is computed explicitly — the
 * beforeSave hook in models/User.js does not run here.
 */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const password = await bcrypt.hash('Admin123!change-me', 12);

    await queryInterface.bulkInsert('users', [
      {
        name: 'BabyMart Admin',
        email: 'admin@babymart.local',
        password,
        avatar: null,
        role: 'admin',
        created_at: now,
        updated_at: now,
      },
      {
        name: 'Test Customer',
        email: 'customer@babymart.local',
        password: await bcrypt.hash('Customer123!', 12),
        avatar: null,
        role: 'user',
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', {
      email: { [Sequelize.Op.in]: ['admin@babymart.local', 'customer@babymart.local'] },
    });
  },
};
