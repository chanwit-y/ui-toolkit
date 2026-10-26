# checkbox

`mode: "single"` is one boolean field (`defaultChecked`; `isRequired` means it
must be checked — "accept the terms"). `mode: "group"` is a list of
`options: [{ value, label, disabled? }]` whose value is the array of checked
values (`orientation`: `horizontal | vertical`; `isRequired` = at least one).

Look: `variant` (`classic | surface | soft`), `size` (`1 | 2 | 3`); `label`,
`helperText`, `errorMessage`.

```json
{ "type": "checkbox", "config": { "name": "agree", "label": "I accept the terms", "mode": "single", "isRequired": true, "errorMessage": "Please accept" } }
```
