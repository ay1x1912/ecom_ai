# BabyMart Backend — Route & Behaviour Spec

Reverse-engineered from the course transcript (`babymart-course-transcript.txt`),
backend segment `[00:00]`–`[03:14]`, plus the API-consumption evidence in the
admin section (`[03:45]`–`[08:40]`) and client section (`[08:40]`–`[18:48]`).

The original is Node + Express + Mongoose. This document deliberately describes
**behaviour, not their code** — field lists, status codes, auth rules and
step-by-step logic — so you can implement it in any stack. Pseudocode is
language-neutral.

Timestamps like `[01:03]` point at the transcript so you can check any detail.

---

## 1. Service shape

Single REST service, JSON in / JSON out, stateless bearer-token auth.
Base path `/api`. Original ran on port 8000.

```
/api/auth          register, login, profile, logout
/api/users         user CRUD (admin) + per-user address sub-resource
/api/categories    CRUD, paginated list
/api/brands        CRUD
/api/products      CRUD
/api/banners       CRUD (homepage marketing slots)
/api/cart          per-user cart
/api/wishlist      per-user wishlist
/api/orders        order lifecycle
/api/stats         dashboard counters + distributions (admin)
/api/analytics     richer reporting (admin)  — see §11, barely specified
/api/payment       Stripe intent + webhook   — see §11, barely specified
/api/docs          OpenAPI/Swagger UI
```

Mount order matters in one place: categories and brands must be registered
before products, because product creation validates category/brand references
`[02:45]`.

---

## 2. Environment

From `[00:09]` and `[02:50]`:

| Var | Purpose |
|---|---|
| `PORT` | HTTP port (8000) |
| `MONGO_URI` | database connection string |
| `JWT_SECRET` | token signing secret |
| `STRIPE_SECRET_KEY` | Stripe server key |
| `STRIPE_WEBHOOK_SECRET` | webhook signature verification |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | image uploads |
| `CLIENT_URL` / `ADMIN_URL` | CORS allow-list + Stripe redirect targets |
| production server URL | used once deployed |

Ship a committed `.env.example` with keys but no values. The author leaked a
live `MONGO_URI` to git at `[02:52]` and had to rewrite it — put `.env` in
`.gitignore` on commit one.

An email/SMTP service (Nodemailer) exists in their repo but was **explicitly
skipped** in the video `[00:10]`. Nothing depends on it.

---

## 3. Cross-cutting conventions

**Async error capture.** Every handler is wrapped so a thrown error or rejected
promise lands in one central error middleware instead of killing the process
`[00:31]`, `[00:58]`. Whatever your stack's equivalent is, decide it once.

**Error middleware** normalises `{ message, statusCode }` and hides stack traces
outside development `[00:10]`.

**A not-found middleware** catches unmatched routes; a debug middleware logs
every request during development `[00:24]`.

**CORS** allow-lists the client and admin origins. This bit the author at
`[01:18]`: Swagger's "try it out" was blocked until the origin was allowed.

**Status codes used:** `200` ok, `201` created, `400` bad request / validation,
`401` missing or invalid token, `403` authenticated but wrong role, `404` not
found.

**Response envelope is inconsistent in the original** — some endpoints return
`{ success: true, users: [...] }`, others return the bare object `[01:37]`,
`[02:11]`. The author says outright this was left deliberately varied. **Pick one
envelope and apply it everywhere.** Suggested:

```
success → { data: <payload>, meta?: { page, perPage, total, totalPages } }
error   → { error: { message, code? } }
```

**Pagination contract** (implemented on categories `[02:41]` and orders `[03:00]`;
left as an exercise elsewhere — implement it uniformly):

```
query: page (default 1), perPage (default 20), sortOrder (asc|desc, default asc)
1. coerce page/perPage to integers, clamp to sane bounds (perPage max e.g. 100)
2. validate sortOrder against the allow-list
3. skip = (page - 1) * perPage
4. total = count(filter)
5. rows  = find(filter).sort(...).skip(skip).limit(perPage)
6. return rows + { page, perPage, total, totalPages: ceil(total / perPage) }
```

---

## 4. Auth model

**Token.** Sign `{ id: <userId> }` only — nothing else. The author first embedded
the whole user object, decoded it in a JWT debugger, saw the password hash sitting
in the payload, and cut it back to the id `[01:09]`. Expiry 7 days `[01:07]`.
A JWT payload is *readable by anyone holding the token*; treat it as public.

Refresh tokens were raised and skipped `[01:07]`. If you want them, design that
in now — retrofitting rotation is painful.

