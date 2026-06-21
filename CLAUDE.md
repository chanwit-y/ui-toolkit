# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Gummy UI (`@gummy-ui/ui`) is a **config-driven React component library**. The headline feature is not the individual components but a declarative engine: you describe a CRUD screen with three plain-object configs (model + api + container) and the `Core` class renders a full data-table + modal-form UI with no JSX. See "The declarative engine" below — it is the single most important thing to understand here.

Bun-workspace monorepo. TypeScript strict, ESM-only, no CommonJS.

## Commands

Always prefix shell commands with `rtk` (60–90% token savings; see the RTK section in the global CLAUDE.md for the full reference). RTK passes through unchanged when it has no dedicated filter, so it is always safe.

```bash
rtk bun install                                   # install (postinstall dedupes esbuild)
rtk bun run dev                                    # full stack: builds ui, then runs ui --watch + api + example
rtk bun run example                                # example app only (Vite, port 3200)
rtk bun run api                                    # API server only (Hono, port 9000)
rtk bun run build                                  # build ui, api, example  (NOTE: also references apps/studio, which does not exist)
rtk bun run --filter @gummy-ui/ui build            # build the library only (tsup)
rtk bun run --filter @gummy-ui/ui typecheck        # tsc --noEmit — run before committing
rtk bun test packages/ui/src/model/master.test.ts  # tests use `bun:test`
```

`scripts/dev.mjs` is the dev orchestrator: it kills stale esbuild/vite processes and frees ports 9000/3200, runs the esbuild dedupe, builds `packages/ui` once, then spawns `ui` (watch) and `api`, and starts `example` after a 2s delay so it picks up the freshly built library.

**Build dependency order matters:** `apps/example` imports `@gummy-ui/ui` as `workspace:*` and consumes its built `dist/`. After changing library source, the library must be rebuilt (or running in `--watch`) before the example reflects it. Use `bun run dev` rather than starting apps individually.

### esbuild pinning (do not "fix" casually)
`esbuild` is pinned to `0.27.7` via a root `overrides`, and `postinstall` (`scripts/dedupe-esbuild.mjs`) deletes nested copies under `vite`/`tsup`. The example's `vite.config.mjs` also force-enables `supported.destructuring` because esbuild 0.27.7 otherwise errors lowering destructuring. Changing esbuild versions or removing these workarounds will break the build.

## Workspaces

- **packages/ui** — `@gummy-ui/ui`, the library. Built with **tsup** (ESM + `.d.ts`, `react`/`react-dom` external). CSS ships separately and must be imported by consumers as `@gummy-ui/ui/styles.css`.
- **apps/example** — Vite demo (port 3200). In dev, Vite **proxies** `/collection`, `/upload`, `/uploads`, `/health` to the API (`http://localhost:9000`); leave `VITE_API_URL` empty in dev. `vite.config.mjs` (not `.ts`) is the active config.
- **apps/api** — Hono backend (port 9000, `tsx` via nodemon). A mock CRUD + file-upload server backing the example (`countries`, `upload` routes; uploads written to `apps/api/uploads/`). Not part of the published library.

## The declarative engine (core architecture)

A screen is assembled from three configs, then handed to `Core`:

1. **model** (`TModelMaster`) — named data shapes (request/response/params/query). Plain objects of `"string" | "number" | "boolean" | "any"` and nested `{ type: "array", collection: {...} }`. Converted at runtime to TypeBox/Zod schemas via `packages/ui/src/model/` (`convertTModelToTypeBox`, `convertTModelToTArray`).
2. **api** (`TApiMaster<typeof model>`) — named endpoints. Each entry has `url`, `methods`, and string keys (`response`/`body`/`query`/`parameter`) that **reference model names**, giving end-to-end typing from endpoint to payload. URLs use `:param` placeholders.
3. **container** (`Container[]` of `Bin[]`) — responsive layout. Each `Bin` carries breakpoint spans (`sm/md/lg/xl` as 12-col strings), a `type` (`textfield`, `select`, `avatar`, `hidden`, `text`, …), grid alignment, and an `element` describing the field (`name`, `dataType`, `isRequired`, validation, etc.).

Wiring (see `apps/example/src/App.tsx` and `apps/example/src/config/country/`):

```ts
const http = new HttpClientFactory(import.meta.env.VITE_API_URL ?? "", async () => "", "1.0.0", 30000);
const ui = new Core(http, model, api, containers).run();   // returns React elements
```

`Core` (`components/core/core.ts`) builds an `ApiFactory` → `ApiMaster` (binds endpoints to typed callers using the model) and a `ContainerBuilder`, then `.run()` returns the rendered tree. Must be rendered inside `<DataProvider>` + `<ThemeProvider>` (theme config sets per-component colors, e.g. button/dataTable). When adding a feature like the `country` example, add a sibling folder under `apps/example/src/config/<feature>/` with `model.ts`, `api.ts`, `container.ts`.

The builder layer lives in `packages/ui/src/components/core/` — `containerBuilder.tsx`, `elementBuilder.tsx`, `containerGrid.ts`, plus per-component config builders (`dataTable.ts`, `textField.ts`, `schema.ts`, `expression.ts`, …). `schema.ts`/`expression.ts` drive runtime validation and conditional logic.

