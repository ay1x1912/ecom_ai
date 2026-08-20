'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'banners',
      {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        name: { type: Sequelize.STRING(120), allowNull: false },
        title: { type: Sequelize.STRING(200), allowNull: true },
        // Display text such as "start from 9.99" — kept as a string because the
        // source material used it as a label, not an amount. If this turns out to
        // be a real price, migrate it to DECIMAL(10,2).
        start_from: { type: Sequelize.STRING(100), allowNull: true },
        image: { type: Sequelize.STRING(500), allowNull: true },
        banner_type: { type: Sequelize.STRING(60), allowNull: true },
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
    await queryInterface.dropTable('banners');
  },
};
