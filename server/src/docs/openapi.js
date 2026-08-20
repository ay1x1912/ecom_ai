import { z } from 'zod';
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';

import { env } from '../config/env.js';
import { isMockProvider } from '../modules/payments/providers/index.js';

// Request schemas — these are the EXACT objects the routes validate against.
import { registerSchema, loginSchema } from '../modules/auth/schema.js';
import {
  userListQuerySchema,
  createUserSchema,
  updateUserAdminSchema,
  userIdParamSchema,
  addressBodySchema,
  addressUpdateSchema,
  addressParamsSchema,
} from '../modules/users/schema.js';
import {
  productBodySchema,
  productUpdateSchema,
  productQuerySchema,
  productIdParamSchema,
  productSlugParamSchema,
} from '../modules/products/schema.js';
import {
  bodySchema as categoryBody,
  updateSchema as categoryUpdate,
  querySchema as categoryQuery,
} from '../modules/categories/index.js';
import {
  bodySchema as brandBody,
  updateSchema as brandUpdate,
  querySchema as brandQuery,
} from '../modules/brands/index.js';
import {
  bodySchema as bannerBody,
  updateSchema as bannerUpdate,
  querySchema as bannerQuery,
} from '../modules/banners/index.js';
import {
  addItemSchema,
  updateItemSchema,
  productIdParam as cartProductParam,
} from '../modules/cart/index.js';
import { addSchema as wishlistAdd, productIdParam as wishProductParam } from '../modules/wishlist/index.js';
import {
  createSchema as orderCreate,
  statusSchema as orderStatus,
  querySchema as orderQuery,
} from '../modules/orders/index.js';
import { checkoutSchema, mockSettleSchema } from '../modules/payments/index.js';
import { querySchema as statsQuery } from '../modules/stats/index.js';
import { signatureSchema } from '../modules/uploads/index.js';
import { idParamSchema } from '../middleware/validate.js';

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description: 'Paste the token returned by POST /api/auth/login.',
});

/**
 * `.refine()` wraps a schema in ZodEffects, which the generator cannot introspect
 * for parameters. Unwrap to the underlying object for documentation purposes; the
 * refinement still runs at request time, it simply is not expressible in OpenAPI.
 */
const plain = (schema) => {
  let s = schema;
  while (s?._def?.typeName === 'ZodEffects') s = s._def.schema;
  return s;
};

/* ------------------------------------------------------------------ *
 * Response shapes.
 *
 * NOTE: unlike the request schemas above, these are written for the docs
 * rather than derived from running code — the response shapes live in
 * src/presenters/*. Treat them as descriptive, not authoritative.
 * ------------------------------------------------------------------ */
const metaSchema = z
  .object({ page: z.number(), perPage: z.number(), total: z.number(), totalPages: z.number() })
  .openapi('PaginationMeta');

const envelope = (data, { paginated = false } = {}) =>
  z.object({ data, ...(paginated ? { meta: metaSchema } : {}) });

const errorSchema = z
  .object({
    error: z.object({
      message: z.string(),
      fields: z
        .array(z.object({ path: z.string(), message: z.string() }))
        .optional(),
    }),
  })
  .openapi('ErrorResponse');

const userSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    avatar: z.string().nullable(),
    role: z.enum(['admin', 'user', 'deliveryman']),
    createdAt: z.string(),
  })
  .openapi('User');

const addressSchema = z
  .object({
    id: z.number(),
    street: z.string(),
    city: z.string(),
    country: z.string(),
    postalCode: z.string(),
    isDefault: z.boolean(),
    note: z.string().nullable(),
  })
  .openapi('Address');

const productSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    price: z.number(),
    discountPercentage: z.number(),
    finalPrice: z.number().describe('Price after discount, computed server-side'),
    stock: z.number(),
    inStock: z.boolean(),
    image: z.string(),
    averageRating: z.number(),
    ratingsCount: z.number(),
  })
  .openapi('Product');

