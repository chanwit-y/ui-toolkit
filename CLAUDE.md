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
- **Routing + shell** (`src/components/core/PageRouter.tsx`, `core/pages.tsx`, `AppShell.tsx`): `PageRouter` renders one `Core` per page of a keyed `TPageMaster` record inside the consumer's own `<BrowserRouter>` and provides the record through `PagesProvider`; `ButtonElement.navigate` (the `"Navigate"` action) and `DataTableElement.rowNavigate` are `NavigateTarget`s resolved through it (`useNavigateTo`, warn-and-no-op on bad config). `AppShell` wraps `PageRouter` with a top bar (`brand` node or the config `appBar: AppBarConfig` — title, `icon`/`logo` mark, `variant: "panel" | "accent"` (accent paints the bar in `--accent-9` with contrast text, re-scoped via `color`), `height`, `sidebarToggle: { hide, show }` glyphs for the collapse button (defaults chevrons; `IconData` gained `panelLeft`/`panelLeftClose`/`panelLeftOpen`); collapse toggle, `header` slot; `menuIcons={false}` hides every menu item's icon — the rail then shows label initials) and a sidebar built from a `TMenu` (page links keyed to pages with fixed-param active matching, groups, external links, dividers; icon rail remembered in localStorage; off-canvas drawer below `md`). `navigation="top"` renders the same menu as a horizontal strip in the top bar instead (groups become Radix dropdowns, no sidebar; the drawer still serves mobile). A breadcrumb strip under the top bar follows `PageElement.parent` (a page key; ancestor links fill their `:params` by name from the current route), labelled by `title` — which may be a `DataValue` (`state`/`url`/`value`, resolved via `usePageTitle`, also the `document.title`); `breadcrumbs={false}` hides the strip app-wide, `PageElement.breadcrumb: false` per page. Code above the routed element must use `matchPage(pages, pathname)` for route params (`useParams()` is empty there). Surfaces use Radix vars (`--color-panel-solid`, `--gray-*`, `--accent-*`) because the library's Tailwind has no `darkMode: 'class'`. See `apps/example/src/config/country/{pages,menu}.ts`.
- **Imperatively-used components** also exist (DataTable2, DataTableEditable, Autocomplete2, Modal, Snackbar, etc.) and are exported from `src/index.ts` for direct JSX use alongside the declarative engine.

The public surface is curated in `packages/ui/src/index.ts` — add new exports there.

## Studio live cell previews (size-gated chip ↔ live component)

`apps/studio` (the visual layout builder) renders the **real library component** inside a grid cell once the cell is big enough, and a compact **chip** when it isn't. When adding a live preview for another component type (Select, DatePicker, …), follow this recipe — it's implemented for `textfield` in `apps/studio/src/components/Layout/GridItem.tsx`:

