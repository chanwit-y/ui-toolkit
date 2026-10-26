# datepicker, daterangepicker, datetimepicker

One config (`DateConfig`), told apart by `kind` (`date | range | datetime`,
set by the type — leave it). Bound to `config.name`; a range's value is
`{ from, to }`.

- `displayFormat` (a dayjs format, e.g. `DD MMM YYYY`), `min` / `max`
  (ISO dates), `weekStartsOn` (`0` Sunday, `1` Monday), `minuteStep`
  (datetime), `clearable`.
- `label`, `placeholder`, `helperText`, `isRequired` + `errorMessage`,
  `variant`, `size`, `radius`.

```json
{ "type": "datepicker", "config": { "name": "publishedAt", "label": "Published", "displayFormat": "DD MMM YYYY", "clearable": true } }
```
