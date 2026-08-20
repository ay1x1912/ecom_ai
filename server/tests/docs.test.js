import { describe, it, expect, afterAll } from 'vitest';
import { api } from './helpers/api.js';
import { closeDb } from './helpers/db.js';
import { buildOpenApiDocument } from '../src/docs/openapi.js';

const doc = buildOpenApiDocument();

const body = (path, method) =>
  doc.paths[path][method].requestBody.content['application/json'].schema;

const params = (path, method) =>
  Object.fromEntries((doc.paths[path][method].parameters ?? []).map((p) => [p.name, p.schema]));

afterAll(closeDb);

describe('OpenAPI document', () => {
  it('generates without throwing and covers every mounted resource', () => {
    const paths = Object.keys(doc.paths);
    for (const base of [
      '/api/auth/login',
      '/api/users',
      '/api/products',
      '/api/categories',
      '/api/brands',
      '/api/banners',
      '/api/cart',
      '/api/wishlist',
      '/api/orders',
      '/api/payment/checkout-session',
      '/api/uploads/signature',
      '/api/stats',
    ]) {
      expect(paths).toContain(base);
    }
  });

  it('declares bearer auth and applies it to protected routes only', () => {
    expect(doc.components.securitySchemes.bearerAuth).toMatchObject({
      type: 'http',
      scheme: 'bearer',
    });
    // Public catalogue read.
    expect(doc.paths['/api/products'].get.security).toBeUndefined();
    // Admin-only listing.
    expect(doc.paths['/api/users'].get.security).toEqual([{ bearerAuth: [] }]);
  });
});

/**
 * These assertions are the point of generating docs from the validators: each one
 * fails if a schema changes without the documentation following. They are the
 * guard against the drift that made the source project's hand-written annotations
 * untrustworthy.
 */
describe('documentation cannot drift from validation', () => {
  it('does not advertise a role field on public registration', () => {
    const props = body('/api/auth/register', 'post').properties;
    expect(Object.keys(props).sort()).toEqual(['address', 'email', 'name', 'password']);
    expect(props.role).toBeUndefined();
  });

  it('publishes the same perPage ceiling the API enforces', () => {
    expect(params('/api/users', 'get').perPage).toMatchObject({ maximum: 100, default: 20 });
  });

  it('publishes the 90% discount ceiling', () => {
    const props = body('/api/products', 'post').properties;
    expect(props.discountPercentage).toMatchObject({ minimum: 0, maximum: 90 });
  });

  it('publishes the exact upload allow-list and size cap', () => {
    const props = body('/api/uploads/signature', 'post').properties;
    expect(props.contentType.enum).toEqual(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
    expect(props.size.maximum).toBe(5 * 1024 * 1024);
  });

  it('publishes the real order status values', () => {
    expect(body('/api/orders/{id}/status', 'put').properties.status.enum).toEqual([
      'pending',
      'paid',
      'completed',
      'cancelled',
    ]);
  });
});

describe('docs endpoints', () => {
  it('serves the spec as JSON', async () => {
    const res = await api().get('/api/docs/json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.0');
    expect(res.body.info.title).toBe('BabyMart API');
  });

  it('serves the Swagger UI page', async () => {
    const res = await api().get('/api/docs/').redirects(1);
    expect(res.status).toBe(200);
    expect(res.text).toContain('BabyMart API');
  });
});