1. **Gate on measured cell width, not breakpoint.** `useIsLiveWidth(el)` decides chip vs live from the cell's content-box width against a per-kind threshold (`thresholdsForType`: ~14rem for fields, wider for tables, and an `ALWAYS_LIVE` zero-threshold tier for display/trigger types — divider/text/typography/avatar/button/modal/popover) with a **hysteresis band** (flip to live at `liveMin`, back to chip only below `chipMax`) so a cell resting on the boundary doesn't strobe between subtrees. `hidden` never goes live (it renders nothing at runtime).
2. **Measure synchronously, then observe.** Read the width in a `useLayoutEffect` (`clientWidth` − horizontal padding) so the correct state is set *before paint*, then attach a `ResizeObserver` for later resizes. Do **not** rely on the observer's async first callback alone — it flashes a chip on mount and never fires in throttled contexts (hidden/background tabs; see [[studio-preview-hidden-tab]]). The measured element is held in `useState` (callback ref) and merged with dnd-kit's `setNodeRef`; the decision stays local to `GridItem` — nothing goes in `gridStore`.
3. **One generic seam.** `renderLive(item, isLive)` returns the real component or `null`; each new type is one branch there. Anything without a live render falls through to its chip even when wide.
4. **Inert preview.** Wrap the live component in `pointer-events-none` so a click still selects the cell and drag still works via the grip — you preview the component, you don't interact with it on the canvas.
5. **Let the cell own sizing.** Map the component's editable config 1:1 onto its props, but force `isFullWidth` and drop `isFixedHeight` in-cell so the field fills the cell width and the grid row controls height. Props with no equivalent (e.g. a required marker) get baked into an existing prop (the label).
6. **Theme comes free.** Studio wraps the canvas in `ThemeProvider` (`App.tsx`); real library components inherit the accent/appearance — no extra wiring. (Studio consumes the library's built `dist/`, so rebuild the library after changing component source — see the studio toolchain notes.)

### Studio workspace and shared library

Studio is a two-level app persisted to one localStorage key (`gummy.studio.workspace.v1`, `version: 2`) by `components/Workspace/workspaceStore.ts` (zustand `persist`; `merge` migrates v1 payloads). The **portal** (`/`, `components/Workspace/Portal.tsx`) lists projects and hosts the **shared library** pages (`/library/apis`, `/library/models` → `components/Library/LibraryPage.tsx`). A **project** (`/p/:id/*`, `ProjectShell.tsx`) owns only its canvas, env and theme plus `endpointIds` attached from the library; its models are derived from those endpoints' refs. The five live zustand stores are unchanged editors: `ProjectShell` hydrates grid/env/theme from the project snapshot and autosaves them back; `Library/LibrarySync.tsx` hydrates the group/model/api stores from `workspace.library` once at boot and autosaves them back. Scoping is a React context (`Library/scope.ts`: `useScopedEndpoints/useScopedModels` for the editors, `useProjectEndpoints/useProjectModels` for grid inspectors, code export and Live Preview) — never filter by reaching into the workspace store from a component. `groupId` on `EndpointDef`/`ModelDef` is editor-only and never serialized.

### Studio chrome styling (tokens, not palette colours)

The studio's own chrome follows the `gummy-studio` mockup: a monochrome "ink" token set defined in `apps/studio/src/index.css` (`:root` light, `.dark` dark) and exposed to Tailwind via `@theme inline` — use `bg-surface / bg-panel / bg-panel-2 / bg-sunken`, `text-ink / text-ink-2 / text-ink-3`, `border-line / border-line-strong`, `bg-accent text-accent-ink`, `ring-focus`, and `text-danger / text-warn / text-ok`. Never `zinc-*`/`teal-*` in studio chrome — one class must work in both appearances (the library ThemeProvider toggles `.dark` on `<html>` from the Theme page's `appearance`, so chrome and canvas flip together). Compact type uses `text-ui` (12.5px) / `text-ui-sm` / `text-ui-xs`, leaving `text-sm` etc. to the previewed library components. Shared primitives (`btn`, `field`, `seg`/`seg-btn`, `tag`, `mini-tab`, `list-row`, `sec-label`, `box`) are `@utility` classes in the same file, wrapped by `components/common` (`Button`, `IconButton`, `Input`, `Select`, `SegmentedControl`).

### Nested canvases (container / paper / tab / modal / popover)

Container-hosting types carry **child canvases** (`GridItemData.childCanvases`: one for container/paper/modal/popover, one per tab header, arbitrary depth). Editing is **drill-in**: `enterCanvas`/`exitToDepth` in `gridStore` track an `activePath`, only one flat canvas is ever active (dnd-kit/selection/inspector unchanged), and a breadcrumb in `PreviewToolbar` navigates back. All store mutations route through `setActiveCanvas` (immutable spine rebuild via `updateCanvasAtPath`). Parent cells render children **read-only** via `ChildCanvasPreview` (recursive, one `pointer-events-none` at the top); modal/popover cells render only their trigger — their content is exercised in the Live Preview modal, where the real engine can open the overlay. Serialize recurses through `toEngineContainer` (`gridConfig.ts`); the tab panel's add/remove goes through `addTab`/`removeTab` so `TabConfig.tabs` and `childCanvases` stay index-aligned.

