# BabyMart — admin

Store administration for the BabyMart API: dashboard, users, products, categories,
brands, banners, orders. Next.js 16 (App Router), React 19, Tailwind 4,
shadcn/ui, Recharts.

Scope and reasoning live in [implementation.md](./implementation.md).

## Running it

The API must be up first:

```bash
cd ../server
docker compose up -d      # MySQL on 3307, Redis on 6379
npm run dev               # http://localhost:8000
```

Then this app, **on port 3001** — the storefront already owns 3000:

```bash
npm install
npm run dev               # http://localhost:3001
```

`.env.local`:

```
API_URL=http://localhost:8000
```

Read server-side only. Every API call is made from a server component or a server
action, so the admin's token never reaches the browser.

The repo's root `.env` must have `ADMIN_URL=http://localhost:3001`; the API builds
its CORS allow-list from it.

Sign in with `admin@babymart.local` / `Admin123!change-me`. There is no sign-up —
see below.

## What it does

| Screen | |
| --- | --- |
| Dashboard | Revenue, counts, stock health, orders by status, products by category, best sellers, never-sold, recent orders — all from one `GET /api/stats` |
| Users | Search, role filter, create, edit |
| Products | Search, category and brand filters, full CRUD |
| Categories / Brands / Banners | Search, full CRUD |
| Orders | Status filter, order-number search, detail, status transitions, printable invoice |
| Account | The signed-in admin's own profile |

## Three things worth knowing

**There is no registration page, deliberately.** The course this is modelled on
builds a public sign-up that accepts a `role`, which is privilege escalation —
anyone reaching the admin URL could mint an admin. The API closes it:
`POST /api/auth/register` strips `role` outright. Roles are assignable only via
`POST /api/users`, which is admin-only, so new staff are created from the Users
screen by an existing admin.

**Users cannot be deleted here.** `DELETE /api/users/:id` is a hard delete and
there is no `isActive` column to soft-delete into, so the panel offers neither.

**The invoice is unbranded.** No logo, no company address, no invoice numbering,
and no tax or shipping lines — the API sets `total = subtotal`, so those rows
would be invented. It prints only what the order record actually holds.

## Auth

The backend JWT lives in an httpOnly cookie named `babymart_admin_token`.

That name differs from the storefront's `babymart_token` on purpose: cookies are
scoped by host, not by port, so on localhost both apps share one jar. Reusing the
name would mean signing into the admin silently replaced a shopper's session in
the other tab.

Protection is four layers, none redundant:

- `src/proxy.ts` redirects when the cookie is missing — it cannot see the role, so
  it does not try;
- `(panel)/layout.tsx` calls `requireAdmin()`, which fetches the profile and
  checks `role === 'admin'` — a customer's token is a perfectly valid token;
- every server action calls `requireAdmin()` itself, because a server action is a
  public HTTP endpoint;
- the API enforces roles independently.

Login also checks the role **before** setting the cookie, so a customer signing in
here is refused rather than left holding a session that can do nothing.

## Image uploads

Three steps, and the file bytes never pass through this app:

1. a server action calls `POST /api/uploads/signature` — the token stays
   server-side;
2. the browser `PUT`s the file **straight to Cloudflare R2** at the signed URL;
3. the returned `publicUrl` goes into the form.

Type and size are checked before a signature is requested, because those
constraints are baked into the signature: **5 MB max, JPEG/PNG/WebP/AVIF only**,
URL valid for five minutes. The object key is generated server-side, so a
filename cannot path-traverse or overwrite anything.

> **`R2_PUBLIC_BASE_URL` is still a placeholder** in the root `.env`. Uploads
> succeed and the object lands in the bucket, but the stored URL will not load
> until it is set to the bucket's Public Development URL or a custom domain. The
> upload field says so inline when it happens.

## Layout

```
src/
├── app/
│   ├── login/            public
│   └── (panel)/          sidebar + header, requireAdmin
├── actions/              server actions: auth, users, catalogue, products, orders, account, uploads
├── components/
│   ├── ui/               shadcn-generated
│   ├── data-table/       search, filters, empty row, form dialog, delete confirmation
│   ├── form/             Field, SelectField, SubmitButton, ImageUploadField
│   ├── charts/           Recharts wrappers (the only client components on the dashboard)
│   └── panel/            sidebar, account menu, stat card, order status control
├── lib/                  api.ts, session.ts, resources.ts, list-params.ts, format.ts
└── types/api.ts          mirrors of the backend presenters
```

Twelve foundation files are copied from `client/` — `lib/api.ts`,
`lib/session.ts`, the form components, `OrderDetails`, `ProductImage`,
`Pagination` and friends. Copied rather than shared: a workspace package is the
correct end state, but it is build tooling nothing here needs yet. The cost is
real — a change to the API's response envelope has to be made in both apps.

## Notes

- **No client state library, no Context, no data-fetching library.** Server
  components fetch, server actions mutate and call `refresh()`. Search, filters,
  sort and page live in the URL, so a filtered view is linkable and the back
  button works.
- **Lists paginate and filter on the server.** The course does both in memory and
  skips pagination outright, which stops working the moment a table is larger than
  one page.
- **Order status is one button per legal transition**, not a dropdown, so an
  illegal move is unreachable rather than merely rejected.
- **Charts have animation disabled.** A dashboard is read, not watched, and an
  animating chart is blank for the first second after every navigation.
