# Prompt: the Book shop demo — a proof of concept of Gummy

> Grilled design, 2026-10-24 — **implemented the same day** (see the demo and "Book shop generator"
> bullets in `CLAUDE.md`). Kept as the record of the decisions. Deviations found while building:
> the API also sends dates as display strings and has `POST /api/books/:id/delete` (form buttons
> can't DELETE) and `GET /api/genres/:genre/authors` (a dependent select fills URL params); the
> book form needs a hidden `_id`; one studio gap was closed (a condition on the repeater item's own
> field) and two engine bugs fixed (data-table column widths with pinning, autocomplete argument
> order) — all listed in `CLAUDE.md`.

## Goal

`demo/` becomes a self-contained consumer app that proves the whole Gummy loop on a fresh domain:
a **Book shop staff back office**, designed in the studio, stored as JSON in `demo/gummy/`,
rendered by `<GummyApp>` with no screen code, backed by its own mock API. `gummy studio` in `demo/`
opens the same project; an edit there shows up in the running app.

## Decisions (the design tree, resolved)

1. **A new project, not a copy of the example.** The countries showcase stays in `apps/example`
   and the studio's Country seed.
2. **Authored as a studio workspace.** The project is built from the studio's own seed helpers
   and types, so the studio can open and edit it; the demo renders the exported project folder.
3. **Staff back office**, with a customer-facing catalogue view; every screen is pure config.
4. **Its own mock API in `demo/api/`.** A small Hono server on **port 9100**, CORS on, routes
   under `/api/...` (books, authors, genres, orders, customers, reviews, staff, settings, uploads,
   covers, the sign-in profile lookup). The demo's Vite dev server proxies `/api`; the studio
   project's `API_URL` is `http://localhost:9100`. One base URL per project, so everything the
   project calls lives here.
5. **The Book shop replaces the countries sample in `demo/`.** Track `demo/gummy/workspace.json`
   (only the Book shop project + its library) and `demo/gummy/projects/book-shop/`; remove
   `demo/gummy/projects/demo/`; the picker defaults to `book-shop`. The user's local untracked
   `demo/gummy/workspace.json` and `gummy-demo.json` are **moved** to
   `demo/gummy/.local-backup/` (gitignored), never deleted.
6. **Mock Azure sign-in with staff roles.** A "Book shop Azure" entry in the studio Sign-in
   library, profile lookup `GET /api/staff/by-email?email=`; staff: **Chanwit Yimneam** (manager,
   `chanwit_y@banpu.co.th`, the default `VITE_AUTH_MOCK_EMAIL`), a clerk, and a former employee
   (403 → the denied screen); unknown email → 404. The `me` profile carries `role`; conditions on
   it gate manager-only actions (Delete book, Refund order) and show a read-only note to clerks
   on Settings.
7. **Pages** (≈ 11, all config):
   - **Dashboard** `/` — page load `summary` (skeleton): cards bound to counts, a custom
     `SalesChart` component over `summary.salesByDay`, a low-stock repeater, a recent-orders
     table from page data.
   - **Books** `/books` — server paging + sort + filter form (genre load-once, author dependent
     on genre, in-stock switch), HTML cover column, cell clamp, Add / Edit modal with cover upload
     and a date field, manager-only Delete in the modal, row click → detail.
   - **Book detail** `/books/:id` — data-driven title + breadcrumb, card with cover media + HTML
     description, reviews repeater, Editions form list (CRUD).
   - **Authors** `/authors` + **Author** `/authors/:id` — table with pinned / resized columns;
     the author's books as a nested repeater; links as a form list.
   - **Orders** `/orders` — status + date filters, row header, merged / grouped columns, HTML
     status badge.
   - **Order detail** `/orders/:id` — items table, the refund request as an approval line,
     manager-only Refund (confirm box → API → reload), `fn:printOrder`.
   - **Customers** `/customers` + detail — table, a "New customer" form drawer posting to the
     API, the customer's orders.
   - **Catalogue** `/catalogue` — card grid in a repeater, conditional "Featured" badge, card as
     a link.
   - **Settings** `/settings` — switches with a gated pair, currency select, the refund approval
     line in a workflow editor saved through the API, read-only note for clerks.
   - Custom code stays minimal: component `SalesChart`, action `printOrder`.
8. **Mock data**: deterministic seeded generator — 120 books, 30 authors, 8 genres,
   60 customers, 300 orders over 90 days (some with refund requests), 2–6 reviews per book,
   3 staff. Covers are SVGs drawn by the API (`/api/covers/:id.svg`, title + author on a
   genre colour; no network, no copyrighted art); an uploaded cover replaces it. Writes live in
   memory until restart.
9. **Generator, then the workspace is the source of truth.** `apps/studio/scripts/bookshop.ts`
   (run with `bun`) builds the project with the studio's seed helpers / types, writes
   `demo/gummy/workspace.json` at the current workspace version and exports
   `projects/book-shop/` through the CLI's exporter (`projectFolders` + `splitProjectPages`).
   It refuses to overwrite an existing workspace without `--force`. The studio's default
   workspace is untouched (no migration, no version bump).
10. **Studio gaps**: a small, contained gap (one more source option / field on an existing panel)
    is added to the studio with its export + a test, so the project stays fully
    studio-authored; anything needing a new component type or a redesign is left out of the page
    and reported as a follow-up. Never patch the JSON by hand.
11. **Run + proof.** `bun run demo` starts API (9100) + app (3400); `demo` gets `hono` +
    `@hono/node-server` dev deps and an `api` script; `.claude/launch.json` gains `demo-api`.
    Tests: an API smoke test (paging, filters, profile 200 / 404 / 403, CRUD, refund); a
    project test (`assertGummyProject`, every endpoint a page names exists, every page body
    valid); a studio test that the generated `workspace.json` loads through the store's
    migration path unchanged. Then a browser walk-through of every page as manager, clerk and
    the denied account, one write per page, and one studio edit round-trip.

## Out of scope

A customer storefront / cart, real book metadata or cover art, seeding the Book shop into the
studio's default workspace, persistence across API restarts.
