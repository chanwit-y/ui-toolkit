# Logic — formulas, rules, conditions

Computed values and conditions live in the config (no app code). Three things:

- **Formula** — computes a value: `[qty] * [unitPrice]`, `ROUND($country.population / row.area_km2, 1)`.
- **Rule** — IF / ELSE IF / ELSE, the first branch whose condition holds gives the result; a `boolean` rule is also a condition.
- **Condition** — AND / OR groups of comparisons, used by **Show when** (`condition`), **Enabled when** (`enabledWhen`) and table style rules.

## Code-mode text (what the tools take)

Anywhere a condition or a formula goes you may pass text; the MCP parses it (names → ids) and errors with the column on a typo.

| Write | Means |
|---|---|
| `[qty]`, `[address.city]` | a field of the **nearest form** (live as the user types) |
| `$country.name`, `$country.$status` | page data (a load's key; `$status` = idle / held / loading / success / error) |
| `row.price`, `row`, `row.$value`, `row.$index` | the repeater item / table row; in a table rule the cell value and position |
| `row.$table._id` | inside a data table's edit modal: the edited row (empty while **adding**) |
| `url.code`, `query.tab` | a route param / query value |
| `12`, `15%` (= 0.15), `'TH'`, `TRUE`, `FALSE`, `EMPTY` | literals |
| `((Subtotal))`, `IF((Discount rate))` | a saved formula / a saved rule's result |
| `+ - * / ( )`, `&` (join as text), `× ÷` too | operators (× ÷ before + −) |
| `ROUND(x, n) MIN MAX ABS LEN TODAY() DAYS(from, to) COUNT(list) SUM(list, 'field')` | functions |

Conditions: `=  ≠ (!=, <>)  >  ≥ (>=)  <  ≤ (<=)`, `IS EMPTY`, `IS NOT EMPTY`, `CONTAINS`, `IN ('a', 'b')`, `BETWEEN 1 AND 10`, joined by `AND` / `OR` with brackets. `IF((Is business))` alone is the saved boolean rule.

Semantics: a blank operand makes `> < BETWEEN` false; `eq` against blank is true only for blank; numeric strings compare as numbers; text `=` is case-sensitive, `CONTAINS` is not; a non-number in arithmetic counts as blank (the formula's `onEmpty`: `empty` default / `zero` / `error`); divide by 0 follows `onDivideByZero`. A broken condition is **false** (hides).

## Where it goes

- `update_item` / `add_item`: `condition` (Show when; `"adding"` / `"editing"` are shortcuts in a table modal), `enabledWhen` (inputs and buttons), and on form fields `valueFormula` (`"((Subtotal))"` or text) + `valueMode: "computed"` (locked, recalculated, submitted) — default `initial` seeds the field once.
- Display values: a text / typography / html / card binding `{ "source": "formula", "formula": "((Total))" }` (or text, or `{ "expr": "…", "format": {…} }`).
- A data table column: `value: "((Density))"` (or `{ "expr": "DAYS(row.joined_at, TODAY())" }`) makes it **computed** — written under its accessor, so sort / search / export see it.
- A style rule: `condition: "row.growth > 0.02 AND ((Density)) > 100"` replaces its one comparison.

Form rules: a field **hidden** by Show when is neither validated nor submitted; a **disabled** one is not validated but is submitted; a computed one is validated.

## Saved items

`upsert_formula { name, expr, format?, onEmpty?, onDivideByZero? }` and `upsert_rule { name, resultType, rule: { branches: [{ when, then }], else } }` (when / then / else as text). They are project-level, referenced by id (rename-safe) and exported by name as `project.formulas` / `project.rules`. Fields in them bind **by name** wherever they are used. `delete_formula` / `delete_rule` say what still uses them. `validate_project` reports cycles, deleted references, branch results that don't match the rule's type and non-boolean rules used as conditions.
