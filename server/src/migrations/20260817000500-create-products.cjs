'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'products',
      {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        name: { type: Sequelize.STRING(200), allowNull: false, unique: true },
        slug: { type: Sequelize.STRING(220), allowNull: false, unique: true },
        description: { type: Sequelize.TEXT, allowNull: true },
        // DECIMAL, never FLOAT. Floating-point money drifts by cents and produces
        // order totals that cannot be reconciled.
        price: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
        discount_percentage: {
          type: Sequelize.SMALLINT.UNSIGNED,
          allowNull: false,
          defaultValue: 0,
        },
        stock: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        image: { type: Sequelize.STRING(500), allowNull: false },
        category_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: 'categories', key: 'id' },
          // RESTRICT: you cannot delete a category that still has products.
          // This is what turns the course's 500 cast error into a clean constraint.
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        brand_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: 'brands', key: 'id' },
          onDelete: 'RESTRICT',
          onUpdate: 'CASCADE',
        },
        // Denormalised caches, recomputed from product_ratings in a hook.
        average_rating: { type: Sequelize.DECIMAL(3, 2), allowNull: false, defaultValue: 0 },
        ratings_count: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
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

    await queryInterface.addIndex('products', ['category_id'], {
      name: 'products_category_id_idx',
    });
    await queryInterface.addIndex('products', ['brand_id'], { name: 'products_brand_id_idx' });
    // Storefront sorts and range-filters on price.
    await queryInterface.addIndex('products', ['price'], { name: 'products_price_idx' });

    // MySQL 8.0.16+ enforces CHECK constraints.
    await queryInterface.sequelize.query(
      'ALTER TABLE products ADD CONSTRAINT products_price_non_negative CHECK (price >= 0)',
    );
    // Max 90%: 100% would mean free. The source material wavered between the two.
    await queryInterface.sequelize.query(
      'ALTER TABLE products ADD CONSTRAINT products_discount_range CHECK (discount_percentage BETWEEN 0 AND 90)',
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('products');
  },
};
