import request from 'supertest';
import { app } from '../../src/app.js';
import { User, Category, Brand, Product } from '../../src/models/index.js';

export const api = () => request(app);

export const json = (req) => req.set('Content-Type', 'application/json');

/** Create a user directly, bypassing the API — hooks still hash the password. */
export const createUser = async ({
  name = 'Test User',
  email = 'user@test.local',
  password = 'password123',
  role = 'user',
} = {}) => {
  const user = await User.create({ name, email, password, role });
  return { user, password };
};

export const loginAs = async (email, password) => {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data.token;
};

export const auth = (token) => ({ Authorization: `Bearer ${token}` });

/** An admin plus a customer, both logged in. The usual starting point. */
export const seedActors = async () => {
  await createUser({ name: 'Admin', email: 'admin@test.local', password: 'admin12345', role: 'admin' });
  await createUser({ name: 'Customer', email: 'customer@test.local', password: 'customer12345' });

  return {
    adminToken: await loginAs('admin@test.local', 'admin12345'),
    customerToken: await loginAs('customer@test.local', 'customer12345'),
  };
};

/** One category, one brand, one product — enough to order something. */
export const seedCatalogue = async ({ price = 100, stock = 10, discountPercentage = 0 } = {}) => {
  const category = await Category.create({ name: 'Toys', categoryType: 'featured' });
  const brand = await Brand.create({ name: 'ACME' });
  const product = await Product.create({
    name: 'Test Product',
    slug: 'test-product',
    price,
    discountPercentage,
    stock,
    image: 'https://example.test/p.png',
    categoryId: category.id,
    brandId: brand.id,
  });
  return { category, brand, product };
};

/** Register through the API so the caller gets a token and a default address. */
export const registerShopper = async (email = 'shopper@test.local') => {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Shopper',
    email,
    password: 'shopper12345',
    address: { street: '1 Test St', city: 'Dhaka', country: 'BD', postalCode: '1216' },
  });
  const token = res.body.data.token;
  const profile = await request(app).get('/api/auth/profile').set(auth(token));
  return {
    token,
    userId: profile.body.data.id,
    addressId: profile.body.data.addresses[0].id,
  };
};
