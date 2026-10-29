# Gummy demo — the Book shop

A proof of concept of Gummy UI: **Gummy Books**, a staff back office for a book
shop, built the way an external team would build it. The screens were designed
in the studio and live as JSON in `gummy/`; `<GummyApp>` renders them; a small
mock API in `api/` is the backend. Nothing in `src/` describes a screen.

```
demo/
├─ gummy/
│  ├─ workspace.json            the studio's state — open it with `bun run studio`
│  └─ projects/
│     ├─ book-shop/             the project the app renders (written by the studio on every save)
│     │  ├─ project.json        routes (each page's `src`), menu, app bar, theme, models, endpoints, sign-in
│     │  └─ pages/*.json        one file per page, its own chunk, fetched on the page's first visit
│     ├─ gummy-portal/          a second project: the pill sidebar (see "Gummy Portal" below)
│     └─ glass-showcase/        a third: the Glass surface on every component (see below)
├─ api/                         the Book shop mock API (Hono on Bun, port 9100) — README.md is its contract
├─ src/
│  ├─ main.tsx                  BrowserRouter + the library stylesheet
│  ├─ App.tsx                   <GummyApp project={…} loadPage={…} …/>
│  ├─ project.ts                picks the project under gummy/projects/ and builds its page loader
│  ├─ actions.ts                `printOrder`, the one custom button action
│  └─ components.tsx            `SalesChart`, the one custom component
├─ scripts/dev.mjs              runs the API and the app together
├─ vite.config.mjs              proxies /api to the mock API in dev
└─ package.json
```

## Run it

From the monorepo root (the demo is a workspace, so `@gummy-ui/ui` resolves to
`packages/ui/dist` — build the library first):

```bash
bun run --filter @gummy-ui/ui build
bun run demo                     # mock API on :9100 + the app on http://localhost:3400
bun run --cwd demo studio        # the studio over demo/gummy on http://127.0.0.1:3300
bun run --cwd demo test          # the mock API's tests + the project ↔ API contract
```

`bun run --cwd demo api` / `app` start one half alone.

## Gummy Portal — the other sidebar

The same workspace holds a second project, **Gummy Portal**: a small staff
portal (Home, Applications, Approvals, Communications, a Settings group) with
static pages and no API or sign-in. It exists to show the shell's **pill**
sidebar beside the Book shop's plain one: tinted item cards, a sky → lavender
gradient on the active item with an indigo bar at the edge, groups that open in
place (a flyout on the icon rail) and a "Hide Menu" toggle at the sidebar's
foot. All of it is `shell.sidebar` in its `project.json`, edited in the
studio's Menu tab → Sidebar.

```bash
bun run --cwd demo app:portal    # http://localhost:3402 (VITE_GUMMY_PROJECT=gummy-portal)
```

## Glass showcase — every surface as glass

The third project, **Glass showcase**, is the Glass surface on every
component: `theme.surface: "glass"` with a configured gradient backdrop turns
cards, the table frame, dropdowns, dialogs, the app bar and sidebar into
translucent blurred panels (pinned and sticky table cells stay near-opaque,
fields are a lighter glass). Four pages — Overview (cards and a form), Tables
(pinned columns, a filter popover, an edit modal), Cards (repeaters of books and
authors) and Overlays (drawer, modal, popover, tabs) — over the Book shop API,
so it needs `bun run --cwd demo api` running. Flip the theme in the top bar for
dark glass. The surface and its backdrop are the studio's Theme page → Surface
/ Backdrop; the Gummy Portal is glass too, on the engine's default accent
backdrop, and the Book shop stays flat.

```bash
bun run --cwd demo app:glass     # http://localhost:3403 (VITE_GUMMY_PROJECT=glass-showcase)
```


## Charts showcase — the chart's ten types