const cartSchema = z
  .object({
    id: z.number(),
    items: z.array(
      z.object({
        productId: z.number(),
        quantity: z.number(),
        unitPrice: z.number(),
        lineTotal: z.number(),
        availableStock: z.number(),
        inStock: z.boolean(),
      }),
    ),
    itemCount: z.number(),
    totalQuantity: z.number(),
    subtotal: z.number(),
    orderable: z.boolean(),
  })
  .openapi('Cart');

const orderSchema = z
  .object({
    id: z.number(),
    orderNumber: z.string(),
    userId: z.number().nullable(),
    status: z.enum(['pending', 'paid', 'completed', 'cancelled']),
    subtotal: z.number(),
    total: z.number(),
    shippingAddress: z.object({
      street: z.string(),
      city: z.string(),
      country: z.string(),
      postalCode: z.string(),
    }),
    payment: z.object({
      provider: z.string().nullable(),
      reference: z.string().nullable(),
      paidAt: z.string().nullable(),
    }),
    items: z.array(
      z.object({
        id: z.number(),
        productId: z.number().nullable(),
        name: z.string(),
        price: z.number(),
        quantity: z.number(),
        lineTotal: z.number(),
      }),
    ),
  })
  .openapi('Order');

const messageSchema = z.object({ message: z.string() });

const json = (schema) => ({ content: { 'application/json': { schema } } });

const ERRORS = {
  400: { description: 'Validation failed or malformed request', ...json(errorSchema) },
  401: { description: 'Missing or invalid token', ...json(errorSchema) },
  403: { description: 'Authenticated but not permitted', ...json(errorSchema) },
  404: { description: 'Not found', ...json(errorSchema) },
  409: { description: 'Conflict with existing state', ...json(errorSchema) },
  429: { description: 'Rate limit exceeded', ...json(errorSchema) },
};

const pick = (...codes) => Object.fromEntries(codes.map((c) => [c, ERRORS[c]]));

/** Compact helper so each route reads as one declaration. */
const route = ({
  method,
  path,
  tag,
  summary,
  description,
  auth = 'none', // none | user | admin
  params,
  query,
  body,
  ok: okDef,
  errors = [],
}) => {
  const failures = new Set(errors);
  if (auth !== 'none') {
    failures.add(401);
    if (auth === 'admin') failures.add(403);
  }
  if (body || query || params) failures.add(400);

  registry.registerPath({
    method,
    path,
    tags: [tag],
    summary,
    description:
      auth === 'admin' ? `${description ?? summary}\n\n**Requires an admin token.**` : description,
    security: auth === 'none' ? undefined : [{ [bearerAuth.name]: [] }],
    request: {
      ...(params ? { params: plain(params) } : {}),
      ...(query ? { query: plain(query) } : {}),
      ...(body ? { body: { content: { 'application/json': { schema: plain(body) } } } } : {}),
    },
    responses: {
      [okDef.status ?? 200]: { description: okDef.description, ...json(okDef.schema) },
      ...pick(...failures),
    },
  });
};

/* ----------------------------- Auth ----------------------------- */
const authPayload = envelope(z.object({ user: userSchema, token: z.string() }));

route({
  method: 'post', path: '/api/auth/register', tag: 'Auth',
  summary: 'Register a new account',
  description:
    'A submitted `role` is ignored — the field is stripped, so accounts can never self-promote. Admins are created by an existing admin or by the seeder.',
  body: registerSchema,
  ok: { status: 201, description: 'Account created', schema: authPayload },
  errors: [409, 429],
});

route({
  method: 'post', path: '/api/auth/login', tag: 'Auth',
  summary: 'Exchange credentials for a JWT',
  description:
    'Returns the same message for an unknown email and a wrong password, so the endpoint cannot be used to discover which addresses are registered.',
  body: loginSchema,
  ok: { description: 'Authenticated', schema: authPayload },
  errors: [401, 429],
});

