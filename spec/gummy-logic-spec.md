# Gummy Logic — formulas and rules

> Grilled design, 2026-10-30. Reference mockup: *Calculation and Decision Rules Redesign – Formula Builder v5.2* (Finance Gateway). This spec turns that mockup's two editors — **Calculation** (a token formula) and **Decision rule** (an `IF / ELSE IF / ELSE` chain) — into a config-level feature of the Gummy engine and studio: a **custom result** wherever a config takes a value, and **hide / enable / style by condition** wherever a config takes a condition.

Workspace today: `version: 59`. Engine condition type today: `CondExpression` (binary tree, `eq … lte | and | or`, refs to context data / a state slice / an observed value).

---

## 1. Decisions at a glance

| # | Decision |
|---|---|
| 1 | **Not a Bin.** Two new *value kinds* — **Formula** (`Expr`) and **Rule** — that plug into existing config slots, plus a **project-level library** of named formulas and rules. |
| 2 | Operands: **form field** (nearest enclosing form, live), **page data** (state slice + path, incl. `$status`), **item / row**, **URL** param / query, **literal**, **saved formula / rule**. No separate "master value" source — the studio offers a select field's options as literals. |
| 3 | Arithmetic `+ − × ÷ ( )`, `%` literals, `&` text join; functions `ROUND MIN MAX ABS LEN TODAY DAYS COUNT SUM`; conditions `= ≠ > ≥ < ≤`, `is empty / is not empty`, `contains`, `is one of`, `between`, nested AND / OR groups. No inline IF in a formula (use a saved rule), no regex, no custom functions. |
| 4 | Stored as a **JSON AST** (schema-validated, MCP-patchable, no runtime parser). The studio's Code mode prints / parses it. The old `CondExpression` stays accepted everywhere. |
| 5 | Output via the existing **`CellFormat`** + `formatCell` + app locale; formatting only at display, raw value everywhere else. `onEmpty` / `onDivideByZero` default `"empty"`; `"error"` = `—` + tooltip in a display, **false** in a condition, unset in a field value. |
| 6 | v1 slots: `Bin.condition`, `enabledWhen` on **every input and buttons**, table `rowStyles` / `cellStyles` `when`; values in `text` / `typography` / `html` `value`, card `titleValue` / `subheaderValue`, form field `value`, a **computed table column**. Deferred: `requiredWhen`, request mapping, chart series, menu `dataWhen`. |
| 7 | Form field `valueMode: "initial"` (default, today's behaviour) \| `"computed"` (locked, live, submitted, validated). Cycles: studio error, runtime warn-once + skip. |
| 8 | Library is **project-level** (`project.formulas` / `project.rules`), inline-first with "Save as…", studio stores ids → names at export, fields bind **by name** where used, rules declare a `resultType`. |
| 9 | Studio: a summary **chip** per slot in the inspector + one large **dialog** editor (Visual \| Code, operand popover, sample result). Click-to-insert + keyboard in v1; palette drag deferred. |
| 10 | **One condition per item.** `showWhen` + `dataWhen` + the Switch gate migrate into `GridItemData.condition` (v60) with **presets** for the old cases; style rules keep their cards, only `when` becomes the shared chip. |
| 11 | A field **hidden by its condition** is out of the form: not validated, not submitted. |
| 12 | A field **disabled** (by `enabledWhen` or static `disabled`) is not validated but is submitted; a computed field is validated. |
| 13 | Coercion / blank / date / case rules fixed in the pure evaluator (§6). Studio type mismatches are warnings; only un-evaluable things are errors. |
| 14 | Studio **Logic** tab per project; example `/logic` page + seeded studio page; one Book shop use; MCP tools + guide; three PRs. |

---

## 2. Engine types

All in `packages/ui/src/components/@types/index.ts`, exported from `src/index.ts`.

```ts
/** A literal, a reference, an operation, a function call or a library reference. */
export type Expr =
  | { lit: number | string | boolean | null }
  | { ref: ExprRefSource; key: string; path?: string; source?: "param" | "query" }
  | { op: "+" | "-" | "*" | "/" | "&"; args: [Expr, Expr] }
  | { fn: ExprFunction; args: Expr[] }
  | { formula: string }   // a saved formula, by name
  | { rule: string };     // a saved rule's result, by name

export type ExprRefSource =
  | "field"  // the nearest enclosing form's field `key` (lodash `path` into an object value)
  | "state"  // the global-state slice `key`; `path` drills data or reads `$status` / `$error`
  | "row"    // the nearest item: repeater item, table edit record (`key` = table name), the row in a table style rule / computed column (`key: "none"` = the row itself, `"value"` = the cell value)
  | "url";   // route param (`source: "param"`, default) or query (`"query"`) named `key`

export type ExprFunction =
  | "ROUND"  // (x, n)
  | "MIN" | "MAX"  // (a, b, …)
  | "ABS"    // (x)
  | "LEN"    // (text)
  | "TODAY"  // ()
  | "DAYS"   // (from, to) → whole days, to − from
  | "COUNT"  // (list)
  | "SUM";   // (list, fieldName as { lit })

export type CondOperator =
  | "eq" | "neq" | "gt" | "gte" | "lt" | "lte"
  | "empty" | "notEmpty" | "contains" | "in" | "between";

export type Cond =
  | { all: Cond[] }
  | { any: Cond[] }
  | { cmp: CondOperator; left: Expr; right?: Expr | Expr[] };
  // `right` absent for empty / notEmpty; Expr[] for `in` (n items) and `between` ([lo, hi])

export type LogicResultType = "number" | "text" | "boolean" | "date";

export type Rule = {
  branches: { when: Cond; then: Expr | Rule }[]; // ≥ 1; first match wins
  else: Expr;                                     // required
};

export type FormulaDef = {
  expr: Expr;
  format?: CellFormat;                         // applied only where displayed
  onEmpty?: "empty" | "zero" | "error";        // default "empty"
  onDivideByZero?: "empty" | "zero" | "error"; // default "empty"
};

export type RuleDef = { resultType: LogicResultType; rule: Rule; format?: CellFormat };

/** Anything a condition slot accepts. */
export type AnyCondition = CondExpression | Cond | { rule: string };
```

`GummyProject` gains `formulas?: Record<string, FormulaDef>` and `rules?: Record<string, RuleDef>` (`schemaVersion` stays 1). `assertGummyProject` checks every `{ formula }` / `{ rule }` reference resolves, every rule has ≥ 1 branch and an `else`, and no library cycle exists.

### 2.1 `DataValue` gains a formula

`DataValue.type` gains `"formula"`: `{ type: "formula", formula?: string, expr?: Expr, format?, onEmpty?, onDivideByZero? }` — either a library name or an inline formula (inline carries its own format / policies). Only the v1 value slots (§4) resolve it; `resolveDataValues` in request mapping ignores it with a warning (deferred).

### 2.2 Telling condition shapes apart

`operator` key → old `CondExpression` (unchanged evaluator). `all` / `any` / `cmp` → `Cond`. `rule` → a library rule, which must be `resultType: "boolean"`.

---

## 3. Runtime

- **`core/formula.ts`** — pure, no React: `evaluateExpr(expr, scope)`, `evaluateCond(cond, scope)`, `evaluateRule(rule, scope)`, `exprDeps(node, library)` (field names, state keys, url keys, uses row) and `libraryCycles(library)`. `scope = { field(name, path), state(key, path), row(key, path), url(key, source), today, library, locale }`. Tested in `core/formula.test.ts` (every row of §6).
- **`core/logic.tsx`** — `FormulasProvider` / `useLogicLibrary` (context, like `ActionsProvider`); hooks `useFormula(dv)` → `{ raw, text, error, loading }`, `useCondition(cond)` → `boolean`. They collect deps once (memo) and subscribe to exactly those: `useWatch({ control: form.control, name: [...] })` for field refs (the form comes from the `ContainerGrid` that draws the bin — a hook-level `FormContext` is added beside it), `useStateVersion(keys)` for state, `useRouteScope` for URL, `useRowScope` for row. `useSkeleton` applies to `state` deps in skeleton mode.
- **`GummyApp`** mounts `FormulasProvider` from `project.formulas` / `project.rules`; a hand-wired app mounts it itself. No provider + a library reference → warn once, value blank / condition false.
- **`ContainerGrid`**: a bin's `condition` goes through `useCondition` when it is a `Cond` / `{ rule }`, through `ConditionExpression` otherwise (both see `ctx` as `row`).
- **Errors** never throw out of render: an evaluation error is `{ error }`, drawn per §5.

---

## 4. Slots (v1)

### 4.1 Conditions

| Slot | Change |
|---|---|
| `Bin.condition` | `AnyCondition` |
| `enabledWhen` | `AnyCondition` on **every** input element (textfield, textarea, number, date pickers, select family, radio, checkbox, switch, upload, workflow editor) and **`ButtonElement.enabledWhen`** (new). Disabled until it first evaluates true (fails closed). The observe-based form stays accepted for old configs; `observeTo` (dependent option fetching) is unrelated and unchanged. |
| `DataTableStyleRule.when` | `AnyCondition`; `row` refs read the row, `{ ref: "row", key: "value" }` the cell value, `index` via `{ ref: "row", key: "index" }`. |

### 4.2 Values

| Slot | Change |
|---|---|
| `text` / `typography` / `html` `value` | `DataValue` with `type: "formula"`; display = formatted text (html: `{{value}}` = formatted) |
| Card `titleValue` / `subheaderValue` | same |
| Form field `value` | a formula, plus **`valueMode?: "initial" \| "computed"`** (§4.3) |
| `ColumnDef.value?: DataValue` (formula) | a **computed column**: evaluated per row with `row` refs; the cell shows the formatted result; sort, column filter and search use the **raw** result (search also matches the formatted text, like `format`); CSV export follows `exportOptions.values` |

### 4.3 Computed fields

- `valueMode: "initial"` (default) — today: resolved once when its inputs first resolve, then the user's.
- `valueMode: "computed"` — the field renders disabled-looking and read-only, re-evaluates on every dep change and calls `setValue(name, raw, { shouldValidate: touched })` only when the result changed. Submitted and validated (§7).
- Cycles (A reads B reads A, directly or through saved formulas): the studio errors; the engine detects them at form mount, warns once and skips the fields involved.

---

## 5. Formatting and errors

- `FormulaDef.format` / `RuleDef.format` / inline `format` → `formatCell(raw, format, locale)` at display only. Feeding another formula, a condition or a field value uses the **raw** value (`((Margin %))` is `0.34`, not `"34%"`).
- `onEmpty`: a blank operand in arithmetic → `"empty"` blank result (default) · `"zero"` treat as 0 · `"error"`.
- `onDivideByZero`: `"empty"` (default) · `"zero"` · `"error"`.
- `"error"` and evaluation failures: a display draws a muted `—` with a tooltip naming the reason + one `console.warn`; a condition is **false**; a field value is left unset.

---

## 6. Evaluation semantics

Blank = `null`, `undefined`, `""` (an empty array for list functions counts as an empty list, not blank).

**Arithmetic**
- Numeric strings coerce (`"12"`, `"-5"`, `"13.5"`); formatted text (`"1,250"`) does not.
- A non-numeric operand counts as **blank** → `onEmpty`. Never `NaN` / `Infinity` in a result.
- `%` literals: `15%` = `0.15`. `&` stringifies; blank → `""`.
- Precedence: `× ÷` before `+ −`, left to right; `&` lowest. The AST makes it explicit; the printer adds brackets only where needed.

**Functions**
- `ROUND(x, n)` half away from zero; `MIN` / `MAX` skip blanks (all blank → blank); `LEN(blank)` = 0.
- `TODAY()` = the local date at evaluation (no time); `DAYS(a, b)` = whole days `b − a`, blank if either is not a date.
- `COUNT(list)` = length (blank → 0); `SUM(list, field)` sums `item[field]` with the arithmetic coercion, skipping blanks.

**Comparisons**

| Case | Rule |
|---|---|
| Either side blank with `gt / gte / lt / lte / between` | **false** |
| `eq` / `neq` with blank | blank equals only blank |
| number vs numeric string | numeric |
| boolean vs `"true"` / `"false"` | boolean |
| dates | as dates when one side is date-typed (a date field, `TODAY()`, a `date` / `datetime` format, a date-typed saved item) and both parse; else as text |
| text `eq` | exact, case-sensitive |
| `contains` | text: case-insensitive substring; list: has an item `eq` the right |
| `in` | `eq` against each item |
| `between` | inclusive both ends |
| `all []` / `any []` | `true` / `false` |

**Rules**: branches in order, first `when` true gives `then` (a nested rule recurses); none → `else`.

---

## 7. Form semantics (validation and submit)

| State | Validated | Submitted |
|---|---|---|
| Hidden by its bin `condition` | no | **no** (dropped from the payload) |
| Disabled by `enabledWhen` | no | yes, as it stands |
| Disabled by static `disabled: true` | no *(behaviour change: was validated)* | yes |
| `valueMode: "computed"` | **yes** — a required computed field that comes out blank shows its error on the field, the message naming its inputs | yes |
| `hidden`-type bins (`_id`), closed tabs, collapsed card sections | unchanged (validated per today's rules) | yes |
| Button disabled by `enabledWhen` | — | not clickable; Enter in a form does not trigger it |

Implementation: at submit the engine evaluates every field bin's `condition` / `enabledWhen` against the current values (`getValues()` + the same scope), builds the zod schema without the hidden and disabled fields (`schema.ts` takes a `skip: Set<name>`), and strips hidden names from the payload before `callArgs`. A v2 opt-out ("hidden but still sent") is noted, not built.

---

## 8. Studio

### 8.1 Data

- `ProjectSnapshot.formulas: FormulaLibDef[]` — `{ id: "formula-…", name, description, expr: StudioExpr, format: ColumnFormatConfig, onEmpty, onDivideByZero }`.
- `ProjectSnapshot.rules: RuleLibDef[]` — `{ id: "rule-…", name, description, resultType, rule: StudioRule, format }`.
- Studio nodes are the engine AST with **ids** in place of names: `{ formula: id }`, `{ rule: id }`, and field refs by **item id** where the field is in scope (resolved to the field's `name` at export; a saved item's field refs are stored by *name* since it is a template). Export (`Workspace/logic.ts`: `makeLogicResolver`, `logicToEngine`) resolves ids → names; a deleted item exports as `MISSING_FORMULA` / `MISSING_RULE` and is flagged.
- Slots in `GridItemData` / configs: `condition?: StudioCond | { rule: id } | null` (replaces `showWhen` + `dataWhen`), `enabledWhen?` on input configs and `ButtonItemConfig`, `ItemBinding` gains a `formula` source (inline or library), `valueMode` on form-field configs, `DataTableColumnConfig.value`, `StyleRuleConfig.when: StudioCond`.

### 8.2 Editor

- **Inspector chip** per slot: the printed code (`[Qty] × [Unit price]`, `IF [Status] = 'Paid' · +2 more · ELSE false`), **Edit · Clear · Use saved…**, ⚠ with the problem list on hover. Condition slots show **presets** above *Custom…*: *While adding*, *While editing* (inside a table's modal canvas), *When page data … is loaded / loading / failed*, *When item field …*, *When field …* — each writes a `Cond`.
- **Dialog** (`Logic/LogicEditorDialog.tsx`, ~960 px, studio `Popover` / dialog chrome, ink tokens):
  - **Formula** — operator / function palette, token canvas, **Visual \| Code** toggle. Code mode: autocomplete on `[` (fields), `((` (saved formulas), `IF((` (saved rules), `'` (literal / select options), function names; inline parse errors, Visual keeps the last valid version; *Format* (Shift+Alt+F). Output section: `ColumnFormatFields` reused + the two policies.
  - **Rule** — the mockup's outline + selected-branch layout: structure tree left (IF / ELSE IF / ELSE, nested levels, the selected row highlighted), the branch card right with AND / OR groups (toggle, add condition, add group, remove), THEN = value or *Nest IF*, *Replace with a value*, ELSE required and undeletable (with the mockup's reasons on the disabled delete). Result type select at the top.
  - **Operand popover** — source tabs **Field · Page data · Item · URL · Value · Saved**, each only where it applies (Item inside a repeater / table / table modal; Field where a form is in scope). Value: number / % / text / true-false / empty; when the comparison's left side is a select-family field, its options as a pick list.
  - **Sample result** — an editable list of the operands, pre-filled from canvas mock rows (`dataTablePreview.ts`) and page-data shapes; the live result formatted; the matched branch highlighted; warnings: *× and ÷ before + and −* (now vs left-to-right values + *Add brackets*), *percent format on a formula ending in × 100* (+ *Remove × 100*).
  - **Save as formula… / rule…** promotes an inline node; a structurally identical existing item triggers the mockup's *Use existing* prompt.
  - Click-to-insert + keyboard (arrow keys between tokens, Delete, Enter to edit). Token reorder by dnd-kit if cheap; palette drag and drag-to-trash deferred.
- **Logic tab** (`/p/:id/logic`, `Logic/LogicPage.tsx`, beside Menu and Theme): two lists (Formulas, Rules) with search, result type, **Used by N** (links to the items / pages), delete blocked while used or *Inline everywhere*; the same dialog edits an item.
- **Checks** (`Logic/logicChecks.ts`, shared with MCP `validate_project`): errors — unknown saved item, cycle, rule branch / else not matching `resultType`, non-boolean rule in a condition slot, empty rule; warnings — operand type mismatch, a field name not in scope where a saved item is used, a library item unused.
- Canvas: chips render as today's conditional / bound states (condition items keep their dashed "conditional" hint; formula values show their printed code as the `{token}`); the Live Preview runs the real engine with the real library.

### 8.3 Migrations

- **v60** (`migrateV59`): `formulas: []`, `rules: []` on every project; per item `showWhen` + `dataWhen` → `condition` (AND-ed when both): `adding` → `{ cmp: "empty", left: { ref: "row", key: "<table>", path: "_id" } }`, `editing` → `notEmpty`, `loaded / loading / failed` → `{ cmp: "eq", left: { ref: "state", key, path: "$status" }, right: { lit: "success" | "loading" | "error" } }`, `compare` → `cmp` (`set` / `unset` → `notEmpty` / `empty`, values JSON-parsed as today), `$item` → `row`; the Switch `enabledWhen: { itemId, when }` → `{ cmp: "eq", left: { ref: "field", key: <gate item id> }, right: { lit: when === "on" } }` (and `canObserve` no longer exported for it); style rules `{ field · op · value }` → `Cond`. Strict and tested against the Book shop / seeded workspaces.
- **v61** (`migrateV60`): the seeded **Logic** page (`seed-page-logic`, `logicDemoSeedItems` / `logicDemoPage`) + its saved items on the seeded project, via `appendDemoPages`.

### 8.4 MCP

`upsert_formula` / `delete_formula` / `upsert_rule` / `delete_rule` (names in patches, `confirm` on delete, `dryRun`), the `logic` guide (`gummy://guide/concepts/logic`) + updated `button` / `datatable` / input guides, schema roots for `FormulaLibDef` / `RuleLibDef` / the slot shapes, `showWhen` / `dataWhen` removed from schemas, `SNAPSHOT_TOOLS` mapping for both fields, `validate_project` runs `logicChecks`. The drift test must pass.

---

## 9. Demos

- **Example app — Logic** page (`/logic`, `config/country/logicDemo.ts`, menu icon `sigma` → `IconData` gains it):
  1. Order line form: `Qty × Unit price` computed field, a tiered **Discount** rule (`IF [Subtotal] ≥ 10000 → 10% ELSE IF ≥ 5000 → 5% ELSE 0`), VAT 7 %, a currency-formatted Total; Save posts to a mock endpoint so the payload is visible.
  2. Type (Personal / Business) radio → *Company name* shown only for Business (required: shows the hidden-field validation + payload rule).
  3. *Accept the terms* switch → Save `enabledWhen`.
  4. A countries table with a computed **Density** column (`population ÷ area_km2`, `ROUND`) and a row style from a nested AND / OR `Cond`.
  5. A typography over page data with `DAYS([joined_at], TODAY())`.
- **Studio**: the same page seeded (v61).
- **Book shop**: the order detail's *Days since placed* as `DAYS([placedAt], TODAY())` and one rule-based status badge; the API's `*Text` fields stay.

---

## 10. Delivery

1. **Engine** — types, `core/formula.ts` + tests, `core/logic.tsx`, the §4 slots, `valueMode`, §7 form semantics (`schema.ts` skip set, payload strip), `ButtonElement.enabledWhen`, computed column, `GummyProject.formulas / rules` + `assertGummyProject`, the example Logic page.
2. **Studio + MCP** — data + export, chip + dialog + Code mode, Logic tab, checks, v60 / v61 migrations, MCP tools / guide / schemas.
3. **Logic UI v2** — the §14 redesign (studio only).
4. **Book shop** — the two usages, regenerate with `bookshop.ts --force`, refresh the tracked `demo/gummy`.

## 11. Deferred

`requiredWhen`; formulas in API request mapping; chart series from formulas; menu items' `dataWhen`; palette drag-and-drop; "editable until touched" computed fields; a "hidden but still submitted" opt-out; regex / string slicing / date arithmetic beyond `DAYS`; custom functions.

## 12. Amendments (PR 1, engine — 2026-10-30)

Made while building it against the codebase:

1. **Row refs.** The cell value and position are `{ ref: "row", key: "$value" }` / `"$index"` (not `value` / `index`, which clash with row fields). A bin condition's `row` is the nearest repeater item, else the container's context data — so a table modal's *adding* preset is `{ cmp: "empty", left: { ref: "row", key: "<table>", path: "_id" } }`.
2. **One disabled seam.** A `Cond` / `{ rule }` `enabledWhen` (and a computed field's lock) is applied by the grid cell (`BinCell`): the element is wrapped in `<fieldset class="gummy-gate" disabled>` (`styles/logic.css`), which disables every native control inside, so every input **and** button gets it without touching the components. The observe-form `enabledWhen` stays the component's (`legacyCondition` in the switch / autocomplete / radio builders); a new-style one is stripped before the builder sees it.
3. **Submit.** `ContainerRenderer` gives `Form` a resolver that narrows the zod schema per validation (`core/formLogic.ts`: `collectFieldGates` → `gateDecisions` → `narrowSchema`); skipped fields drop out of the payload because the resolver's parsed output is what `handleSubmit` posts. Old `CondExpression` bin conditions count too, which fixes the latent "hidden required field blocks submit" bug. A `hidden`-type bin is never hidden away.
4. **Errors in a display** show `—` with the reason as a native `title` tooltip (`.gummy-logic-error`, `display: contents`), not a Radix tooltip.
5. **Computed fields**: a required computed field that comes out blank shows the field's own `errorMessage` (naming its inputs is left to the author). Computed fields reading each other are found at form mount (`computedCycles`) and skipped with a warning.
6. **Computed column**: `DataTable2` writes each row's raw result onto the row under the column's accessor (`withComputedColumns`), so sort / filter / search / export / format need nothing new; the accessor must be a plain name. The column's `format` wins; without one, an *inline* formula's `format` is used (a saved formula's isn't — set `column.format`).
7. **A rule name as a value**: `{ type: "formula", formula: "<rule>" }` shows that rule's result through the rule's `format`.
8. Not built: skeletons for a formula's page-data deps; formulas in request mapping (as planned).

## 13. Amendments (PR 2, studio + MCP — 2026-10-30)

1. **Field refs stay by name** in the studio too (not by item id): a saved item binds by name anyway, and one rule for both keeps the Code mode simple. Renaming a field means updating the conditions that name it.
2. **The Switch's own gate stays** (`SwitchConfig.enabledWhen`, the observe form) — not migrated; the generic **Enabled when** sits beside it on every input and button (`GridItemData.enabledWhen`).
3. **Style rules keep their one-comparison cards**; *Custom condition…* swaps a rule's `when` for a logic condition (`StyleRuleConfig.condition`). Existing rules aren't migrated.
4. **Value slots** are a `formula` source on `ItemBinding` (`{ source: "formula", formula: StudioFormula }`), offered on text / typography / html content / card title + subheader; a form field's formula is `GridItemData.valueFormula` + `valueMode`.
5. **Presets** on Show when: *While adding* / *While editing* inside a table modal and each page load's loaded / loading / failed; everything else is *Custom…*. Inside a table modal the table is `row.$table` (resolved to its name at export, so renaming the table is safe).
6. **Editor**: Visual mode is a row of tokens over the code text (click a palette chip to insert after the selected token, ⌫ removes); a text that doesn't parse drops to Code with the error. Token drag-reorder isn't built. Conditions edit as AND / OR groups whose operands are one-line formula fields.
7. **Logic tab**: a used item can't be deleted (no "inline everywhere"); the MCP's `delete_formula` / `delete_rule` list the users and need `confirm`.
8. **The seeded Logic page's Save validates only** (no endpoint); the example app's page posts to the echo endpoint.
9. **MCP**: Code-mode text is accepted wherever a condition or formula goes (`condition`, `enabledWhen`, `valueFormula`, a binding's `formula`, a column's `value` / a style rule's `condition` in config patches, `upsert_formula.expr`, a rule's `when` / `then` / `else`), plus `"adding"` / `"editing"`; `get_item` prints an item's logic as text. `showWhen` / `dataWhen` are gone from the tools and schemas.
10. **Versions**: v60 (`migrateV59`, conditions) and v61 (`migrateV60`, the seeded page + saved items) land together; the fresh seeds and the Book shop generator run the same converter (`migrateItemConditions`) over their pre-v60 helpers.
11. Side fix: the canvas's click-away deselect ignores clicks inside a dialog, so a dialog opened from the inspector doesn't unmount itself.

## 14. Logic UI v2 (grilled 2026-10-30 — PR 3)

A studio-only redesign of the editor so the common jobs need no syntax. **Nothing stored changes**: the AST, workspace v61, the export, the MCP and the schemas stay as they are — no migration. It replaces §8.2's editor and §13.6's token row.

### 14.1 The condition line (Visual mode)

One line is built from pickers, never typed syntax:

1. **Operand** — a searchable picker grouped by source (Form fields · Page data · Row · URL · Saved formulas · Saved rules), each with a type icon. A ref's type: a form field's `kind` (its `options` make it an *options* type), a page-data path's type from `loadShape`, a row field's `kind`, a URL param = text, a saved rule's `resultType`, a saved formula = number unless its format says date / text.
2. **Operator** — filtered by that type: text `=` `≠` contains · is one of · is empty / not empty; number and date `=` `≠` `>` `≥` `<` `≤` between · is empty; yes/no *is on* / *is off* (`eq true` / `eq false`); options `=` `≠` · is one of · is empty.
3. **Value** — an input of the operand's type: the field's options as a dropdown (multi for *is one of*), a number box, a date picker, a text box. An **ƒx** toggle turns the value into another operand or a formula (the §14.2 bar, compact) — the only place syntax appears in Visual mode.

Code mode stays for conditions; both modes edit the same AST and switch freely.

### 14.2 The formula bar (formulas lose the Visual / Code switch)

- **One highlighted text field**: a textarea over a coloured overlay — field / page-data / saved / rule pills, functions bold, literals coloured; the caret works anywhere.
- **Autocomplete on plain words**: `qty` offers the field *Qty*, `ROUND`, the saved formula *Subtotal*…; Enter inserts the right syntax (`[Qty]`, `ROUND(`, `((Subtotal))`). The `[` / `((` / `$` / `row.` triggers keep working.
- **Function hint** under the bar while the caret is inside a call: `ROUND(number, digits)` with the current argument bold, plus the one-line description.
- **Parse errors** underline the bad span (red wavy) with the message in a slim line below.
- **Operator buttons** `+ − × ÷ & ( )` sit under the bar.
- **Start from** templates, shown while the bar is empty: *A × B*, *Sum of a table column*, *A % of B*, *Days between two dates*, *Join text*, *Round to 2 places* — one click inserts the skeleton (and sets a fitting format, §14.5).
- The precedence and ×100 checks stay.

### 14.3 Inspector slots

- **Summary as a sentence**, not code: `Type` **is** `Business` (operand pills, operator in words, values as chips); groups read *All of: … · Any of: …*; Code-mode text in the tooltip. A formula shows its highlighted text.
- **One mode dropdown** replaces the preset select and Clear. Conditions: *Always* / presets / saved true-false rules / *Condition…*. Formula slots (Value, a binding's Formula, a Computed value): *No formula* / saved formulas / value rules / *Write a formula…*. Picking a saved item stores the reference and shows its pill (linking to it on the Logic tab). The dialog's **Use** select is removed.
- **Inline editing**: a single-line condition is edited right there with the §14.1 line stacked vertically; *+ and / or* makes it a group and opens the dialog. A formula is the compact §14.2 bar inline (no palette) with a *Show as: …* summary opening the format chips in a popover.
- **⤢ Open editor** is always offered (groups, Code mode, templates, Try it, policies, Save as).
- The Value slot keeps its source select (None / From page data / From a formula) and the *Seeds once* / *Computed* segment.

### 14.4 The dialog

Three columns: **Insert** (left, ~13rem, collapsible) · **editor** · **Try it** (right, ~15rem). About 1080px with Insert open, ~860px closed. Insert is open by default for formulas and Code mode, closed in condition Visual mode.

- **Insert** replaces the chip wall: a search box and a vertical list grouped like the operand picker (type icon · name · type / hint; hovering a function shows signature + example). A click inserts at the bar's caret or fills the focused side of a condition line. Operators and option values leave it (operator buttons §14.2; values in the value picker and autocomplete after `[field] =`).
- **Groups**: a sentence header *Show when [all ▾] of these are true*; *and* / *or* in the gutter before each line after the first; **two levels** in Visual mode (a group holds lines and sub-groups, a sub-group holds lines only) — deeper conditions open in Code mode with a note; sub-groups are one neutral inset panel (*any of ▾ these*), the per-depth colours go; a drag grip per line and a ⋯ menu (Duplicate · Wrap in group · Delete); a ✓ / ✗ dot per line and per group header from the Try-it values.
- **Rules**: a **stacked decision list** replaces the outline — one card per branch (**IF** / **ELSE IF** header, the compact group, a *then* value typed by result type: number box, text, date picker, on/off switch for true/false; ƒx makes it a formula), a fixed last **Otherwise** card, drag grips to reorder (*Checked top to bottom — the first match wins*), a ⋯ menu (Duplicate · Delete · Add a nested IF under *then*), a nested IF indented inside its parent's *then*, collapsible, at most two levels visually. The card matching the sample gets an accent edge and *← matches*; the others dim. **Result type** is a segmented control (Yes/No · Number · Text · Date).
- **Show as** (§14.5) and the footer (Save as… · Cancel · Done).

### 14.5 Output

- **Show as**: chips *Raw · Number · Currency · Percent · Date · Text* with the chosen type's knobs inline and a live preview of the sample result in that format on the right. Rules with a Number / Text / Date result use the same row.
- **Policies** collapse to one line — *▸ If an input is empty: leave the result empty · ÷ 0: leave empty* — opening the two selects.
- Templates set a sensible format (*A % of B* → Percent, *Days between* → Number, 0 dp).

### 14.6 Try it

- Always-visible right column. Inputs typed per operand (options dropdown, number box, date picker, on/off switch; text box for page-data paths and row fields), **prefilled** (first option, 1, today, the field name) so a result shows at once.
- Remembered for the studio session, keyed by operand (in memory, not persisted); *Reset samples* at the bottom.
- Result: a formula's formatted value large with the raw value small; a condition's **✓ True / ✗ False** badge; a rule's value + *from branch n* / *from Otherwise*. The same values drive the per-line dots and the matching rule card.

### 14.7 Inline ↔ saved

- **Save as…** in the dialog footer and the slot's ⋯ menu (name + description); the slot then references the item; a small confirmation *Saved as **Total** — edit it on the Logic tab*.
- **Make a copy here** (⋯ on a slot using a saved item) inlines the body — a rule used as a condition becomes its IF branches — leaving the saved item untouched.
- **Match hint**: when a slot's inline formula / condition equals a saved item's (AST compared after normalising), the slot shows *Same as saved formula **Total*** with *Use it*. Checked when the slot is saved, not while typing.

### 14.8 Logic tab

Master–detail like the Api / Model library pages:

- **List** (left): search, *All · Formulas · Rules* filter, *+ New ▾* (Formula / Rule / from a template); rows with a type icon (ƒ / ⑂), name, result type or format, a used-by badge and a red dot when the item has an issue.
- **Detail** (right): the editor **inline** (no modal) with the dialog's three columns plus name + description, autosaved with undo (no Done); tabs **Editor** · **Used by** (pages, items, saved items — a click jumps to the page with the item selected) · **JSON** (that item's export).
- Row ⋯: Duplicate · Rename · Delete (still blocked while used, naming the users). The issues box goes; issues show on the row and in the editor.

### 14.9 Style

- Six logic tokens in `apps/studio/src/index.css` (light + dark, exposed through `@theme inline`): `--logic-field` (blue), `--logic-data` (violet — page data, row, URL), `--logic-saved` (teal), `--logic-rule` (amber), `--logic-fn` (ink, bold, no hue), `--logic-value` (green). Each has a soft tint (pill background) and a strong step (text). They are used **only** by logic pills and syntax colouring; the rest of the chrome stays monochrome.
- **Pill**: a 16px type icon (Aa text, # number, calendar date, toggle yes/no, list options) + the name, rounded-full, tint background, no border. The formula bar's overlay uses the same colours.
- Sans for sentences, pickers and headers; mono only in the formula bar and Code mode. Operators and keywords ink-2 semibold. Errors: red wavy underline + a slim `text-danger` line.

### 14.10 Delivery

PR 3 on this branch, after PR 1 and PR 2 are committed, in two commits:

1. **Pieces** — the tokens and pills; the formula bar (highlight, autocomplete, function hint); the condition line (operand → operator by type → value by type); the inspector slots (sentence, mode dropdown, inline line / bar); Save as / Make a copy / Match.
2. **Surfaces** — the dialog (Insert · editor · Try it, templates, Show as); the group editor and the stacked rule editor; the Logic tab master–detail.

Pure helpers live in a React-free module (`Workspace/logic.ts` or `Logic/model.ts`) with `bun:test` coverage: a ref's operand type, the operators for a type, the value-input kind, sample defaults, highlight segments, AST equality for the match hint, the two-level depth check. The UI is verified in the browser against the seeded Logic page (Discount rate's sample still gives 6099). Book shop usage moves to PR 4.

Deferred: a decision-table view for large rules; persisting samples; drag-and-drop from Insert.

### 14.11 As built (PR 3 — 2026-10-30)

1. **Files**: `Logic/model.ts` (pure, `model.test.ts`), `pills.tsx`, `CodeInput.tsx` (the formula bar — every code field uses it), `ConditionLine.tsx`, `ConditionGroup.tsx`, `RuleCards.tsx`, `TryIt.tsx`, `LogicEditor.tsx` (the three-column body shared by the dialog and the Logic tab), `MenuButton.tsx`; `editors.tsx` keeps only `ExprField`. The palette, the token row and the outline rule editor are gone.
2. **The condition line** lays out in one row when its box is at least 26rem wide and stacks otherwise (a container query), so it fits the inspector, sub-groups and rule cards alike.
3. **Rule conditions** have no Code mode of their own (as before); a branch condition deeper than two levels shows its code field in the card.
4. **Logic tab**: *+ Formula* / *+ Rule* are two buttons rather than a *+ New ▾* menu (a new formula opens on the templates); edits autosave into the project with **no undo** (the workspace store has none); `?item=<id>` selects an item (the inspector's saved-item pill links there); *Used by* jumps to a page with `state.selectItem`, which `ProjectShell` turns into `focusGridItem` (drills into child canvases, then selects).
5. **Insert** starts open for formulas on screens ≥ 1100px (dialog) / ≥ 1360px (Logic tab), closed otherwise and for conditions in Visual mode; Code mode opens it.
6. **Try it** samples live in a module-level session map keyed by the operand's code label (`[qty]`, `$country.name`); a page reload clears them.

