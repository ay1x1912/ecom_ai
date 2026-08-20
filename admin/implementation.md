# BabyMart Admin — Implementation Plan

A standalone **Next.js** app for running the store: dashboard, users, products,
categories, brands, banners, orders.

Third app in the repo, and it is deliberately built like the second one:

| | | |
| --- | --- | --- |
| `server/` | Express + Sequelize + MySQL | the API, already built |
| `client/` | Next.js 16 storefront | built, end-to-end tested |
| `admin/` | Next.js 16 admin panel | **this plan** |

Feature scope comes from the admin segment of the course transcript,
**`[03:14]` – `[08:40]`** (the server segment ends at `[03:14:02]` — *"now what I
need to do basically we can just start building our dashboard"* — and the client
segment begins at `[08:40:00]`). Architecture comes from `client/`, which already
solved these problems against this API.

---

## 1. What the course builds

The presenter states the dashboard's purpose at `[03:17]`: *"this one will be your
eye opener about your business."*

| Screen | Course coverage | What it does |
| --- | --- | --- |
| Login | `[03:33]`, `[03:59]`, `[04:22]` | Email + password |
| Register | `[04:24]` – `[04:35]` | Creates an account with a **role** |
| Dashboard | `[03:17]`, `[08:18]` – `[08:30]` | Counts, revenue, category distribution, fast/slow movers, charts |
| Users | `[05:21]` – `[06:20]` | Table, add / view / edit / delete, search + role filter, avatar upload |
| Products | `[07:34]` – `[08:10]` | CRUD, each tied to a brand **and** a category, sortable |
| Categories | `[07:03]` – `[07:30]` | CRUD |
| Brands | `[06:39]` – `[07:00]` | CRUD |
| Banners | `[08:14]` – `[08:17]` | CRUD |
| Orders | `[03:19]` – `[03:21]`, `[07:33]` | View details, status filter, **invoice generation** |
| Account | `[03:23]`, `[03:31]` | The signed-in admin's own profile |

Cross-cutting: a persistent sidebar + header wrapping the page (`[03:38]`,
`[03:43]`), `sonner` toasts (`[03:44]`), dialogs for edit forms, skeletons while
loading (`[05:51]`), `motion` animations (`[04:25]`, `[08:27]`).

By term frequency across those five and a half hours, **users** is the largest
module by a distance — 399 mentions against 257 for products. It is where the
table, search, filter, dialog and upload patterns are built first and then reused
everywhere else, which is why §9 builds it first too.

---

## 2. Scope

### In

Everything in the table above **except** the register page (§4.1), plus
server-side pagination on every list (§4.3).

### Out

- **Reviews and ratings.** Touched at `[06:11]`; our API has no ratings module.
  `averageRating` and `ratingsCount` are read-only fields on a product.
- **Wishlists.** `/api/wishlist` exists but is token-scoped to its owner, with no
  admin view.
- **Cart inspection.** Same.

---

## 3. Next.js, not Vite — and what that changes

The course builds the admin with Vite and `react-router` (`[03:26]` – `[03:30]`;
it is emphatic that the import is `react-router`, not `react-router-dom`). We are
on Next.js instead, matching `client/`. Four consequences, and the first is the
one that matters.

### 3.1 The token gets an httpOnly cookie back

This is the real win, and it reverses the argument a Vite build would have forced.

A Vite SPA has no server of its own, so the JWT has to live somewhere JavaScript
can read it — the course uses `localStorage` (`[04:22]`). That is strictly weaker
than what the storefront already does, because any script that executes on the
origin can read the token, and our API issues a **7-day** JWT with no refresh
endpoint to rotate against.

With Next.js the admin has a server. So it uses exactly what `client/` uses: the
token goes into an **httpOnly, sameSite=lax cookie** set by a server action, and
never reaches the browser at all. Every call to the API is made from a server
component or a server action.

`localStorage` stops being a compromise we have to justify. Delete that section of
the reasoning; it no longer applies.

### 3.2 No router library, no axios, no data-fetching library

