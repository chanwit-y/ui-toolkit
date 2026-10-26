# Recipe: a card grid (repeater) linking to details

Goal: `/authors` shows one card per author; a card opens the author page.

1. `add_item repeater { config: { name: "authors", source: "endpoint",
   read: { endpointId: "listAuthors", params: {}, extra: {} }, readPaths:
   "data", itemSpan: { xs: 12, sm: 6, md: 4, lg: 3 }, gap: "16px",
   itemNavigate: { pageId: "author", params: { id: { type: "row", key: "_id" } }, replace: false } } }`
2. Into its item template (`parent: { item: "authors", canvas: 0 }`) add a
   `card` with `header.titleBinding: { key: "name", path: "", source: "row" }`,
   `header.subheaderBinding` → `country`, `media.srcBinding` → `photo`.
3. Inside the card's content (`parent: { item: "<card id>", canvas: 0 }`) an
   `html` block over the row: `"<p class=\"dt-muted\">{{bio}}</p>"` with
   `binding: { key: "none", path: "", source: "row" }`.
4. Form fields are refused inside the template (it is read-only); a
   `Navigate` button inside reads the item with `{ type: "row", key: "_id" }`.
