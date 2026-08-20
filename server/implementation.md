# BabyMart Backend — Implementation Plan

Companion to `backend-spec.md`. That file defines **what** the API does (routes,
rules, status codes) and is stack-neutral. This file is the ordered plan for
**how** we build it on our stack.

The route surface in the spec does not change. What changes is everything below
it: the original course used MongoDB with embedded documents, and we're on MySQL
with a relational schema. That translation is the main body of work.

---

## 0. Stack, as decided

| Category | Choice | Version | Notes |
|---|---|---|---|
| Runtime | Node.js | 20.17.0 | LTS |
| Framework | Express.js | 4.21.2 | **v4**, not v5 — see async note below |
| ORM | Sequelize | 6.37.7 | with `mysql2` driver |
| Database | MySQL | 8.0 | `utf8mb4`, InnoDB |
| Cache | Redis via `ioredis` | 5.10.0 | 60s TTL on read endpoints |
| Auth | Passport.js + JWT | — | `passport-jwt` strategy |
| Validation | **Zod** | latest v3 | replaces express-validator |
| Object storage | **Cloudflare R2** | — | product/brand/banner images |
| Payments | **Mocked provider** | — | real gateway deferred, seam kept |
| Language | JavaScript | ESM | no TypeScript |

**Four deviations from the stack table, on purpose:**

1. **Zod instead of express-validator.** Per your instruction. They solve the same
   problem; Zod gives us one schema per endpoint that validates *and* coerces, and
   the same schemas generate our OpenAPI spec (Phase 13). Don't install both —
   two validation layers means two places for rules to drift apart.
2. **`bcrypt` (or `argon2`) is an implied addition** — the table omits password
   hashing, but the spec requires it. Adding `bcrypt`.
3. **Cloudflare R2 instead of Cloudinary** (Phase 7.6). R2 is S3-compatible, so we
   use `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` and no Cloudflare-
   specific SDK. If you meant **Cloudflare Images** rather than R2, see the note in
   7.6 — it changes the upload handshake but nothing else in this plan.
4. **Payments are mocked** (Phase 12), behind a provider interface so the real
   gateway drops in later without touching orders.

**Express 4 has no async error forwarding.** An async handler that throws will
hang the request instead of reaching our error middleware. Express 5 fixed this;
we're on 4, so every async handler must be wrapped (Phase 4, step 4.2). This is
the single easiest way to ship a silently broken endpoint.

---

## 1. MongoDB → MySQL translation map

Read this before touching the spec, because the spec is written in Mongo terms.

| Spec says (Mongo) | We build (MySQL + Sequelize) |
|---|---|
| Embedded `addresses[]` on user | `addresses` table, FK `user_id` |
| Embedded `ratings[]` on product | `product_ratings` table, unique `(product_id, user_id)` |
| `wishlist[]` of ObjectIds | `wishlist_items` join table, unique `(user_id, product_id)` |
| Embedded `cart[]` + separate Cart collection | `carts` + `cart_items` tables |
| `items[]` snapshot on order | `order_items` table (still snapshot columns) |
| `ObjectId` ref | `BIGINT UNSIGNED` FK with real constraints |
| `.populate('category')` | `include:` in the query (JOIN) |
| `{ _id: { $in: ids } }` | `{ id: { [Op.in]: ids } }` |
| Mongoose `pre('save')` hook | Sequelize `beforeSave` hook |
| `countDocuments` | `count()` / `findAndCountAll` |
| Aggregation pipeline for distributions | `GROUP BY` via `attributes` + `fn('COUNT', ...)` |
| Unique index on `email` | `UNIQUE KEY` — the DB enforces it, and it *will* throw |
| Schema-less flexibility | Migrations. Every shape change is a versioned file |

**Three things we gain and must actually use:**

- **Transactions.** Order creation and stock decrement must be atomic. Mongo made
  this awkward; here it's one `sequelize.transaction()`. Spec defect #10 (no stock
  handling) gets fixed properly.
- **Foreign keys.** Spec defect #6 (deletion doesn't cascade) is solved
  declaratively with `ON DELETE CASCADE` / `SET NULL` per relationship.
- **`DECIMAL` for money.** Never `FLOAT`/`DOUBLE` for prices. `DECIMAL(10,2)`.
  Floating-point money produces cent-level drift that surfaces as unreconcilable
  order totals.

---

## 2. Code architecture — where CRUD lives

The proposal on the table: write a Sequelize `User` class carrying all its CRUD
operations as methods, then expose those methods over the API. Resource by
resource.

**The instinct is right and half the design works.** Wanting one obvious home for
a resource's logic — rather than the same query spread across four files — is
correct, and it's why this plan groups code by feature module (1.3) instead of by
technical layer. Two corrections, though, and the second one matters a lot.

### Sequelize is already Active Record

`User.create`, `User.findAll`, `User.findByPk`, `User.update`, `User.destroy`,
`user.save()`, `user.destroy()` — the CRUD methods already exist on the model
class, with transaction support and hooks wired in. Hand-writing
`User.createUser()` around `User.create()` mostly re-wraps what you have: more
code, another layer to keep in sync, no new capability.

So the question isn't *"should CRUD live on the model?"* — it already does. It's
*"where does everything that isn't CRUD live?"* That's the part worth designing.

### Where "CRUD on the model" runs out

Four things in this spec don't fit a single model class:

1. **Multi-model transactions.** Order creation (Phase 10.1) touches cart,
   cart_items, products (locked `FOR UPDATE`, stock decremented), orders and
   order_items — atomically. That can't sit on `Order`, because `Order` has no
   business reaching into `Cart` and `Product`. It needs a coordinator that owns
   the transaction and calls into several models.