route({
  method: 'get', path: '/api/auth/profile', tag: 'Auth', auth: 'user',
  summary: 'The caller’s own account',
  description: 'Authoritative re-read: cart, addresses and role drift after login.',
  ok: { description: 'Current user', schema: envelope(userSchema.extend({ addresses: z.array(addressSchema) })) },
  errors: [404],
});

route({
  method: 'post', path: '/api/auth/logout', tag: 'Auth', auth: 'user',
  summary: 'Log out',
  description: 'Stateless JWTs hold no server session; the client discards the token.',
  ok: { description: 'Logged out', schema: envelope(messageSchema) },
});

/* ----------------------------- Users ---------------------------- */
route({
  method: 'get', path: '/api/users', tag: 'Users', auth: 'admin',
  summary: 'List users', query: userListQuerySchema,
  ok: { description: 'Users', schema: envelope(z.array(userSchema), { paginated: true }) },
});

route({
  method: 'post', path: '/api/users', tag: 'Users', auth: 'admin',
  summary: 'Create a user',
  description: 'The only endpoint permitted to assign a role.',
  body: createUserSchema,
  ok: { status: 201, description: 'Created', schema: envelope(userSchema) },
  errors: [409],
});

route({
  method: 'get', path: '/api/users/{id}', tag: 'Users', auth: 'user',
  summary: 'Read one user', description: 'The user themselves, or an admin.',
  params: userIdParamSchema,
  ok: { description: 'User', schema: envelope(userSchema.extend({ addresses: z.array(addressSchema) })) },
  errors: [403, 404],
});

route({
  method: 'put', path: '/api/users/{id}', tag: 'Users', auth: 'user',
  summary: 'Update a user',
  description:
    'Self or admin. `role` is accepted only from admins — for anyone else the field is stripped, so a self-update cannot escalate privileges.',
  params: userIdParamSchema, body: updateUserAdminSchema,
  ok: { description: 'Updated', schema: envelope(userSchema) },
  errors: [403, 404, 409],
});

route({
  method: 'delete', path: '/api/users/{id}', tag: 'Users', auth: 'admin',
  summary: 'Delete a user',
  description: 'Addresses, cart and wishlist cascade. Orders are retained with the user reference nulled.',
  params: userIdParamSchema,
  ok: { description: 'Deleted', schema: envelope(messageSchema) },
  errors: [404],
});

route({
  method: 'get', path: '/api/users/{id}/addresses', tag: 'Users', auth: 'user',
  summary: 'List a user’s addresses', params: userIdParamSchema,
  ok: { description: 'Addresses', schema: envelope(z.array(addressSchema)) },
  errors: [403, 404],
});

route({
  method: 'post', path: '/api/users/{id}/addresses', tag: 'Users', auth: 'user',
  summary: 'Add an address',
  description: 'The first address is always the default, and only one address is ever default.',
  params: userIdParamSchema, body: addressBodySchema,
  ok: { status: 201, description: 'Created', schema: envelope(addressSchema) },
  errors: [403, 404],
});

route({
  method: 'put', path: '/api/users/{id}/addresses/{addressId}', tag: 'Users', auth: 'user',
  summary: 'Update an address', params: addressParamsSchema, body: addressUpdateSchema,
  ok: { description: 'Updated', schema: envelope(addressSchema) },
  errors: [403, 404],
});

route({
  method: 'delete', path: '/api/users/{id}/addresses/{addressId}', tag: 'Users', auth: 'user',
  summary: 'Delete an address',
  description: 'If the deleted address was the default, the oldest remaining one is promoted.',
  params: addressParamsSchema,
  ok: { status: 204, description: 'Deleted', schema: z.object({}) },
  errors: [403, 404],
});

