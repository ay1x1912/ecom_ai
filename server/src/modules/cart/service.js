import { sequelize, Cart, CartItem, Product } from '../../models/index.js';
import { badRequest, notFoundError, conflict } from '../../utils/AppError.js';
import { publicCart } from '../../presenters/cart.js';

/**
 * Every function here takes userId from the authenticated token — never from a
 * body or param. A cart endpoint that trusts a client-supplied user id is an
 * account-data leak.
 */

const cartInclude = [
  {
    association: 'items',
    include: [{ association: 'product', include: [{ association: 'category' }, { association: 'brand' }] }],
  },
];

/** Carts are created lazily: a user has one the first time they need one. */
const getOrCreateCart = async (userId, transaction) => {
  const [cart] = await Cart.findOrCreate({
    where: { userId },
    defaults: { userId },
    transaction,
  });
  return cart;
};

const loadCart = async (cartId, transaction) =>
  Cart.findByPk(cartId, { include: cartInclude, transaction, order: [['id', 'ASC']] });

export const getCart = async (userId) => {
  const cart = await getOrCreateCart(userId);
  return publicCart(await loadCart(cart.id));
};

export const addItem = async (userId, { productId, quantity }) =>
  sequelize.transaction(async (transaction) => {
    const product = await Product.findByPk(productId, { transaction });
    if (!product) throw notFoundError('Product not found');

    const cart = await getOrCreateCart(userId, transaction);

    const [item, created] = await CartItem.findOrCreate({
      where: { cartId: cart.id, productId },
      defaults: { cartId: cart.id, productId, quantity },
      transaction,
    });

    const resultingQuantity = created ? quantity : Number(item.quantity) + quantity;

    /**
     * Stock is CHECKED here but never reserved. Reserving at add-to-cart needs
     * expiry logic to release abandoned carts; the real reservation happens inside
     * the order transaction, under a row lock.
     */
    if (resultingQuantity > Number(product.stock)) {
      throw conflict(
        `Only ${product.stock} of "${product.name}" available (cart would have ${resultingQuantity})`,
      );
    }

    if (!created) {
      // Atomic UPDATE ... SET quantity = quantity + N, so two concurrent adds
      // cannot lose one another's increment the way read-modify-write would.
      await item.increment('quantity', { by: quantity, transaction });
    }

    return publicCart(await loadCart(cart.id, transaction));
  });

export const updateItemQuantity = async (userId, productId, quantity) =>
  sequelize.transaction(async (transaction) => {
    const cart = await getOrCreateCart(userId, transaction);

    // Scoped by this user's cart id, so another user's line cannot be targeted.
    const item = await CartItem.findOne({
      where: { cartId: cart.id, productId },
      transaction,
    });
    if (!item) throw notFoundError('Item not in cart');

    const product = await Product.findByPk(productId, { transaction });
    if (!product) throw notFoundError('Product not found');

    if (quantity > Number(product.stock)) {
      throw conflict(`Only ${product.stock} of "${product.name}" available`);
    }

    item.quantity = quantity;
    await item.save({ transaction });

    return publicCart(await loadCart(cart.id, transaction));
  });

export const removeItem = async (userId, productId) =>
  sequelize.transaction(async (transaction) => {
    const cart = await getOrCreateCart(userId, transaction);

    const deleted = await CartItem.destroy({
      where: { cartId: cart.id, productId },
      transaction,
    });
    if (deleted === 0) throw notFoundError('Item not in cart');

    return publicCart(await loadCart(cart.id, transaction));
  });

export const clearCart = async (userId) =>
  sequelize.transaction(async (transaction) => {
    const cart = await getOrCreateCart(userId, transaction);
    await CartItem.destroy({ where: { cartId: cart.id }, transaction });
    return publicCart(await loadCart(cart.id, transaction));
  });

/**
 * Used by order creation. Returns the raw rows (not a presenter shape) because the
 * order service needs the model instances to lock and re-price them.
 */
export const getCartItemsForOrder = async (userId, transaction) => {
  const cart = await Cart.findOne({ where: { userId }, transaction });
  if (!cart) throw badRequest('Your cart is empty');

  const items = await CartItem.findAll({
    where: { cartId: cart.id },
    transaction,
    order: [['productId', 'ASC']],
  });

  if (items.length === 0) throw badRequest('Your cart is empty');
  return { cart, items };
};
