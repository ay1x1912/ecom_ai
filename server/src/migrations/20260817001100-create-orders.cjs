'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'orders',
      {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        // Human-facing reference, e.g. BM-2026-000123.
        order_number: { type: Sequelize.STRING(40), allowNull: false, unique: true },
        // Nullable *because* of SET NULL: an order is a financial record and must
        // survive the deletion of the customer who placed it.
        user_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        subtotal: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
        total: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
        status: {
          type: Sequelize.ENUM('pending', 'paid', 'completed', 'cancelled'),
          allowNull: false,
          defaultValue: 'pending',
        },

        // Shipping address is SNAPSHOT, not a reference. If the customer later
        // edits or deletes that address, the order must still say where it went.
        shipping_street: { type: Sequelize.STRING(255), allowNull: false },
        shipping_city: { type: Sequelize.STRING(120), allowNull: false },
        shipping_country: { type: Sequelize.STRING(120), allowNull: false },
        shipping_postal_code: { type: Sequelize.STRING(20), allowNull: false },

        // Provider-neutral payment columns: 'mock' now, a real gateway later,
        // without a migration. payment_event_id is UNIQUE so duplicate settlement
        // is impossible at the storage layer, not just in application logic.
        payment_provider: { type: Sequelize.STRING(30), allowNull: true },
        payment_ref: { type: Sequelize.STRING(190), allowNull: true },
        payment_event_id: { type: Sequelize.STRING(190), allowNull: true, unique: true },
        paid_at: { type: Sequelize.DATE, allowNull: true },

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

    await queryInterface.addIndex('orders', ['user_id'], { name: 'orders_user_id_idx' });
    await queryInterface.addIndex('orders', ['status'], { name: 'orders_status_idx' });
    await queryInterface.addIndex('orders', ['created_at'], { name: 'orders_created_at_idx' });

    await queryInterface.sequelize.query(
      'ALTER TABLE orders ADD CONSTRAINT orders_totals_non_negative CHECK (subtotal >= 0 AND total >= 0)',
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('orders');
  },
};
