import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { api, seedActors, seedCatalogue, auth, registerShopper } from './helpers/api.js';
import { truncateAll, closeDb } from './helpers/db.js';
import { Product } from '../src/models/index.js';

let adminToken;
let product;

beforeEach(async () => {
  await truncateAll();
  ({ adminToken } = await seedActors());
  ({ product } = await seedCatalogue({ price: 100, stock: 10, discountPercentage: 10 }));
});

afterAll(closeDb);

const addToCart = (token, productId, quantity = 1) =>
  api().post('/api/cart').set(auth(token)).send({ productId, quantity });

describe('cart', () => {
  it('prices lines from the live discounted price', async () => {
    const { token } = await registerShopper('cart1@test.local');
    const res = await addToCart(token, product.id, 2);

    expect(res.status).toBe(201);
    // 100 at 10% off = 90
    expect(res.body.data.items[0].unitPrice).toBe(90);
    expect(res.body.data.subtotal).toBe(180);
  });

  it('increments an existing line rather than duplicating it', async () => {
    const { token } = await registerShopper('cart2@test.local');
    await addToCart(token, product.id, 2);
    const res = await addToCart(token, product.id, 1);

    expect(res.body.data.itemCount).toBe(1);
    expect(res.body.data.totalQuantity).toBe(3);
  });

  it('refuses to exceed available stock', async () => {
    const { token } = await registerShopper('cart3@test.local');
    // Within the per-request schema cap (100) but above the 10 in stock, so this
    // exercises the stock check rather than the validation layer.
    const res = await addToCart(token, product.id, 50);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/available/i);
  });

  it('rejects an absurd quantity at the schema, before touching stock', async () => {
    const { token } = await registerShopper('cart3b@test.local');
    const res = await addToCart(token, product.id, 999);
    expect(res.status).toBe(400);
    expect(res.body.error.fields[0].path).toBe('quantity');
  });

  it('keeps one user’s cart invisible to another', async () => {
    const a = await registerShopper('cart4@test.local');
    const b = await registerShopper('cart5@test.local');
    await addToCart(a.token, product.id, 2);

    const res = await api().get('/api/cart').set(auth(b.token));
    expect(res.body.data.itemCount).toBe(0);
  });
});

describe('order creation', () => {
  it('computes the total server-side and snapshots the address', async () => {
    const { token, addressId } = await registerShopper('ord1@test.local');
    await addToCart(token, product.id, 2);

    const res = await api().post('/api/orders').set(auth(token)).send({ addressId });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.total).toBe(180);
    expect(res.body.data.items[0].price).toBe(90);
    expect(res.body.data.shippingAddress.street).toBe('1 Test St');
  });

  /** backend-spec.md defect #3 — the source project trusted client-sent totals. */
  it('IGNORES prices and totals sent by the client', async () => {
    const { token, addressId } = await registerShopper('ord2@test.local');
    await addToCart(token, product.id, 1);

    const res = await api().post('/api/orders').set(auth(token)).send({
      addressId,
      total: 0.01,
      subtotal: 0.01,
      items: [{ productId: product.id, price: 0.01, quantity: 1 }],
    });

    expect(res.status).toBe(201);
    expect(res.body.data.total).toBe(90);
  });

  it('empties the cart and decrements stock', async () => {
    const { token, addressId } = await registerShopper('ord3@test.local');
    await addToCart(token, product.id, 3);
    await api().post('/api/orders').set(auth(token)).send({ addressId });

    const cart = await api().get('/api/cart').set(auth(token));
    expect(cart.body.data.itemCount).toBe(0);

    const fresh = await Product.findByPk(product.id);
    expect(Number(fresh.stock)).toBe(7);
  });

  it('rejects an address belonging to someone else', async () => {
    const owner = await registerShopper('ord4@test.local');
    const other = await registerShopper('ord5@test.local');
    await addToCart(other.token, product.id, 1);

    const res = await api().post('/api/orders').set(auth(other.token))
      .send({ addressId: owner.addressId });

    expect(res.status).toBe(404);
  });

  it('refuses to order an empty cart', async () => {
    const { token, addressId } = await registerShopper('ord6@test.local');
    const res = await api().post('/api/orders').set(auth(token)).send({ addressId });
    expect(res.status).toBe(400);
  });
});

describe('stock under concurrency (defect #10)', () => {
  /**
   * The test that decides whether this backend oversells. Without SELECT ... FOR
   * UPDATE every one of these reads the same stock value and every one succeeds.
   */
  it('never sells more than the available stock', async () => {
    await Product.update({ stock: 3 }, { where: { id: product.id } });

    const shoppers = [];
    for (let i = 0; i < 6; i += 1) {
      const s = await registerShopper(`race${i}@test.local`);
      await addToCart(s.token, product.id, 1);
      shoppers.push(s);
    }

    const results = await Promise.all(
      shoppers.map((s) =>
        api().post('/api/orders').set(auth(s.token)).send({ addressId: s.addressId }),
      ),
    );

    const created = results.filter((r) => r.status === 201);
    const rejected = results.filter((r) => r.status === 409);

    expect(created).toHaveLength(3);
    expect(rejected).toHaveLength(3);

    const fresh = await Product.findByPk(product.id);
    expect(Number(fresh.stock)).toBe(0);
  });
});

describe('order status transitions (defect #5)', () => {
  const placeOrder = async (email) => {
    const s = await registerShopper(email);
    await addToCart(s.token, product.id, 1);
    const res = await api().post('/api/orders').set(auth(s.token)).send({ addressId: s.addressId });
    return { ...s, order: res.body.data };
  };

  it('refuses illegal jumps and honours terminal states', async () => {
    const { order } = await placeOrder('tr1@test.local');

    const skip = await api().put(`/api/orders/${order.id}/status`)
      .set(auth(adminToken)).send({ status: 'completed' });
    expect(skip.status).toBe(409);

    const paid = await api().put(`/api/orders/${order.id}/status`)
      .set(auth(adminToken)).send({ status: 'paid' });
    expect(paid.status).toBe(200);
    expect(paid.body.data.payment.paidAt).toBeTruthy();

    const done = await api().put(`/api/orders/${order.id}/status`)
      .set(auth(adminToken)).send({ status: 'completed' });
    expect(done.status).toBe(200);

    const reopen = await api().put(`/api/orders/${order.id}/status`)
      .set(auth(adminToken)).send({ status: 'cancelled' });
    expect(reopen.status).toBe(409);
  });

  it('does not let a customer mark their own order paid', async () => {
    const { token, order } = await placeOrder('tr2@test.local');

    const res = await api().put(`/api/orders/${order.id}/status`)
      .set(auth(token)).send({ status: 'paid' });

    expect(res.status).toBe(403);
  });

  it('lets the owner cancel while pending, and restocks', async () => {
    const { token, order } = await placeOrder('tr3@test.local');
    const before = await Product.findByPk(product.id);

    const res = await api().put(`/api/orders/${order.id}/status`)
      .set(auth(token)).send({ status: 'cancelled' });

    expect(res.status).toBe(200);
    const after = await Product.findByPk(product.id);
    expect(Number(after.stock)).toBe(Number(before.stock) + 1);
  });

  it('hides one customer’s order from another', async () => {
    const { order } = await placeOrder('tr4@test.local');
    const nosy = await registerShopper('tr5@test.local');

    expect((await api().get(`/api/orders/${order.id}`).set(auth(nosy.token))).status).toBe(403);
    expect((await api().get(`/api/orders/${order.id}`).set(auth(adminToken))).status).toBe(200);
    expect((await api().get('/api/orders').set(auth(nosy.token))).status).toBe(403);
  });
});
