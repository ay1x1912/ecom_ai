# BabyMart Client — Implementation Plan (reduced scope)

Two apps in one Next.js project:

- **Storefront** — a customer signs up, browses products, builds a cart, pays, and sees the order confirmed.
- **Admin panel** — an admin edits product details and reads orders.

Nothing else. This plan replaces the earlier full-course plan; §1 records exactly what
was cut so the decision is reversible.

---

## 1. Scope

### In

| Area | What it means |
| --- | --- |
| Register / login / logout | Email + password against `/api/auth/*`, token in an httpOnly cookie |
| Product list | Paginated grid, `?search=` and price/category filter via URL params |
| Product detail | One product by slug, add-to-cart |
| Cart | View, change quantity, remove, clear |
| Checkout | Pick or add a shipping address, place the order |
| Payment | Mock gateway round-trip, order lands `paid` |
| Order confirmation | The order the customer just paid for |
| Admin — products | List, edit product details |
| Admin — orders | List all orders, read one, advance its status |

### Out (deliberately)

Home page and banners · wishlist · ratings and reviews · category and brand browsing
pages · customer profile and address management outside checkout · admin CRUD for
users, categories, brands and banners · admin dashboard stats · order history list for
the customer.

Every one of these has a working backend endpoint, so any of them is additive later —
none requires re-architecting what is built here.

**One caveat on that list.** "Customer order history" is out, but the confirmation page
is in, and they are the same fetch (`GET /api/orders/my` vs `GET /api/orders/:id`).
Adding the list back is roughly one page component.

---

## 2. What the backend dictates

These are not design choices. The API is already built, and it constrains the client in
four ways worth knowing before Phase 1.

**2.1 — An order needs a saved address, not a typed one.**
`POST /api/orders` accepts exactly one field: `addressId`. So checkout cannot be a
single form that posts street/city/country alongside the order. The customer must have
an address row first. Two ways in: `POST /api/auth/register` takes an optional
`address` object, and `POST /api/users/:id/addresses` creates one any time. **The
checkout page therefore needs a "add a new address" form even in the minimal build** —
a fresh account that registered without an address otherwise cannot order at all.

**2.2 — The client sends no prices, no items, no total.**
The order is built server-side from the caller's cart, re-priced under a row lock, with
stock decremented in the same transaction. The client's job at checkout is to send an
address id and render what comes back.

**2.3 — The mock gateway redirects into a page we have to build.**
`POST /api/payment/checkout-session` returns a `checkoutUrl` of the form
`${CLIENT_URL}/mock-checkout?session=…&order=…`, where `CLIENT_URL` is
`http://localhost:3000`. That page is ours. It stands in for a hosted gateway page: two
buttons, pay and fail, each posting to `POST /api/payment/mock/settle`. That settle
endpoint is **unauthenticated by design** (it is webhook-shaped), so the page must be
publicly routable and must not assume a session.

**2.4 — Editing a product needs category and brand lists.**
`productUpdateSchema` accepts `categoryId` and `brandId` as numeric foreign keys. The
admin edit form needs `GET /api/categories` and `GET /api/brands` to populate two
selects — read-only use of two modules that are otherwise out of scope.

---

## 3. Stack

Latest published versions, verified against the registry:

| Package | Version |
| --- | --- |
| next | 16.3.1 |
| react / react-dom | 19.2.8 |
| typescript | 7.0.2 |
| tailwindcss | 4.3.3 |
| shadcn (CLI) | latest |
| zod | 4.4.3 |
| react-hook-form | 7.85.0 |
| @hookform/resolvers | 5.9.1 |
| sonner | 2.0.8 |
| lucide-react | 1.32.0 |

Two version notes:

- **Tailwind 4 configures in CSS, not `tailwind.config.ts`.** Theme tokens live in an
  `@theme` block after `@import "tailwindcss"`. shadcn supports this, but the setup
  steps differ from every v3 tutorial. Better known now than discovered in Phase 1.
- **TypeScript 7 is the rewritten compiler.** It is `latest` and semantically
  compatible, but editor and lint plugins can lag. Dropping to the 5.9 line is a
  one-line change if tooling misbehaves.

### Three things the earlier plan had that this one drops

**NextAuth — removed.** It exists to broker identity across providers and to own a
session. Here there is exactly one identity source (our own `/api/auth/login`, which
returns a JWT), and the session is one cookie. NextAuth would wrap that in an adapter,
a callbacks chain and a type-augmentation file to arrive at the same place. A ~40-line
`lib/session.ts` does it directly. Add NextAuth later, when a Google button is actually
wanted.