**`requireAuth` middleware** `[01:21]`:

```
1. read Authorization header; require the "Bearer <token>" form
2. if absent or malformed → 401 "Not authorized, no token"
3. verify signature + expiry with JWT_SECRET; on failure → 401 "token failed"
4. load user by decoded.id, excluding the password field
5. if no such user → 401
6. attach user to the request; continue
```

**`requireAdmin` middleware** `[01:35]`, runs after `requireAuth`:

```
if request.user exists and request.user.role == "admin" → continue
else → 403 "Not authorized as an admin"
```

Roles: `admin`, `user`, `deliveryman` `[00:40]`. Only the first two are used;
`deliveryman` is provisioned for later delivery flows.

**Password hashing** happens in a pre-save hook, not in controllers, so every
write path benefits `[00:50]`:

```
before save:
  if password field not modified → continue      # critical: else you re-hash
  salt = generateSalt(cost 10)
  password = hash(password, salt)
```

That guard is what stops a profile update from double-hashing an already-hashed
password and locking the user out. The author also lost time to a missing `await`
around salt generation `[00:57]` — hashing is async in most libraries.

**Password comparison** is a model method, `matchPassword(candidate)`, doing a
constant-time compare of candidate against the stored hash `[00:59]`. Never
compare plaintext.

---

## 5. Data models

### User `[00:39]`, extended `[02:00]`

| Field | Type | Rules |
|---|---|---|
| `name` | string | required |
| `email` | string | required, **unique** — the identity key |
| `password` | string | required, stored hashed, never returned |
| `avatar` | string | default placeholder URL |
| `role` | enum | `admin` \| `user` \| `deliveryman`, default `user` |
| `addresses` | array | embedded, see below |
| `wishlist` | array | references to Product |
| `cart` | array | `{ product → Product, quantity }` |
| timestamps | | created/updated |

Embedded **address**: `street`, `city`, `country`, `postalCode` (all required
strings — note postal code is a *string*, confirmed at `[02:16]`), `isDefault`
boolean, optional `note`.

A second pre-save hook enforces **exactly one default address** `[00:54]`:

```
before save:
  if addresses not modified → continue
  if an address is flagged default → clear the flag on all others
  if no address is flagged and the list is non-empty → flag the first
```

Wishlist and cart store **ids, not embedded product copies** — a deliberate
call, restated at `[03:05]`: duplicating product documents into every user makes
writes heavy and the copies go stale. You dereference on read.

### Product `[02:06]` — the most involved model

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, unique (slug source) |
| `description` | string | |
| `price` | number | default 0 |
| `discountPercentage` | number | default 0, min 0, max 90 |
| `stock` | number | default 0 |
| `image` | string | required (Cloudinary secure URL) |
| `category` | ref → Category | required |
| `brand` | ref → Brand | required |
| `ratings` | array | `{ user → User, rating 1–5, comment, createdAt }` |
| `averageRating` | number | derived from `ratings` |
| timestamps | | |

Max discount wobbles between 100 and 90 in the narration `[02:06]`; 90 is the
stated intent — 100% would mean free.

`averageRating` is recomputed from the embedded ratings whenever they change
`[02:07]`. Keep that in one place (a hook or a service method), never in a
controller.

### Category `[02:04]`

`name` (unique), `image` (optional), `categoryType` (**enum**, validated against
a fixed list — featured / hot / top `[02:43]`), timestamps.

### Brand `[02:01]`

`name` (unique), `image`, timestamps. Simplest model in the system.

### Banner `[02:01]`

`name`, `title`, `startFrom`, `image`, `bannerType`, timestamps. Drives homepage
marketing slots; the admin can add/edit them so nothing is hardcoded `[03:21]`.

### Cart `[02:03]`

Its own collection, not only the embedded user array: `userId` (ref → User,
required) and `items[]` of `{ productId → Product, name, price, quantity, image }`.

Note the denormalisation here — cart items snapshot name/price/image alongside
the id. That's defensible (price at time of add), but it contradicts the
ids-only principle above. **Decide deliberately:** snapshot price if you want
cart prices frozen, reference if you want them live.

### Order `[02:04]`

| Field | Type | Notes |
|---|---|---|
| `userId` | ref → User | owner |
| `items` | array | `{ productId, name, price, quantity, image }` snapshot |
| `total` | number | default 0 |
| `status` | enum | `pending` \| `paid` \| `completed` \| `cancelled`, default `pending` |
| `shippingAddress` | object | street, city, country, postalCode |
| `paymentIntentId` | string | Stripe |
| `stripeSessionId` | string | Stripe |
| `paidAt` | date | |
| timestamps | | |

