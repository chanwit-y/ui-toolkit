# chart

A chart over an endpoint (`endpointId` + `dataPath`, the dot path to the row
array, + `requestMapping` like a data table's — literal / URL / page-data
sources; a chart has no filter form) or over page data (`rowsBinding`, an
`ItemBinding` with `source: "state"`). `name` is its binding name; the clicked
datum is page data `<name>Selected` while `clickState.enabled` (the source
row's fields plus `$series`, `$value`, and `$x` / `$y` / `$size` / `$percent`
by type). See `spec/gummy-chart-spec.md`.

- `type` — bar | line | area | barLine | pie | scatter | radar | gauge |
  heatmap | funnel. Switching keeps `series` and `options`; only the keys the
  type reads are exported.
- `xField` + `xFormat` — the category / slice-label / indicator field and how
  it shows (a `date` format with a `pattern` also buckets rows by that label).
  `gauge` reads none; `scatter` reads `options.xField` (numeric); `heatmap`
  adds `options.yField` + `options.valueField`.
- `series` — `[{ id, field, label, color, format, axis, shape, stack }]`;
  `color` is a Radix hue name (`''` = automatic, a fixed validated palette
  order; the 9th and later fold into "Other"); `axis: right` and
  `shape: line` are for `barLine`; `stack` for `bar` with
  `options.mode: stackGroup`. pie / gauge / heatmap / funnel read exactly one
  series. `update_item` replaces the whole array — send every series.
- `splitBy` — a field whose distinct values each become a series (one
  `series` entry = the value field), first-seen order. bar / line / area /
  scatter / radar only.
- `options` — only the keys the type uses: bar `orientation`, `mode`
  (grouped | stacked | stackGroup), `barMaxWidth`; line / area `smooth`,
  `showMarkers`, `stacked`; pie `innerRadius` (`"60%"` = donut),
  `labelPosition`, `centerText` (`"$total"`); scatter `xField`, `sizeField`
  (bubble), `labelField`; radar `radarShape`, `radarMax`; gauge `gaugeShape`
  (radial | linear), `min`, `max`, `bands: [{ id, to, color }]` (the last
  band's `to` may be `''` = max); heatmap `yField`, `valueField`, `hue`,
  `showValues`; funnel `orientation`, `funnelShape` (pyramid = ascending),
  `labelPosition`, `sort`. Numbers are text (`''` = auto).
- `xAxis` / `yAxis` / `yAxisRight` — `{ title, min, max, format, showGrid }`;
  cartesian types only, radar reads `xAxis.title`, heatmap the two titles.
- `referenceLines` — `[{ id, label, value, axis, color, dashed }]`; `value`
  is a number as text or a dot path into the **raw** response
  (`"crossline[0].value"` — not with `rowsBinding`); cartesian types and
  gauge (target ticks).
- `legend: { show, position }` (hidden anyway for a single series),
  `showDataLabels` (ends of bars / the last point of a line), `height` (CSS,
  `''` = 320px), `emptyText`, `title` / `subtitle` / `footnote`.
- `clickNavigate` — a navigate target (page by name); `row` params read the
  datum (`$series`, `$value`, the row's fields). `clickState: { enabled,
  stateKey }` (`''` = `<name>Selected`).

```json
{ "name": "productionBySite", "title": "Production by site", "type": "bar",
  "endpointId": "productionReport", "dataPath": "data",
  "requestMapping": [{ "id": "rm-year", "slot": "query", "key": "year",
                       "source": { "type": "url", "key": "year", "source": "query" } }],
  "xField": "month", "xFormat": { "type": "date", "pattern": "MMM", "decimals": "", "grouping": true,
                                  "currency": "", "percentOf": "1", "timeZone": "", "trueLabel": "", "falseLabel": "" },
  "splitBy": "site",
  "series": [{ "id": "s-1", "field": "tonnes", "label": "Tonnes", "color": "", "axis": "left", "shape": "bar", "stack": "",
               "format": { "type": "number", "decimals": 0, "grouping": true, "currency": "", "percentOf": "1",
                           "pattern": "", "timeZone": "", "trueLabel": "", "falseLabel": "" } }],
  "options": { "mode": "stacked" },
  "referenceLines": [{ "id": "rl-1", "label": "Target", "value": "crossline[0].value", "axis": "y", "color": "amber", "dashed": true }],
  "clickState": { "enabled": true, "stateKey": "" } }
```