2. **Authorization is request-shaped.** "Admin, or the user themselves" (6.2)
   needs `req.user`. Push that onto the model and the model now knows about HTTP;
   test it and you're constructing fake requests.
3. **Cache invalidation** (Phase 8.3) spans resources and belongs to neither the
   model nor the controller.
4. **Most of our surface isn't plain CRUD.** `/auth/login`, `/auth/profile`,
   nested addresses with the single-default rule, `/orders/:id/status` with a
   transition table, idempotent wishlist add, cart upsert, `/stats` aggregations.
   Generic CRUD covers maybe a third of the endpoints in `backend-spec.md`.

### Don't expose model methods directly as endpoints

This is the part I'd push back on hardest. If the HTTP surface is generated from
model methods, then the ORM's shape dictates the API's shape, and **mass
assignment becomes the default**: `User.update(req.body)` happily writes whatever
keys arrive, including `role`.

That is precisely spec defects #1 and #2 — the course's self-promotion hole
(`[00:35]`) and its missing ownership check (`[01:49]`). We're fixing those by
having an explicit Zod schema per endpoint that strips unknown keys (4.3), and an
explicit authorization step per route. A generic method-exposer has nowhere to put
either, and route-by-route exceptions are how it grows into something worse than
plain controllers.

There's also a coupling cost: rename a model method and you've silently changed
your public API contract.

### What we do instead — four layers

Already assumed by the phase plan; stated here so it's explicit:

| Layer | Owns | Knows about HTTP? |
|---|---|---|
| **Model** | columns, associations, hooks, *domain* instance methods | no |
| **Service** | business rules, transactions, cache invalidation | no |
| **Controller** | parse + validate, authorize, call service, shape response | yes |
| **Router** | paths, middleware order | yes |

**Domain behaviour on the model, orchestration in the service.** So
`user.matchPassword()` and the password-hashing hook (5.1, 5.2) live on the model
— they're intrinsic to what a user *is*. Order creation lives in
`orders/service.js` — it's a workflow across models.

Services take plain arguments and return plain data. That's what makes them
testable without a server, and reusable from a CLI, a seeder or a queue worker
later.

### Getting the DRY win anyway

The repetition you're trying to avoid is real — twelve resources × five endpoints.
Solve it with **composition rather than inheritance**: one shared CRUD service
factory, used where behaviour is generic and ignored where it isn't.

```js
// services/crudService.js
export const createCrudService = (Model, { searchable = [], sortable = [] } = {}) => ({
  list: async ({ page, perPage, sortBy, sortOrder, search }) => { /* shared pagination */ },
  get: async (id) => { /* findByPk + 404 */ },
  create: async (data) => Model.create(data),
  update: async (id, data) => { /* load, assign, save */ },
  remove: async (id) => { /* load, destroy */ },
});
```

Then a genuinely generic resource is tiny:

```js
// modules/brands/service.js
export const brandService = createCrudService(Brand, {
  searchable: ['name'], sortable: ['name', 'createdAt'],
});
```

…while a resource with real rules writes its own, or wraps the factory and
overrides one method:

```js
// modules/users/service.js — spread the factory, override what differs
export const userService = {
  ...createCrudService(User, { searchable: ['name', 'email'] }),
  create: registerUser,        // hashing hook + unique-email handling
  update: updateUserGuarded,   // role rules, ownership
};
```

Brands, banners and categories collapse to a few lines each. Users, orders, cart
and wishlist keep explicit services because their behaviour is explicit. Nothing
is forced through an abstraction that doesn't fit it.

### Verdict — agreed, this is the plan of record

Keep: one module per resource, shared CRUD factory, domain methods on models.

Drop: hand-written CRUD wrappers duplicating Sequelize, and auto-exposing model
methods as endpoints.

Settled and signed off. Every phase below assumes this layering, so if it ever
needs revisiting, this section changes first and the phases follow.

The extra layer costs one small file per resource. What it buys is the thing that
distinguishes this build from the course's: every endpoint has one explicit place
where input is validated and permission is checked.

---

## 3. Phase 0 — Prerequisites

- [ ] Node 20.17.0 active (`.nvmrc` with `20.17.0`)
- [ ] MySQL 8.0 reachable; create database `babymart` with
      `CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`
- [ ] Redis reachable (local Docker is fine)
- [ ] Decide: local services via `docker-compose.yml` (recommended — one file
      pins MySQL 8.0 and Redis for everyone) or native installs
- [ ] Cloudflare account: R2 bucket created, API token with object read/write, and
      a public bucket URL or custom domain for serving images
- [ ] **No payment account needed** — payments are mocked (Phase 12). Defer the
      gateway signup until you swap the provider in.

---

## 4. Phase 1 — Scaffold and configuration

**1.1 Init the project.** `package.json` with `"type": "module"` (ESM).

**1.2 Install:**

```
runtime:  express@4.21.2 sequelize@6.37.7 mysql2 ioredis@5.10.0
          passport passport-jwt jsonwebtoken bcrypt zod
          cors helmet morgan dotenv
dev:      sequelize-cli nodemon vitest supertest eslint prettier
```

**1.3 Folder layout:**

```
src/
  app.js              # express app, no listen() — importable for tests
  server.js           # boots app + db + redis, handles signals
  config/
    env.js            # Zod-validated environment
    database.js       # sequelize instance
    redis.js          # ioredis client
    passport.js       # jwt strategy
  models/             # one file per model + index.js for associations
  migrations/         # sequelize-cli, .cjs
  seeders/
  modules/
    auth/             # routes.js, controller.js, service.js, schema.js
    users/  products/  categories/  brands/  banners/
    cart/   wishlist/  orders/  stats/  payments/
  middleware/
    authenticate.js  requireRole.js  validate.js
    errorHandler.js  notFound.js  cache.js  asyncHandler.js
  utils/
tests/
```