/* --------------------------- Catalogue -------------------------- */
const catalogue = [
  {
    tag: 'Products', base: '/api/products', entity: productSchema,
    body: productBodySchema, update: productUpdateSchema, query: productQuerySchema,
    params: productIdParamSchema,
  },
  {
    tag: 'Categories', base: '/api/categories',
    entity: z.object({ id: z.number(), name: z.string(), image: z.string().nullable(), categoryType: z.string() }).openapi('Category'),
    body: categoryBody, update: categoryUpdate, query: categoryQuery, params: idParamSchema,
  },
  {
    tag: 'Brands', base: '/api/brands',
    entity: z.object({ id: z.number(), name: z.string(), image: z.string().nullable() }).openapi('Brand'),
    body: brandBody, update: brandUpdate, query: brandQuery, params: idParamSchema,
  },
  {
    tag: 'Banners', base: '/api/banners',
    entity: z.object({ id: z.number(), name: z.string(), title: z.string().nullable(), startFrom: z.string().nullable(), image: z.string().nullable(), bannerType: z.string().nullable() }).openapi('Banner'),
    body: bannerBody, update: bannerUpdate, query: bannerQuery, params: idParamSchema,
  },
];

for (const r of catalogue) {
  route({
    method: 'get', path: r.base, tag: r.tag, summary: `List ${r.tag.toLowerCase()}`,
    description: 'Public read.', query: r.query,
    ok: { description: r.tag, schema: envelope(z.array(r.entity), { paginated: true }) },
  });
  route({
    method: 'post', path: r.base, tag: r.tag, auth: 'admin', summary: `Create a ${r.tag.slice(0, -1).toLowerCase()}`,
    body: r.body,
    ok: { status: 201, description: 'Created', schema: envelope(r.entity) },
    errors: [409],
  });
  route({
    method: 'get', path: `${r.base}/{id}`, tag: r.tag, summary: `Read one`,
    description: 'Public read.', params: r.params,
    ok: { description: r.tag, schema: envelope(r.entity) },
    errors: [404],
  });
  route({
    method: 'put', path: `${r.base}/{id}`, tag: r.tag, auth: 'admin', summary: 'Update',
    params: r.params, body: r.update,
    ok: { description: 'Updated', schema: envelope(r.entity) },
    errors: [404, 409],
  });
  route({
    method: 'delete', path: `${r.base}/{id}`, tag: r.tag, auth: 'admin', summary: 'Delete',
    description: 'Returns 409 if other records still reference this one.',
    params: r.params,
    ok: { description: 'Deleted', schema: envelope(messageSchema) },
    errors: [404, 409],
  });
}

route({
  method: 'get', path: '/api/products/slug/{slug}', tag: 'Products',
  summary: 'Read a product by slug',
  description: 'Slugs are stable across renames, so storefront URLs keep working.',
  params: productSlugParamSchema,
  ok: { description: 'Product', schema: envelope(productSchema) },
  errors: [404],
});

/* ----------------------------- Cart ----------------------------- */
route({
  method: 'get', path: '/api/cart', tag: 'Cart', auth: 'user',
  summary: 'The caller’s cart',
  description: 'Prices are joined live from products and only freeze when an order is created.',
  ok: { description: 'Cart', schema: envelope(cartSchema) },
});
route({
  method: 'post', path: '/api/cart', tag: 'Cart', auth: 'user',
  summary: 'Add an item',
  description: 'Adding a product already in the cart increases its quantity instead of duplicating the line.',
  body: addItemSchema,
  ok: { status: 201, description: 'Cart', schema: envelope(cartSchema) },
  errors: [404, 409],
});
route({
  method: 'put', path: '/api/cart/{productId}', tag: 'Cart', auth: 'user',
  summary: 'Set an item’s quantity', params: cartProductParam, body: updateItemSchema,
  ok: { description: 'Cart', schema: envelope(cartSchema) },
  errors: [404, 409],
});
route({
  method: 'delete', path: '/api/cart/{productId}', tag: 'Cart', auth: 'user',
  summary: 'Remove an item', params: cartProductParam,
  ok: { description: 'Cart', schema: envelope(cartSchema) },
  errors: [404],
});
route({
  method: 'delete', path: '/api/cart', tag: 'Cart', auth: 'user',
  summary: 'Empty the cart',
  ok: { description: 'Cart', schema: envelope(cartSchema) },
});

