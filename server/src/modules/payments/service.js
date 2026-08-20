import { sequelize, Order, canTransition } from '../../models/index.js';
import { notFoundError, conflict, forbidden, badRequest } from '../../utils/AppError.js';
import { restockOrderItems } from '../orders/service.js';
import { paymentProvider } from './providers/index.js';

const orderInclude = [{ association: 'items' }];

/**
 * Start a checkout for one of the caller's pending orders.
 *
 * Line items are never taken from the request — the order already holds
 * server-priced snapshots, and those are what the provider is told to charge.
 */
export const createCheckoutSession = async (requester, orderId) =>
  sequelize.transaction(async (transaction) => {
    const order = await Order.findByPk(orderId, {
      include: orderInclude,
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    if (!order) throw notFoundError('Order not found');

    const isOwner = order.userId !== null && Number(order.userId) === Number(requester.id);
    if (requester.role !== 'admin' && !isOwner) {
      throw forbidden('You may only pay for your own orders');
    }

    if (order.status !== 'pending') {
      throw conflict(`Order is already "${order.status}" and cannot be paid again`);
    }

    const session = await paymentProvider.createCheckoutSession(order);

    // Persisting the session id is what lets settlement find this order later,
    // with no in-memory state to lose on restart.
    order.paymentProvider = paymentProvider.name;
    order.paymentRef = session.sessionId;
    await order.save({ transaction });

    return {
      orderId: Number(order.id),
      orderNumber: order.orderNumber,
      amount: Number(order.total),
      provider: paymentProvider.name,
      ...session,
    };
  });

/**
 * THE settlement function. Every provider — mock today, a real gateway later —
 * funnels through here, so swapping providers never touches order logic.
 *
 * Idempotent on eventId: gateways retry, and a duplicate delivery must not settle
 * an order twice. orders.payment_event_id carries a UNIQUE index, so the guarantee
 * survives even a race between two concurrent deliveries.
 */
export const settleOrderPaid = async ({ orderId, paymentRef, eventId, provider }) =>
  sequelize.transaction(async (transaction) => {
    if (eventId) {
      const seen = await Order.findOne({
        where: { paymentEventId: eventId },
        include: orderInclude,
        transaction,
      });
      if (seen) return { order: seen, alreadyProcessed: true };
    }

    const order = await Order.findByPk(orderId, {
      include: orderInclude,
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    if (!order) throw notFoundError('Order not found');

    // Replaying an old event for an order that already advanced is a no-op, not
    // an error — the desired end state is already true.
    if (order.status === 'paid' || order.status === 'completed') {
      return { order, alreadyProcessed: true };
    }

    if (!canTransition(order.status, 'paid')) {
      throw conflict(`Cannot settle an order with status "${order.status}"`);
    }

    order.status = 'paid';
    order.paidAt = new Date();
    order.paymentProvider = provider ?? paymentProvider.name;
    if (paymentRef) order.paymentRef = paymentRef;
    if (eventId) order.paymentEventId = eventId;
    await order.save({ transaction });

    // Reload before returning. MySQL DATETIME has no fractional seconds, so the
    // in-memory Date carries milliseconds the database will not keep — returning
    // it unreloaded advertises a paidAt that no later read will ever match.
    await order.reload({ transaction });

    return { order, alreadyProcessed: false };
  });

/** Payment failed or expired: cancel the order and return its stock. */
export const settleOrderFailed = async ({ orderId, eventId, provider }) =>
  sequelize.transaction(async (transaction) => {
    if (eventId) {
      const seen = await Order.findOne({
        where: { paymentEventId: eventId },
        include: orderInclude,
        transaction,
      });
      if (seen) return { order: seen, alreadyProcessed: true };
    }

    const order = await Order.findByPk(orderId, {
      include: orderInclude,
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    if (!order) throw notFoundError('Order not found');

    if (order.status === 'cancelled') return { order, alreadyProcessed: true };

    if (!canTransition(order.status, 'cancelled')) {
      throw conflict(`Cannot cancel an order with status "${order.status}"`);
    }

    await restockOrderItems(order, transaction);

    order.status = 'cancelled';
    order.paymentProvider = provider ?? paymentProvider.name;
    if (eventId) order.paymentEventId = eventId;
    await order.save({ transaction });
    await order.reload({ transaction });

    return { order, alreadyProcessed: false };
  });

/** Resolve the order a provider event refers to, via the stored session id. */
export const findOrderBySession = async (sessionId) => {
  const order = await Order.findOne({ where: { paymentRef: sessionId } });
  if (!order) throw badRequest('Unknown payment session');
  return order;
};
