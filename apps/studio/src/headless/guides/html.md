# html

A block of sanitised markup: `html` is a `{{path}}` template rendered against
`binding` (`{ key: "none", path: "", source: "row" }` = the repeater item,
or a page load), every placeholder HTML-escaped; `{{value}}` is the bound
value itself. Without a binding it is static markup (placeholders render
empty). `prose: true` (default) styles headings, lists, quotes, tables;
`false` for markup bringing its own layout.

The sanitiser keeps `class`, `style` and links (same-origin `href="/…"`
navigate in-app) and drops scripts, `<style>`, form controls and
`javascript:` URLs. Portable styling: inline `style` with Radix vars
(`var(--accent-9)`, `var(--gray-11)`) or the shipped helpers `dt-strong`,
`dt-muted`, `dt-badge`, `dt-badge-gray`, `dt-link`.

```json
{ "type": "html", "config": { "html": "<h3>{{name}}</h3><p class=\"dt-muted\">{{about}}</p>", "binding": { "key": "none", "path": "", "source": "row" } } }
```