The fifth project, **Charts showcase**, puts the config-driven `chart` (see
`spec/gummy-chart-spec.md`) over the Book shop's analytics aggregates
(`/api/analytics/*`, see `api/README.md`) and its raw lists, one page per
family: **Sales** (bars with a target read off the response, a line, a stacked
area, a click that lands in page data), **Mix** (a donut whose clicked slice
opens that genre's books, the best-selling authors, the order funnel, a
pyramid, a status bar), **Compare** (bars + a right-axis line, a bubble scatter
of every book), **Patterns** (a weekday × hour heatmap, the genre scorecard as
two radars) and **KPIs** (four gauges). Every chart is JSON: series, axes,
formats, reference lines, legend and click-through; no ECharts option is ever
saved.

```bash
bun run --cwd demo api           # the analytics live on the mock API
bun run --cwd demo app:charts    # http://localhost:3405 (VITE_GUMMY_PROJECT=charts-showcase)
```

## Who you are

Sign-in is the project's Azure SSO entry (`auth` in `project.json`). With no
tenant, `.env` signs a mock staff account in — the profile still comes from the
API (`GET /api/staff/by-email`):

| `VITE_AUTH_MOCK_EMAIL` | Sees |
|---|---|
| `chanwit_y@gummay.co.th` (default) | Chanwit Yimneam, **manager** — Delete in the book form, Approve refund, Save settings |
| `pimchanok_s@gummay.co.th` | Pimchanok Saelim, **clerk** — the same pages without those, plus "waiting for a manager" / read-only notes |
| `nadia_s@gummay.co.th` | a former employee — the "No access" screen |

The gates are plain config: items shown only while the signed-in profile's
`role` equals `manager` (or `clerk`) — the studio's **Show when (page data)**
over the Sign-in profile.

## The pages

| Page | What it shows of Gummy |
|---|---|
| **Dashboard** `/` | One page load in skeleton mode feeding KPI cards, the custom `SalesChart`, a low-stock repeater and a recent-orders table |
| **Catalogue** `/catalogue` | A card grid from a repeater; a "Featured" line shown by a condition on each item's own field; the whole card a link |
| **Books** `/books` | Server paging, sort and search; a filter form whose Author list depends on the Genre picked; HTML cover cells; the Add / Edit form with a cover upload, a date and a switch; Delete for managers only |
| **Book** `/books/:id` | Title and breadcrumb from the loaded book; a card with the cover; Editions as a form list; reviews from a repeater over their own endpoint |
| **Authors** `/authors`, **Author** `/authors/:id` | A pinned, resizable table; the author's books as a card repeater; links as a form list |
| **Orders** `/orders` | Inline filters (status multi-select, dates); the order number as row header; Customer / Amount header groups; subtotal and total merged when there's no shipping |
| **Order** `/orders/:id` | Lines from page data; `fn:printOrder`; a pending refund as an approval line and the manager's Approve refund form (POST, then the order reloads) |
| **Customers** `/customers`, **Customer** `/customers/:id` | A paged table; a "New customer" form in a drawer that posts and refreshes; the customer's orders |
| **Settings** `/settings` | One form over the settings load: switches (one gated by another), a currency select, the refund approval line in a workflow editor, saved with one PATCH |

## Editing it

`bun run --cwd demo studio` runs `gummy studio` over this folder: it opens
`gummy/workspace.json`, and every change rewrites the files of
`gummy/projects/book-shop/` that changed — Vite reloads the running app.
`workspace.json` is the source of truth; commit it with the project folder.

The workspace was first written by `bun apps/studio/scripts/bookshop.ts`
(from the repo root), which builds it with the studio's own seed helpers
(`apps/studio/src/components/seed/bookshop/`, Gummy Portal from
`seed/portal/`). It refuses to overwrite an
existing workspace — `--force` regenerates it and throws studio edits away.

## The mock API

`api/README.md` is the contract: deterministic data (120 books, 30 authors,
300 orders over the last 90 days, 60 customers, 6 staff), money and dates also
sent as display strings (a config can't format them), drawn SVG covers, uploads
kept in memory. Writes last until the API restarts.
