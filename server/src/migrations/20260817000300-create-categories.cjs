'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'categories',
      {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        name: { type: Sequelize.STRING(120), allowNull: false, unique: true },
        image: { type: Sequelize.STRING(500), allowNull: true },
        // Enforced twice on purpose: ENUM here, z.enum in the request schema.
        // Zod gives a readable 400; the ENUM stops anything bypassing the API.
        category_type: {
          type: Sequelize.ENUM('featured', 'hot', 'top'),
          allowNull: false,
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
    await queryInterface.dropTable('categories');
  },
};