Order items **must** be snapshots, not live references — an order is a
historical record and must not change when a product is later repriced or
renamed.

Lifecycle `[02:05]`: created `pending` → `paid` on successful payment →
`completed` on delivery → `cancelled` if voided. The author notes a richer set
(confirmed, packed, delivered) exists in a later iteration `[12:55]`.

---

## 6. `/api/auth`

### `POST /api/auth/register` — public `[00:29]`–`[00:58]`

```
body: { name, email, password, role?, address? }
1. if a user with this email exists → 400 "User already exists, try login"
2. create user (password hashed by the pre-save hook)
   seed addresses from the optional address, else an empty list
3. on success → 201 { id, name, email, avatar, role, addresses }
4. on failure → 400 "Invalid user data"
```

> **Fix this before you ship it.** The original reads `role` straight from the
> request body `[00:35]`, so anyone can POST `role: "admin"` and self-promote —
> which is exactly how the author creates the first admin at `[01:10]`. In your
> build: **ignore `role` on public registration** (always assign `user`), and
> create the first admin via a seed script or by promotion through the
> admin-only user endpoint.

Never return the password field, hashed or not.

### `POST /api/auth/login` — public `[00:59]`–`[01:09]`

```
body: { email, password }
1. find user by email
2. if user exists AND matchPassword(password) →
     200 { id, name, email, avatar, role, token: sign(user.id) }
3. else → 400 "Invalid email or password"
```

Use one message for both "no such email" and "wrong password" — distinguishing
them tells an attacker which emails are registered.

### `GET /api/auth/profile` — auth `[01:20]`–`[01:27]`

```
1. load user by request.user.id, excluding password
2. if found → 200 { id, name, email, avatar, role, addresses }
3. else → 404 "User not found"
```

Purpose `[01:24]`: the client caches the user at login, but cart, wishlist and
addresses drift. This is the re-hydration endpoint — the authoritative read.

### `POST /api/auth/logout` — auth `[01:27]`

Returns `200 { success: true, message: "Logged out successfully" }`. With
stateless JWTs the server holds no session, so this is a client-side token
discard. It only becomes meaningful if you add a token denylist or refresh-token
revocation.

---

## 7. `/api/users`

All admin-only except where noted. Backing logic at `[01:31]`–`[02:21]`.

| Method | Path | Auth | Handler |
|---|---|---|---|
| GET | `/api/users` | admin | list users |
| POST | `/api/users` | admin | create user |
| GET | `/api/users/:id` | auth | get one |
| PUT | `/api/users/:id` | auth | update |
| DELETE | `/api/users/:id` | admin | delete |
| POST | `/api/users/:id/addresses` | auth | add address |
| PUT | `/api/users/:id/addresses/:addressId` | auth | update address |
| DELETE | `/api/users/:id/addresses/:addressId` | auth | delete address |

### `GET /api/users` `[01:36]`

```
1. find all users, excluding password
2. 200 { success: true, users }
```

No pagination in the original — the author flags it as an exercise `[01:46]`,
`[05:47]`. Add it; an admin user table needs it.

### `POST /api/users` `[01:41]`

Same logic as register, but admin-invoked and allowed to set `role` and
`addresses` outright `[01:42]`. This is the legitimate home for role assignment.

### `GET /api/users/:id` `[01:46]`

Load by path id, exclude password, `404` if absent.

### `PUT /api/users/:id` `[01:47]`

```
1. load user by path id; if absent → 404 "User not found"
2. AUTHORIZATION: allow if requester is the same user OR an admin
3. overwrite provided fields: name, email, password, role, addresses, avatar
   (absent fields keep their current value)
4. save (password re-hashed by the hook only if it changed)
5. 200 updated user, without password
```

> **Step 2 is missing in the original.** The author writes the ownership check,
> then comments it out and skips it `[01:49]`, leaving any authenticated user
> able to `PUT /api/users/<anyone>` — including setting their own `role` to
> `admin`. That is a privilege-escalation hole. Implement the check, and either
> strip `role` from self-updates or gate it behind admin.

### `DELETE /api/users/:id` `[01:55]`

```
1. load user; if absent → 404
2. cascade: delete the user's cart, and decide a policy for their orders
3. delete the user
4. 200 { success: true, message: "User deleted successfully" }
```