- **Routing** is the App Router's file system. No `createBrowserRouter`, no
  `RouterProvider`, no `<Outlet />` — `app/(panel)/layout.tsx` is the shell.
- **HTTP** is `lib/api.ts`, the same ~140-line `fetch` wrapper `client/` uses. The
  course's axios instance with request/response interceptors (`[04:10]` –
  `[04:13]`) exists to attach a bearer token and catch 401s; ours attaches the
  token server-side and there is no browser request to intercept.
- **Data fetching** is server components. The course fetches in `useEffect` with
  hand-rolled loading state per page (`[08:21]`); the plan I wrote for a Vite
  build proposed TanStack Query to collapse that boilerplate. On the App Router
  there is no boilerplate to collapse: the page is `async`, it awaits the API, and
  `loading.tsx` provides the skeleton. **That open question is closed** — no
  client cache, no `invalidateQueries`, no provider.

### 3.3 The SPA reload bug does not exist here

At `[03:23]` – `[03:24]` the course hits it: *"any route except the home, if you
reload it, you're going to have a problem."* That is a static host serving an SPA
without a history fallback. Server-rendered routes have no such failure mode, so
it is off the deployment checklist entirely. Noted only because the transcript
spends several minutes on it.

### 3.4 Port 5173 has to change

`.env` currently says `ADMIN_URL=http://localhost:5173`, which is Vite's default.
`client/` already occupies Next's default 3000, so the admin runs on **3001**
(`next dev --port 3001`).

Two edits, both required before Phase 2 or every request fails CORS:

```
# .env
ADMIN_URL=http://localhost:3001
```

`server/src/app.js` builds its allow-list from
`[CLIENT_URL, ADMIN_URL, http://localhost:PORT]`, so changing the value is enough
— no server code change.

---

## 4. Where this diverges from the course

Four places, all forced by the backend rather than chosen.

### 4.1 No register page — a security fix, not a cut

The course builds a public registration form that submits a `role` (`[04:35]`:
*"must require a name, an email, a password and a role"*). A public endpoint that
accepts a role is privilege escalation: anyone who reaches the admin URL can mint
themselves an admin.

Our backend already closes this — it is **defect #1** in
`server/implementation.md` §19. `POST /api/auth/register` strips `role` entirely,
because `z.object` drops unknown keys before the model sees them. Roles are
assignable only through `POST /api/users`, which is admin-only.

So the admin app has **no register route**. New staff are created from inside the
authenticated Users screen by an existing admin; the first admin comes from the
seeder. Same capability, through the door that checks who you are.

### 4.2 Cloudflare R2, not Cloudinary

The course uploads through Cloudinary with a cloud name, API key and secret
(`[06:24]` – `[06:28]`). We have none of those. `server/implementation.md` §0
records the swap as deviation 3: R2 is S3-compatible, so the API signs uploads
with `@aws-sdk/s3-request-presigner`.

The handshake, and the one place this app's architecture is not "everything on the
server":

1. A **server action** calls `POST /api/uploads/signature` with
   `{ contentType, size, folder }` and returns `uploadUrl` + `publicUrl` to the
   client. The admin's token stays server-side.
2. A **client component** `PUT`s the file bytes **straight to R2** at `uploadUrl`,
   sending exactly the `requiredHeaders`. The bytes never pass through Next — that
   is the entire point of presigning, and routing them through a server action
   would put a 5 MB body through the RSC protocol for no benefit.
3. `publicUrl` goes into the form as the resource's `image` (or `avatar`).

Constraints are fixed **in the signature**, so they must be enforced in the UI
before a signature is requested, not after: **5 MB max**, `jpeg`/`png`/`webp`/
`avif` only, URL valid **5 minutes**, folder one of `products`/`categories`/
`brands`/`banners`/`avatars`. The object key is generated server-side, so a
filename cannot path-traverse or overwrite anything.

**Blocked today.** `R2_PUBLIC_BASE_URL` is still `https://pub-REPLACE-ME.r2.dev`,
so `publicUrl` comes back unusable. It needs the bucket's real Public Development
URL (bucket → Settings) or a custom domain before Phase 6.

