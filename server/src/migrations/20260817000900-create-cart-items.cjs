'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'cart_items',
      {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        cart_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: 'carts', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        product_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: 'products', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        quantity: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
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

    // This constraint makes "add to cart" a single race-safe upsert instead of
    // read-then-branch. NOTE: no price column here — cart prices join live from
    // products, and only freeze when the order is created.
    await queryInterface.addConstraint('cart_items', {
      fields: ['cart_id', 'product_id'],
      type: 'unique',
      name: 'cart_items_cart_product_unique',
    });

    await queryInterface.sequelize.query(
      'ALTER TABLE cart_items ADD CONSTRAINT cart_items_quantity_positive CHECK (quantity >= 1)',
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cart_items');
  },
};