**React Context providers — removed, all of them.** The reference stack listed nine.
With server components the cart, the product list and the session are all fetched
server-side; a provider would be a second copy of state to keep in sync, which is the
usual reason carts drift. Cart mutations run through server actions and `revalidateTag`,
with `useOptimistic` for the instant badge bump.

**Client-side filter state — replaced by URL search params.** `?page=2&search=bottle` makes
listings shareable, the back button correct, and the filtering server-rendered.

---

## 4. Auth

Login posts to `/api/auth/login`, which returns `{ user, token }`.

- The token goes into an **httpOnly, sameSite=lax, secure-in-prod cookie** set by a
  server action. Never `localStorage` — anything readable by JS is readable by injected
  JS.
- `getSession()` reads the cookie and calls `GET /api/auth/profile`, wrapped in React's
  `cache()` so it runs at most once per request. That returns `{ id, name, email, role }`
  — the role comes from the server every time rather than from a decoded client-side
  claim.
- **Middleware** checks only that the cookie exists, and redirects to `/login` for
  `/cart`, `/checkout`, `/orders/*` and `/admin/*`. It cannot check the role cheaply,
  so it does not try.
- **Every admin page and every admin server action re-checks `role === 'admin'`
  itself.** Middleware is a redirect for good UX, not a security boundary — a server
  action is a public HTTP endpoint and must defend itself. The backend enforces this
  independently too; this is the second layer.
- Logout posts to `/api/auth/logout` and deletes the cookie.

---

## 5. Endpoints consumed

| Method | Path | Used by |
| --- | --- | --- |
| POST | `/api/auth/register` | Sign-up |
| POST | `/api/auth/login` | Sign-in |
| GET | `/api/auth/profile` | `getSession()` |
| POST | `/api/auth/logout` | Sign-out |
| GET | `/api/products` | Product list (`page`, `perPage`, `search`, `sortBy`, `sortOrder`, `categoryId`, `brandId`, `minPrice`, `maxPrice`, `inStock`) |
| GET | `/api/products/slug/:slug` | Product detail |
| GET | `/api/products/:id` | Admin edit form |
| PUT | `/api/products/:id` | Admin save (admin) |
| GET | `/api/cart` | Cart page, header badge |
| POST | `/api/cart` | Add to cart `{ productId, quantity }` |
| PUT | `/api/cart/:productId` | Change quantity `{ quantity }` |
| DELETE | `/api/cart/:productId` | Remove line |
| GET | `/api/users/:id/addresses` | Checkout address picker |
| POST | `/api/users/:id/addresses` | Checkout new address |
| POST | `/api/orders` | Place order `{ addressId }` |
| GET | `/api/orders/:id` | Confirmation, admin order detail |
| GET | `/api/orders` | Admin order list (admin) — same list params plus `status` |
| PUT | `/api/orders/:id/status` | Admin status change (admin) |
| POST | `/api/payment/checkout-session` | Start payment `{ orderId }` |
| POST | `/api/payment/mock/settle` | Mock gateway page `{ sessionId, outcome }` |
| GET | `/api/categories`, `/api/brands` | Admin form selects |

Responses are `{ data, meta? }` on success and `{ error: { message, fields? } }` on
failure. `fields` maps directly onto react-hook-form's `setError`, so backend validation
errors land on the right input without a second validation vocabulary.

Order statuses are `pending | paid | completed | cancelled`.

---

## 6. Pages

```
/                      → redirect to /products
/products              product grid, search + filters in URL params
/products/[slug]       detail, add to cart
/login                 
/register              name, email, password, optional first address
/cart                  lines, quantity steppers, subtotal, checkout button
/checkout              address picker + new-address form, place order
/mock-checkout         gateway stand-in — pay / fail  (public, no session)
/orders/[id]           confirmation: status, items, total, address

/admin                 redirect to /admin/orders
/admin/products        table: name, price, stock, edit link
/admin/products/[id]   edit form
/admin/orders          table: number, customer, total, status, date + status filter
/admin/orders/[id]     items, address, payment, status control
```

Shared shell: a header with logo, search box, cart badge and a session menu; admin gets
its own minimal sidebar layout. No footer beyond a line of text, no mega-menu, no
carousel.

---

## 7. Structure