### 4.3 Server-side pagination, search and filtering

At `[05:47]`: *"as I told you pagination it will not be there, I'm going to keep it
as simple as possible."* At `[05:50]`: *"we're not calling in the database... we're
manipulating whatever we're searching in the item."*

That works on eight seeded products. On a real table the page downloads every row
and the search only matches what happened to be downloaded. Pagination on two
resources only was **defect #8** on the backend; it was fixed there, and throwing
it away in the client would waste the fix.

Every list endpoint accepts `page`, `perPage`, `search`, `sortBy`, `sortOrder` and
its own filters, and returns `meta` with `total` and `totalPages`. All of it lives
in the URL query string — same as the storefront — so a filtered view is linkable
and the back button is correct.

### 4.4 Invoices are client-side, and thinner than the course's

The course generates invoices with preview, print, download and share
(`[03:20]` – `[03:21]`). We have no invoice endpoint and no company or tax
settings. An order already carries what an invoice needs: number, date,
snapshotted line items, subtotal, total, shipping address, payment reference. So
this is a print stylesheet over the order detail.

One caution. The course invoice shows *"subtotal, tax, shipping and entire cost
total"*. **We have neither tax nor shipping** — `orders.total` is assigned
`subtotal` outright in `server/src/modules/orders/service.js`, with the comment
*"shipping/tax would adjust this"*. Printing those two lines would be inventing
numbers.

---

## 5. What we reuse from `client/`

`client/` is not a reference — it is a working implementation against this API,
and most of its foundation is domain-neutral. Lift these directly:

| From `client/src/…` | Why it transfers unchanged |
| --- | --- |
| `lib/api.ts` | Envelope unwrapping, `ApiError` with `fields`, `buildUrl` query dropping, `apiMaybe` collapsing 404/403 |
| `lib/session.ts` | Cookie read/write, `getSession()` wrapped in React `cache`, `requireAdmin` |
| `lib/format.ts` | `formatMoney`, `formatDateTime` |
| `lib/image-hosts.ts` | The optimiser allow-list and `canOptimise` |
| `types/api.ts` | Same presenters, same shapes |
| `components/form/*` | `Field`, `SelectField`, `SubmitButton`, `FormError` |
| `components/order-status-badge.tsx`, `order-details.tsx` | `OrderDetails` already takes `showCustomer` |
| `components/shop/product-image.tsx` | Unknown-host and dead-URL fallbacks |
| `components/shop/pagination.tsx` | Link-based, carries the query string |
| `proxy.ts` | Cookie-presence redirect, different matcher |
| `actions/types.ts` | The shared `FormState` |

Additions on top: `Banner`, `StatsResponse`, and the `deliveryman` role in
`types/api.ts`.

**Copy, don't share — for now.** A workspace package (`packages/api-client`) is
the correct end state and would stop these twelve files drifting into two
versions. It is also a build-tooling project that nothing here needs today.
Copying is the honest trade; the risk is real, so if the API's response envelope
ever changes, both apps have to be edited. Flagging it rather than pretending the
duplication is free.

### Lessons the storefront build already paid for

These cost real debugging time in `client/` and are cheaper to inherit than to
rediscover:

- **`revalidateTag` now needs two arguments** in Next 16. For read-your-writes
  after a mutation, the right call is `refresh()` from `next/cache` inside the
  server action.
- **`middleware.ts` is `proxy.ts`** in Next 16, exporting `proxy`, node runtime.
- **`cookies()`, `params` and `searchParams` are async.** `PageProps<'/route'>`
  and `LayoutProps` are generated by `next typegen`.
- **`next/image` refuses SVG** without `dangerouslyAllowSVG`, which the seeded
  `placehold.co` images are. Keep the optimiser allow-list narrow and let unknown
  hosts fall back to a plain `<img>`.
- **A broken image URL will not fire `onError`** when the markup is
  server-rendered — the load already failed before React attached the handler. The
  ref check (`complete && naturalWidth === 0`) is what catches it.
