# switch

An on / off toggle — one boolean field named `config.name`.

- `label`, `labelPosition` (`start | end`), `helperText`, `defaultChecked`,
  `disabled`; look: `variant`, `size`.
- `isRequired` means it **must be on** (with `errorMessage`).
- **Gate another switch**: on the gated one set
  `enabledWhen: { itemId: "<the gate switch>", when: "on" | "off" }` (its name
  works) — it stays disabled until the gate matches. Only switches gate, and
  both must be on the same canvas.

```json
{ "type": "switch", "config": { "name": "notify", "label": "Email me", "enabledWhen": { "itemId": "subscribe", "when": "on" } } }
```