Group by **feature module**, not by technical layer. One folder holds a
resource's routes, Zod schemas, controller and service — that's where you'll be
working, rather than tabbing between four sibling directories.

**1.4 Validate env at boot with Zod.** Do this first; it pays back immediately.

```js
// config/env.js
import { z } from 'zod';
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8000),
  DB_HOST: z.string(), DB_PORT: z.coerce.number().default(3306),
  DB_NAME: z.string(), DB_USER: z.string(), DB_PASSWORD: z.string(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLIENT_URL: z.string().url(), ADMIN_URL: z.string().url(),

  // Cloudflare R2 (S3-compatible)
  CLOUDFLARE_ACCOUNT_ID: z.string(),
  R2_ACCESS_KEY_ID: z.string(),
  R2_SECRET_ACCESS_KEY: z.string(),
  R2_BUCKET: z.string(),
  R2_PUBLIC_BASE_URL: z.string().url(),

  // Payments: mock for now, real gateway later
  PAYMENT_PROVIDER: z.enum(['mock', 'stripe']).default('mock'),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
})
// the real gateway's keys are required only when it's actually selected
.refine((e) => e.PAYMENT_PROVIDER !== 'stripe' || e.STRIPE_SECRET_KEY, {
  message: 'STRIPE_SECRET_KEY is required when PAYMENT_PROVIDER=stripe',
})
// and the mock must never be selectable in production
.refine((e) => e.NODE_ENV !== 'production' || e.PAYMENT_PROVIDER !== 'mock', {
  message: 'PAYMENT_PROVIDER=mock is forbidden in production',
});

export const env = schema.parse(process.env);
```

Those two `.refine` calls are the whole reason to keep payment config in Zod. The
first lets the Stripe keys be absent while we're mocking, without making them
permanently optional. The second makes it **impossible to boot production with a
fake payment provider** — see Phase 12.3 for why that matters more than it looks.

The process now refuses to start on a missing or malformed secret, instead of
crashing hours later inside a payment handler — which is exactly what happened in
the course at `[03:12]`. Note `JWT_SECRET.min(32)`: a short secret is a weak
secret.

**1.5 `.gitignore` before the first commit.** `.env`, `node_modules`, logs.
Commit `.env.example` with keys and empty values. The course author pushed a live
database URI and had to rewrite history `[02:52]`.

**1.6 Sequelize CLI with ESM.** `sequelize-cli` predates ESM, so point
`.sequelizerc` at CommonJS files and write migrations as `.cjs`:

```js
// .sequelizerc
const path = require('path');
module.exports = {
  config: path.resolve('src/config/sequelize-cli.cjs'),
  'models-path': path.resolve('src/models'),
  'migrations-path': path.resolve('src/migrations'),
  'seeders-path': path.resolve('src/seeders'),
};
```

---

## 5. Phase 2 — Database and cache connections

**2.1 Sequelize instance** with `dialect: 'mysql'`, `logging` on in development
only, `define: { underscored: true, timestamps: true }` (snake_case columns,
camelCase in JS), and a connection `pool`.

**2.2 Set `timezone: '+00:00'` and store all timestamps in UTC.** Formatting is
the client's job. Mixed-timezone storage is very hard to unpick later.

**2.3 Redis client** via ioredis with a `retryStrategy` and an `error` listener —
an unhandled ioredis error event will crash the process.

**2.4 Fail-open on cache, fail-closed on database.** If Redis is down the API must
still serve (slower). If MySQL is down we return 503. Wrap every cache call in
try/catch that logs and falls through to the query.

**2.5 Graceful shutdown** in `server.js`: on `SIGTERM`/`SIGINT`, stop accepting
connections, then close the Sequelize pool and Redis quit.

**2.6 Migrations only — never `sequelize.sync({ alter: true })`.** `sync` is
convenient and will eventually silently drop or rebuild a column in a way that
loses data. Every schema change is a migration file with `up` and `down`.

---

## 6. Phase 3 — Schema and migrations

The largest phase. One migration per table, in FK-dependency order so the
constraints can be created as we go.

**3.1 `users`**

| Column | Type | Constraints |
|---|---|---|
| `id` | BIGINT UNSIGNED | PK, AUTO_INCREMENT |
| `name` | VARCHAR(120) | NOT NULL |
| `email` | VARCHAR(190) | NOT NULL, **UNIQUE** |
| `password` | VARCHAR(255) | NOT NULL (bcrypt hash) |
| `avatar` | VARCHAR(500) | NULL, default placeholder |
| `role` | ENUM | `'admin','user','deliveryman'`, default `'user'` |
| `created_at`/`updated_at` | DATETIME | |

`VARCHAR(190)` on the unique email column is deliberate: with `utf8mb4` and older
index limits, 255 chars can exceed the key size. 190 is the safe idiom.

**3.2 `addresses`** — `id`, `user_id` FK → `users.id` **ON DELETE CASCADE**,
`street`, `city`, `country`, `postal_code` (VARCHAR — it's a string per spec
`[02:16]`; leading zeros matter), `is_default` BOOLEAN default false, `note`
NULL. Index `user_id`.

**3.3 `categories`** — `id`, `name` UNIQUE, `image` NULL, `category_type` ENUM
(`'featured','hot','top'`), timestamps.

**3.4 `brands`** — `id`, `name` UNIQUE, `image` NULL, timestamps.

**3.5 `products`** — `id`, `name` UNIQUE, `slug` UNIQUE, `description` TEXT,
`price` DECIMAL(10,2) NOT NULL, `discount_percentage` SMALLINT default 0 (CHECK
0–90), `stock` INT default 0 (CHECK >= 0), `image` VARCHAR(500) NOT NULL,
`category_id` FK → `categories.id` **ON DELETE RESTRICT**, `brand_id` FK →
`brands.id` **ON DELETE RESTRICT**, `average_rating` DECIMAL(3,2) default 0,
`ratings_count` INT default 0, timestamps.