- **Radix `Select` submits nothing.** It renders a button and a portal, not a
  native `<select>`, so a form needs the hidden input `SelectField` keeps in step.
- **Prefer one submit button per legal action** over a select-then-submit. The
  order status control ended up as a button per legal transition; illegal moves
  become unreachable rather than merely rejected.
- **Don't spread `disabled` after setting it** on a submit button — an explicit
  `undefined` from the caller cancels the pending lock.

### Forms: `useActionState`, not react-hook-form

The course adds react-hook-form + zod with schemas in `lib/validation.ts`
(`[04:33]` – `[04:35]`). `client/` dropped both, and the reasoning holds here: the
API validates every payload with zod already and returns
`error.fields[] → { path, message }`, which maps straight onto inputs. A second
schema on the client is a second place for "at least 8 characters" to drift.

This admin has more forms than the storefront did, so it is a closer call. It
would tip if we needed cross-field validation or multi-step wizards — we need
neither. If you would rather follow the course here, it is an additive change and
nothing else in this plan depends on it.

---

## 6. Architecture

### 6.1 Routes

```
app/
├── login/page.tsx                 public
├── (panel)/                       layout = sidebar + header, requireAdmin
│   ├── page.tsx                   Dashboard
│   ├── users/page.tsx
│   ├── products/page.tsx
│   ├── products/[id]/page.tsx
│   ├── categories/page.tsx
│   ├── brands/page.tsx
│   ├── banners/page.tsx
│   ├── orders/page.tsx
│   ├── orders/[id]/page.tsx
│   ├── orders/[id]/invoice/page.tsx
│   └── account/page.tsx
├── error.tsx · not-found.tsx · layout.tsx
proxy.ts                           cookie-presence redirect for everything but /login
```

### 6.2 Auth, in three layers

Exactly the storefront's model, with the role check promoted into the layout:

- **`proxy.ts`** redirects to `/login` when the session cookie is missing. It
  cannot see the role without a network call, so it does not try. This is UX.
- **`(panel)/layout.tsx`** calls `requireAdmin()` — reads the cookie, fetches
  `GET /api/auth/profile`, and requires `role === 'admin'`. A customer's token is
  a perfectly valid token; only the profile says what it may do. It gets signed
  out with an explanation, not a wall of failed requests.
- **Every server action re-checks `requireAdmin()` itself.** A server action is a
  public HTTP endpoint; the layout guarding the page says nothing about who can
  POST to the action behind it.

The API enforces roles independently. None of the four layers is redundant.

### 6.3 Screen anatomy

Every list screen is the same shape, built once for Users and reused:

- **Server component** reads `searchParams` → calls the API → renders the table.
- **Toolbar** is a client component that pushes to the URL (`?page`, `?search`,
  `?role`, `?status`, `?sortBy`). No local filter state.
- **Create / edit** are dialogs wrapping a `<form action={serverAction}>` with
  `useActionState`; the backend's `fields` land on the inputs.
- **Delete**, where a resource has one, is an `AlertDialog` confirming, then a
  server action. Users have none (§11.1).
- Each action ends in `refresh()` and a `sonner` toast.
- `loading.tsx` per route supplies the skeleton the course hand-rolls at
  `[05:51]`.

---

## 7. Stack

Latest published versions, verified against the registry. The first block matches
`client/` on purpose — two Next apps on different minors is a debugging tax for no
gain.

| Package | Version | Note |
| --- | --- | --- |
| next | 16.3.1 | App Router; runs on port 3001 |
| react / react-dom | 19.2.8 | |
| typescript | 7.0.2 | Rewritten compiler; 5.9 is a one-line fallback |
| tailwindcss | 4.3.3 | Configures in CSS, not `tailwind.config.ts` |
| shadcn/ui | latest CLI | The course installs button, card, dialog, alert-dialog, form, input, label, select, skeleton, table, badge (`[03:39]`) |
| sonner | 2.0.8 | `[03:44]` |
| lucide-react | 1.33.0 | |
| recharts | 3.10.1 | `[08:18]`, `[08:25]` — bar and pie |
| motion | 13.1.0 | The `motion` package, **not** `framer-motion` — the course loses time to that confusion at `[08:27]` |

