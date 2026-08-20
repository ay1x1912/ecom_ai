import { QueryTypes } from 'sequelize';
import { sequelize, User, Product, Category, Brand, Order } from '../../models/index.js';
import { publicOrder } from '../../presenters/order.js';

/**
 * Dashboard aggregates.
 *
 * These are written as raw SQL rather than ORM calls because GROUP BY with LEFT
 * JOINs is clearer read as SQL, and Sequelize's aggregate helpers obscure it. No
 * caller input reaches a query fragment — the only variables are integer limits,
 * which are bound as replacements.
 *
 * Everything counts in the database. Loading rows to count them in JavaScript is
 * the thing this endpoint exists to avoid.
 */

const num = (v) => Number(v ?? 0);

/**
 * "Revenue" means money actually received: paid AND completed orders.
 *
 * The source project was vague here, which is how a dashboard ends up counting
 * pending baskets as income. Completed orders were paid before they shipped, so
 * excluding them would undercount.
 */
const EARNED_STATUSES = ['paid', 'completed'];

export const getStats = async ({ topLimit = 5, recentLimit = 5 } = {}) => {
  const [
    users,
    products,
    categories,
    brands,
    orders,
    ordersByStatus,
    usersByRole,
    productsByCategory,
    productsByBrand,
    stockRows,
    bestSellers,
    neverSold,
    recentOrders,
  ] = await Promise.all([
    User.count(),
    Product.count(),
    Category.count(),
    Brand.count(),
    Order.count(),

    sequelize.query(
      `SELECT status, COUNT(*) AS count, COALESCE(SUM(total), 0) AS total
         FROM orders
        GROUP BY status`,
      { type: QueryTypes.SELECT },
    ),

    sequelize.query(
      `SELECT role, COUNT(*) AS count FROM users GROUP BY role`,
      { type: QueryTypes.SELECT },
    ),

    // LEFT JOIN so a category with no products still appears, as a zero.
    sequelize.query(
      `SELECT c.id, c.name, COUNT(p.id) AS count
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id
        GROUP BY c.id, c.name
        ORDER BY count DESC, c.name ASC`,
      { type: QueryTypes.SELECT },
    ),

    sequelize.query(
      `SELECT b.id, b.name, COUNT(p.id) AS count
         FROM brands b
         LEFT JOIN products p ON p.brand_id = b.id
        GROUP BY b.id, b.name
        ORDER BY count DESC, b.name ASC`,
      { type: QueryTypes.SELECT },
    ),

    sequelize.query(
      `SELECT
         SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END)                AS outOfStock,
         SUM(CASE WHEN stock > 0 AND stock <= 5 THEN 1 ELSE 0 END) AS lowStock,
         COALESCE(SUM(stock), 0)                                   AS unitsOnHand
       FROM products`,
      { type: QueryTypes.SELECT },
    ),

    // Units are counted from order_items snapshots, so a deleted product still
    // shows the sales it made.
    sequelize.query(
      `SELECT oi.product_id AS productId, oi.name AS name,
              SUM(oi.quantity) AS unitsSold,
              SUM(oi.price * oi.quantity) AS revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
        WHERE o.status IN (:earned)
        GROUP BY oi.product_id, oi.name
        ORDER BY unitsSold DESC
        LIMIT :limit`,
      { type: QueryTypes.SELECT, replacements: { earned: EARNED_STATUSES, limit: topLimit } },
    ),

    // Products that have never appeared in a paid order — the dashboard's
    // "not moving" list.
    sequelize.query(
      `SELECT p.id, p.name, p.stock, p.price
         FROM products p
        WHERE NOT EXISTS (
                SELECT 1
                  FROM order_items oi
                  JOIN orders o ON o.id = oi.order_id
                 WHERE oi.product_id = p.id
                   AND o.status IN (:earned)
              )
        ORDER BY p.created_at DESC
        LIMIT :limit`,
      { type: QueryTypes.SELECT, replacements: { earned: EARNED_STATUSES, limit: topLimit } },
    ),

    Order.findAll({
      include: [
        { association: 'items' },
        { association: 'user', attributes: ['id', 'name', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: recentLimit,
    }),
  ]);

  const statusMap = Object.fromEntries(
    ordersByStatus.map((r) => [r.status, { count: num(r.count), total: num(r.total) }]),
  );
  const forStatus = (s) => statusMap[s] ?? { count: 0, total: 0 };

  const revenueEarned = EARNED_STATUSES.reduce((sum, s) => sum + forStatus(s).total, 0);
  const stock = stockRows[0] ?? {};

  return {
    totals: { users, products, categories, brands, orders },

    revenue: {
      // Money received. Pending is explicitly NOT revenue — it is a forecast.
      earned: Number(revenueEarned.toFixed(2)),
      pending: Number(forStatus('pending').total.toFixed(2)),
      cancelled: Number(forStatus('cancelled').total.toFixed(2)),
      averageOrderValue:
        forStatus('paid').count + forStatus('completed').count > 0
          ? Number(
              (revenueEarned / (forStatus('paid').count + forStatus('completed').count)).toFixed(2),
            )
          : 0,
    },

    orders: {
      byStatus: ['pending', 'paid', 'completed', 'cancelled'].map((status) => ({
        status,
        ...forStatus(status),
      })),
      recent: recentOrders.map(publicOrder),
    },

    users: {
      byRole: usersByRole.map((r) => ({ role: r.role, count: num(r.count) })),
    },

    products: {
      byCategory: productsByCategory.map((r) => ({
        id: num(r.id),
        name: r.name,
        count: num(r.count),
      })),
      byBrand: productsByBrand.map((r) => ({
        id: num(r.id),
        name: r.name,
        count: num(r.count),
      })),
      outOfStock: num(stock.outOfStock),
      lowStock: num(stock.lowStock),
      unitsOnHand: num(stock.unitsOnHand),
      bestSellers: bestSellers.map((r) => ({
        productId: r.productId === null ? null : num(r.productId),
        name: r.name,
        unitsSold: num(r.unitsSold),
        revenue: Number(num(r.revenue).toFixed(2)),
      })),
      neverSold: neverSold.map((r) => ({
        id: num(r.id),
        name: r.name,
        stock: num(r.stock),
        price: num(r.price),
      })),
    },
  };
};
