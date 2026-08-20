'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'order_items',
      {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        order_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: { model: 'orders', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        // SET NULL, not CASCADE: deleting a product must never delete history.
        // The snapshot columns below keep the line readable without the product.
        product_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
          references: { model: 'products', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },

        // Snapshots. Renaming or repricing a product must not rewrite past orders.
        name: { type: Sequelize.STRING(200), allowNull: false },
        price: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        quantity: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        image: { type: Sequelize.STRING(500), allowNull: true },

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

    await queryInterface.addIndex('order_items', ['order_id'], {
      name: 'order_items_order_id_idx',
    });

    await queryInterface.sequelize.query(
      'ALTER TABLE order_items ADD CONSTRAINT order_items_quantity_positive CHECK (quantity >= 1)',
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE order_items ADD CONSTRAINT order_items_price_non_negative CHECK (price >= 0)',
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('order_items');
  },
};