**Not installed, and why:** `vite`, `react-router` (App Router), `axios`
(`lib/api.ts`), `@tanstack/react-query` (server components),
`react-hook-form` + `zod` + `@hookform/resolvers` (§5, forms).

`recharts` is a client component — it needs `"use client"` and will not render in
an RSC. The dashboard page stays a server component that fetches `/api/stats` and
passes plain data into small client chart wrappers.

---

## 8. The API we consume

| Method | Path | Screen |
| --- | --- | --- |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/profile` | `getSession()`, Account |
| POST | `/api/auth/logout` | Header menu |
| GET | `/api/stats` | Dashboard (`topLimit`, `recentLimit`) |
| GET / POST | `/api/users` | Users list, create (**admin-only, may set role**) |
| GET / PUT | `/api/users/:id` | Users view, edit (no delete — §11.1) |
| GET / POST | `/api/users/:id/addresses` | User detail |
| PUT / DELETE | `/api/users/:id/addresses/:addressId` | User detail |
| GET / POST | `/api/products` | Products |
| GET / PUT / DELETE | `/api/products/:id` | Products |
| GET / POST / PUT / DELETE | `/api/categories`, `/api/brands`, `/api/banners` | Their screens |
| GET | `/api/orders` | Orders (`status`, `search` by order number) |
| GET | `/api/orders/:id` | Order detail, invoice |
| PUT | `/api/orders/:id/status` | Order detail |
| DELETE | `/api/orders/:id` | Orders |
| POST | `/api/uploads/signature` | Every image field |

Enumerations to mirror exactly, because the API rejects anything else:

- **roles** — `admin`, `user`, `deliveryman`. The course's *"delivery person"* at
  `[06:24]` is the third one; we do not offer it (§11.3) but still render it.
- **order status** — `pending`, `paid`, `completed`, `cancelled`; legal moves are
  `pending → paid | cancelled` and `paid → completed | cancelled`, both other
  states terminal. Offer only the legal ones (defect #5).
- **category type** — `featured`, `hot`, `top`.
- **discount** — capped at 90, matching a DB `CHECK`.

### What the dashboard can actually show

`GET /api/stats` returns more than the course displays, in one call — no
client-side aggregation anywhere on that screen:

- `totals` — users, products, categories, brands, orders;
- `revenue` — `earned` (paid + completed only), `pending`, `cancelled`,
  `averageOrderValue`. Pending is deliberately **not** revenue;
- `orders.byStatus` with count and value, and `orders.recent`;
- `users.byRole`;
- `products.byCategory` / `byBrand` — the pie chart at `[08:25]`;
- `products.bestSellers` and `neverSold` — the course's *"which is moving faster
  and which is not moving at all"* (`[03:18]`), already computed in SQL;
- `products.outOfStock`, `lowStock`, `unitsOnHand`.

---

## 9. Phases

Each ends somewhere demonstrable.

**Phase 1 — Foundation.** `create-next-app` (TS, Tailwind, App Router, src dir),
shadcn init, port 3001, `.env.local`, `ADMIN_URL` updated in the root `.env`.
Copy the twelve files from §5. *Done when:* a page server-renders live products
from the running API.

**Phase 2 — Auth.** Login form and server action, cookie session, `requireAdmin`,
`proxy.ts`, sign-out. *Done when:* a **customer** account is refused with a clear
message and an admin reaches the panel.

**Phase 3 — The shell.** `(panel)/layout.tsx` with sidebar navigation and active
state, header with the signed-in admin, `sonner`, `error.tsx`, `not-found.tsx`.
*Done when:* every route is reachable and reload works everywhere.

**Phase 4 — The reusable list, via Users.** Table, URL-driven search + role filter
+ pagination, create and edit dialogs, skeletons, empty state. **No delete** —
see §11.1. *Done when:* a user can be created and promoted to admin, and the
filters survive a reload and a shared link.

**Phase 5 — Categories, brands, banners.** The same pattern against three simpler
resources. *Done when:* all three CRUD end to end and category type is held to the
enum.

**Phase 6 — Uploads.** `ImageUploadField`: server action for the signature →
browser `PUT` to R2 → `publicUrl` into the form, with size and type checked before
the signature is requested, and progress on the PUT. Wire into avatars, brands,
categories, banners. *Done when:* an uploaded image survives a reload and renders
on the storefront. **Needs `R2_PUBLIC_BASE_URL` first.**

**Phase 7 — Products.** The heaviest form: price, discount, stock, description,
image, and the required category and brand selects. *Done when:* a product created
here appears on the storefront at the right price and stock.

**Phase 8 — Orders.** List with status filter and order-number search; detail with
customer, address, snapshotted items, payment; status controls offering only legal
transitions. *Done when:* an order moves `paid → completed` and an illegal
transition is unreachable from the UI.

**Phase 9 — Dashboard.** Stat cards, revenue split, recharts bar and pie, best
sellers and never-sold tables, recent orders. *Done when:* every number on screen
traces to one `/api/stats` call.

**Phase 10 — Invoice.** Print-friendly order document on its own route with a
print stylesheet, unbranded (§11.2). *Done when:* an order prints to PDF with no
invented tax, shipping or branding.

**Phase 11 — Polish and verification.** Empty and error states, pending-disabled
buttons, motion transitions, responsive pass, README. Then the same end-to-end
browser run `client/` got: sign in → create a user → create a product → upload an
image → advance an order → read the dashboard.

---

## 10. Prerequisites

- API on `:8000`, containers up (`docker compose up -d` in `server/`; the Compose
  project name is pinned to `ecom_ai`, which matters because the directory name
  `server` collides with another project on this machine).
- Root `.env` files are symlinked into `server/` — the API reads `.env` from its
  working directory.
- An admin account: `admin@babymart.local` / `Admin123!change-me`.
- `ADMIN_URL=http://localhost:3001` in the root `.env` (§3.4).
- `R2_PUBLIC_BASE_URL` set to a real value before Phase 6.