## Other library subsystems

- **API layer** (`src/api/`): `HttpClientFactory`/`HttpClientBase` wrap Axios (base URL, async token getter, version, timeout, interceptors). `ApiFactory` + `APIMaster.ts` turn the `model`+`api` config into typed request functions. `observable/` provides RxJS wrappers; `hooks/useObservableCleanup.ts` unsubscribes on unmount.
- **Auth** (`src/auth/azure/`): Azure AD via MSAL. `getAccessToken` is the token entry point and is typically passed as the `HttpClientFactory` token getter.
- **Context** (`src/components/context/`): `DataProvider`, `LoadingProvider`, `ThemeProvider` — wrap the app; `ThemeProvider` carries the per-component theme map.
- **Imperatively-used components** also exist (DataTable2, DataTableEditable, Autocomplete2, Modal, Snackbar, etc.) and are exported from `src/index.ts` for direct JSX use alongside the declarative engine.

The public surface is curated in `packages/ui/src/index.ts` — add new exports there.

## Studio live cell previews (size-gated chip ↔ live component)

`apps/studio` (the visual layout builder) renders the **real library component** inside a grid cell once the cell is big enough, and a compact **chip** when it isn't. When adding a live preview for another component type (Select, DatePicker, …), follow this recipe — it's implemented for `textfield` in `apps/studio/src/components/Layout/GridItem.tsx`:

1. **Gate on measured cell width, not breakpoint.** `useIsLiveWidth(el)` decides chip vs live from the cell's content-box width against a single threshold (~14rem) with a **hysteresis band** (flip to live at `LIVE_MIN_PX`, back to chip only below `CHIP_MAX_PX`) so a cell resting on the boundary doesn't strobe between subtrees.
2. **Measure synchronously, then observe.** Read the width in a `useLayoutEffect` (`clientWidth` − horizontal padding) so the correct state is set *before paint*, then attach a `ResizeObserver` for later resizes. Do **not** rely on the observer's async first callback alone — it flashes a chip on mount and never fires in throttled contexts (hidden/background tabs; see [[studio-preview-hidden-tab]]). The measured element is held in `useState` (callback ref) and merged with dnd-kit's `setNodeRef`; the decision stays local to `GridItem` — nothing goes in `gridStore`.
3. **One generic seam.** `renderLive(item, isLive)` returns the real component or `null`; each new type is one branch there. Anything without a live render falls through to its chip even when wide.
4. **Inert preview.** Wrap the live component in `pointer-events-none` so a click still selects the cell and drag still works via the grip — you preview the component, you don't interact with it on the canvas.
5. **Let the cell own sizing.** Map the component's editable config 1:1 onto its props, but force `isFullWidth` and drop `isFixedHeight` in-cell so the field fills the cell width and the grid row controls height. Props with no equivalent (e.g. a required marker) get baked into an existing prop (the label).
6. **Theme comes free.** Studio wraps the canvas in `ThemeProvider` (`App.tsx`); real library components inherit the accent/appearance — no extra wiring. (Studio consumes the library's built `dist/`, so rebuild the library after changing component source — see the studio toolchain notes.)

## Conventions

- Functional components + hooks; Tailwind for styling (no inline styles); Radix UI primitives for accessibility.
- PascalCase component files, camelCase utilities. Type all props; use Zod/TypeBox for runtime validation where the engine expects it.
- Match the config shapes (`TModelMaster`, `TApiMaster`, `Bin`/`Container`) exactly — they are the contract the builders rely on.

## Theming rule (apply when creating or editing any component)

Every component you add or change **must follow the theme** in two ways. Don't hardcode colors:

1. **Light/dark mode.** Surfaces, text, and borders flip with the `dark` class on `<html>` (Tailwind `darkMode: 'class'`). Use `dark:` variant classes (`bg-white dark:bg-gray-900`, `text-slate-800 dark:text-gray-100`, `border-slate-200 dark:border-gray-700`) — never a bare `#fff`/hex/static `bg-white`. Inline styles are only acceptable for genuinely dynamic values that can't be a class (e.g. a computed elevation shadow); everything else goes through classes so `dark:` resolves.
2. **Accent (primary) color.** For brand/primary surfaces follow the Radix accent via the `--accent-*` CSS vars (`bg-[var(--accent-9)]`, `text-[var(--accent-contrast)]`, `hover:bg-[var(--accent-10)]`, `ring-[var(--accent-6)]`). These re-tint automatically for dark appearance and track the configured `accentColor` — prefer them over named Tailwind palette colors. Read per-component overrides from `useTheme()` (`theme.components.*`) and fall back to the accent vars when unset.

Two constraints that make this work:
- **Tailwind only emits classes that appear as literal strings** in scanned source (`packages/ui/src/**`). Runtime-built class names are dropped — keep accent/dark classes as literal constants or static lookup maps (see `tableBgColors` and the `ACCENT_*` constants in `src/util/constant/colors.ts`).
- **`@apply dark:…` compiles to the portal-safe descendant form** `.sel:is(.dark *){…}`, which covers Radix-portaled content (modals/popovers at body level). Use it in `src/styles.css` rather than `.dark .sel {}` so portaled chrome flips too.
