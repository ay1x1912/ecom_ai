'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'product_ratings',
      {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        product_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: 'products', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        user_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        rating: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
        comment: { type: Sequelize.TEXT, allowNull: true },
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

    // One review per user per product.
    await queryInterface.addConstraint('product_ratings', {
      fields: ['product_id', 'user_id'],
      type: 'unique',
      name: 'product_ratings_product_user_unique',
    });

    await queryInterface.sequelize.query(
      'ALTER TABLE product_ratings ADD CONSTRAINT product_ratings_range CHECK (rating BETWEEN 1 AND 5)',
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('product_ratings');
  },
};
