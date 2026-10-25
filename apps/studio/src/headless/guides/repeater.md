# repeater

Renders its **item template** (child canvas 0) once per item of an array —
read-only (form inputs are refused inside a template). The array comes from:

- `source: "endpoint"` — `read: { endpointId, params, extra }` (`params` fills
  the endpoint's URL `:params` from `NavParamSource`s) + `readPaths` (dot path to
  the array);
- `source: "state"` — `stateBinding: { source: "state", key: "<load>", path }`;
- `source: "parent"` — `parentField`, an array field of the enclosing
  repeater's item (nested repeaters).

Inside the template, bind with `source: "row"`: a typography's
`binding: { key: "name", path: "", source: "row" }`, an avatar's `srcBinding`,
a card's `header.titleBinding`, an HTML block's `binding` (`key: "none"` = the
item itself). A `Navigate` button inside reads the item with
`{ type: "row", key: "_id" }`.

Layout: `itemSpan: { xs, sm, md, lg }` (of 12), `gap`, `itemSurface`
(`none | outlined | elevation`), `itemPadding`; `itemNavigate` makes the whole
item a link; `emptyText`.