/* --------------------------- Wishlist --------------------------- */
const wishlistEntry = z.object({ addedAt: z.string(), product: productSchema }).openapi('WishlistEntry');

route({
  method: 'get', path: '/api/wishlist', tag: 'Wishlist', auth: 'user',
  summary: 'The caller’s wishlist',
  description: 'Products are joined on read, so no separate hydration call is needed.',
  ok: { description: 'Wishlist', schema: envelope(z.array(wishlistEntry)) },
});
route({
  method: 'post', path: '/api/wishlist', tag: 'Wishlist', auth: 'user',
  summary: 'Add a product',
  description: 'Idempotent: 201 when added, 200 when it was already there.',
  body: wishlistAdd,
  ok: { status: 201, description: 'Wishlist', schema: envelope(z.array(wishlistEntry)) },
  errors: [404],
});
route({
  method: 'delete', path: '/api/wishlist/{productId}', tag: 'Wishlist', auth: 'user',
  summary: 'Remove a product', params: wishProductParam,
  ok: { description: 'Wishlist', schema: envelope(z.array(wishlistEntry)) },
  errors: [404],
});
route({
  method: 'delete', path: '/api/wishlist', tag: 'Wishlist', auth: 'user',
  summary: 'Clear the wishlist',
  ok: { description: 'Wishlist', schema: envelope(z.array(wishlistEntry)) },
});

/* ---------------------------- Orders ---------------------------- */
route({
  method: 'post', path: '/api/orders', tag: 'Orders', auth: 'user',
  summary: 'Create an order from the cart',
  description:
    'Send only an address id. Prices, line items and totals are read from the database inside a transaction — any money values in the request body are ignored. Stock is checked under a row lock, so concurrent orders cannot oversell.',
  body: orderCreate,
  ok: { status: 201, description: 'Created', schema: envelope(orderSchema) },
  errors: [404, 409],
});
route({
  method: 'get', path: '/api/orders/my', tag: 'Orders', auth: 'user',
  summary: 'The caller’s orders', query: orderQuery,
  ok: { description: 'Orders', schema: envelope(z.array(orderSchema), { paginated: true }) },
});
route({
  method: 'get', path: '/api/orders', tag: 'Orders', auth: 'admin',
  summary: 'All orders', query: orderQuery,
  ok: { description: 'Orders', schema: envelope(z.array(orderSchema), { paginated: true }) },
});
route({
  method: 'get', path: '/api/orders/{id}', tag: 'Orders', auth: 'user',
  summary: 'Read an order', description: 'Owner or admin.', params: idParamSchema,
  ok: { description: 'Order', schema: envelope(orderSchema) },
  errors: [403, 404],
});
route({
  method: 'put', path: '/api/orders/{id}/status', tag: 'Orders', auth: 'user',
  summary: 'Change an order’s status',
  description:
    'Legal transitions only: pending → paid | cancelled, paid → completed | cancelled. Completed and cancelled are terminal. A customer may only cancel while pending; marking an order paid is the payment provider’s job. Cancelling restocks the items.',
  params: idParamSchema, body: orderStatus,
  ok: { description: 'Updated', schema: envelope(orderSchema) },
  errors: [403, 404, 409],
});
route({
  method: 'delete', path: '/api/orders/{id}', tag: 'Orders', auth: 'admin',
  summary: 'Delete an order', params: idParamSchema,
  ok: { description: 'Deleted', schema: envelope(messageSchema) },
  errors: [404],
});

