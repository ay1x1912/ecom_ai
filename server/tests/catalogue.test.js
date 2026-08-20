import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { api, seedActors, seedCatalogue, auth } from './helpers/api.js';
import { truncateAll, closeDb } from './helpers/db.js';

let adminToken;
let customerToken;
let category;
let brand;
let product;

beforeEach(async () => {
  await truncateAll();
  ({ adminToken, customerToken } = await seedActors());
  ({ category, brand, product } = await seedCatalogue({ price: 100, stock: 5, discountPercentage: 25 }));
});

afterAll(closeDb);

describe('public reads, admin writes', () => {
  it('serves catalogue reads without a token', async () => {
    for (const path of ['/api/products', '/api/categories', '/api/brands', '/api/banners']) {
      expect((await api().get(path)).status).toBe(200);
    }
  });

  it('refuses writes from anonymous and non-admin callers', async () => {
    const anon = await api().post('/api/brands').send({ name: 'Nope' });
    expect(anon.status).toBe(401);

    const customer = await api().post('/api/brands').set(auth(customerToken)).send({ name: 'Nope' });
    expect(customer.status).toBe(403);
  });

  it('rejects a duplicate name with 409', async () => {
    const res = await api().post('/api/brands').set(auth(adminToken)).send({ name: 'ACME' });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/already exists/i);
  });

  it('rejects an invalid category type', async () => {
    const res = await api().post('/api/categories').set(auth(adminToken))
      .send({ name: 'Nursery', categoryType: 'super-hot' });
    expect(res.status).toBe(400);
  });
});

describe('referential integrity surfaces as the right status', () => {
  it('returns 400 when a product references a category that does not exist', async () => {
    const res = await api().post('/api/products').set(auth(adminToken)).send({
      name: 'Ghost', price: 5, image: 'https://x.test/a.png',
      categoryId: 999999, brandId: brand.id,
    });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/does not exist/i);
  });

  it('returns 409 when deleting a category that still has products', async () => {
    const res = await api().delete(`/api/categories/${category.id}`).set(auth(adminToken));

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/still in use/i);
  });
});

describe('product listing', () => {
  it('computes the discounted price server-side', async () => {
    const res = await api().get(`/api/products/${product.id}`);
    expect(res.body.data.price).toBe(100);
    expect(res.body.data.finalPrice).toBe(75);
  });

  it('resolves by slug without the id route shadowing it', async () => {
    const res = await api().get('/api/products/slug/test-product');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(Number(product.id));
  });

  it('rejects a sort column outside the allow-list', async () => {
    expect((await api().get('/api/products?sortBy=stock')).status).toBe(400);
  });

  it('rejects an inverted price range', async () => {
    expect((await api().get('/api/products?minPrice=50&maxPrice=10')).status).toBe(400);
  });

  it('filters by price range and stock', async () => {
    const inRange = await api().get('/api/products?minPrice=50&maxPrice=150');
    expect(inRange.body.data).toHaveLength(1);

    const outOfStock = await api().get('/api/products?inStock=false');
    expect(outOfStock.body.data).toHaveLength(0);
  });
});

describe('upload signing', () => {
  it('requires an admin', async () => {
    const res = await api().post('/api/uploads/signature').set(auth(customerToken))
      .send({ contentType: 'image/png', size: 1024 });
    expect(res.status).toBe(403);
  });

  it('refuses a disallowed content type', async () => {
    const res = await api().post('/api/uploads/signature').set(auth(adminToken))
      .send({ contentType: 'application/x-sh', size: 1024 });
    expect(res.status).toBe(400);
  });

  it('refuses a file above the size cap', async () => {
    const res = await api().post('/api/uploads/signature').set(auth(adminToken))
      .send({ contentType: 'image/png', size: 6 * 1024 * 1024 });
    expect(res.status).toBe(400);
  });

  it('signs a valid request with a generated key and an expiry', async () => {
    const res = await api().post('/api/uploads/signature').set(auth(adminToken))
      .send({ contentType: 'image/webp', size: 2048, folder: 'products' });

    expect(res.status).toBe(200);
    expect(res.body.data.uploadUrl).toContain('X-Amz-Signature');
    // The key is generated, never taken from the client.
    expect(res.body.data.key).toMatch(/^products\/[0-9a-f-]{36}\.webp$/);
    expect(res.body.data.expiresIn).toBe(300);
  });
});
