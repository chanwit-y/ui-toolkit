# Gummy `chart` item type — specification

Derived from `@oe-ui/ui-render` (`src/lib/components/chart/`, `@types/report.ts`,
`util/extension/string.extension.tsx`) and `@oe-ui/report-studio` on 2026-10-29,
for implementation as a **new built-in palette item type** in the Gummy engine
and studio. The ui-render chart is the reference for *what people author*
(chart types, series, axes, reference lines, formats); its rendering stack
(ag-charts-enterprise, MUI, hex `Colors`) is **not** carried over.

Decisions in this document were grilled one by one and are final for v1.
§10 records them.

---

## 1. Purpose and scope

A **chart** draws rows from an endpoint or from page data as one of ten chart
types, themed by the project (Radix colour roles, light / dark, Flat / Glass
surface), and exposes the clicked datum to the rest of the page.

| In scope (v1) | Out of scope (v1) |
|---|---|
| Types: `bar` (vertical / horizontal; grouped / stacked / stack-group), `line`, `area`, `barLine` (bars + lines, optional secondary axis), `pie` (pie / donut), `scatter` (scatter / bubble), `radar`, `gauge` (radial / linear), `heatmap`, `funnel` (funnel / pyramid) | Waterfall, pareto, sankey, chord, sunburst, candlestick / OHLC, box plot, histogram, range bar / area, nightingale, radial bar / column (v2 list, §7) |
| Data from an endpoint (`endpointId` + `dataPath` + `requestMapping`) or a page load (`rowsBinding`) | A report-specific response envelope (`DataReport`); the chart reads a plain row array |
| Manual series (field per series) **and** `splitBy` pivot (one series per distinct value) | Server-side aggregation; the chart never sums rows — the API or a page load does |
| Reference lines (static value or a path into the response) | Reference *areas* / bands on cartesian charts |
| Per-series / per-axis number, currency, percent, date formats (the data table's `ColumnFormatConfig`) | Free-text prefix / suffix strings (replaced by `format`) |
| HTML legend (Tailwind), click-to-toggle series, tooltip, loading / empty / error states | ECharts' canvas legend; data zoom / brush; export to PNG |
| Click → navigate (`StudioNavigate`) and click → page state `<name>Selected` | Cross-chart highlight on hover |
| Sample-data canvas in the studio; Live Preview over the endpoint | An ECharts option escape hatch (`advancedOption`) |
| Theme roles only: Radix colour names, resolved at render time | Hex colour input anywhere in the panel |

KPI tiles from ui-render (`ome-overview-card`, `achievement-card`,
`progress-circle-card`) are **not charts**; they become separate item types
later (§7).

**Why a built-in type and not `custom`:** series, axes, formats, an endpoint
with request mapping, a navigate target and a state slice cannot be expressed
as string props + one bound value. `datatable` is the closest existing type and
its conventions are reused throughout (`endpointId` + `apiPaths`-style dot
path, `rowsBinding`, `requestMapping`, `ColumnFormatConfig`, `<name>Selected`,
`StudioNavigate`, studio-only `id`s on sortable cards).

**Why ECharts:** open licence (Apache-2.0), covers every v1 and v2 type, one
theme object, tree-shakeable per chart type. `recharts` would have dropped
gauge, heatmap, sankey, candlestick, box plot; `nivo` drops gauge and
candlestick. The saved JSON contains no ECharts option (§4), so the library is
an engine implementation detail.

---

## 2. Data contract

### 2.1 Rows

The chart consumes `Row[]` — plain objects. Field accessors are dot paths
(`"site.name"`), resolved with the same helper the data table uses for
`accessor`.

```ts
type Row = Record<string, unknown>;
```

The engine never mutates rows. Sorting (where a type offers it, §3.3) is
applied to a copy.

### 2.2 Source

Exactly one of:

- **Endpoint** — `endpointId` (by `EndpointDef.id`, resolved to the endpoint's
  name at export) + `dataPath` (dot path to the array, `''` = the response is
  the array) + `requestMapping` (`RequestMapRow[]`, identical to the data
  table's: one row per `params` / `query` / `body` key, sourced from a
  literal, a URL `:param`, page state, or a **filter field** of a form on the
  page with a fallback). Fetched through `useReadApi`: held until every
  `:param` resolves, refetched when any mapped value changes.
- **Page load** — `rowsBinding: { source: "state", key: "<load id>", path }`
  (an `ItemBinding`), in-memory; while set the export drops `api` and
  `requestMapping`.

A string response is `JSON.parse`d before `dataPath` is applied (same
tolerance as `filecollection`).

A Banpu `DataReport` endpoint (`{ data, crossline, targets }`) is consumed by
setting `dataPath: "data"` and pointing reference lines at
`crossline[0].value` / `targets[0].value` (§2.4). No envelope is special-cased.

### 2.3 Series resolution

**Manual** (`splitBy: ''`): every entry of `series[]` is one series; its
values are `row[series.field]` across rows, keyed by `row[xField]`.

**Pivot** (`splitBy: "<field>"`): exactly one `series[]` entry (the value
field). Rows are grouped by `row[splitBy]`; each distinct value becomes a
series named by that value, in **first-seen order** (never sorted, so colour
follows the entity across refetches — a filter that removes a site must not
repaint the survivors). Values are `row[series[0].field]` keyed by
`row[xField]`. A category missing from one group is `null` (a gap, not 0).

In both modes the x categories are the distinct `row[xField]` values in
first-seen order, formatted for display by `xFormat`
(`ColumnFormatConfig`; a `date` / `datetime` type with a `pattern` also buckets
rows whose formatted label is equal — this replaces ui-render's
`groupBy.format`).

Types that are not category-based read fields differently (§3.3): `scatter`
has numeric `xField` per series, `heatmap` has `xField` + `yField` +
`valueField`, `gauge` reads `series[0].field` from the **first row** only,
`pie` / `funnel` read `xField` as the slice label and `series[0].field` as its
value.

### 2.4 Reference lines

```ts
type ReferenceLine = {
  id: string;                      // studio-only
  label: string;                   // '' = the formatted value
  value: string;                   // a number as text, or a dot path into the raw response
  axis: "x" | "y";                 // which axis the line crosses (y = horizontal line on a vertical bar)
  color: string;                   // Radix colour name, '' = text-secondary
  dashed: boolean;
};
```

`value` is parsed as a number first; if it is not numeric it is a path into
the **raw response** (before `dataPath`) — so `crossline[0].value` works
against a `DataReport`. A path that resolves to nothing hides that line.
Reference lines are honoured by cartesian types and `gauge` (drawn as target
ticks); other types ignore them and the panel hides the section.

### 2.5 The clicked datum

Clicking a mark produces one object, used by `clickNavigate` (`row` param
sources) and written to `<name>Selected`:

| Series mode / type | Datum |
|---|---|
| Manual, category types | the source **row** (`Row`) plus `$series` (series label) and `$value` |
| Pivot | `{ [xField]: category, [splitBy]: seriesName, $series, $value }` plus the source row's fields when exactly one row produced the point |
| `scatter` | the source row plus `$series`, `$x`, `$y`, `$size` |
| `heatmap` | the source row plus `$x`, `$y`, `$value` |
| `pie`, `funnel` | the source row plus `$value`, `$percent` |
| `gauge` | the first row plus `$value` |

`$`-prefixed keys never collide with row fields (row accessors cannot start
with `$`). Clicking the same mark again clears the slice to `null`; the
slice is also cleared on every refetch.

---

## 3. Studio config (`ChartConfig`)

Deep-merge patched through `update_item`, validated against the JSON schema.
`series`, `referenceLines` and `requestMapping` are replaced whole, like
`columns` on the data table. Defaults are what `add_item` creates.

### 3.1 Schema (TypeScript form)

```ts
type ChartType =
  | "bar" | "line" | "area" | "barLine" | "pie"
  | "scatter" | "radar" | "gauge" | "heatmap" | "funnel";

type ChartSeries = {
  id: string;                      // studio-only stable card identity, never exported
  field: string;                   // row accessor (dot path)
  label: string;                   // '' = the field name
  color: string;                   // Radix colour name; '' = palette slot by position
  axis: "left" | "right";          // barLine only; others ignore
  shape: "bar" | "line";           // barLine only; others ignore
  stack: string;                   // bar (mode stackGroup) only: series with the same stack id stack together; '' = own stack
  format: ColumnFormatConfig;      // value formatting (tooltip, labels, axis of this series)
};

type ChartAxis = {
  title: string;
  min: string;                     // number as text; '' = auto
  max: string;
  format: ColumnFormatConfig;      // tick labels; '' type = plain
  showGrid: boolean;
};

type GaugeBand = { id: string; to: string; color: string };   // `to` = upper bound as text

type ChartOptions = {
  // bar
  orientation: "vertical" | "horizontal";     // bar, funnel
  mode: "grouped" | "stacked" | "stackGroup"; // bar
  barMaxWidth: string;                         // px as text, '' = auto
  // line / area
  smooth: boolean;
  showMarkers: boolean;
  stacked: boolean;                            // area
  // pie
  innerRadius: string;                         // '' = pie; "60%" = donut
  labelPosition: "outside" | "inside" | "none";// pie, funnel
  centerText: string;                          // donut only: static text, or "$total" = sum of values
  // scatter
  xField: string;                              // numeric x (replaces the category xField)
  sizeField: string;                           // '' = fixed marker size (scatter → bubble when set)
  labelField: string;                          // '' = no point labels
  // radar
  radarShape: "polygon" | "circle";
  radarMax: string;                            // '' = auto per indicator
  // gauge
  gaugeShape: "radial" | "linear";
  min: string; max: string;                    // '' = 0 / 100
  bands: GaugeBand[];                          // ordered by `to`; the last band's `to` may be '' = max
  // heatmap
  yField: string;
  valueField: string;
  hue: string;                                 // Radix colour name for the sequential ramp; '' = accent
  showValues: boolean;
  // funnel
  funnelShape: "funnel" | "pyramid";
  sort: "none" | "asc" | "desc";
};

type ChartConfig = {
  name: string;                    // binding name; state slice defaults to `${name}Selected`
  title: string;                   // '' = no header
  subtitle: string;
  footnote: string;
  type: ChartType;

  endpointId: string | null;
  dataPath: string;
  rowsBinding: ItemBinding;        // null = the endpoint
  requestMapping: RequestMapRow[];

  xField: string;                  // category / label / indicator accessor
  xFormat: ColumnFormatConfig;
  splitBy: string;                 // '' = manual series
  series: ChartSeries[];
  xAxis: ChartAxis;                // cartesian types; radar uses xAxis.title only
  yAxis: ChartAxis;
  yAxisRight: ChartAxis;           // barLine only
  options: ChartOptions;           // every key present; the panel shows the ones `type` uses

  referenceLines: ReferenceLine[];
  legend: { show: boolean; position: "top" | "bottom" | "left" | "right" };
  showDataLabels: boolean;         // selective: ends of bars / last point of a line (§5.5)
  height: string;                  // CSS length; '' = 320px
  emptyText: string;               // '' = "No data"

  clickNavigate?: StudioNavigate;  // absent = off
  clickState?: { enabled: boolean; stateKey: string };   // absent = off; stateKey '' = `${name}Selected`
};
```

Every key is `required` except `clickNavigate` and `clickState` (optional like
`rowNavigate` / `selection` on the data table, so configs saved before a key
existed need no migration). `additionalProperties: false` everywhere.
`options` is one flat object with every knob present so a type switch keeps
whatever the author set and `update_item` patches stay shallow.

### 3.2 Defaults

```json
{
  "name": "chart_1",
  "title": "Chart",
  "subtitle": "",
  "footnote": "",
  "type": "bar",
  "endpointId": null,
  "dataPath": "",
  "rowsBinding": null,
  "requestMapping": [],
  "xField": "name",
  "xFormat": { "type": "", "decimals": "", "grouping": true, "currency": "", "percentOf": "1", "pattern": "", "timeZone": "", "trueLabel": "", "falseLabel": "" },
  "splitBy": "",
  "series": [
    { "id": "s-1", "field": "value", "label": "Value", "color": "", "axis": "left", "shape": "bar", "stack": "",
      "format": { "type": "number", "decimals": "", "grouping": true, "currency": "", "percentOf": "1", "pattern": "", "timeZone": "", "trueLabel": "", "falseLabel": "" } }
  ],
  "xAxis":      { "title": "", "min": "", "max": "", "format": { "type": "", "decimals": "", "grouping": true, "currency": "", "percentOf": "1", "pattern": "", "timeZone": "", "trueLabel": "", "falseLabel": "" }, "showGrid": false },
  "yAxis":      { "title": "", "min": "", "max": "", "format": { "type": "", "decimals": "", "grouping": true, "currency": "", "percentOf": "1", "pattern": "", "timeZone": "", "trueLabel": "", "falseLabel": "" }, "showGrid": true },
  "yAxisRight": { "title": "", "min": "", "max": "", "format": { "type": "", "decimals": "", "grouping": true, "currency": "", "percentOf": "1", "pattern": "", "timeZone": "", "trueLabel": "", "falseLabel": "" }, "showGrid": false },
  "options": {
    "orientation": "vertical", "mode": "grouped", "barMaxWidth": "",
    "smooth": false, "showMarkers": true, "stacked": false,
    "innerRadius": "", "labelPosition": "outside", "centerText": "",
    "xField": "", "sizeField": "", "labelField": "",
    "radarShape": "polygon", "radarMax": "",
    "gaugeShape": "radial", "min": "", "max": "", "bands": [],
    "yField": "", "valueField": "", "hue": "", "showValues": false,
    "funnelShape": "funnel", "sort": "desc"
  },
  "referenceLines": [],
  "legend": { "show": true, "position": "top" },
  "showDataLabels": false,
  "height": "",
  "emptyText": ""
}
```

Default layout: `colSpan { xs: 4, sm: 6, md: 8, lg: 12 }`, `alignSelf:
stretch` — the same cell as the data table.

### 3.3 Per-type field usage

What each type reads; everything else in the config is ignored by that type
and hidden by the panel.

| Type | `xField` | `series[]` | `splitBy` | `options` keys | Axes | Ref. lines |
|---|---|---|---|---|---|---|
| `bar` | category | ≥ 1 | yes | `orientation`, `mode`, `barMaxWidth` | x, y | yes |
| `line` | category | ≥ 1 | yes | `smooth`, `showMarkers` | x, y | yes |
| `area` | category | ≥ 1 | yes | `smooth`, `showMarkers`, `stacked` | x, y | yes |
| `barLine` | category | ≥ 1, each with `shape` + `axis` | no | `smooth`, `showMarkers`, `barMaxWidth` | x, y, yRight | yes |
| `pie` | slice label | exactly 1 (value) | no | `innerRadius`, `labelPosition`, `centerText` | — | no |
| `scatter` | — (`options.xField` numeric) | ≥ 1 (y per series) | yes | `xField`, `sizeField`, `labelField` | x, y | yes |
| `radar` | indicator name | ≥ 1 | yes | `radarShape`, `radarMax` | `xAxis.title` only | no |
| `gauge` | — | exactly 1 (value, first row) | no | `gaugeShape`, `min`, `max`, `bands` | — | yes (target ticks) |
| `heatmap` | x category | exactly 1, unused (value = `options.valueField`) | no | `yField`, `valueField`, `hue`, `showValues` | x, y (titles only) | no |
| `funnel` | stage label | exactly 1 (value) | no | `orientation`, `funnelShape`, `labelPosition`, `sort` | — | no |

`bar.mode`: `grouped` = side by side; `stacked` = every series in one
stack; `stackGroup` = series sharing a `stack` id stack together, distinct
ids sit side by side (ui-render's `stackgroup-bar`). Horizontal orientation
swaps the axes' roles; `xAxis` keeps meaning "the category axis".

### 3.4 Property panel

Sections, top to bottom:

1. **General** — name, title, subtitle, footnote, **type** (a segmented icon
   picker, ten entries), height, emptyText.
2. **Data** — source toggle (Endpoint / Page data); endpoint picker +
   `dataPath` + request mapping editor (the data table's, verbatim), or the
   `ItemBinding` picker; a **Fields** hint listing the accessors seen in the
   last Live Preview / sample response (the same helper the data table's
   column picker uses).
3. **Series** — `xField` + `xFormat` (hidden for `gauge`, `heatmap`,
   `scatter`), `splitBy` (only where §3.3 allows it; while set, the series
   list is locked to one card titled "Value"), then sortable series cards
   (the data table column-card pattern): field, label, colour (Radix swatch
   picker with "Auto"), format, and the `barLine` extras (shape, axis) or
   `bar` stack id when `mode = stackGroup`.
4. **Options** — only the `options` keys §3.3 lists for the current type.
   `barLine` shows the hint "Use the right axis only when the two measures
   differ in scale; readers compare heights."
5. **Axes** — x / y (/ right) title, min, max, tick format, grid. Hidden for
   non-cartesian types; radar shows only the indicator-axis title.
6. **Reference lines** — sortable cards (label, value-or-path, axis, colour,
   dashed). Hidden where §3.3 says no.
7. **Legend & labels** — legend show / position, `showDataLabels`.
8. **Interaction** — click navigate (the data table's row-navigate editor,
   `row` sources offering the datum keys of §2.5) and click state (enabled,
   stateKey).

### 3.5 Canvas rendering (design mode)

The canvas renders the **real chart over deterministic sample data** so
orientation, stacking, colours and legend are visible with nothing wired:

- Category types: 12 categories (`Jan`…`Dec` when `xFormat.type` is a date
  type, else `A`…`L`); each series gets a seeded pseudo-random walk (seed =
  hash of `series.id`) scaled 20–100; pivot mode fabricates 3 groups
  (`Group 1..3`).
- `scatter`: 40 points per series; `heatmap`: 7 × 12 cells; `pie` / `funnel`:
  5 slices; `radar`: 6 indicators; `gauge`: 72 of 0–100.
- Reference lines with a numeric `value` draw; path-valued ones draw at the
  series mean and carry a dashed "sample" badge in the legend row.
- A dashed outline and a top-right "Sample data" pill mark the frame, exactly
  like the data table's unwired state.

**Live Preview** fetches `endpointId` through the preview fetcher with
`requestMapping` resolved from the preview's filter form / URL defaults,
applies `dataPath`, `splitBy` and reference-line paths, and renders for real.
A `rowsBinding` source shows sample data in the preview (page loads do not
run in the studio), with the pill reading "Page data — sample".

### 3.6 Validation (`validate_project`)

Errors:
- `xField` blank on a type that needs it (§3.3).
- `series` empty, or a type needing exactly one series has more.
- `splitBy` set on a type that does not support it, or with more than one
  series.
- `series[].axis = "right"` while `type ≠ barLine`; `barLine` with every
  series on the right axis.
- `options.xField` / `yField` / `valueField` blank for `scatter` / `heatmap`.
- A `referenceLines[].value` that is neither numeric nor a path, or a path
  while `rowsBinding` is set (there is no raw response to read).
- A gauge band whose `to` is not numeric (except a blank last band).
- `clickNavigate` with an unmapped `:param` (the data table's rule).

Warnings:
- `endpointId` null and `rowsBinding` null (the chart will render the empty
  state).
- More than 8 series (manual) — the 9th and later fold into "Other" (§6.3).
- A colour name repeated across two series.
- `barLine` using the right axis (a hint, not a defect).

---

## 4. Export → engine `ChartElement`

Export resolves stable ids to current names, drops defaults, and emits:

```ts
type ChartElement = {
  type: "chart";
  name: string;
  chart: ChartType;
  title?: string; subtitle?: string; footnote?: string;

  api?: {                            // endpoint source
    name: string;                    // endpoint by name
    paths?: string[];                // dataPath split on '.'
    params?: Record<string, DataValue>;
    query?: Record<string, DataValue>;
    body?: Record<string, DataValue>;
  };
  items?: ItemBindingValue;          // page-data source (engine binding), instead of api

  x?: { field: string; format?: ColumnFormat };
  splitBy?: string;
  series: {
    field: string; label?: string; color?: string;
    axis?: "right"; shape?: "line"; stack?: string; format?: ColumnFormat;
  }[];
  xAxis?: AxisDef; yAxis?: AxisDef; yAxisRight?: AxisDef;   // only non-default keys
  options?: Partial<ChartOptionsValue>;                     // only keys the type uses and that differ from defaults; numeric text → numbers
  referenceLines?: { label?: string; value: number | { path: string[] }; axis?: "x"; color?: string; dashed?: true }[];
  legend?: { show?: false; position?: "bottom" | "left" | "right" };
  showDataLabels?: true;
  height?: string;
  emptyText?: string;
  clickNavigate?: NavigateTarget;    // page id resolved to its key
  clickState?: { stateKey: string }; // only while enabled; stateKey resolved to `${name}Selected` when ''
};
```

Rules:
- `api` mirrors the data table's read API shape (`name`, `paths`, DataValue
  maps from `requestMapping`), so the engine fetches it with `useReadApi`
  unchanged. While `rowsBinding` is set, `api` and `requestMapping` are
  dropped and `items` is emitted.
- `series[].id`, `referenceLines[].id`, `bands[].id`, `requestMapping[].id`
  are never exported.
- `format` with `type: ''` is dropped; otherwise the same `ColumnFormat`
  object the data table exports.
- Numeric text (`min`, `max`, `barMaxWidth`, `radarMax`, `bands[].to`,
  reference `value`) exports as numbers; a non-numeric reference `value`
  exports as `{ path: string[] }` split on `.`.
- `options.xField` / `yField` / `valueField` export as `x.field`, `y.field`,
  `value.field` for `scatter` / `heatmap` so the engine has one field
  vocabulary.
- **No ECharts option is ever written.** The engine builds it at render time
  (§5.3). This keeps the saved document library-neutral and lets ECharts be
  upgraded without migrating pages.

---

## 5. Runtime behaviour

### 5.1 Loading and states

| State | Render |
|---|---|
| First fetch in flight | Skeleton inside the frame: the title bar (if any) and a plot-shaped block (height = `height`) pulsing on surface-strong; for cartesian types five pulsing bars of staggered height at the baseline, otherwise one rounded block. |
| Fetch failed | Centred muted text "Couldn't load chart" with a text-variant **Retry** button. |
| Loaded, zero rows (or every series empty after resolution) | Centred muted `emptyText` (default "No data"), legend hidden, axes hidden. |
| Refetch after a mapped value changes | The current chart stays; a 14px spinner at the header's right until the fetch settles; ECharts `setOption` with `notMerge: false` so series animate to the new values. Selection slice clears. |
| `api` held (a `:param` unresolved) | The empty state with the muted text "Waiting for filters" — never a fetch with a blank param. |

### 5.2 Data pipeline

`raw → parse → dataPath → rows → (sort for funnel) → resolve series (§2.3)
→ format labels → ECharts option → setOption`. Reference-line paths read
`raw`. The pipeline is a pure function `buildChartModel(element, raw,
theme) → ChartModel`, unit-testable without a DOM; the ECharts adapter is a
second pure function `toEChartsOption(model, theme)`. Nothing else in the
engine imports `echarts`.

### 5.3 ECharts adapter contract

- Import per type from `echarts/core` + `echarts/charts` + `echarts/components`
  (`BarChart`, `LineChart`, `PieChart`, `ScatterChart`, `RadarChart`,
  `GaugeChart`, `HeatmapChart`, `FunnelChart`; `GridComponent`,
  `TooltipComponent`, `MarkLineComponent`, `VisualMapComponent`, `RadarComponent`),
  `CanvasRenderer`. No `echarts/index` import — bundle stays tree-shaken.
- Rendered through `echarts-for-react`'s `ReactEChartsCore` with
  `notMerge={false}`, `lazyUpdate`, and the theme registered once per
  appearance (`gummy-light`, `gummy-dark`, §6.2). Resize is observed by the
  frame (`ResizeObserver`), not by window events, so a chart inside a
  collapsible container resizes correctly.
- ECharts' own `legend` is **disabled**; the HTML legend dispatches
  `legendToggleSelect` / `legendSelect`.
- ECharts' `title` is **disabled**; the Tailwind header carries title /
  subtitle / footnote.
- Tooltip: `trigger: "axis"` with a crosshair for `line` / `area` / `barLine`
  and `bar` with ≥ 2 series; `trigger: "item"` otherwise. The tooltip
  formatter renders a small HTML table (category, then one row per series:
  swatch · label · formatted value) in the theme's text tokens; `confine:
  true`; appended to `document.body` so it escapes `overflow: hidden` frames.
- Per-type mapping:

| Type | ECharts |
|---|---|
| `bar` | `series.type: "bar"`; `grouped` → no `stack`; `stacked` → `stack: "all"`; `stackGroup` → `stack: series.stack \|\| series.field`; horizontal → swap `xAxis`/`yAxis` kinds; `barMaxWidth`; `barGap: "8%"`, `barCategoryGap: "32%"`; `itemStyle.borderRadius` 4 on the data end only; 2px surface gap between stacked segments via `itemStyle.borderColor = surface`, `borderWidth: 1` |
| `line` | `series.type: "line"`, `lineStyle.width: 2`, `symbolSize: 8` when `showMarkers` else `symbol: "none"`, `smooth`, `connectNulls: false` |
| `area` | `line` + `areaStyle.opacity: 0.18`, `stack: "all"` when `stacked` |
| `barLine` | bar + line series as above; `yAxisIndex: 1` for `axis: right`; the right axis `splitLine.show: false` |
| `pie` | `series.type: "pie"`, `radius: [innerRadius \|\| 0, "72%"]`, `itemStyle.borderColor = surface`, `borderWidth: 2`, `label.position` from `labelPosition` (`none` → `label.show: false`), `avoidLabelOverlap`; donut `centerText` as a `graphic` text at the centre in `text-primary`; `minShowLabelAngle: 8` |
| `scatter` | `series.type: "scatter"`, numeric `xAxis`/`yAxis` (`type: "value"`), `symbolSize` fixed 10 or a sqrt scale over `sizeField` (8–40 px), `labelField` → `label.show` with `position: "top"`; `itemStyle.borderColor = surface`, `borderWidth: 2` (the overlap ring); more than 3 series emits a console warning (all-pairs cap, §6.3) |
| `radar` | `radar.indicator` = x categories, `max` = `radarMax` or the per-indicator max rounded up; `shape`; one `series.type: "radar"` with `data[]` per series, `areaStyle.opacity: 0.12`, `lineStyle.width: 2` |
| `gauge` | `radial` → `series.type: "gauge"`, `min`/`max`, `axisLine.lineStyle.color` from `bands` (`[[to/max, colour]…]`, tail = `--gray-5`), `progress.show`, `detail` formatted by `series[0].format`; reference lines → `markPoint`-style target ticks (`axisTick`-length triangles) with labels; `linear` → a horizontal `bar` series on a hidden category axis with the same bands as `markArea` and the value bar in the series colour |
| `heatmap` | category `xAxis` / `yAxis`, `series.type: "heatmap"`, `visualMap` continuous (hidden; the HTML legend shows the ramp), sequential ramp = Radix steps 3 → 11 of `hue` (or the accent), `label.show` from `showValues`, cell `borderColor = surface`, `borderWidth: 2` |
| `funnel` | `series.type: "funnel"`, `sort` (`none` → `"none"`), `funnelAlign: "center"`, `pyramid` → `sort: "ascending"` with `funnelAlign: "center"`, horizontal → `orient: "horizontal"`, `label.position` from `labelPosition`, `itemStyle.borderColor = surface`, `borderWidth: 2` |

- Reference lines: `markLine` on the first series of the matching axis with
  `symbol: "none"`, `lineStyle` 1px (dashed when `dashed`), label at the end
  in `text-secondary`, `silent: true`.
- Axes: tick labels in `text-secondary`, 12px; axis lines hidden; grid lines
  (`splitLine`) 1px `--gray-5`, shown per `showGrid`; `boundaryGap` for bars;
  `min` / `max` when set; tick formatter = the axis `format`; category
  labels auto-rotate 45° when more than 12 categories at the current width,
  with `interval: "auto"`.

### 5.4 Legend (HTML)

- Rendered by the frame as a row of pills (`position` top / bottom) or a
  column (left / right): 10px round swatch (series colour; for `heatmap` a
  40px ramp bar with min / max text), label in `text-secondary` 12px,
  8px × 4px padding, 4px radius, hover surface-strong.
- Hidden when `legend.show` is false **or** there is exactly one series on a
  category type (the title names it); always shown for `pie` / `funnel` with
  ≥ 2 slices and for `scatter` with ≥ 2 series.
- Click toggles the series (`legendToggleSelect`); a toggled-off pill drops
  to 40% opacity and strikes the label. Keyboard: the pills are buttons
  (`aria-pressed`).
- Wraps to as many rows as needed; a label longer than 160px truncates with a
  native tooltip.

### 5.5 Direct labels (`showDataLabels`)

Selective, never a number on every point: `bar` labels the end of each bar
only when the category count × series count ≤ 24; `line` / `area` label the
**last** point of each series; `pie` / `funnel` follow `labelPosition`;
`scatter` follows `labelField`; `gauge` always shows the value; `heatmap`
follows `showValues`. Labels use `text-primary` on the surface (outside the
mark) or the surface colour inside a filled mark, never the series colour.

### 5.6 Click

One `click` handler on the ECharts instance: builds the datum (§2.5), writes
`clickState.stateKey` when enabled (toggling off on a second click of the
same mark), then plays `clickNavigate` when present. A click on empty plot
area clears the slice. The clicked mark gets `emphasis` (a 2px surface ring
+ 10% darker fill) until the slice changes.

### 5.7 Layout and chrome

- The frame fills its grid cell's width. Its height is `height` (`''` =
  320px) **plus** the header and legend; the plot is `height` exactly, so a
  row of three charts aligns.
- Header (when `title` or `subtitle` is set): 40px min; title small /
  semibold / `text-primary`, subtitle 12px `text-secondary` beneath; the
  refetch spinner at the right.
- Footnote: 12px `text-secondary`, 8px above the frame's bottom padding.
- Glass surface: the frame is a Glass panel like a `paper`; the plot
  background is transparent (`backgroundColor: "transparent"` in the
  theme) so the backdrop shows through.

---

## 6. Visual spec

Structure is prescriptive; colours are **theme roles**, never literal values,
so the item honours the project theme, light / dark, and the Glass surface.

### 6.1 Frame (Tailwind)

| Element | Spec |
|---|---|
| Frame | `rounded-[var(--radius-3)] bg-[var(--color-panel)] border border-[var(--gray-a5)] p-4 flex flex-col gap-3`; Glass → the project's glass panel classes instead of `bg-*` / `border-*` |
| Header | `flex items-start justify-between min-h-10`; title `text-sm font-semibold text-[var(--gray-12)]`; subtitle `text-xs text-[var(--gray-11)]` |
| Legend pill | `inline-flex items-center gap-2 rounded px-2 py-1 text-xs text-[var(--gray-11)] hover:bg-[var(--gray-a3)] aria-pressed:false:opacity-40 aria-pressed:false:line-through`; swatch `size-2.5 rounded-full` |
| Plot | `relative w-full` with `style={{ height }}`; the ECharts canvas `absolute inset-0` |
| Empty / error | `flex h-full items-center justify-center text-sm text-[var(--gray-11)]`; Retry = the engine's text-variant button |
| Skeleton | `animate-pulse bg-[var(--gray-a3)] rounded` blocks as §5.1 |
| Footnote | `text-xs text-[var(--gray-11)]` |
| Sample-data pill (studio) | `absolute right-3 top-3 rounded-full bg-[var(--amber-a3)] px-2 py-0.5 text-[10px] text-[var(--amber-11)]` |

Tailwind classes are the project's existing utility conventions (Radix CSS
variables through `var(--…)` arbitrary values, as the data table and paper
already do); no new Tailwind theme keys are introduced.

### 6.2 Theme bridge (Radix → ECharts)

At mount and on every appearance / theme change the frame reads
`getComputedStyle(frame)` once and registers an ECharts theme:

| ECharts role | CSS variable |
|---|---|
| `backgroundColor` | `transparent` |
| `textStyle.color`, `title` (unused), `label.color` | `--gray-12` |
| axis tick labels, legend text (HTML), axis names | `--gray-11` |
| `splitLine`, `axisLine`, radar `splitLine` / `axisLine` | `--gray-5` (Glass: `--gray-a5`) |
| tooltip background / border / text | `--color-panel-solid` / `--gray-a6` / `--gray-12`, 4px radius, 8px padding, shadow `--shadow-3` |
| crosshair | `--gray-a8`, 1px dashed |
| mark gaps / rings (`borderColor`) | the resolved frame background (`--color-panel` or, on Glass, `--color-background`) |
| reference line default | `--gray-11` |
| gauge track, heatmap empty cell | `--gray-5` |
| emphasis ring | the frame background, 2px |

Series colours are **not** read from CSS variables (see §6.3): a named
colour resolves through the palette table so it is validated in both
appearances.

### 6.3 Palette

Series `color` is a Radix hue **name**. `''` takes the next palette slot by
series position (fixed order, never cycled: a 9th manual series folds into
"Other" in `--gray-9`; a 9th pivot group likewise, summed when numeric).

The categorical palette, validated with the data-viz validator on 2026-10-29
(every check PASS in light on `#fcfcfb` and dark on `#191919`; adjacent-pair
CVD ΔE ≥ 10.1, normal-vision ΔE ≥ 19.9, contrast ≥ 3:1; the first three slots
also pass all-pairs for `scatter` / `bubble`):

| Slot | Radix hue | Step | Hex (both appearances) |
|---|---|---|---|
| 1 | `blue` | 10 | `#0588F0` |
| 2 | `orange` | 10 | `#EF5F00` |
| 3 | `teal` | 10 | `#0D9B8A` |
| 4 | `amber` | 11 | `#AB6400` |
| 5 | `pink` | 10 | `#CF3897` |
| 6 | `grass` | 10 | `#3E9B4F` |
| 7 | `plum` | 10 | `#A144AF` |
| 8 | `red` | 10 | `#DC3E42` |

**Why a fixed table and not `var(--<hue>-10)`:** Radix's *dark* scales put
steps 9–10 at OKLCH L ≈ 0.69–0.86 — above the dark-surface band (0.48–0.67)
— so reading the variable in dark mode fails the validator (amber-11 dark is
`#FFCA16`). The light step-10 values pass on **both** surfaces, so the engine
ships them as one table, `chartPalette.ts`, keyed by hue name, with every
other Radix hue mapped to its light step-10 value for authors who pick one
explicitly (`iris`, `indigo`, `crimson`, `violet`, `cyan`, `jade`, `tomato`,
`purple`, `ruby`, `green`, `brown`, `gold`, `bronze`, `sky`, `mint`, `lime`,
`yellow`, `gray`). Light hues (`sky`, `mint`, `lime`, `yellow`) and the
near-grays (`brown`, `gold`, `bronze`) fail the chroma or lightness band and
carry a panel warning "low contrast as a series colour".

**The project accent is not slot 1** (a refinement of grilled decision 7):
rotating an arbitrary accent into the first slot would change the adjacent
pairs and void the validation. The accent is used for the heatmap sequential
ramp (`hue: ''`), gauge progress (`series[0].color: ''`), and nothing else by
default. An author who wants the accent on a series picks it by name.

**Sequential** (heatmap): Radix steps 3 → 11 of one hue, light → dark, in the
current appearance's scale (these *are* read from CSS variables, since a
ramp only needs monotonic lightness). **Status** (gauge bands): the author
picks names; the panel suggests `grass` / `amber` / `red` and the preview
labels each band with its bound so state is never colour-alone.

### 6.4 Marks

Thin marks: bars `barCategoryGap: 32%`, data-end radius 4px only, 2px
surface gap between stacked segments and pie / funnel / heatmap cells, lines
2px, markers 8px with a 2px surface ring, area fill 18% opacity, radar fill
12%. Grid lines recessive (`--gray-5`, 1px, horizontal only by default).
Text never wears a series colour.

Accessibility: the frame is `role="figure"` with `aria-label` = title;
the canvas is `aria-hidden`; a visually-hidden table (`sr-only`) lists the
resolved series × categories with formatted values so screen readers and
copy-paste get the numbers; legend pills are buttons.

---

## 7. Non-goals and later work

Deliberately excluded from v1; none changes the data model above.

- **v2 types**, each one new `ChartType` branch + one adapter mapping:
  `waterfall`, `pareto` (bar + cumulative line, one computed series),
  `sankey`, `chord`, `sunburst`, `candlestick` / `ohlc`, `boxPlot`,
  `histogram`, `rangeBar` / `rangeArea`, `nightingale`, `radialBar` /
  `radialColumn`, `treemap`.
- **KPI tiles** (`ome-overview-card`, `achievement-card`,
  `progress-circle-card`): separate `kpiCard` item type with its own
  condition-colour rules (ui-render's `ChipConfig` / `ConditionConfig`).
- **`advancedOption`** — a JSON textarea merged over the ECharts option. Add
  only after three real requests that a typed knob cannot meet, and then as
  an *engine-only* field hidden behind a project flag, never in the studio
  panel. It would be the one place ECharts leaks into saved documents.
- **Data zoom / brush**, **export PNG / CSV** (an `ExportChart` button
  action), **cross-chart hover highlight**, **small multiples** (`facetBy`).
- **Client-side aggregation** (`sum` / `avg` by `xField`) — today the API or
  a page load aggregates.
- **Prefix / suffix text** — `ColumnFormatConfig` covers currency / percent /
  unit cases; a free unit suffix (`" t"`, `" MWh"`) is a candidate `unit`
  key on `ColumnFormatConfig`, shared with the data table.
- **Drag-to-resize height** — Gummy's grid owns sizing.

---

## 8. Acceptance checklist

Studio
- [ ] `list_item_types` shows `chart` (label "Chart", category "Data", summary "A chart over an endpoint or page data: ten types, series, axes, reference lines, click-through.").
- [ ] `describe_item_type` returns the schema, the defaults in §3.2 and the guide in §9.
- [ ] `add_item` creates the defaults; `update_item` deep-merges, replaces `series` / `referenceLines` / `requestMapping` whole, rejects unknown keys.
- [ ] Switching `type` keeps `series` and `options`; the panel shows only the §3.3 sections.
- [ ] The canvas renders every type over sample data with the "Sample data" pill; Live Preview renders the endpoint's rows with `requestMapping` resolved.
- [ ] `validate_project` reports every error and warning in §3.6.
- [ ] Export matches §4: no ECharts keys, defaults dropped, ids never emitted, `endpointId` → name, `pageId` → key, numeric text → numbers, reference paths split.

Runtime
- [ ] Skeleton → chart → empty / failed / waiting states render as §5.1.
- [ ] Endpoint, `dataPath`, string responses, `rowsBinding` all load; refetch on a mapped value change animates and clears the selection.
- [ ] Manual and `splitBy` series resolve as §2.3 (first-seen order, gaps as `null`, colour follows the entity when a filter removes a group).
- [ ] Every type in §5.3 renders with the listed mark specs; `barLine` right axis; `gauge` bands and target ticks; `heatmap` ramp; `funnel` sort / pyramid.
- [ ] HTML legend toggles series, hides for a single series, wraps, truncates; ECharts legend and title never render.
- [ ] Tooltip uses theme tokens, escapes the frame, follows the series formats.
- [ ] Click writes the §2.5 datum to `<name>Selected`, toggles off, clears on empty-area click and on refetch; `clickNavigate` fires with `row` params.
- [ ] Theme bridge re-registers on appearance change; Glass surface shows the backdrop through the plot; every colour is a role or a palette-table value.
- [ ] `node validate_palette.js` passes for the §6.3 table on both surfaces (`--mode light`, `--mode dark --surface "#191919"`), and for slots 1–3 with `--pairs all`.
- [ ] `sr-only` data table present; `role="figure"`; legend pills keyboard-operable.
- [ ] Bundle: only the eight chart modules + five components imported from `echarts/*`; no `echarts/index`.

Demo
- [ ] A `/analytics/*` family on the mock API (`apps/api`) returning plain row arrays and one `DataReport`-shaped response (`{ data, crossline }`) for the reference-line path case.
- [ ] The example app's **Charts** page: a bar (grouped → stacked via a radio bound to state), a line with `splitBy`, a donut with `$total`, a gauge with bands, a heatmap, and a table bound to `<chart>Selected`; the same page seeded into the studio by the next `migrateV*` step.

---

## 9. Authoring guide (text for `describe_item_type`)

```
# chart

A chart over an endpoint (`endpointId` + `dataPath`, the dot path to the row
array, + `requestMapping` like a data table) or over page data (`rowsBinding`).
`name` is its binding name; the clicked datum is page data `<name>Selected`
while `clickState.enabled`.

- `type` — bar | line | area | barLine | pie | scatter | radar | gauge |
  heatmap | funnel.
- `xField` + `xFormat` — the category / label / indicator field and how it
  shows (a `date` type with a `pattern` also buckets rows by that label).
- `series` — `[{ id, field, label, color, format, axis, shape, stack }]`;
  `color` is a Radix hue name (`''` = automatic, fixed palette order);
  `axis: right` and `shape: line` are for `barLine`; `stack` for
  `bar` with `options.mode: stackGroup`. `update_item` replaces the whole
  array — send every series.
- `splitBy` — a field whose distinct values each become a series (one
  `series` entry = the value field). bar / line / area / scatter / radar.
- `options` — only the keys the type uses: bar `orientation`, `mode`,
  `barMaxWidth`; line / area `smooth`, `showMarkers`, `stacked`; pie
  `innerRadius` (`"60%"` = donut), `labelPosition`, `centerText` (`"$total"`);
  scatter `xField`, `sizeField`, `labelField`; radar `radarShape`, `radarMax`;
  gauge `gaugeShape`, `min`, `max`, `bands: [{ id, to, color }]`; heatmap
  `yField`, `valueField`, `hue`, `showValues`; funnel `orientation`,
  `funnelShape`, `labelPosition`, `sort`.
- `xAxis` / `yAxis` / `yAxisRight` — `{ title, min, max, format, showGrid }`.
- `referenceLines` — `[{ id, label, value, axis, color, dashed }]`; `value` is
  a number or a dot path into the raw response (`"crossline[0].value"`).
- `legend: { show, position }`, `showDataLabels`, `height` (CSS length,
  `''` = 320px), `emptyText`.
- `clickNavigate` — a navigate target; `row` params read the datum
  (`$series`, `$value`, the row's fields). `clickState: { enabled, stateKey }`.

{ "name": "productionBySite", "title": "Production by site", "type": "bar",
  "endpointId": "listProduction", "dataPath": "data",
  "requestMapping": [{ "id": "rm-year", "slot": "query", "key": "year",
                       "source": { "type": "filter", "key": "year", "fallback": "2026" } }],
  "xField": "month", "xFormat": { "type": "date", "pattern": "MMM", "decimals": "", "grouping": true,
                                  "currency": "", "percentOf": "1", "timeZone": "", "trueLabel": "", "falseLabel": "" },
  "splitBy": "site",
  "series": [{ "id": "s-1", "field": "tonnes", "label": "Tonnes", "color": "", "axis": "left", "shape": "bar", "stack": "",
               "format": { "type": "number", "decimals": 0, "grouping": true, "currency": "", "percentOf": "1",
                           "pattern": "", "timeZone": "", "trueLabel": "", "falseLabel": "" } }],
  "options": { "orientation": "vertical", "mode": "stacked" },
  "referenceLines": [{ "id": "rl-1", "label": "Target", "value": "crossline[0].value", "axis": "y", "color": "amber", "dashed": true }],
  "clickState": { "enabled": true, "stateKey": "" } }
```

---

## 10. Decision log (grilled 2026-10-29)

| # | Decision | Chosen | Rejected |
|---|---|---|---|
| 1 | Integration shape | First-class `chart` item type with schema, panel, export, preview | `custom` component (flat string props, one binding — not authorable) |
| 2 | Library licence | Open library; ag-charts-enterprise and its licence key not carried into Gummy | Keep ag-charts + adapter (`toChartOptions` port) |
| 3 | Library | Apache ECharts via `echarts-for-react`, tree-shaken per type | Recharts (no gauge / heatmap / sankey / candlestick), Nivo |
| 4 | v1 type scope | Ten collapsed types with modifiers (§1); v2 list in §7; KPI cards are separate items | Port all 50 `ChartType` entries one-to-one |
| 5 | Data model | The data table's: `endpointId` + `dataPath` / `rowsBinding`, `requestMapping` reused; `referenceLines` with number-or-path | ui-render's `DataReport` envelope baked into the engine |
| 6 | Series model | `xField` + `xFormat`, manual `series[]` with `ColumnFormatConfig`, `splitBy` pivot in v1; prefix / suffix dropped | Manual-only; free-text prefix / suffix |
| 7 | Theming | Radix colour names only; roles via CSS variables; Tailwind frame + HTML legend; no hex input. **Refined in §6.3:** series hexes come from a validated per-hue table (not `var(--hue-10)`), and the accent is not forced into slot 1 | Hex inputs; ECharts canvas legend |
| 8 | Interaction | `clickNavigate` (`StudioNavigate`) + `clickState` → `<name>Selected` | Display-only v1 |
| 9 | Export | `ChartElement`, defaults dropped, no ECharts option in saved JSON, **no `advancedOption`** | JSON escape hatch merged over the option |
| 10 | Studio | Real chart over deterministic sample data on the canvas; Live Preview via the endpoint; §3.6 validation; default `type: bar` | Dashed placeholder until exported |
| 11 | Location | This file, `ui-toolkit/spec/gummy-chart-spec.md`, following `gummy-file-collection-spec.md` | — |

Open for the implementer to confirm against the codebase (amendments go in a
§11 like the file-collection spec's §10): the exact read-API ref type
(`FormListReadApiRef` vs the data table's `api`), the `IconData` keys for the
ten type icons (`chartBar`, `chartLine`, `chartArea`, `chartBarLine`,
`chartPie`, `chartScatter`, `chartRadar`, `gauge`, `heatmap`, `funnel` — the
missing ones added), and whether the Glass panel exposes its background as
`--color-background` for the mark-gap colour.

---

## 11. Amendments made against the codebase (2026-10-29)

Decided while implementing; each overrides the section it names.

| # | Section | Amendment |
|---|---|---|
| 1 | §2.2, §3.1, §3.4 | **No filter source for a chart's `requestMapping`.** The engine's `{ type: "filter" }` DataValue resolves only inside a data table's own `filterContainer`; a chart has no filter form, so its request keys come from a literal, a URL `:param` / query or page state. `validate_project` reports a filter-sourced key as an error. A user choice that must steer a chart goes through a URL param, a page-data slice, or another chart's / table's `<name>Selected`. |
| 2 | §5.3 | **No `echarts-for-react`.** The library wraps `echarts/core` itself (`components/echarts.ts` registers the eight charts + components + `CanvasRenderer` once; `EChartsCanvas` in `Chart.tsx` inits, `setOption`s with `replaceMerge` on `series` / axes / `visualMap` / `radar` / `graphic`, clears on a type switch, resizes by `ResizeObserver`, one click handler). ECharts **6.1** (`echarts` is a direct dependency of `@gummy-ui/ui`). |
| 3 | §6.2 | **No `registerTheme`.** The frame reads the Radix variables with `getComputedStyle` (`core/chartTheme.ts`, every value normalised to `rgba()` through a 1×1 canvas because Radix emits `color(display-p3 …)` on wide-gamut displays, which zrender can't parse) and `toEChartsOption` writes the tokens straight into the option. Re-read on appearance / surface / accent / `hue` change. |
| 4 | §6.2 | **Glass gap colour.** The glass panel exposes no `--color-background`; the mark gaps / rings read `--gummy-surface-base` (white / `--gray-2`, the colour the panel's alpha is mixed from) under glass and `--color-panel-solid` flat. |
| 5 | §6.3 | **Light hues take step 11.** `sky`, `mint`, `lime`, `yellow` map to their light step-11 value (like `amber`), since their step 10 is near white; the "low contrast" warning covers the near-grays `brown` / `gold` / `bronze` / `gray`. |
| 6 | §2.2 | **The read API type** is the engine's `FormListReadApi` (`API` + the resolved caller / segments / `urlParams`), fetched through `useReadApi` with `paths` stripped so the model sees the **raw** response; `api.paths` is applied by `buildChartModel`. |
| 7 | §2.3 | **Several rows in one category are summed** (date bucketing, duplicate keys); the point's datum is the row itself only when exactly one row produced it, else the category key plus `$series` / `$value` (both modes). |
| 8 | §3.5 | **The canvas preview reuses the export.** `chartElementLook(config)` (the type-aware engine keys, defaults dropped) feeds both the runtime `ChartElement` and the studio canvas, which renders the real `ChartView` over `buildChartPreviewRows(config)`; a path-valued reference line previews at 60 (the sample mean). |
| 9 | §5.4 | **Compact legend.** Below a 420px frame width a `left` / `right` legend is drawn as a row (a right legend in a third-width cell left the donut 180px wide). |
| 10 | §8 (Demo) | The example page switches grouped / stacked with two buttons whose custom actions (`fn:barGrouped` / `fn:barStacked`) write the `chartMode` slice; the two bar charts are bins with a `source: "state"` condition. A form field can't drive a bin condition (conditions read `contextData` and state, not form values). The datum is shown by an `html` block bound to `productionSelected`, not a table (the datum is one object). |
| 11 | §3.1 | `IconData` keys: `chartBar`, `chartBarStacked`, `chartLine`, `chartArea`, `chartBarLine`, `chartPie`, `chartScatter`, `chartRadar`, `gauge`, `heatmap`, `funnel`. |
| 12 | §3.2 | Workspace **v59** (`migrateV58`): the analytics models + endpoints in the library, the seeded **Charts** page `seed-page-charts`. The mock API routes live under `/collection/analytics/*` (the example's Vite proxy forwards `/collection`). |