---

## 11. Decisions

Answered before implementation started.

1. **User deletion — not implemented.** The Users screen creates, views and edits;
   it does not delete or deactivate. `DELETE /api/users/:id` stays unused. This is
   the safer default anyway: the delete is hard, and there is no `isActive` column
   to soft-delete into.
2. **Invoice branding — not implemented.** No logo, no company address, no
   separate invoice numbering. The printable document carries only what the order
   record actually holds: order number, dates, snapshotted line items, totals,
   shipping address, payment reference. Nothing is invented, which was the concern
   in §4.4.
3. **Deliveryman — not implemented.** The role is not offered when creating or
   editing a user; the selector is `admin` / `user`. The value is still *rendered*
   if a record already carries it, because the API enum allows it and hiding an
   existing value would be a lie about the data.
4. **Forms — `useActionState`, no react-hook-form.** Consistent with `client/`,
   for the reasons in §5.
5. **The storefront's `/admin` routes stay for now.** They are working code and
   the repo has no version control, so removing them is not cheaply reversible.
   Raised as a follow-up once this app is verified, not done silently.

Two structural choices made during implementation, both departures from §6.1:

6. **Products are edited in a dialog, not at `/products/[id]`.** Every other
   resource uses the dialog, and a sixth pattern for one screen is a worse trade
   than a taller dialog. The dialog scrolls, so the longer form still fits.
7. **Order delete exists, on the detail page only.** `DELETE /api/orders/:id` is
   admin-only and useful for clearing test data, but it destroys a financial
   record and neither refunds nor restocks — cancelling does both. It is therefore
   never offered from the list, and its confirmation says all of that.

---

## 12. Scope removals from §1

For the record, what the course builds that this app deliberately will not:
register page (§4.1), reviews and ratings (§2), wishlist and cart inspection
(§2), Cloudinary (§4.2), user deletion, invoice branding, and the deliveryman
role.
