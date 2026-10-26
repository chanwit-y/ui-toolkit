# radio

One value from `options: [{ value, label, disabled? }]`, bound to
`config.name`; `defaultValue`, `orientation` (`horizontal | vertical`),
`isRequired` + `errorMessage`, `variant`, `size`.

```json
{ "type": "radio", "config": { "name": "status", "label": "Status", "orientation": "horizontal",
  "options": [{ "value": "active", "label": "Active" }, { "value": "archived", "label": "Archived" }], "defaultValue": "active" } }
```
