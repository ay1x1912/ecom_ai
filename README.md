# BabyMart

A full e-commerce stack — API, storefront and admin panel — built against the
BabyMart course, with its design defects fixed rather than reproduced.

| | | Port | |
| --- | --- | --- | --- |
| **`server/`** | Express 4 · Sequelize · MySQL 8 · Redis | `8000` | The API. Owns all business rules. |
| **`client/`** | Next.js 16 · React 19 · Tailwind 4 · shadcn/ui | `3000` | Customer storefront — browse, cart, checkout, pay. |
| **`admin/`** | Next.js 16 · React 19 · Tailwind 4 · shadcn/ui | `3001` | Store administration — dashboard, catalogue, orders, users. |

The course's fourth part, a React Native app, is not built.

## Quick start

```bash
./dev.sh
```

That starts MySQL and Redis in Docker, waits for the database to report healthy,
then runs all three apps with prefixed, interleaved logs. Ctrl-C stops everything
it started; the containers stay up so the next start is fast.

```
./dev.sh                 everything
./dev.sh --no-docker     MySQL and Redis are already running elsewhere
./dev.sh --only admin    one app (api | client | admin), repeatable
./dev.sh --down          stop the containers
```

First run installs dependencies in any app missing `node_modules`. If a port is
already taken the script says which one and by which process, rather than letting
one of the three fail quietly.

**Requirements:** Node 20.17 (see `.nvmrc`), npm, Docker Desktop.

### First time only

The database needs a schema and seed data:

```bash
cd server
npm run db:migrate
npm run db:seed
```

### Accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@babymart.local` | `Admin123!change-me` |
| Customer | `customer@babymart.local` | `Customer123!` |

The admin password is telling you to change it — do that from **My account** in
the panel. There is no public sign-up in the admin: registration cannot assign a
role, so staff accounts are created by an existing admin from the Users screen.

## Configuration

One `.env` at the repo root is the source of truth. `server/` gets it through a
symlink, because the API reads `.env` from its working directory:

```
.env  .env.example  .sequelizerc  .nvmrc   →   symlinked into server/
```

`dev.sh` re-creates those links if they go missing. Each frontend has its own
`.env.local` holding a single variable, `API_URL=http://localhost:8000`, which is
read **server-side only** — neither app ever puts a token in the browser.

If you move an app off its default port, update `CLIENT_URL` or `ADMIN_URL` in
`.env` too: the API builds its CORS allow-list from them, and the mock payment
provider builds its redirect URL from `CLIENT_URL`.

## How the pieces fit

**The API owns every rule.** Orders are priced server-side from the cart under a
row lock, stock is decremented in the same transaction, and roles are checked on
every request. Neither frontend sends a price, a total, or a line item — the
storefront's checkout posts one field, `addressId`.

**Both frontends are server-rendered.** They fetch in server components and mutate
in server actions, so the backend JWT lives in an httpOnly cookie and never
reaches JavaScript. There is no client state library, no Context and no data
fetching library in either app; search, filters and pagination live in the URL.

**Payments are mocked, behind a provider seam.** `POST /api/payment/checkout-session`
returns a `checkoutUrl` pointing at the storefront's own `/mock-checkout` page,
which then posts to an unauthenticated settle endpoint shaped like a real webhook.
That endpoint is registered only when `PAYMENT_PROVIDER=mock`, and the API refuses
to boot with mock in production. A failed payment cancels the order and returns
the stock.

**Uploads go straight to Cloudflare R2.** The admin asks the API for a presigned
URL, then the browser `PUT`s the file directly to the bucket; the bytes never pass
through either Next app. Content type and size are fixed inside the signature.

## Documentation

| | |
| --- | --- |
| `backend-spec.md` | What the API does — routes, rules, status codes. Stack-neutral. |
| `server/implementation.md` | How the API was built, phase by phase, plus the ledger of thirteen course defects and where each is fixed. |
| `client/implementation.md` | Storefront scope and architecture. |
| `admin/implementation.md` | Admin scope, and where it diverges from the course. |
| `server/src/docs` | OpenAPI spec — Swagger UI at `/api/docs`. |

Each app also has its own README with the details specific to it.

## Testing

```bash
cd server && npm test          # vitest, against a separate test database
```

Both frontends have been verified end to end with headless-browser runs covering
sign-up, cart, checkout, payment settlement, admin CRUD, role gating and the
presigned upload handshake.

## Known gaps

- **`R2_PUBLIC_BASE_URL` is a placeholder.** Uploads succeed and the object lands
  in the bucket, but the stored URL will not load until this is set to the
  bucket's Public Development URL or a custom domain. The admin's upload field
  says so inline when it happens.
- **The dev database holds test data.** Several `E2E …` and `x.test` products and
  a number of throwaway accounts accumulated during verification. Harmless, but
  they show up in listings and on the dashboard.
- **No product image gallery** — `products.image` is a single URL column.
- **No ratings, tax or shipping.** `orders.total` equals `subtotal`; the invoice
  deliberately prints no line the data cannot support.
- **`client/src/app/admin`** still ships a small admin panel from before `admin/`
  existed. Two panels means two places to fix a bug; it is a candidate for
  removal.

## A note on Docker

`server/docker-compose.yml` pins `name: ecom_ai`. Without it Compose derives the
project name from the directory — `server` — which collides with other projects
using the same directory name, and `docker compose up` will happily adopt their
containers and start this stack against an empty volume. Do not remove that line.