```
client/
├── src/
│   ├── app/
│   │   ├── (shop)/            products, cart, checkout, orders — storefront layout
│   │   ├── (auth)/            login, register — centred card layout
│   │   ├── admin/             admin layout + pages, role-guarded
│   │   ├── mock-checkout/     public, outside both layouts
│   │   ├── layout.tsx
│   │   └── globals.css        Tailwind 4 @theme tokens live here
│   ├── components/
│   │   ├── ui/                shadcn, generated — not hand-edited
│   │   ├── shop/              ProductCard, QuantityStepper, CartLine, AddressForm
│   │   └── admin/             DataTable, StatusBadge, StatusSelect
│   ├── lib/
│   │   ├── api.ts             typed fetch wrapper: base URL, bearer token, envelope unwrap
│   │   ├── session.ts         cookie read/write, getSession(), requireUser, requireAdmin
│   │   ├── format.ts          money and date
│   │   └── utils.ts           cn()
│   ├── actions/               server actions: auth, cart, checkout, admin
│   └── types/api.ts           hand-written to match the presenters
└── .env.local                 API_URL, NEXT_PUBLIC_API_URL
```

`lib/api.ts` is the single place that knows the backend exists. It attaches the bearer
token, unwraps `{ data }`, and throws a typed `ApiError` carrying `message` and
`fields`. Every caller above it works in domain terms.

---

## 8. Phases

Each phase ends somewhere demonstrable.

**Phase 1 — Foundation.**
`create-next-app` (TS, Tailwind, App Router), shadcn init, `lib/api.ts`, `types/api.ts`,
`.env.local`, root layout. *Done when:* a page server-renders live products from the
running backend.

**Phase 2 — Auth.**
Register and login forms (react-hook-form + zod, backend `fields` mapped onto inputs),
cookie session, `getSession()`, middleware, header session menu, logout. *Done when:* a
new account can sign up, sign in, refresh without losing the session, and sign out.

**Phase 3 — Catalogue.**
Product grid with pagination and URL-param search/filter; detail page by slug; empty and
not-found states. *Done when:* a product is reachable from the list and shows real
stock, price and discount.

**Phase 4 — Cart.**
Add to cart from detail and card, cart page with steppers and remove, optimistic header
badge, `revalidateTag('cart')` after each mutation. *Done when:* quantities survive a
reload and the badge is never stale.

**Phase 5 — Checkout and payment.**
Address picker plus new-address form; place order; checkout session; `/mock-checkout`
page; settle; land on the confirmation page. *Done when:* an order goes
`pending → paid`, the cart is empty afterwards, and stock has dropped. Also verify the
failure button leaves the order unpaid and recoverable.

**Phase 6 — Admin.**
Role-guarded layout, product table, product edit form, order table with status filter,
order detail with status control. *Done when:* an admin edits a price and sees it on the
storefront, and moves an order `paid → completed`.

**Phase 7 — Tidy.**
Loading skeletons, error boundaries, `sonner` toasts on every mutation, disabled buttons
while pending, mobile check at 375 px, a README with the run steps.

---

## 9. Prerequisites

- Backend running on `:8000` with `CLIENT_URL=http://localhost:3000` and
  `PAYMENT_PROVIDER=mock`.
- Seeded data — products, categories, brands — and a known admin account.
- CORS on the backend must allow `http://localhost:3000` with credentials.
- **Config files are still at the repo root after the reorg** (`.env`, `.sequelizerc`,
  `.nvmrc`). `dotenv` resolves from the working directory, so the server needs them
  moved into `server/` or needs to be started from the root.

---

## 10. Open questions

1. **Currency and locale.** Prices are plain decimals. Assuming `en-US` / USD via
   `Intl.NumberFormat` unless told otherwise.
2. **Guest cart.** The cart endpoints all require a token, so a signed-out visitor
   cannot hold one server-side. Recommending **sign-in required to add to cart** —
   simplest, and honest about what the backend supports. The alternative (local cart,
   merged on login) is a Phase 4 rewrite, so it is cheap to decide now and expensive
   later.
3. **Product images.** `products.image` is a single URL column, so the detail page shows
   one image. A gallery would need a backend change.
4. **Admin image upload.** `POST /api/uploads/signature` gives presigned direct-to-R2
   uploads. Editing an existing product does not require it. Include a file picker in
   the edit form, or paste a URL for now? Recommending **paste a URL** for the first
   pass — note that `R2_PUBLIC_BASE_URL` is still a placeholder in `.env`.
5. **Admin product create/delete.** `POST` and `DELETE /api/products` exist. "Update
   details" was the stated need; say the word if create and delete should be in Phase 6
   too — it is one more form and one confirm dialog.