### Studio pages, templates, activity and design-only types (from the `gummy-studio-20260909` mockup)

- **Pages.** A project snapshot is `{ pages: PageDef[], env, theme, endpointIds }` (workspace `version: 4`; v1/v2/v3 payloads are migrated in `workspaceStore.ts` `merge` — v3→v4 derives page keys and turns the old design-only "go to page" into the engine `Navigate` action). Each page is `{ id, key, name, path, grid }` where `path` is the exported route (`/countries/:code`; `pathParams` in `Workspace/snapshots.ts`) and `key` is its identifier in the exported `pages` record (`pageKey`/`uniquePageKey`, editable in `PageDialog`, unique per project; navigation refs store the `id` and resolve to the key at export). `gridStore` stays a single-canvas editor: the Layout tab lives at `/p/:projectId/pages/:pageId` and `ProjectShell` hydrates only that page, flushing the outgoing page's autosave on a switch. Page CRUD (`addPage/updatePage/movePage/deletePage`) is on the workspace store; the canvas bar (`Layout/PageBar.tsx`) and the left pane's Pages tab (`Layout/PagesPanel.tsx`, a tree by button links via `Layout/pageLinks.ts`) drive it.
- **Undo/redo** is a per-page snapshot history recorded by a `useGridStore.subscribe` in `gridStore.ts` (cap 50, consecutive same-structure edits within 600 ms coalesce, cleared on `hydrate`). `useUndoShortcuts` binds Cmd/Ctrl+Z and Shift+Cmd+Z outside text controls.
- **Design-only component types** (`Layout/designTypes.ts`: hero, image, gallery, video, linkcard, quicklinks, spacer, bar/line/pie chart, people, orgchart, stat, alert, banner, progress, toast, dialog) have no `@gummy-ui/ui` counterpart. They render their design on the canvas (`Layout/DesignPreviews.tsx` — the seam a real component slots into later), have Props panels (`DesignConfigPanel.tsx`), export as an `empty` bin carrying `designOnly: { type, label, config }`, and the Live Preview turns them into a labelled placeholder (`livePreview.ts`). Palette tiles mark them with a dot (`designOnly: true` in `componentCatalog.ts`).
- **Style tab** (`Layout/StylePanel.tsx`) writes `GridItemData.style` (`ElementStyle`: bg/text/border/accent/radius, table header colours, zebra) — a design-only annotation painted through CSS variables on the cell (`elementStyleVars`) and exported on the bin as `style`; containers derive the engine `surface` background/border flags from it.
- **Page navigation is engine-backed** (see the page-router design in `packages/ui`): a button's `Navigate` action carries `ButtonItemConfig.navigate` and a data table's row click `DataTableConfig.rowNavigate`, both a `StudioNavigate` (`pageId` + one `NavParamSource` per `:param` — literal / URL param or query / global state / clicked row — + `replace`). Export resolves `pageId` → `PageDef.key` (loud `MISSING_PAGE` when deleted) into the engine `NavigateTarget` on the element, and `pages.ts` emits the keyed `TPageMaster` record `PageRouter` takes as is. `NavigateEditor` (`ButtonConfigPanel.tsx`) is the shared editor. The remaining `DesignNavigation` kinds (link, toast, dialog) stay design-only: exported on the bin as `designNavigation` and played by `LivePreviewModal` with a capture-phase click matched by button label; click-only toasts/dialogs (`trigger: 'button'`) are filtered out of the page.
- **App-shell menu** (grilled design, see memory `config-app-shell-menu`): the snapshot carries `menu: MenuItemDef[]` (workspace `version: 5`; v4 payloads get `defaultMenu` — one link per param-less page) and, since `version: 6`, `shell: { navigation: 'sidebar' | 'top', breadcrumbs }` since `version: 7` `shell.appBar: { title, icon, logo, variant }` since `version: 8` `shell.menuIcons` (`migrateV7`, a checkbox in the Layout section) and since `version: 9` `shell.collapsible` + `shell.appBar.sidebarToggle: { hide, show }` (`migrateV8`; a checkbox and two icon fields in the App bar block, the fields disabled while not collapsible) (`defaultShell(title)` / `defaultAppBar`, title defaulting to the project name — `migrateV6`; edited as the Layout and App bar sections at the top of the Menu tab; `shellToEngine` in `Workspace/menu.ts` turns it into the `AppShell` props — empty app-bar fields dropped — for both the `export const shell` in `menu.ts`, spread onto `<AppShell>` in the HANDOFF wiring, and the Live Preview). Breadcrumbs are authored per page in `PageDialog`: `PageDef.parentId` (cycle-guarded in `updatePage`), `crumb?: NavParamSource` (literal / URL param / query only — no `state` until a container `load` is authorable) and `hideBreadcrumbs`; `Workspace/pageMeta.ts` (`enginePageMeta`) turns them into the `PageElement` `title`/`parent`/`breadcrumb` for both `pages.ts` and the Live Preview, which passes `documentTitle={false}` to `PageRouter` so the studio tab keeps its name. `Menu/MenuEditor.tsx` at `/p/:id/menu` edits it (sortable cards, groups one level deep, `NavigateEditor` for page links, an Icon field per item — glyph + key trigger opening the shared `IconPicker` in the studio `Popover`, glyph echoed in the card header); `Workspace/menu.ts` converts it to the library `TMenu` (`menuToEngine`, page ids → keys via `toNavigateTarget`) for the `menu.ts` export and for the Live Preview, which now renders `PageRouter` inside the real `AppShell` (`height` bounded to the modal).
- **Live Preview routes for real**: `LivePreviewModal` renders every page's exported container through the library `PageRouter` inside a `MemoryRouter`, wrapped in `NestedRouterBoundary` (resets react-router's `UNSAFE_*` contexts so a router can nest inside the studio's `BrowserRouter`). The page bar shows the memory location, one input per `:param` of the matched page (a page opened directly has its params unfilled), a page select and history back. `apps/studio/vite.config.ts` aliases `react-router-dom` to the studio's v7 copy so the library's built output (peer dep, otherwise the root v6) shares the studio's router contexts.
- **Templates** live in `workspace.library.templates` (`TemplateDef`, seeded by `seed/templates.ts`). Portal page `/library/templates` (`Library/TemplatesPage.tsx`), master-layout editor `/library/templates/:id/layout` (`Library/TemplateShell.tsx`, `Layout templateMode`), studio Templates tab (`Layout/TemplatesPanel.tsx`) inserting via `cloneItems` (fresh ids, remapped refs, page navigation dropped) and `gridStore.appendItems`. `saveLibrary` merges so the live-store sync never drops templates.
- **Activity** (`workspace.activity`, cap 500) is written by `logActivity` from the coarse store actions and by `Library/LibrarySync.tsx` diffing the library stores (created/renamed/deleted). Identity is `workspace.user` from `MOCK_USERS` (`Workspace/UserButton.tsx`). Page: `/activity` (`Workspace/ActivityPage.tsx`).
- **Overview / Export** (`Workspace/OverviewDialog.tsx`, `ExportDialog.tsx` + `exportFiles.ts`) open from the topbar; export bundles project.json, api.ts, model.ts, theme.ts, routes.ts, HANDOFF.md.
- **Theme extras**: palette presets snap to the nearest Radix accent (`nearestAccent` in `Theme/types.ts`), density → Radix `scaling` (exported in theme.ts; note the library `ThemeProvider` does not yet forward `scaling` to `<Theme>`), per-mode surfaces + font are `StudioThemeConfig.design` (design-only, painted on the canvas frame and Live Preview wrapper via `Theme/designTheme.ts`).
- Engine contract untouched on purpose: breakpoints stay `sm/md/lg/xl` out of 12 columns, engine bins keep their shape; everything mockup-only rides beside them under `designOnly` / `designNavigation` / `style` keys.

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
