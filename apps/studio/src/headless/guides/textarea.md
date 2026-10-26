# textarea

A multi-line text input bound to `config.name`, with the text field's
`label`, `placeholder`, `helperText`, `isRequired` + `errorMessage`.

- `rows` (the starting height), `resize` (`none | both | horizontal | vertical`),
  `autoResize` (grow with the text).
- `maxLength` + `showCharCount` for a counter.
- Prefill from page data with `initialValue: { source: "state", key: "<load>", path }`.

```json
{ "type": "textarea", "config": { "name": "description", "label": "Description", "rows": 5, "maxLength": 500, "showCharCount": true } }
```
