import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

export const ORDER_STATUSES = ['pending', 'paid', 'completed', 'cancelled'];

/**
 * Legal status transitions. The course had none, so `cancelled -> paid` was
 * possible. Terminal states have no outgoing edges.
 */
export const ORDER_TRANSITIONS = {
  pending: ['paid', 'cancelled'],
  paid: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export const canTransition = (from, to) => (ORDER_TRANSITIONS[from] ?? []).includes(to);

export class Order extends Model {
  canTransitionTo(next) {
    return canTransition(this.status, next);
  }
}

Order.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    orderNumber: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    // Nullable by design: ON DELETE SET NULL keeps the financial record when the
    // customer is deleted.
    userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    total: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    status: {
      type: DataTypes.ENUM(...ORDER_STATUSES),
      allowNull: false,
      defaultValue: 'pending',
    },

    // Snapshot of where it shipped, not a reference to a mutable address row.
    shippingStreet: { type: DataTypes.STRING(255), allowNull: false },
    shippingCity: { type: DataTypes.STRING(120), allowNull: false },
    shippingCountry: { type: DataTypes.STRING(120), allowNull: false },
    shippingPostalCode: { type: DataTypes.STRING(20), allowNull: false },

    // Provider-neutral: 'mock' now, a real gateway later, no migration needed.
    paymentProvider: { type: DataTypes.STRING(30), allowNull: true },
    paymentRef: { type: DataTypes.STRING(190), allowNull: true },
    // UNIQUE: makes duplicate settlement impossible in storage, not just in code.
    paymentEventId: { type: DataTypes.STRING(190), allowNull: true, unique: true },
    paidAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: 'Order',
    tableName: 'orders',
  },
);

export default Order;
