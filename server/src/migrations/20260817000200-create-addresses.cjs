'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'addresses',
      {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        user_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          // Deleting a user removes their addresses — nothing else references them.
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        street: { type: Sequelize.STRING(255), allowNull: false },
        city: { type: Sequelize.STRING(120), allowNull: false },
        country: { type: Sequelize.STRING(120), allowNull: false },
        // A string, not a number: leading zeros are significant in many countries.
        postal_code: { type: Sequelize.STRING(20), allowNull: false },
        is_default: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        note: { type: Sequelize.STRING(255), allowNull: true },
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

    await queryInterface.addIndex('addresses', ['user_id'], { name: 'addresses_user_id_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('addresses');
  },
};