The cascade is **left as a TODO comment** in the original `[01:57]`. Orphaned
carts and orders are a real consequence. Orders usually should be *retained*
(financial record) with the user reference soft-nulled rather than hard-deleted.

### Address sub-resource `[02:08]`–`[02:21]`

`POST /api/users/:id/addresses`:

```
1. load user by path id; if absent → 404
2. AUTHORIZATION: same user or admin, else 403
3. require street, city, country, postalCode → else 400 "All address fields are required"
4. if isDefault requested → clear the default flag on the user's other addresses
5. if this is the first address → force isDefault = true
6. append, save
7. 200/201 with the updated address list
```

`PUT .../addresses/:addressId` — locate the embedded address by id, `404` if
absent, patch supplied fields, re-run the single-default rule, save `[02:12]`.

`DELETE .../addresses/:addressId` — locate, remove; **if the removed one was the
default, promote the first remaining address to default** `[02:13]`, save.

Address authorization here is stricter than on `PUT /api/users/:id`: owner or
admin, enforced `[02:09]`. Use this pattern as your model for the rest.

---

## 8. Catalogue: products, categories, brands, banners

All four follow one CRUD shape — public reads, admin-only writes:

```
GET    /api/<resource>        public   list  (paginated)
POST   /api/<resource>        admin    create
GET    /api/<resource>/:id    public   read one
PUT    /api/<resource>/:id    admin    update
DELETE /api/<resource>/:id    admin    delete
```

### Products `[02:21]`–`[02:49]`

`POST /api/products`:

```
body: { name, description, price, category, brand, image,
        discountPercentage?, stock? }
1. if a product with this name exists → 400 "Product with this name already exists"
2. verify category and brand ids resolve to real documents
     → else 400 (a bad id surfaces as a cast error otherwise, see below)
3. if an image file was supplied → upload to the image service, keep the secure URL
4. create with discountPercentage ?? 0 and stock ?? 0
5. 201 product  |  400 "Invalid product data"
```

Two traps the author hit:

- Creating a product with a category/brand string that isn't a valid id throws a
  **cast error** — an ugly 500 rather than a clean 400 `[02:35]`. Validate id
  format *and* existence, and map cast failures to 400 in your error middleware.
- Products cannot be created before at least one category and one brand exist
  `[02:36]`. Seed those, and say so in your setup docs.

Image upload was repeatedly deferred `[02:27]`, `[02:28]`. Note the content-type
issue the author flags at `[02:27]`: a JSON body can't carry a binary file. Pick
one approach deliberately — multipart upload to your API which forwards to the
image host, or direct-to-host upload from the browser with a signed URL and only
the resulting URL sent as JSON. The second scales better.

List filtering/sorting/pagination for the storefront is assembled client-side via
a shared query-string builder `[04:14]`; the server side is left thin. Define it
explicitly: `page`, `perPage`, `sortOrder`, plus `category`, `brand`, `search`,
and a price range.

### Categories `[02:40]`–`[02:48]`

The **only** resource with pagination fully implemented `[02:41]` — use it as
your reference implementation (§3).

`POST /api/categories`:

```
body: { name, image?, categoryType }
1. require name to be a non-empty string → else 400
2. validate categoryType against the allow-list → else 400 "Invalid category type"
3. if a category with this name exists → 400
4. upload image if supplied, keep the secure URL
5. 201 category
```

The enum check is enforced server-side `[02:48]` — the admin UI can't be trusted
to constrain it.

### Brands `[02:36]`–`[02:39]`

Plainest CRUD: unique name, optional image upload on create and update, delete
by id. Nothing surprising.

### Banners `[02:56]`

Standard CRUD over `name`, `title`, `startFrom`, `image`, `bannerType`. Exists so
homepage promos are data, not deploys.

---

## 9. Cart, wishlist, orders

### `/api/cart` — all endpoints auth `[03:07]`

| Method | Path | Behaviour |
|---|---|---|
| GET | `/api/cart` | own cart, product refs dereferenced |
| POST | `/api/cart` | add item `{ productId, quantity = 1 }` |
| PUT | `/api/cart` | change an item's quantity |
| DELETE | `/api/cart/:productId` | remove one item |
| DELETE | `/api/cart` | clear |

Add-item logic `[03:08]`:

```
1. require productId; quantity defaults to 1 and must be >= 1
2. load the product; if absent → 404 "Product not found"
3. find the item's index in the caller's cart
4. if present → increment quantity; else → append
5. save, then return the cart with products dereferenced
```

