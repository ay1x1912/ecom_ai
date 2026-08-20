import { sequelize } from '../config/database.js';

import { User } from './User.js';
import { Address } from './Address.js';
import { Category, CATEGORY_TYPES } from './Category.js';
import { Brand } from './Brand.js';
import { Product } from './Product.js';
import { ProductRating } from './ProductRating.js';
import { Banner } from './Banner.js';
import { Cart } from './Cart.js';
import { CartItem } from './CartItem.js';
import { WishlistItem } from './WishlistItem.js';
import { Order, ORDER_STATUSES, ORDER_TRANSITIONS, canTransition } from './Order.js';
import { OrderItem } from './OrderItem.js';

/**
 * Associations live here, not in the individual model files, so there is one
 * place to read the shape of the domain and no import cycles between models.
 *
 * onDelete/onUpdate are declared in the migrations — the database enforces them.
 * Repeating them here only affects Sequelize-level cascades, so they're omitted
 * to keep a single source of truth.
 */

// Users
User.hasMany(Address, { foreignKey: 'userId', as: 'addresses' });
Address.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(Cart, { foreignKey: 'userId', as: 'cart' });
Cart.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(ProductRating, { foreignKey: 'userId', as: 'ratings' });
ProductRating.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Wishlist: a real join table, so it's exposed both ways — as rows (for
// idempotent insert/delete) and as a many-to-many (for hydrated reads).
User.hasMany(WishlistItem, { foreignKey: 'userId', as: 'wishlistItems' });
WishlistItem.belongsTo(User, { foreignKey: 'userId', as: 'user' });
WishlistItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasMany(WishlistItem, { foreignKey: 'productId', as: 'wishlistItems' });

User.belongsToMany(Product, {
  through: WishlistItem,
  foreignKey: 'userId',
  otherKey: 'productId',
  as: 'wishlistProducts',
});
Product.belongsToMany(User, {
  through: WishlistItem,
  foreignKey: 'productId',
  otherKey: 'userId',
  as: 'wishlistedBy',
});

// Catalogue
Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

Brand.hasMany(Product, { foreignKey: 'brandId', as: 'products' });
Product.belongsTo(Brand, { foreignKey: 'brandId', as: 'brand' });

Product.hasMany(ProductRating, { foreignKey: 'productId', as: 'ratings' });
ProductRating.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// Cart
Cart.hasMany(CartItem, { foreignKey: 'cartId', as: 'items' });
CartItem.belongsTo(Cart, { foreignKey: 'cartId', as: 'cart' });

CartItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasMany(CartItem, { foreignKey: 'productId', as: 'cartItems' });

// Orders
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems' });

export {
  sequelize,
  User,
  Address,
  Category,
  Brand,
  Product,
  ProductRating,
  Banner,
  Cart,
  CartItem,
  WishlistItem,
  Order,
  OrderItem,
  // Domain constants live with their models; re-exported so modules have one
  // import site for everything data-layer.
  CATEGORY_TYPES,
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
  canTransition,
};

export const models = {
  User,
  Address,
  Category,
  Brand,
  Product,
  ProductRating,
  Banner,
  Cart,
  CartItem,
  WishlistItem,
  Order,
  OrderItem,
};
