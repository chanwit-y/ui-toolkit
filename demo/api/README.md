# Book shop mock API

The backend of the `demo/` Book shop (see `docs/prompts/bookshop-demo.md`): a small Hono app with
deterministic generated data, run by Bun on **port 9100**. Everything lives in memory — writes last
until the process restarts.

```bash
bun run --cwd demo api      # http://localhost:9100
```

| Env | Default | Meaning |
|---|---|---|
| `PORT` | `9100` | Listen port. |
| `PUBLIC_URL` | `http://localhost:9100` | Prefix of every asset URL the API returns (covers, avatars, uploads), so `<img>` tags work from the demo (port 3400) and from the studio's Live Preview (port 3300) alike. |
| `ANCHOR_DATE` | today (UTC, `YYYY-MM-DD`) | The last day of the generated 90-day order history; the dashboard's "this month" is relative to it. Tests pin it. |

CORS is open (`*`, every method, every requested header — the engine's HTTP client also sends
`app-version`, and the studio's Live Preview calls the API from another origin).

## Conventions

- A list answers `{ "data": [...], "total": <matches before paging> }`; one record answers
  `{ "data": {...} }`; an error answers `{ "message": "..." }` with its status.
- Paged lists take `offset` (default 0) and `limit` (absent = every match), `sortBy` (any field of
  the row) and `sortDir` (`asc` | `desc`, default `asc`).
- Write bodies come from forms, so numbers and booleans may arrive as strings (`"12.50"`, `"true"`)
  and are coerced. Unknown body keys are ignored.
- Ids are readable and stable: `g-fantasy`, `a-01`, `b-001`, `c-001`, `o-1001`, `s-1`.
- Dates: `YYYY-MM-DD` for calendar dates, ISO 8601 for timestamps.
- Money is THB. Every money field also has a display string beside it (`priceText`, `totalText`, …),
  formatted `฿` + `en-US` with two decimals (`฿1,250.00`) and derived on each response, because a
  config can't format numbers.
- Likewise for dates shown on screen, in shop time (Asia/Bangkok): `publishedAtText`, `joinedAtText`,
  `createdAtText` (`21 Sep 2002`) and `placedAtText`, `refund.requestedAtText` (`16 Oct 2026, 13:38`).

## Data

Generated once at start from a seeded PRNG (the same rows every run):

| Set | Count | Notes |
|---|---|---|
| Genres | 8 | Fantasy, Science Fiction, Mystery, Romance, History, Biography, Children, Cookery — each with a colour. |
| Authors | 30 | 2–7 books each; `bio` one or two sentences. |
| Books | 120 | Stock 0–40 (about one in eight at 0, a dozen at 1–5); about 15 `featured`. |
| Reviews | 2–6 per book | `rating` 1–5; the book's `rating` is their average (1 decimal). |
| Editions | 1–3 per book | Hardcover / Paperback / Ebook / Audiobook. |
| Customers | 60 | Thai and international names, a handful of cities. |
| Orders | 300 | Over the 90 days ending `ANCHOR_DATE`; 1–4 lines each; about 8 in `refund_requested` with a pending refund approval line, a few `refunded` / `cancelled`. |
| Staff | 6 | See **Staff**. |
| Settings | 1 | See **Settings**. |

## Endpoints

### Health
`GET /api/health` → `{ "ok": true }`

### Genres
`GET /api/genres` → `{ data: Genre[], total }` sorted by name.
`Genre = { _id, name, color }` (`color` a hex like `#7c3aed`).

### Authors
`GET /api/authors?genre=&search=` → `{ data: Author[], total }` sorted by name. `genre` (a genre
`_id`) keeps authors with at least one book in it; `search` matches the name (contains, case-insensitive).
`Author = { _id, name, country, born, bio, avatar, bookCount }` (`born` a year number, `avatar` an
avatar URL).

`GET /api/genres/:genre/authors` → the same as `GET /api/authors?genre=:genre` (an unknown genre
gives an empty list) — the engine's dependent select passes its parent's value as a URL param.

`GET /api/authors/:id` → `{ data: Author & { books: Book[] } }`; 404 unknown.

Links (a form list): `{ _id, label, url }`
- `GET /api/authors/:authorId/links` → `{ data: Link[], total }` (2 seeded per author)
- `POST /api/authors/:authorId/links` body `{ label, url }` → 201 `{ data: Link }`; 400 when `label` is blank
- `PATCH /api/authors/:authorId/links/:id` body `{ label?, url? }` → `{ data: Link }`
- `DELETE /api/authors/:authorId/links/:id` → `{ data: { _id } }`

### Books
`GET /api/books?offset&limit&search&genre&author&inStock&featured&sortBy&sortDir` → `{ data: Book[], total }`.
`search` matches title, ISBN or author name (contains, case-insensitive); `genre` / `author` are
`_id`s; `inStock=true` keeps stock > 0, `inStock=false` stock = 0; `featured=true` featured only.
Default order: title asc.

```
Book = { _id, title, isbn, authorId, authorName, genreId, genreName, genreColor,
         price, stock, publishedAt, pages, cover, description, featured,
         rating, reviewCount, updatedAt, priceText, publishedAtText }
```
`price` a number with 2 decimals (THB), `publishedAt` `YYYY-MM-DD`, `cover` a URL (the drawn cover,
or an uploaded image's URL), `description` plain text, two or three sentences (the frontend's HTML
templates escape every value, so markup here would show its tags).

- `GET /api/books/:id` → `{ data: Book }`; 404 unknown
- `POST /api/books` body `{ title, isbn?, authorId, genreId, price, stock?, publishedAt?, pages?, cover?, description?, featured? }`
  → 201 `{ data: Book }` (names / colour filled from the ids; blank `cover` ⇒ the drawn one);
  400 when `title` is blank, `price` < 0, or `authorId` / `genreId` unknown
- `PATCH /api/books/:id` (same fields, partial) → `{ data: Book }`; 400 / 404 as above
- `DELETE /api/books/:id` → `{ data: { _id } }`; 404 unknown
- `POST /api/books/:id/delete` → the same as `DELETE` (any body ignored) — the engine's form
  buttons submit only POST / PATCH, and the manager-only Delete lives in the book form

Editions (a form list): `Edition = { _id, format, isbn, price, priceText }`
- `GET /api/books/:bookId/editions` → `{ data: Edition[], total }`
- `POST /api/books/:bookId/editions` body `{ format, isbn?, price }` → 201 `{ data: Edition }`
- `PATCH /api/books/:bookId/editions/:id` → `{ data: Edition }`
- `DELETE /api/books/:bookId/editions/:id` → `{ data: { _id } }`

Reviews: `GET /api/books/:bookId/reviews` → `{ data: Review[], total }`, newest first.
`Review = { _id, reviewer, rating, title, body, createdAt, createdAtText }`.

### Customers
`GET /api/customers?offset&limit&search&city&sortBy&sortDir` → `{ data: Customer[], total }`.
`search` matches name or email. Default order: name asc.
`Customer = { _id, name, email, phone, city, joinedAt, joinedAtText, orderCount, totalSpent, avatar, totalSpentText }`.

- `GET /api/customers/:id` → `{ data: Customer & { orders: Order[] } }` (newest first); 404 unknown
- `POST /api/customers` body `{ name, email, phone?, city? }` → 201 `{ data: Customer }`;
  400 when `name` or `email` is blank, 409 when the email is taken

### Orders
`GET /api/orders?offset&limit&search&status&from&to&customer&sortBy&sortDir` → `{ data: Order[], total }`.
`search` matches the order number or the customer's name; `status` one status or a comma list;
`from` / `to` inclusive `YYYY-MM-DD` on `placedAt`; `customer` a customer `_id`. Default order:
`placedAt` desc.

```
Order = { _id, number, customerId, customerName, customerCity, status, statusLabel,
          placedAt, itemCount, subtotal, shipping, total, paymentMethod, handledBy,
          subtotalText, shippingText, totalText, placedAtText }
```
`status` ∈ `pending | paid | shipped | delivered | refund_requested | refunded | cancelled`
(`statusLabel` its English label), `number` like `SO-1001`, `handledBy` a staff name.

`GET /api/orders/:id` → `{ data: Order & { items: OrderItem[], refund: Refund | null } }`; 404 unknown.
```
OrderItem = { _id, bookId, title, authorName, cover, qty, price, lineTotal, priceText, lineTotalText }
Refund    = { reason, requestedAt, requestedAtText, requestedBy, steps: RefundStep[] }
RefundStep = { sequence, role, name, jobTitle, status, actionDate, remark }
```
`RefundStep.status` uses the approval-line codes: `0` pending, `2` approving (the current step),
`3` rejected, `5` approved. The requester (a clerk) is step 1 (`5`); the store manager's approval is
step 2 (`2` while requested).

`POST /api/orders/:id/refund` body `{ remark? }` → `{ data: <the order detail> }`: only from
`refund_requested`, which becomes `refunded`; the current step becomes `5` with `actionDate` now and
the remark; 409 otherwise, 404 unknown.

### Staff (the sign-in profile)
```
Staff = { _id, employeeId, email, firstNameEn, lastNameEN, name, jobTitle, role,
          avatar, companyModel: { name }, active }
```
`role` ∈ `manager | clerk`; `companyModel.name` is `Gummy Books`. The field names match the
library's user-menu defaults.

| Name | Email | Role | Active |
|---|---|---|---|
| Chanwit Yimneam | `chanwit_y@banpu.co.th` | manager (Store Manager) | yes |
| Pimchanok Saelim | `pimchanok_s@banpu.co.th` | clerk (Sales Clerk) | yes |
| Thanapat Rattanakul | `thanapat_r@banpu.co.th` | clerk (Inventory Clerk) | yes |
| Kanokwan Srisuk | `kanokwan_s@banpu.co.th` | manager (Finance Manager) | yes |
| Arthit Wongsa | `arthit_w@banpu.co.th` | clerk (Sales Clerk) | yes |
| Nadia Samae | `nadia_s@banpu.co.th` | clerk (Former Sales Clerk) | **no** |

- `GET /api/staff` → `{ data: Staff[], total }`, active staff only, sorted by name (the workflow editor's user list)
- `GET /api/staff/by-email?email=` → `{ data: Staff }` for an active person; 400 blank, 404 unknown,
  403 inactive (case-insensitive email)

### Settings
`GET /api/settings` → `{ data: Settings }`; `PATCH /api/settings` (partial) → `{ data: Settings }`.
```
Settings = { currency, notifyOrders, notifyLowStock, lowStockDaily, lowStockThreshold, refundLine }
```
Defaults: `THB`, `true`, `true`, `false`, `5`, and `refundLine` = two steps
`{ sequence, actionType, inchargeUsers: Staff[], ccUsers: Staff[] }` — `Reviewer` (Kanokwan) then
`Approver` (Chanwit, cc Pimchanok). PATCH rejects a `refundLine` step with no `inchargeUsers` (400)
and renumbers `sequence` 1…n; `lowStockThreshold` is coerced to a number ≥ 0.

### Dashboard
`GET /api/summary` → `{ data: Summary }`
```
Summary = { bookCount, customerCount, ordersThisMonth, revenueThisMonth, revenueThisMonthText, lowStockCount,
            refundRequests, salesByDay: { date, total, orders }[], lowStock: Book[], recentOrders: Order[] }
```
"This month" = the calendar month of `ANCHOR_DATE`; revenue sums `total` of orders not `cancelled` /
`refunded`. `salesByDay` covers the 30 days ending `ANCHOR_DATE` (every day present, zeros
included). `lowStock` = books with stock ≤ `settings.lowStockThreshold`, lowest first, at most 8;
`recentOrders` = the 8 newest orders.

### Images
- `GET /api/covers/:bookId.svg` — a drawn cover (`image/svg+xml`): the title and author on the
  genre's colour, 300×450. Text is XML-escaped. 404 unknown.
- `GET /api/avatars/:seed.svg` — initials on a colour picked from the seed, 128×128.
- `POST /api/upload` multipart, field `file` → 201 `{ data: { url, name, size, type } }`; images only
  (`image/png | jpeg | gif | webp`, else 415), ≤ 5 MB (else 413). Kept in memory.
- `GET /api/uploads/:name` — the uploaded bytes with their type; 404 unknown.
- `DELETE /api/uploads/:name` → `{ data: { name } }`.

## Layout

```
demo/api/
├─ README.md          this contract
├─ src/
│  ├─ index.ts        Bun.serve on PORT
│  ├─ app.ts          createApp({ anchorDate?, publicUrl? }) → the Hono app (fresh data per call)
│  ├─ data.ts         the seeded generator
│  ├─ svg.ts          covers + avatars
│  └─ routes/*.ts     one module per resource
└─ test/api.test.ts   bun:test over app.request()
```
