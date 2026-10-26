# text, typography, avatar, divider

Display items — never form fields, fine inside a repeater.

- **typography** — `text`, `variant` (`display1 | display2 | h1 … h6 |
  subtitle1 | subtitle2 | body1 | body2 | caption | overline | button`),
  `weight`, `color`, `align`, `truncate`, `href` (a link).
- **text** — `text`, `isLabel` (small label style).
- **avatar** — `src`, `alt`, `fallback` (initials), `size`
  (`xs | sm | md | lg | xl`).
- **divider** — `variant` (`fullWidth | inset | middle`), `spacing`.

**Bound values**: `binding` (text / typography), `srcBinding` and
`fallbackBinding` (avatar) are `ItemBinding`s — inside a repeater
`{ key: "<item field>", path: "", source: "row" }`, anywhere
`{ source: "state", key: "<load>", path: "<field>" }`. The static text / src
is the fallback while the binding is empty; a `skeleton` load draws a
placeholder until its data lands.

```json
{ "type": "typography", "config": { "text": "Untitled", "variant": "h3", "binding": { "source": "state", "key": "book", "path": "title" } } }
```