/* --------------------------- Payments --------------------------- */
route({
  method: 'post', path: '/api/payment/checkout-session', tag: 'Payments', auth: 'user',
  summary: 'Open a checkout session',
  description: `Charges the amount stored on the order. Active provider: **${env.PAYMENT_PROVIDER}**.`,
  body: checkoutSchema,
  ok: {
    status: 201, description: 'Session',
    schema: envelope(z.object({
      orderId: z.number(), orderNumber: z.string(), amount: z.number(),
      provider: z.string(), sessionId: z.string(), checkoutUrl: z.string(),
    })),
  },
  errors: [403, 404, 409],
});

if (isMockProvider) {
  route({
    method: 'post', path: '/api/payment/mock/settle', tag: 'Payments',
    summary: 'Simulate a provider callback (development only)',
    description:
      'Stands in for the gateway webhook and drives the same settlement path a real provider will. Registered only when PAYMENT_PROVIDER=mock, and the app refuses to boot with the mock provider in production. Idempotent on `eventId`.',
    body: mockSettleSchema,
    ok: {
      description: 'Settled',
      schema: envelope(z.object({ alreadyProcessed: z.boolean(), order: orderSchema })),
    },
    errors: [404, 409],
  });
}

/* ---------------------------- Uploads --------------------------- */
route({
  method: 'post', path: '/api/uploads/signature', tag: 'Uploads', auth: 'admin',
  summary: 'Get a presigned upload URL',
  description:
    'Returns a short-lived URL for uploading straight to Cloudflare R2. Content type, size and object key are fixed at signing time — a presigned URL is a capability, so anything left unconstrained here is unconstrained at upload.',
  body: signatureSchema,
  ok: {
    description: 'Signed URL',
    schema: envelope(z.object({
      uploadUrl: z.string(), publicUrl: z.string(), key: z.string(),
      expiresIn: z.number(), requiredHeaders: z.record(z.string()),
    })),
  },
});

/* ----------------------------- Stats ---------------------------- */
route({
  method: 'get', path: '/api/stats', tag: 'Stats', auth: 'admin',
  summary: 'Dashboard aggregates',
  description:
    'Counts, revenue, distributions, stock health, best sellers, never-sold products and recent orders. Revenue counts paid and completed orders only — pending baskets are reported separately as a forecast, never as income.',
  query: statsQuery,
  ok: { description: 'Stats', schema: envelope(z.record(z.any())) },
});

/* ----------------------------- Health --------------------------- */
route({
  method: 'get', path: '/health', tag: 'System',
  summary: 'Liveness and dependency check',
  description: 'Reports database and cache reachability. 503 when the database is unreachable.',
  ok: {
    description: 'Healthy',
    schema: envelope(z.object({ status: z.string(), db: z.string(), cache: z.string() })),
  },
});

export const buildOpenApiDocument = () => {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'BabyMart API',
      version: '0.1.0',
      description: [
        'E-commerce backend: catalogue, cart, wishlist, orders and payments.',
        '',
        '**Request schemas on this page are the live validators.** They are imported',
        'directly from the route modules, so a change to validation changes these docs',
        'automatically and the two cannot drift.',
        '',
        'Response schemas are written for documentation and are descriptive rather',
        'than authoritative — the shapes are produced by `src/presenters/`.',
        '',
        '### Authentication',
        'POST /api/auth/login, then click **Authorize** and paste the token.',
      ].join('\n'),
    },
    servers: [{ url: `http://localhost:${env.PORT}`, description: 'Local development' }],
    tags: [
      { name: 'Auth' }, { name: 'Users' }, { name: 'Products' }, { name: 'Categories' },
      { name: 'Brands' }, { name: 'Banners' }, { name: 'Cart' }, { name: 'Wishlist' },
      { name: 'Orders' }, { name: 'Payments' }, { name: 'Uploads' }, { name: 'Stats' },
      { name: 'System' },
    ],
  });
};