The cart is always scoped to the authenticated caller — the user id comes from
the token, **never** from the request body. Same for wishlist and "my orders".

Not covered in the video, and worth deciding: reject quantities exceeding
`stock`, and whether stock is reserved at add-to-cart or only at order creation.
The original does neither.

### `/api/wishlist` — all endpoints auth `[03:04]`–`[03:07]`

| Method | Path | Behaviour |
|---|---|---|
| GET | `/api/wishlist` | own wishlist ids |
| POST | `/api/wishlist` | add `{ productId }`, ignore if already present |
| DELETE | `/api/wishlist/:productId` | remove |
| POST | `/api/wishlist/products` | **batch dereference**: ids in → full products out |
| DELETE | `/api/wishlist` | clear |

The batch endpoint `[03:06]` exists because the wishlist stores only ids:

```
body: { productIds: [...] }
1. require a non-empty array → else 400
2. find all products whose id is in the list, with category name attached
3. 200 products
```

A POST that only reads is a wart — it's a POST to keep a long id list out of the
query string. `GET /api/wishlist?expand=products` is cleaner and cacheable.
Whichever you choose, cap the array length.

Adding is idempotent by design `[03:05]`: already-present ids are skipped rather
than erroring.

### `/api/orders` `[03:00]`–`[03:04]`

| Method | Path | Auth | Behaviour |
|---|---|---|---|
| GET | `/api/orders` | admin | all orders, paginated + status filter + search |
| GET | `/api/orders/my` | auth | caller's own orders |
| POST | `/api/orders` | auth | create from cart |
| GET | `/api/orders/:id` | auth | one order (owner or admin) |
| PUT | `/api/orders/:id/status` | auth | advance status |
| DELETE | `/api/orders/:id` | auth | delete (owner or admin) |

**Admin list** `[03:01]`: paginate, filter by status, attach the buyer's name and
email, project the fields the table needs, return rows plus the total.

**Create from cart** `[03:01]`:

```
body: { items, shippingAddress }
1. require a non-empty items list → else 400
2. require shippingAddress with street, city, country, postalCode → else 400
3. for each item, load the product and confirm it exists
4. build snapshot items { productId, name, price, quantity, image }
5. total = sum(price * quantity)
6. create the order with status "pending"
7. 201 order
```

> **Compute the total server-side from stored product prices** — never trust a
> total, or per-item prices, sent by the client. The transcript has the client
> assembling item data before POSTing `[18:24]`; treat that as untrusted input
> and re-price everything from the database. Otherwise a crafted request buys a
> pram for one cent.
>
> Also decide where **stock decrement** happens (on payment success, ideally,
> inside a transaction) and clear the cart after a successful order. Neither is
> covered in the video.

**Update status** `[03:02]`:

```
body: { status, paymentIntentId?, stripeSessionId? }
1. validate status against pending|paid|completed|cancelled → else 400
2. load the order; if absent → 404
3. AUTHORIZATION: admin, or the owner while the order is still pending
4. apply status; on "paid" record paymentIntentId, stripeSessionId, paidAt
5. save
6. 200 order
```

The original saves this **with validation disabled** to dodge shipping-address
validation errors `[03:03]`. Don't copy that — it lets invalid documents through.
Fix the validation instead: make `shippingAddress` requirements consistent
between creation and update, or validate only the changed subtree.

Status transitions are also unconstrained: nothing stops `cancelled → paid`.
A small state machine of legal transitions is worth the twenty lines.

---

## 10. `/api/stats` — admin dashboard `[02:58]`–`[03:00]`

Single endpoint, `GET /api/stats`, admin only. Returns the numbers behind the
dashboard tiles and charts:

```
counts:        users, products, categories, brands, orders
revenue:       sum of order totals (paid orders only — the original is vague here)
distributions: orders grouped by status
               users grouped by role
               products grouped by category
               products grouped by brand
```

Aggregate these in the database, not by loading every document and counting in
application code. Consumers are the tiles and charts described at `[03:16]`.

Return one payload with a stable shape; the dashboard renders whatever it gets.

---

## 11. Specified too thinly to copy — decide these yourself

Honest flagging: these were pasted from the author's repo and narrated only in
passing, so the transcript does **not** contain enough to reimplement them
faithfully. Treat the notes as direction, not spec.

**`/api/payment`** `[03:09]`, `[03:12]`. A payment controller exists and reads
`STRIPE_SECRET_KEY`; the author defers all explanation and it later crashes
startup when the key is missing `[03:12]`. Meanwhile the Next.js client creates
its Stripe **checkout session in its own server route**, not on this API
`[18:31]`–`[18:34]`, passing line items as `{ name, description, amount,
currency, quantity, images }` with success/cancel URLs, customer email and
metadata `[18:40]`.

