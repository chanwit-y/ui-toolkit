# formula

The **end user's** formula (the Logic group's *New formula* tile). In the
running app it shows a result as a typography; clicking it (or the pencil)
opens the studio's editor over the page: an **Insert** list (the form's fields,
page data read off what has loaded, saved formulas and rules, the functions
`ROUND MIN MAX ABS LEN TODAY DAYS COUNT SUM`), a formula bar with autocomplete
and the function hint, *Show as* with the blank / divide-by-zero policies, and
**Try it** over samples that start from the form's live values. Blank clears
it. Display-only: not a field of the form.

The grammar is the studio's Code mode with engine names: `[field]` or a bare
`field`, `$load.path`, `row.x`, `url.x` / `query.x`, `((Saved formula))`,
`IF((Rule))`, `15%`, `'text'`, `+ − × ÷ &`, `( )`.

- `formula` — the **starting** formula (inline, with its *Show as* and blank
  policies, or a saved one); `null` = empty until the user writes one. Reset
  in the modal returns to it.
- `placeholder` — shown (muted) while there is no formula.
- `persist` — where the user's formula is kept: `local` (default,
  localStorage under `gummy.formula.<page key>.<name>`), `session`, `none`.
  Only a formula that differs from the starting one is stored.
- `allowFormat: false` hides *Show as*, the policies with it.
- `variant` / `weight` / `color` / `align` — the result typography;
  `label` a caption above it; `editLabel` the pencil's label and modal title.

For a formula **you** author that the user never edits, use a `typography`
with a formula binding (the Display group's Formula tile) instead.

```json
{ "type": "formula", "config": { "name": "myTotal", "label": "Total with VAT", "formula": { "expr": { "op": "*", "args": [{ "ref": "field", "key": "subtotal" }, { "lit": 1.07 }] }, "format": { "type": "currency", "currency": "THB", "decimals": 2, "grouping": true, "percentOf": "1", "pattern": "", "timeZone": "", "trueLabel": "", "falseLabel": "" }, "onEmpty": "empty", "onDivideByZero": "empty" } } }
```
