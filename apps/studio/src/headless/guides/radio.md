# radio

One value from `options: [{ value, label, disabled?, helperText? }]`, bound to
`config.name`; `defaultValue`, `orientation` (`horizontal | vertical`),
`isRequired` + `errorMessage`, `variant` (the circle: `classic | surface | soft`),
`size`.

```json
{ "type": "radio", "config": { "name": "status", "label": "Status", "orientation": "horizontal",
  "options": [{ "value": "active", "label": "Active" }, { "value": "archived", "label": "Archived" }], "defaultValue": "active" } }
```

## Card display

`display: "card"` draws every option in its own bordered box — the whole box is
the label, the selected one takes the theme accent (border + tint), keyboard
focus rings the box. Orthogonal to `variant`; absent = `plain`. An option's
`helperText` is the box's second line. Vertical cards span the cell, horizontal
cards share the row equally and wrap.

```json
{ "type": "radio", "config": { "name": "kind", "label": "Kind", "display": "card", "orientation": "horizontal",
  "options": [{ "value": "new", "label": "New priority", "helperText": "Starts a top-level item" },
              { "value": "sub", "label": "Sub-item under an existing priority" }], "defaultValue": "new" } }
```