`RESTRICT` on those FKs means you cannot delete a category that still has
products — which is the behaviour you want, and it turns spec defect #9 (bad
category id → 500 cast error) into a clean constraint error we map to 400/409.

Index `category_id`, `brand_id`, and `price` (storefront sorting).

**3.6 `product_ratings`** — `id`, `product_id` FK CASCADE, `user_id` FK CASCADE,
`rating` TINYINT (CHECK 1–5), `comment` TEXT NULL, timestamps,
**UNIQUE `(product_id, user_id)`** so one review per user per product.

`average_rating` and `ratings_count` on `products` are denormalised caches.
Recompute them in an `afterCreate`/`afterUpdate`/`afterDestroy` hook on
`product_ratings`, inside the same transaction. One place, never in a controller.

**3.7 `banners`** — `id`, `name`, `title`, `start_from`, `image`, `banner_type`,
timestamps.

**3.8 `carts`** — `id`, `user_id` FK UNIQUE CASCADE (one cart per user),
timestamps.

**3.9 `cart_items`** — `id`, `cart_id` FK CASCADE, `product_id` FK CASCADE,
`quantity` INT NOT NULL (CHECK >= 1), timestamps, **UNIQUE `(cart_id,
product_id)`**.

That unique constraint makes "add item" a single upsert instead of the
read-then-branch logic the course used at `[03:08]`, and it's race-safe.

**Decision, flagged in the spec §5:** cart items hold *no* price snapshot. Prices
join live from `products`, so a repriced item shows its current price in the
cart. This is the honest behaviour for a storefront; snapshotting invites "the
cart said £8" disputes. Prices freeze at order creation, not before.

**3.10 `wishlist_items`** — `id`, `user_id` FK CASCADE, `product_id` FK CASCADE,
`created_at`, **UNIQUE `(user_id, product_id)`**. The constraint gives us
idempotent adds via `findOrCreate` — spec `[03:05]` behaviour, enforced by the DB.

