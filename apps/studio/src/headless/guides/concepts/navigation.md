# Pages, navigation, menu, breadcrumbs

- A page's `path` is its route; `:params` (`/books/:id`) are read by
  `{ type: "url", key: "id", source: "param" }` sources. Its `key` names it
  in the exported pages record — references store the page id and resolve
  to the key, so renaming is safe.
- **Navigate** — a `StudioNavigate` `{ pageId, params, replace }`: on a
  button (`actions: ["Navigate"]` + `navigate`), a data table row
  (`rowNavigate`), a repeater item (`itemNavigate`), a card (`navigate`) or a
  menu link. Fill every `:param` of the target, e.g. from the clicked row:
  `{ "id": { "type": "row", "key": "_id" } }`.
- **Menu** — `update_menu`: page links, external links, groups (one level)
  and dividers. Detail pages (with `:params`) are usually reached by row
  clicks, not the menu; a menu link to one must fix its params.
- **Breadcrumbs** — `update_page` `parent` (the page above), `crumb` (a
  label source, e.g. a URL param or a load field), `hideBreadcrumbs`;
  the shell's `breadcrumbs` turns the strip on / off app-wide.
