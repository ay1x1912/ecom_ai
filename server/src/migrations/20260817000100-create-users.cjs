'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'users',
      {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        name: { type: Sequelize.STRING(120), allowNull: false },
        // 190 chars is the safe idiom for a utf8mb4 unique index.
        email: { type: Sequelize.STRING(190), allowNull: false, unique: true },
        password: { type: Sequelize.STRING(255), allowNull: false },
        avatar: { type: Sequelize.STRING(500), allowNull: true },
        role: {
          type: Sequelize.ENUM('admin', 'user', 'deliveryman'),
          allowNull: false,
          defaultValue: 'user',
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        },
      },
      { charset: 'utf8mb4', collate: 'utf8mb4_0900_ai_ci' },
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};
