# select, autocomplete, multiAutocomplete

One config shape for the three (`SelectFieldConfig`; the multi adds
`maxSelections`, `showSelectedCount`, `groupKey`, `checkboxes` and
`disabledKey`, and submits an array of ids).

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

**Grouped options (multi only)**: `groupKey` names the row field whose value
is the section header (sticky, uppercase); rows with a blank value come first
without a header, groups follow in first-seen order, and a search matching a
header keeps that whole group. `checkboxes: true` draws a checkbox at the
start of every row instead of the trailing check on the selected ones.
`disabledKey` names the row field that makes an option unpickable: a true
value greys it out, a text value also shows as the reason badge at the row's
end ("No role assigned"); arrow keys skip it, and one already in the value
keeps its chip (removable) but can't be re-picked.

```json
{ "mode": "source", "dataSource": { "endpointId": "regionCountries", "paths": "data" },
  "idKey": "_id", "displayKey": "name", "searchKey": "name", "subtitleKey": "code",
  "groupKey": "region", "checkboxes": true, "disabledKey": "unavailable" }
```
