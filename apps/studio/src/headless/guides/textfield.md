# textfield (and hidden)

A form input bound to `config.name` (the field key in the submitted body —
unique within its form). `dataType` picks the input kind (`text`, `number`,
`email`, `password`, `date`, `tel`, `url`, …); `number` submits a number.

- `label`, `placeholder`, `helperText`; `isRequired` + `errorMessage`;
  `regex` + `regexErrorMessage` for a pattern.
- Look: `variant` (`classic | surface | soft`), `size` (`1 | 2 | 3`), `radius`.
- `isFullWidth` (default true) fills the grid cell — size with `layout.colSpan`
  rather than `width`.
- Prefill from page data: `update_item` `initialValue: { source: "state", key: "<load>", path: "title" }`.

**hidden** carries a value the form submits but never shows — `name` +
`dataType` (`string | number | boolean | any`). The classic one is `_id` in an
edit form: Save fills the endpoint's URL `:id` from it.

```json
{ "type": "textfield", "config": { "name": "title", "label": "Title", "isRequired": true, "placeholder": "The book title" } }
```
