# Custom actions and components (code the app supplies)

Config can name code it doesn't contain; the app registers it.

- **Custom action** — `upsert_custom_action { name }` declares it; a button's
  chain calls it as `"fn:<name>"` anywhere among the built-in actions
  (`["StartLoading", "fn:checkStock", "SubmitFormToPostAPI", "StopLoading"]`).
  At runtime it receives the form, the row, page data, the button's API,
  snackbar, navigate…; returning `false` stops the chain. The app implements
  it in `src/actions.ts`.
- **Custom component** — `upsert_custom_component { name, props }` declares a
  React component with typed props (`text | number | boolean | select |
  json`); a `custom` item places it (`add_item` with `component`), passes
  the props and one bound `value`. The app implements it in
  `src/components.tsx`.

An undeclared or unimplemented name is skipped (action) or drawn as a
placeholder (component) — never a crash. `export_project` lists the
declared names under `customActions` / `customComponents`.
