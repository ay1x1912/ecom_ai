import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { api, seedActors, seedCatalogue, auth, registerShopper } from './helpers/api.js';
import { truncateAll, closeDb } from './helpers/db.js';
import { Product } from '../src/models/index.js';

let product;

beforeEach(async () => {
  await truncateAll();
  await seedActors();
  ({ product } = await seedCatalogue({ price: 200, stock: 10 }));
});

afterAll(closeDb);

/** Place a pending order and open a checkout session for it. */
const startCheckout = async (email, quantity = 1) => {
  const shopper = await registerShopper(email);
  await api().post('/api/cart').set(auth(shopper.token))
    .send({ productId: product.id, quantity });
  const order = await api().post('/api/orders').set(auth(shopper.token))
    .send({ addressId: shopper.addressId });
  const session = await api().post('/api/payment/checkout-session')
    .set(auth(shopper.token)).send({ orderId: order.body.data.id });

  return { ...shopper, order: order.body.data, session: session.body.data };
};

const settle = (sessionId, outcome, eventId) =>
  api().post('/api/payment/mock/settle').send({ sessionId, outcome, eventId });

describe('checkout session', () => {
  it('charges the amount stored on the order', async () => {
    const { session } = await startCheckout('pay1@test.local');

    expect(session.provider).toBe('mock');
    expect(session.amount).toBe(200);
    expect(session.sessionId).toMatch(/^mock_sess_/);
  });

  it('refuses to open checkout for someone else’s order', async () => {
    const { order } = await startCheckout('pay2@test.local');
    const other = await registerShopper('pay3@test.local');

    const res = await api().post('/api/payment/checkout-session')
      .set(auth(other.token)).send({ orderId: order.id });

    expect(res.status).toBe(403);
  });

  it('refuses to re-open checkout on a paid order', async () => {
    const { order, session, token } = await startCheckout('pay4@test.local');
    await settle(session.sessionId, 'success', 'evt-1');

    const res = await api().post('/api/payment/checkout-session')
      .set(auth(token)).send({ orderId: order.id });

    expect(res.status).toBe(409);
  });
});

describe('settlement', () => {
  it('marks the order paid and records when', async () => {
    const { session } = await startCheckout('pay5@test.local');
    const res = await settle(session.sessionId, 'success', 'evt-2');

    expect(res.status).toBe(200);
    expect(res.body.data.order.status).toBe('paid');
    expect(res.body.data.order.payment.paidAt).toBeTruthy();
    expect(res.body.data.alreadyProcessed).toBe(false);
  });

  /**
   * Gateways retry. A duplicate delivery must not settle twice, and the response
   * must report exactly what was stored — the paidAt returned here has to match a
   * later read, which is what caught the DATETIME truncation bug.
   */
  it('is idempotent on a repeated delivery', async () => {
    const { session } = await startCheckout('pay6@test.local');

    const first = await settle(session.sessionId, 'success', 'evt-3');
    const replay = await settle(session.sessionId, 'success', 'evt-3');

    expect(replay.status).toBe(200);
    expect(replay.body.data.alreadyProcessed).toBe(true);
    expect(replay.body.data.order.payment.paidAt).toBe(first.body.data.order.payment.paidAt);
  });

  it('settles once even when six deliveries arrive at the same moment', async () => {
    const { session, order, token } = await startCheckout('pay7@test.local');

    const results = await Promise.all(
      Array.from({ length: 6 }, () => settle(session.sessionId, 'success', 'evt-race')),
    );

    const settled = results.filter((r) => r.body.data.alreadyProcessed === false);
    expect(settled).toHaveLength(1);

    const fresh = await api().get(`/api/orders/${order.id}`).set(auth(token));
    expect(fresh.body.data.status).toBe('paid');
  });

  it('cancels and restocks when payment fails', async () => {
    const before = await Product.findByPk(product.id);
    const { session } = await startCheckout('pay8@test.local', 3);
    const during = await Product.findByPk(product.id);
    expect(Number(during.stock)).toBe(Number(before.stock) - 3);

    const res = await settle(session.sessionId, 'failure', 'evt-4');

    expect(res.body.data.order.status).toBe('cancelled');
    const after = await Product.findByPk(product.id);
    expect(Number(after.stock)).toBe(Number(before.stock));
  });

  it('rejects an unknown session', async () => {
    const res = await settle('mock_sess_does_not_exist', 'success', 'evt-5');
    expect(res.status).toBe(400);
  });
});