**3.11 `orders`** — `id`, `order_number` VARCHAR UNIQUE (human-facing, e.g.
`BM-2026-000123`), `user_id` FK **ON DELETE SET NULL** (keep the financial record
when a user is deleted — spec defect #6), `subtotal` and `total` DECIMAL(10,2),
`status` ENUM (`'pending','paid','completed','cancelled'`) default `'pending'`,
shipping columns (`shipping_street`, `shipping_city`, `shipping_country`,
`shipping_postal_code`) as a **snapshot**, `paid_at` NULL, timestamps.
Index `user_id`, `status`, `created_at`.

**Payment columns are provider-neutral**, not Stripe-named: `payment_provider`
(VARCHAR — `'mock'`, later `'stripe'`), `payment_ref` (VARCHAR, the session or
intent id), `payment_event_id` (VARCHAR UNIQUE NULL, the settled event — the
unique constraint is what makes idempotency airtight in Phase 12.2).

The spec's `payment_intent_id` / `stripe_session_id` (`[02:06]`) bake one vendor
into the schema. Since we're mocking now and swapping later, generic columns mean
the provider change is an adapter, not a migration.

Shipping address is copied onto the order, not referenced. If the customer later
edits or deletes that address, the order must still show where it shipped.

**3.12 `order_items`** — `id`, `order_id` FK CASCADE, `product_id` FK **ON DELETE
SET NULL**, plus snapshot columns `name`, `price` DECIMAL(10,2), `quantity`,
`image`. Snapshots are the point: renaming or repricing a product must never
rewrite history.

**3.13 Models and associations** in `models/index.js`:

```
User    hasMany Address, WishlistItem, Order;  hasOne Cart
Cart    hasMany CartItem;      CartItem belongsTo Product
Product belongsTo Category, Brand;  hasMany ProductRating, CartItem, OrderItem
Order   belongsTo User;  hasMany OrderItem
```

**3.14 The `defaultScope` password trap.** Exclude `password` by default so it can
never leak through a controller that forgot to strip it, and add an explicit
scope for login:

```js
User.init({ /* ... */ }, {
  defaultScope: { attributes: { exclude: ['password'] } },
  scopes: { withPassword: { attributes: { include: ['password'] } } },
});
// login must use: User.scope('withPassword').findOne({ where: { email } })
```

Forgetting the scope in login gives you a baffling "password is undefined"
bcrypt error. Write the comment now.

**3.15 Seeders** — an admin user (hashed password), a handful of categories and
brands, then products. Products cannot exist without a category and brand
(`[02:36]`), so order matters.

---

## 7. Phase 4 — Cross-cutting middleware

**4.1 App assembly** in `app.js`: `helmet()`, `cors()` with an allow-list of
`CLIENT_URL` and `ADMIN_URL`, `morgan`, then `express.json()`.

**One exception:** the Stripe webhook route must be mounted with
`express.raw({ type: 'application/json' })` **before** `express.json()`.
Signature verification runs against the raw bytes; a parsed-and-restringified
body fails every time. Wire this in Phase 12, but leave the comment now.

**4.2 `asyncHandler`** — mandatory on Express 4:

```js
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
```

Every async controller gets wrapped. Nothing else in the codebase makes it as
easy to ship a hanging endpoint.

**4.3 Zod `validate` middleware:**

```js
export const validate = (schemas) => (req, res, next) => {
  for (const key of ['body', 'params', 'query']) {
    if (!schemas[key]) continue;
    const result = schemas[key].safeParse(req[key]);
    if (!result.success) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          fields: result.error.issues.map((i) => ({
            path: i.path.join('.'), message: i.message,
          })),
        },
      });
    }
    req[key] = result.data;   // parsed + coerced + stripped
  }
  next();
};
```

Two things earn their keep here. **Reassigning `req[key]` to `result.data`** means
downstream code sees coerced types (`page` is a real number) and unknown keys are
stripped — which is our defence against mass-assignment. And **`z.coerce`** is
required for query params, since everything off the query string is a string:

```js
export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});
```

`.max(100)` on `perPage` matters — without it `?perPage=1000000` is a free
denial-of-service.

**4.4 Central error handler.** Translate errors into the spec's envelope, and map
Sequelize error classes explicitly:

| Error | Response |
|---|---|
| `ZodError` | 400 with field list |
| `UniqueConstraintError` | 409 (or 400) "already exists" |
| `ForeignKeyConstraintError` | 400 "referenced record does not exist" |
| `ValidationError` | 400 |
| `DatabaseError` | 500, log detail, return a generic message |
| custom `AppError` | its own status |

Never leak raw SQL or stack traces outside development. This mapping is what
retires spec defect #9 across the whole API rather than per-endpoint.

**4.5 One response envelope, applied everywhere** — spec defect #7:

```
success: { data: <payload>, meta?: { page, perPage, total, totalPages } }
error:   { error: { message, fields? } }
```

**4.6 `notFound`** for unmatched routes, registered after all route mounts.

---

## 8. Phase 5 — Auth

**5.1 Password hashing in a Sequelize hook**, mirroring spec `[00:50]`:

```js
User.addHook('beforeSave', async (user) => {
  if (!user.changed('password')) return;   // the critical guard
  user.password = await bcrypt.hash(user.password, 12);
});
```

`user.changed('password')` is Sequelize's equivalent of Mongoose's `isModified`.
Without it, every profile update re-hashes the stored hash and locks the user out.

**5.2 `user.matchPassword(candidate)`** as an instance method wrapping
`bcrypt.compare`.

**5.3 Single-default-address rule** (spec `[00:54]`). In SQL this is a service
concern, not a hook — MySQL 8 has no partial unique index. In one transaction:
clear `is_default` on the user's other addresses, then set it on the target. Also
force `is_default = true` when it's the user's first address.

**5.4 Token signing.** Payload carries `{ sub: user.id }` and nothing else —
spec `[01:09]`, where embedding the whole user leaked the password hash into a
publicly readable token. 7-day expiry from `JWT_EXPIRES_IN`.

**5.5 Passport JWT strategy:**

```js
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: env.JWT_SECRET,
}, async (payload, done) => {
  try {
    const user = await User.findByPk(payload.sub);   // defaultScope drops password
    return done(null, user || false);
  } catch (err) { return done(err, false); }
}));
```

**5.6 `authenticate`** = `passport.authenticate('jwt', { session: false })`.
`session: false` is required — we're stateless, and without it Passport reaches
for session middleware we haven't mounted.

**5.7 `requireRole('admin')`** runs after `authenticate`, returns 403 (not 401)
when the user is authenticated but not permitted. Spec `[01:35]`.

**5.8 Endpoints** per spec §6, with Zod schemas:

- `POST /api/auth/register` — **`role` is not in the schema.** Zod strips it, so
  a client cannot self-promote. This closes spec defect #1, the course's
  self-promotion hole at `[00:35]`. First admin comes from the seeder.
- `POST /api/auth/login` — `withPassword` scope; one generic
  "Invalid email or password" for both failure modes (spec defect #11).
- `GET /api/auth/profile` — `authenticate`; include addresses.
- `POST /api/auth/logout` — `authenticate`; 200. Stateless, so this is a
  client-side discard. Note in code that revocation needs a denylist.

Also catch the `UniqueConstraintError` on email and return the spec's 400 "User
already exists" — with a unique index, the race between "check if exists" and
"insert" is real, and the DB is the only reliable arbiter.

---

## 9. Phase 6 — Users and addresses

**6.1** Routes per spec §7. All under `authenticate`; list/create/delete under
`requireRole('admin')`.

**6.2 Implement the ownership check the course skipped** — spec defect #2,
`[01:49]`. One reusable guard:

```js
const canActOnUser = (req) =>
  req.user.role === 'admin' || req.user.id === Number(req.params.id);
```

Used by `PUT /api/users/:id` and all three address endpoints. Without it, any
logged-in user can edit any other user.

**6.3 Keep `role` out of the self-update path.** Two Zod schemas for the same
route: an admin schema that permits `role`, and a self schema that doesn't. Pick
by `req.user.role` in the controller. Zod's stripping does the enforcement.

**6.4 Paginate `GET /api/users`** — the course left this out (`[01:46]`), we do it
from the start with the shared `listQuerySchema`, plus `search` (name/email
`LIKE`) and `role` filter, which the admin UI expects `[03:18]`.

**6.5 Address endpoints** — the single-default rule (5.3) applies on create and
update; on delete, promote the first remaining address to default (spec `[02:13]`).

**6.6 `DELETE /api/users/:id`** — FKs do the cascade now: addresses, cart, cart
items and wishlist rows go automatically; orders survive with `user_id` set to
NULL. Spec defect #6, solved declaratively.

**6.7 `findAndCountAll` with `include` trap.** Joining a `hasMany` association
multiplies rows, so `count` comes back inflated and `limit` truncates wrongly.
Use `distinct: true`, or count in a separate query. This will bite on the first
list endpoint with an include — recognise it early.

---

## 10. Phase 7 — Catalogue

**7.1** Categories, brands, banners, products — the uniform CRUD from spec §8:
public reads, `requireRole('admin')` writes.

**7.2 Products list endpoint** carries the storefront query contract:
`page`, `perPage`, `sortOrder`, `sortBy` (allow-list: `price`, `createdAt`,
`averageRating`), `category`, `brand`, `search`, `minPrice`, `maxPrice`.

Build the `where` clause from validated input only, and keep `sortBy` on an
**allow-list** — interpolating a user-supplied column into `ORDER BY` is an
injection vector that parameterisation does not cover.

**7.3 Product create/update** validates that `category_id` and `brand_id` exist —
though the FK constraint is the real guarantee, and the error handler maps its
failure to a clean 400 (spec `[02:35]`).

**7.4 `slug`** generated from `name` on create; keep it stable on rename, or
accept that URLs change.

**7.5 Category `category_type`** is an ENUM in the DB *and* a `z.enum` in the
schema. Two layers, deliberately: Zod gives a readable 400, the ENUM stops
anything that bypasses the API.

**7.6 Image upload — Cloudflare R2, presigned direct upload** (the course deferred
this repeatedly, `[02:27]`).

R2 is S3-compatible, so this is the standard S3 presigned-PUT flow — no
Cloudflare-specific SDK:

```
install: @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

1. POST /api/uploads/signature   (admin)
   body: { filename, contentType, size }
   - validate contentType against an allow-list (image/jpeg|png|webp|avif)
   - validate size against a cap (e.g. 5 MB)
   - generate key: products/<uuid>.<ext>          (never trust the client filename)
   - return a presigned PUT URL, short expiry (5 min), plus the final public URL
2. Browser PUTs the file straight to R2.
3. Browser sends only the public URL back as JSON on product create/update.
```

S3 client config for R2: `region: 'auto'`, endpoint
`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, and the R2 access key pair.

Why presigned rather than `multer` through our API: upload bandwidth and memory
never touch our process, and it sidesteps the JSON-can't-carry-binary problem the
author ran into. The tradeoff is that the browser talks to R2 directly, so the
**content-type and size limits must be baked into the signature** — a presigned
URL is a capability, and anything you don't constrain when signing is unconstrained
at upload time.

Serve images from a **custom domain or R2 public bucket URL** (`R2_PUBLIC_BASE_URL`)
so the account id isn't in public URLs and Cloudflare's CDN caches them.

Three R2 specifics worth knowing up front:

- **No image transformation.** Cloudinary resized on the fly; R2 is plain object
  storage. If you need thumbnails, either generate variants at upload time
  (`sharp`) or put Cloudflare Image Resizing in front of the custom domain. Decide
  before the storefront starts requesting sizes.
- **Deleting a product should delete its object**, or the bucket accumulates
  orphans forever. Do it after the DB commit, and tolerate failure (log, don't
  fail the request) — a leaked object is cheaper than a failed delete.
- **If you meant Cloudflare Images, not R2:** the flow becomes a "direct creator
  upload" — your API requests a one-time upload URL from the Images API, the
  browser posts the file there, and you store the returned image id, with variants
  requested by URL suffix. It gives you transformations for free. Everything else
  in this plan is unchanged; only 7.6 and the env vars differ. Say which and I'll
  rewrite this step.

---

## 11. Phase 8 — Redis caching  <!-- DEFERRED -->

> **STATUS: deferred by decision.** Caching is skipped for now — read endpoints
> go straight to MySQL. The connection and the fail-open helpers in
> `src/config/redis.js` stay (the health check reports on them), but no cache
> middleware is mounted.
>
> When this is picked up, 8.2 is the rule that matters most: never cache an
> authenticated per-user response under a shared key, or one customer's cart
> gets served to another.

Per the stack table: 60s TTL on read endpoints.

**8.1 Cache middleware** for `GET` list/detail routes. Key from route path plus
**sorted, validated** query params — mount it *after* `validate` so `?page=1&x=2`
and `?x=2&page=1` produce one key, and junk params are already stripped:

```
cache:v1:products:list:page=1&perPage=20&sortOrder=asc
```

**8.2 Never cache authenticated per-user responses** under a shared key. Cart,
wishlist, orders and profile must either skip the cache or include the user id in
the key. Getting this wrong serves one customer's cart to another — the highest-
severity bug available in this phase. Default the middleware to **skip whenever
`req.user` is present**, and opt in explicitly per route.

**8.3 Invalidation by namespace version.** Rather than scanning for keys to
delete (`KEYS` is O(n) and blocks; `SCAN` is fiddly), keep a version counter per
resource and embed it in the key:

```
GET  → v = INCR-less GET cache:ver:products   (default 1)
       key = cache:v1:products:...:{v}
WRITE → INCR cache:ver:products                (all old keys now unreachable)
```

Old entries fall out on their own TTL. Invalidation becomes one atomic `INCR`.

**8.4 Cache the `/api/stats` dashboard payload** — it's aggregate-heavy, admin-only
and tolerates 60s staleness. Best value in the system.

**8.5 Fail open.** Redis errors log and fall through to MySQL (Phase 2.4).

**8.6 Set the TTL from config**, not a literal, so it's tunable per environment.

---

## 12. Phase 9 — Cart and wishlist

**9.1** All routes `authenticate`. **Scope every query to `req.user.id`, never a
body or param value.** A cart endpoint that trusts a `userId` from the client is
an account-data leak.

**9.2 Add to cart** is one upsert against the `(cart_id, product_id)` unique
constraint — increment on conflict. Create the user's cart lazily with
`findOrCreate`.

**9.3 Validate stock** (absent in the course): reject quantities above
`product.stock` with 400. Do **not** reserve stock at add-to-cart; reserve at
order creation (Phase 10). Cart-time reservation needs expiry logic we don't want.

**9.4 Get cart** joins products for live name/price/image, and computes line and
cart totals server-side.

**9.5 Wishlist add** = `findOrCreate` — idempotent via the unique constraint
(spec `[03:05]`).

**9.6 Replace the course's `POST /api/wishlist/products` batch-dereference
endpoint.** It only existed because Mongo stored bare ids and the client had to
hydrate them; the spec already flags the read-via-POST as a wart. With SQL we
just JOIN, so `GET /api/wishlist` returns full products directly. One fewer
endpoint and no id-array length cap to police.

---

## 13. Phase 10 — Orders

The phase where transactions earn their place.

**10.1 `POST /api/orders` — inside a single `sequelize.transaction()`:**

```
1. load the caller's cart with items; empty → 400
2. SELECT the referenced products FOR UPDATE        (row locks)
3. for each line: product exists && stock >= quantity, else 400/409
4. RE-PRICE every line from the products table
5. subtotal/total computed server-side
6. snapshot shipping address from the chosen address id
7. create order (status 'pending') + order_items with snapshot columns
8. decrement product.stock
9. clear the cart
10. COMMIT  → 201 order
```

Step 4 fixes spec defect #3. The course accepted client-supplied item data
(`[18:24]`); we ignore any price the client sends and read it from the database.
Otherwise a crafted request buys anything for a penny.

Step 2's `FOR UPDATE` (`lock: t.LOCK.UPDATE`) is what makes the stock check
correct under concurrency. Without the lock, two simultaneous orders both read
`stock = 1` and both succeed. Any commerce backend that skips this oversells.

**10.2 `GET /api/orders`** (admin) — paginated, `status` filter, search, buyer's
name/email joined. Watch the `findAndCountAll` include trap (6.7).

**10.3 `GET /api/orders/my`** — scoped to `req.user.id`.

**10.4 `GET /api/orders/:id`** — owner or admin, else 403.

**10.5 `PUT /api/orders/:id/status`** — with a real transition table, which the
course lacked (spec defect #5):

```
pending   → paid | cancelled
paid      → completed | cancelled
completed → (terminal)
cancelled → (terminal)
```

Reject anything else with 409. And **do not disable validation on save** — the
course did that to dodge a shipping-address error (`[03:03]`, defect #4); our
shipping columns are plain snapshot columns on the order, so the problem doesn't
arise.

Cancelling a `paid` order should restock its items, in a transaction.

**10.6 Authorisation:** admin may set any legal transition; an owner may only
cancel while `pending`. Marking an order `paid` is the **webhook's** job
(Phase 12) — never a client's.

---

## 14. Phase 11 — Stats and analytics

**11.1 `GET /api/stats`** (admin) per spec §10: counts of users, products,
categories, brands, orders; revenue as `SUM(total)` over **paid** orders only
(the course was vague — we're explicit); plus distributions of orders by status,
users by role, products by category and by brand.

**11.2 Aggregate in SQL** — `COUNT`/`SUM` with `GROUP BY` via `attributes:
[[fn('COUNT', col('id')), 'count']]` and `group`. Do not load rows and count in
JavaScript.

**11.3 Run the independent aggregates concurrently** with `Promise.all`, then
assemble one payload of stable shape.

**11.4 Cache it** (Phase 8.4).

**11.5 Fold `/api/analytics` into `/api/stats` unless a real need appears.** The
spec notes analytics was never explained in the source (§11) and overlaps stats
heavily. Build the one endpoint the dashboard tiles at `[03:17]` actually need —
paid vs pending, revenue, best sellers, recent orders, never-sold products — and
skip inheriting two overlapping surfaces.

---

## 15. Phase 12 — Payments (mocked)

No real gateway for now. The goal of this phase is therefore **the seam, not the
integration**: build the interface and the settlement path so a real provider drops
in later without touching orders.

Payment is owned by **our API**, not the web client — the course split this (spec
§11, `[18:31]`), which would leave mobile unable to check out.

**12.1 Define one provider interface**, `modules/payments/providers/`:

```js
// every provider implements exactly this
createCheckoutSession(order)  -> { sessionId, checkoutUrl }
parseEvent(rawBody, headers)  -> { eventId, type, sessionId, paymentRef }
```

Two implementations: `mock.js` now, `stripe.js` later. Selected once at startup
from `PAYMENT_PROVIDER`. Nothing outside this folder imports a provider directly —
that's what keeps the swap cheap.

**12.2 One settlement function, provider-agnostic.** This is the most important
piece of the phase:

```
settleOrderPaid({ orderId, paymentRef, eventId }):
  in a transaction:
    1. if eventId already processed -> return (idempotent no-op)
    2. load order FOR UPDATE; if already 'paid' -> return
    3. transition pending -> paid   (Phase 10.5 rules)
    4. record paymentRef + paid_at
    5. mark eventId processed
```

Both the mock and the real webhook call **this same function**. When you swap in
Stripe, the only new code is signature verification and event parsing.

**12.3 Mock provider behaviour:**

```
createCheckoutSession(order):
  sessionId  = "mock_sess_" + uuid
  store {sessionId -> orderId} in Redis, short TTL
  checkoutUrl = `${CLIENT_URL}/mock-checkout?session=${sessionId}`
  return both
```

Plus a **development-only** endpoint to drive the outcome:

```
POST /api/payment/mock/settle     { sessionId, outcome: 'success'|'failure' }
  success -> settleOrderPaid({ orderId, paymentRef: sessionId, eventId: ... })
  failure -> cancel the order and restock (Phase 10.5)
```

> **Guard this endpoint at three levels.** An endpoint that marks orders paid
> without payment is a free-checkout exploit if it ever reaches production:
>
> 1. the route is only registered when `PAYMENT_PROVIDER === 'mock'`;
> 2. env validation refuses to boot production with the mock selected (Phase 1.4);
> 3. a test asserts the route returns 404 when the provider is `stripe`.
>
> Belt and braces is proportionate here — this is the one mock in the system that
> moves money.

**12.4 Build idempotency now, while mocking.** It's tempting to skip it because
the mock never retries. Don't: retry-driven duplicate settlement is the classic
payment bug, and it's far easier to build into `settleOrderPaid` today than to
retrofit once real webhooks are arriving. Test it by calling `/mock/settle` twice
with the same `eventId` and asserting one state change.

**12.5 Keep the raw-body seam documented** (Phase 4.1). The mock doesn't need it —
signature verification does. Leave the comment and the route ordering in place so
the real provider doesn't require rearranging the app.

**12.6 Never mark an order paid from a client redirect**, mock or real. A success
URL can be forged and a user can close the tab mid-flow. Settlement happens
server-side only. Building the mock this way means the client integration you write
now is the same one the real gateway needs.

**12.7 When the real gateway lands**, the work is: implement `stripe.js` against
the 14.1 interface, add `POST /api/payment/webhook` (public, raw body, signature
verified) which parses the event and calls `settleOrderPaid`, flip
`PAYMENT_PROVIDER`, and delete the mock route. Orders, cart and checkout code are
untouched. Verify with the Stripe CLI (`stripe listen`, `stripe trigger`),
including a deliberate duplicate delivery.

---

## 16. Phase 13 — API documentation

**15.1** Generate OpenAPI **from the Zod schemas** with `zod-to-openapi` — one
source of truth, so docs can't drift from validation. This is the main structural
win over the course's hand-written annotations, which drifted and once crashed the
server at boot (`[01:18]`).

**15.2** Serve Swagger UI at `/api/docs` with bearer auth configured.

**15.3** Add the API's own origin to the CORS allow-list or "try it out" fails —
exactly the wall the author hit at `[01:18]`.

---

## 17. Phase 14 — Testing and hardening

**16.1 Vitest + Supertest** against the exported `app` (no `listen`).

**16.2** A separate `babymart_test` database, migrated before the run and
truncated between tests. Never point tests at the dev database.

**16.3 Priority coverage** — the security fixes, because these are the
regressions that matter:

- [ ] registration ignores a submitted `role`
- [ ] a non-admin cannot `PUT` another user
- [ ] order totals ignore client-supplied prices
- [ ] concurrent orders cannot oversell (two parallel requests, `stock = 1`)
- [ ] illegal status transitions are rejected
- [ ] a duplicate settlement event is a no-op (same `eventId` twice → one change)
- [ ] **the mock settle route 404s when `PAYMENT_PROVIDER=stripe`** (Phase 12.3)
- [ ] one user's cart is never served to another (cache-key test)
- [ ] a presigned upload URL rejects a disallowed content type (Phase 7.6)

**16.4 Rate-limit** auth endpoints (`express-rate-limit`) — login is a
brute-force target.

**16.5 Structured logging** with request ids; never log tokens, passwords or full
card data.

**16.6 `GET /health`** checking MySQL and Redis, for the deployment platform.

**16.7 Deploy:** run migrations as a release step, not at boot. Set
`NODE_ENV=production`.

---

## 18. Working order

Ship in vertical slices — a phase isn't done until its endpoints are callable and
tested:

```
Phase 1–2   scaffold, config, connections           foundation
Phase 3     schema + migrations + seeders           biggest single chunk
Phase 4     middleware                              everything depends on it
Phase 5     auth                                    unblocks all protected routes
Phase 6     users + addresses                       first full CRUD
Phase 7     catalogue                               products need categories+brands
Phase 8     caching                                 needs read endpoints to exist
Phase 9     cart + wishlist                         needs products
Phase 10    orders                                  needs cart + products
Phase 11    stats                                   needs orders
Phase 12    payments                                needs orders
Phase 13    docs                                    alongside each phase, ideally
Phase 14    tests + hardening                       continuous, not last
```

Phases 3–5 are the foundation; rushing them costs more later than they save now.

---

## 19. Defect ledger — spec issues and where we fix them

Cross-reference to `backend-spec.md` §14. All thirteen are addressed:

| # | Course defect | Fixed in |
|---|---|---|
| 1 | Registration accepts `role` → self-promotion | 5.8 (Zod strips it) |
| 2 | No ownership check on user update | 6.2 (`canActOnUser`) |
| 3 | Order totals trusted from client | 10.1 step 4 (re-price) |
| 4 | Order saved with validation disabled | 10.5 (snapshot columns) |
| 5 | No status-transition rules | 10.5 (transition table) |
| 6 | Deletion doesn't cascade | 3.2/3.11 (FK CASCADE / SET NULL) |
| 7 | Inconsistent response envelopes | 4.5 (one envelope) |
| 8 | Pagination on two resources only | 4.3 + 6.4 (shared schema) |
| 9 | Bad ids → 500 cast errors | 4.4 (FK error mapping) |
| 10 | No stock validation or decrement | 9.3 + 10.1 (`FOR UPDATE`) |
| 11 | Login leaks which emails exist | 5.8 (one generic message) |
| 12 | Payment split across API and client | 12.1 (API owns the provider seam) |
| 13 | Secrets committed to git | 1.5 (`.gitignore` first) |

Note the section numbers above refer to the numbered steps inside each phase
(e.g. "10.1" is step 1 of Phase 10 — Orders), not the `##` heading numbers.

Plus four additions of our own, none of which the course had:

- **`perPage` capped** at 100 so pagination can't be turned into a DoS.
- **Per-user cache isolation** so Redis can't serve one customer's cart to another.
- **Mock payment provider locked out of production** by env validation, so a
  free-checkout endpoint can never ship.
- **Presigned uploads constrained at signing time** — content type and size are
  fixed in the signature, since a presigned URL is a capability the browser holds.
