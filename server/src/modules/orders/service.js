import { Op } from 'sequelize';
import {
  sequelize,
  Order,
  OrderItem,
  Product,
  Address,
  CartItem,
  canTransition,
} from '../../models/index.js';
import {
  badRequest,
  notFoundError,
  forbidden,
  conflict,
} from '../../utils/AppError.js';
import { paginationMeta } from '../../utils/respond.js';
import { getCartItemsForOrder } from '../cart/service.js';

const orderInclude = [{ association: 'items' }];
const orderIncludeWithCustomer = [
  { association: 'items' },
  { association: 'user', attributes: ['id', 'name', 'email'] },
];

const round2 = (n) => Number(n.toFixed(2));

/** Human-facing reference. Random suffix so ids are not guessable from a sequence. */
const generateOrderNumber = () => {
  const year = new Date().getUTCFullYear();
  const rand = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, '0');
  return `BM-${year}-${rand}`;
};

/**
 * Create an order from the caller's cart.
 *
 * The whole thing is one transaction, and the products are locked FOR UPDATE before
 * their stock is checked. Without that lock two simultaneous orders both read
 * stock = 1 and both succeed — which is how commerce backends oversell.
 */
export const createOrderFromCart = async (userId, { addressId }) =>
  sequelize.transaction(async (transaction) => {
    const { cart, items } = await getCartItemsForOrder(userId, transaction);

    // Shipping address is snapshotted, so it must belong to the caller.
    const address = await Address.findOne({
      where: { id: addressId, userId },
      transaction,
    });
    if (!address) throw notFoundError('Address not found');

    const productIds = items.map((i) => Number(i.productId));

    // Row locks, in a deterministic id order to avoid deadlocking against a
    // concurrent order that touches the same products in the opposite order.
    const products = await Product.findAll({
      where: { id: { [Op.in]: productIds } },
      order: [['id', 'ASC']],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    const byId = new Map(products.map((p) => [Number(p.id), p]));

    const lines = [];
    let subtotal = 0;

    for (const item of items) {
      const product = byId.get(Number(item.productId));
      if (!product) throw badRequest('A product in your cart no longer exists');

      const quantity = Number(item.quantity);
      if (quantity > Number(product.stock)) {
        throw conflict(
          `Insufficient stock for "${product.name}": ${product.stock} available, ${quantity} requested`,
        );
      }

      /**
       * RE-PRICE FROM THE DATABASE. The client sends no prices and no total — any
       * it did send is ignored. Trusting client-side money is how a pram gets
       * bought for a penny (backend-spec.md defect #3).
       */
      const unitPrice = product.discountedPrice;
      const lineTotal = round2(unitPrice * quantity);
      subtotal = round2(subtotal + lineTotal);

      lines.push({
        productId: product.id,
        // Snapshot columns: an order is a historical record.
        name: product.name,
        price: unitPrice,
        quantity,
        image: product.image,
      });
    }

    const order = await Order.create(
      {
        orderNumber: generateOrderNumber(),
        userId,
        subtotal,
        total: subtotal, // shipping/tax would adjust this
        status: 'pending',
        shippingStreet: address.street,
        shippingCity: address.city,
        shippingCountry: address.country,
        shippingPostalCode: address.postalCode,
      },
      { transaction },
    );

    await OrderItem.bulkCreate(
      lines.map((l) => ({ ...l, orderId: order.id })),
      { transaction, validate: true },
    );

    // Decrement stock atomically for each line.
    for (const line of lines) {
      await Product.decrement('stock', {
        by: line.quantity,
        where: { id: line.productId },
        transaction,
      });
    }

    // The cart has become an order; empty it.
    await CartItem.destroy({ where: { cartId: cart.id }, transaction });

    return Order.findByPk(order.id, { include: orderInclude, transaction });
  });

/** Admin listing: paginated, filterable by status, searchable by order number. */
export const listAllOrders = async ({ page, perPage, sortBy, sortOrder, status, search }) => {
  const where = {};
  if (status) where.status = status;
  if (search) where.orderNumber = { [Op.like]: `%${String(search).replace(/[\\%_]/g, '\\$&')}%` };

  const { rows, count } = await Order.findAndCountAll({
    where,
    include: orderIncludeWithCustomer,
    order: [[sortBy, sortOrder.toUpperCase()]],
    limit: perPage,
    offset: (page - 1) * perPage,
    distinct: true,
  });

  return { rows, meta: paginationMeta({ page, perPage, total: count }) };
};

/** The caller's own orders. */
export const listMyOrders = async (userId, { page, perPage, sortBy, sortOrder, status }) => {
  const where = { userId };
  if (status) where.status = status;

  const { rows, count } = await Order.findAndCountAll({
    where,
    include: orderInclude,
    order: [[sortBy, sortOrder.toUpperCase()]],
    limit: perPage,
    offset: (page - 1) * perPage,
    distinct: true,
  });

  return { rows, meta: paginationMeta({ page, perPage, total: count }) };
};

export const getOrderFor = async (requester, orderId) => {
  const order = await Order.findByPk(orderId, { include: orderIncludeWithCustomer });
  if (!order) throw notFoundError('Order not found');

  const isOwner = order.userId !== null && Number(order.userId) === Number(requester.id);
  if (requester.role !== 'admin' && !isOwner) {
    throw forbidden('You may only view your own orders');
  }

  return order;
};

/**
 * Return an order's quantities to stock.
 *
 * Exported because two paths need it: an explicit cancellation, and a failed
 * payment settling as cancelled. Skips lines whose product has since been deleted
 * (product_id is NULL there).
 */
export const restockOrderItems = async (order, transaction) => {
  for (const item of order.items ?? []) {
    if (item.productId === null) continue;
    await Product.increment('stock', {
      by: Number(item.quantity),
      where: { id: item.productId },
      transaction,
    });
  }
};

/**
 * Status transitions.
 *
 * Guarded by the transition table on the model, so `cancelled -> paid` is
 * impossible (backend-spec.md defect #5). Validation is NOT disabled on save —
 * shipping data lives in plain snapshot columns, so the problem that made the
 * source project reach for that workaround does not arise here.
 */
export const updateOrderStatus = async (requester, orderId, nextStatus) =>
  sequelize.transaction(async (transaction) => {
    const order = await Order.findByPk(orderId, {
      include: orderInclude,
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    if (!order) throw notFoundError('Order not found');

    const isOwner = order.userId !== null && Number(order.userId) === Number(requester.id);
    const isAdmin = requester.role === 'admin';

    if (!isAdmin && !isOwner) throw forbidden('You may only modify your own orders');

    /**
     * A customer may only cancel, and only while still pending. Marking an order
     * paid is the payment provider's job via settlement — never a client's.
     */
    if (!isAdmin && !(nextStatus === 'cancelled' && order.status === 'pending')) {
      throw forbidden('You may only cancel an order while it is still pending');
    }

    if (!canTransition(order.status, nextStatus)) {
      throw conflict(`Cannot change status from "${order.status}" to "${nextStatus}"`);
    }

    // Cancelling an order that had already reduced stock must give it back.
    if (nextStatus === 'cancelled') {
      await restockOrderItems(order, transaction);
    }

    order.status = nextStatus;
    if (nextStatus === 'paid' && !order.paidAt) order.paidAt = new Date();
    await order.save({ transaction });

    return Order.findByPk(order.id, { include: orderInclude, transaction });
  });

export const deleteOrder = async (orderId) =>
  sequelize.transaction(async (transaction) => {
    const order = await Order.findByPk(orderId, { transaction });
    if (!order) throw notFoundError('Order not found');
    // order_items cascade via the FK.
    await order.destroy({ transaction });
    return true;
  });
