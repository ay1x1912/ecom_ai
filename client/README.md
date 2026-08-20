# BabyMart — client

Storefront and admin panel for the BabyMart API, built with Next.js 16 (App
Router), React 19, Tailwind 4 and shadcn/ui.

Scope is deliberately narrow — see [implementation.md](./implementation.md):

- **Storefront** — register, sign in, browse and search products, cart, checkout,
  pay through the mock gateway, see the order.
- **Admin** — edit product details, read all orders, advance an order's status.

## Running it

The API must be up first:

```bash
cd ../server
docker compose up -d      # MySQL on 3307, Redis on 6379
npm run dev               # http://localhost:8000
```

Then this app:

```bash
npm install
npm run dev               # http://localhost:3000
```

`.env.local` holds one variable:

```
API_URL=http://localhost:8000
```

It is read server-side only. Every call to the API is made from a server
component or a server action, so the bearer token never reaches the browser.

The backend's `CLIENT_URL` must be `http://localhost:3000` — the mock payment
provider builds its `checkoutUrl` from it and redirects back into
`/mock-checkout` here.

## Seeded accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@babymart.local` | `Admin123!change-me` |
| Customer | `customer@babymart.local` | `Customer123!` |

## The checkout flow

1. `/cart` → `/checkout`, where a saved address is chosen or created.
   `POST /api/orders` accepts **only** an `addressId`, so there is no way to type
   an address straight into the order.
2. The order is built server-side from the cart: re-priced under a row lock,
   stock decremented, cart emptied. The client sends no prices, items or totals.
3. `POST /api/payment/checkout-session` returns a `checkoutUrl` pointing at
   `/mock-checkout`, this app's stand-in for a hosted gateway page.
4. That page posts to `POST /api/payment/mock/settle` — unauthenticated by
   design, because it is shaped like a webhook — and lands on `/orders/[id]`.

**A failed payment cancels the order** and returns the stock; it does not leave
it retryable. A *pending* order (payment abandoned rather than declined) can be
paid or cancelled from its order page.

## Auth

The backend JWT lives in an httpOnly cookie set by a server action — never
`localStorage`. `getSession()` reads it and calls `/api/auth/profile`, wrapped in
React's `cache` so the header, the page and any action share one call.

Route protection is three layers, and none is redundant:

- `src/proxy.ts` (Next 16's renamed middleware) redirects when the cookie is
  missing. It cannot see the role, so it does not try.
- `requireUser` / `requireAdmin` re-check on the server for every protected page
  and every mutating action — a server action is a public HTTP endpoint.
- The API enforces roles itself.

## Layout

```
src/
├── app/
│   ├── (shop)/       products, cart, checkout, orders
│   ├── (auth)/       login, register
│   ├── admin/        role-guarded panel
│   └── mock-checkout/ gateway stand-in — public, no session
├── actions/          server actions (auth, cart, checkout, payment, orders, admin)
├── components/       ui/ is shadcn-generated; shop/ and admin/ are ours
├── lib/              api.ts, session.ts, catalogue.ts, cart.ts, orders.ts
└── types/api.ts      hand-written mirrors of the backend presenters
```

`lib/api.ts` is the only module that knows the API exists. It attaches the token,
unwraps `{ data, meta }`, and throws a typed `ApiError` carrying `message` and
`fields` — the latter maps straight onto form inputs, so validation rules are
written once, in the backend's zod schemas.

## Notes

- **No client-side state library and no Context.** Server components fetch; server
  actions mutate and call `refresh()`. Filters, search and pagination live in the
  URL, which makes listings shareable and the back button correct.
- **No NextAuth.** One identity source and one cookie did not justify an adapter,
  a callbacks chain and a type-augmentation file.
- **Product images** come from admin-entered URLs. Known hosts go through
  next/image; anything else renders as a plain `<img>`, and a dead URL falls back
  to a placeholder rather than a broken-image icon. `placehold.co` is off the
  optimiser list on purpose — it serves SVG, which would need
  `dangerouslyAllowSVG`.
