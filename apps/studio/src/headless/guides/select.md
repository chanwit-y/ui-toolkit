# select, autocomplete, multiAutocomplete

One config shape for the three (`SelectFieldConfig`; the multi adds
`maxSelections` and `showSelectedCount` and submits an array of ids).

**Options** come from one of:
- `mode: "static"` + `options: [{ "id": "a", "name": "Alpha" }, …]` — records,
  any keys;
- `mode: "source"` + `dataSource: { endpointId: "<endpoint>", paths: "data" }` —
  fetched; `paths` is the dot path to the array in the response (`""` = the
  response is the array);
- `optionsBinding: { source: "state", key: "<load>", path: "genres" }` — a page load.

**Keys** (one set for every mode): `idKey` (the value submitted), `displayKey`
(the title), `searchKey`, optional `subtitleKey`, `avatarKey` (image URL),
`itemIcon` / `inputIcon` (IconData keys). Keys are top-level fields of a row.

**Dependent (cascading)**: set the child's `observeToItemId` to the parent
item (its name works) — the child refetches per parent value and clears. The
child's endpoint should take the parent value as a URL `:param` named like the
parent field.

```json
{ "mode": "source", "dataSource": { "endpointId": "listAuthors", "paths": "data" },
  "idKey": "_id", "displayKey": "name", "searchKey": "name", "subtitleKey": "country", "avatarKey": "avatar" }
```