So payment ownership is genuinely split in the original. Pick one — and put it on
your API, not the web client, so mobile and web share it. You need:

```
POST /api/payment/checkout-session   auth    create a session for an order, return its URL/id
POST /api/payment/webhook            public  Stripe-signed; the source of truth for "paid"
```

The webhook is the part that matters. Requirements no tutorial should let you
skip: **verify the signature** with `STRIPE_WEBHOOK_SECRET`; read the **raw
body** (signature checks fail against parsed JSON); make handling **idempotent**,
since Stripe retries and may deliver duplicates; and mark orders paid *here*,
never from a client redirect — a user can close the tab, and a success URL can be
forged.

**`/api/analytics`** `[03:09]`. Mentioned once, never explained, and absent from
the rest of the 18 hours. The admin UI it feeds shows paid vs pending orders,
revenue, best sellers, recent orders, and fast-moving vs never-sold products
`[03:17]`. Derive that spec from those tiles. There is meaningful overlap with
`/api/stats` — consider folding both into one reporting surface rather than
inheriting two.

**Avatar upload** `[02:25]`, and pagination on users/brands/products `[01:46]` —
consciously left as exercises.

**Email/Nodemailer** `[00:10]` — scaffolded, unused, no flow depends on it.

---

## 12. API documentation

Swagger/OpenAPI UI served at `/api/docs`, generated from annotations written
beside each route `[01:11]`–`[01:18]`. Bearer auth is wired into the UI so you
can paste a token and exercise protected endpoints in the browser.

Two practical notes: the docs page needs the API's own origin in the CORS
allow-list or "try it out" fails `[01:18]`, and a malformed annotation **crashed
the server** at `[01:18]` — the docs are parsed at boot, so treat them as code.

Prefer generating the spec from your schemas/types if your stack can, rather
than hand-written comments that drift from the handlers.

---

## 13. Suggested build order

The video's order, which sequences cleanly — each step is testable before the
next depends on it:

1. Server skeleton, config, DB connection, health route `[00:19]`–`[00:23]`
2. Error, not-found and logging middleware `[00:10]`
3. User model with both pre-save hooks and `matchPassword` `[00:38]`–`[00:59]`
4. Token signing + `requireAuth` + `requireAdmin` `[01:06]`–`[01:35]`
5. `/api/auth`: register, login, profile, logout `[00:29]`–`[01:30]`
6. `/api/users` CRUD, then the address sub-resource `[01:31]`–`[02:21]`
7. Brands and categories (products depend on them) `[02:36]`–`[02:48]`
8. Products, then image upload `[02:21]`–`[02:49]`
9. Banners `[02:56]`
10. Cart and wishlist `[03:04]`–`[03:08]`
11. Orders `[03:00]`–`[03:04]`
12. Stats, then analytics `[02:58]`, `[03:09]`
13. Payment: checkout session, then the webhook `[03:09]`
14. OpenAPI docs alongside each route as you go `[01:11]`

Steps 1–5 are the ones the author types out in full detail; from step 7 on the
narration thins out and code is pasted, so those are the sections where this
spec is doing more inference. Where you need certainty, the timestamps point
back at the transcript.

---

## 14. Carry-over defects checklist

Everything above worth not reproducing, in one place:

| # | Issue | Where |
|---|---|---|
| 1 | Public registration accepts `role` → self-promotion to admin | `[00:35]` |
| 2 | `PUT /api/users/:id` has no ownership check → any user edits any user | `[01:49]` |
| 3 | Order totals/prices trusted from the client | `[18:24]` |
| 4 | Order status saved with validation disabled | `[03:03]` |
| 5 | No status-transition rules on orders | `[03:02]` |
| 6 | User deletion doesn't cascade cart/orders | `[01:57]` |
| 7 | Inconsistent response envelopes, admitted as deliberate | `[02:11]` |
| 8 | Pagination on categories/orders only | `[01:46]` |
| 9 | Bad category/brand ids surface as 500 cast errors, not 400 | `[02:35]` |
| 10 | No stock validation or decrement anywhere | — |
| 11 | Login distinguishes unknown email from wrong password | `[01:05]` |
| 12 | Payment split between API and web client | `[18:31]` |
| 13 | Secrets committed to git, then rewritten | `[02:52]` |
