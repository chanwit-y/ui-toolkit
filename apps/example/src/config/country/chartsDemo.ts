import type { Bin, ChartElement, Container, DataValue } from "@gummy-ui/ui";
import { DEFAULT_CONTAINER_GRID } from "@gummy-ui/ui";

/**
 * Charts demo page (`/charts`) — the `chart` element (see
 * `spec/gummy-chart-spec.md`) over the mock API's `/collection/analytics/*`
 * resources, one section per family:
 *
 * - **Bar + reference line** — production per site, `splitBy: "site"` over a
 *   date-bucketed month axis, a target read **off the response**
 *   (`crossline[0].value`) and a fixed one; the Grouped / Stacked buttons
 *   write the `chartMode` page-data slice two bins are conditioned on, and a
 *   click writes the datum to `productionSelected`, shown by the block beside.
 * - **Lines** — a line and a stacked area over the same rows.
 * - **Bars + lines** — revenue bars on the left axis, margin as a line on the
 *   right (`percent` format); a horizontal bar of revenue share.
 * - **Parts of a whole** — a donut with `centerText: "$total"`, a funnel and
 *   a pyramid.
 * - **Gauges** — radial with bands + a target tick; linear.
 * - **Grids & points** — a heatmap and a bubble scatter.
 * - **Radar** — a scorecard per site.
 */
const full = { sm: "12", md: "12", lg: "12", xl: "12" } as const;
const half = { sm: "12", md: "6", lg: "6", xl: "6" } as const;
const third = { sm: "12", md: "6", lg: "4", xl: "4" } as const;

const text = (t: string, element: Record<string, unknown> = {}, span: Partial<Bin> = full): Bin => ({
  ...full,
  ...span,
  type: "typography",
  element: { text: t, variant: "body2", ...element } as Bin["element"],
});

const chart = (element: ChartElement, span: Partial<Bin> = half, bin: Partial<Bin> = {}): Bin => ({
  ...full,
  ...span,
  alignSelf: "stretch",
  type: "chart",
  element,
  ...bin,
});

const number0 = { type: "number", decimals: 0 } as const;
const thb = { type: "currency", currency: "THB", decimals: 0 } as const;
const monthFormat = { type: "date", pattern: "MMM" } as const;
const yearFromUrl: DataValue = { type: "url", key: "year", source: "query" };

/* ---------------------------------------------------------------- bar */

const productionBar = (mode: "grouped" | "stacked"): ChartElement => ({
  name: `production${mode === "stacked" ? "Stacked" : ""}`,
  chart: "bar",
  title: "Production by site",
  subtitle: mode === "stacked" ? "Stacked — the target line is read off the response" : "Grouped — the target line is read off the response",
  api: { name: "productionReport", paths: ["data"], query: { year: yearFromUrl } },
  x: { field: "month", format: monthFormat },
  splitBy: "site",
  series: [{ field: "tonnes", label: "Tonnes", format: number0 }],
  options: { mode },
  yAxis: { title: "Tonnes", format: number0 },
  // The response's crossline is the plant total, so it only lands on-scale when stacked.
  referenceLines:
    mode === "stacked"
      ? [
          { label: "Target", value: { path: ["crossline[0]", "value"] }, color: "amber", dashed: true },
          { label: "Floor", value: 600, color: "gray" },
        ]
      : [{ label: "Site target", value: 420, color: "amber", dashed: true }],
  showDataLabels: mode === "grouped",
  clickState: { stateKey: "productionSelected" },
  footnote: "Click a bar: the datum lands in page data `productionSelected`. Add ?year=2027 to the URL to refetch.",
});

const barBins: Bin[] = [
  text("Grouped or stacked: the two buttons write the `chartMode` page-data slice, and each bar chart has a `condition` on it — a form field can't drive a condition, a slice can.", { color: "gray" }),
  {
    ...full,
    sm: "6",
    md: "2",
    lg: "2",
    xl: "2",
    type: "button",
    element: { label: "Grouped", icon: "chartBar", variant: "outlined", actions: ["fn:barGrouped"] } as Bin["element"],
  },
  {
    ...full,
    sm: "6",
    md: "2",
    lg: "2",
    xl: "2",
    type: "button",
    element: { label: "Stacked", icon: "chartBarStacked", variant: "outlined", actions: ["fn:barStacked"] } as Bin["element"],
  },
  chart(productionBar("grouped"), { md: "8", lg: "8", xl: "8" }, {
    condition: { left: { key: "chartMode", source: "state" }, operator: "neq", right: { val: "stacked" } },
  }),
  chart(productionBar("stacked"), { md: "8", lg: "8", xl: "8" }, {
    condition: { left: { key: "chartMode", source: "state" }, operator: "eq", right: { val: "stacked" } },
  }),
  {
    ...full,
    md: "4",
    lg: "4",
    xl: "4",
    type: "html",
    element: {
      html: `<p class="dt-muted">Clicked datum</p>
<dl>
  <dt>Site</dt><dd><strong>{{site}}</strong></dd>
  <dt>Month</dt><dd>{{month}}</dd>
  <dt>Series</dt><dd>{{$series}}</dd>
  <dt>Value</dt><dd>{{$value}}</dd>
</dl>
<p class="dt-muted">Click the same bar again to clear it; a refetch clears it too.</p>`,
      value: { type: "state", key: "productionSelected" },
    } as Bin["element"],
  },
];

/* -------------------------------------------------------------- lines */

const lineBins: Bin[] = [
  chart({
    name: "productionLine",
    chart: "line",
    title: "Production trend",
    subtitle: "splitBy: site · smooth · markers",
    api: { name: "productionReport", paths: ["data"] },
    x: { field: "month", format: monthFormat },
    splitBy: "site",
    series: [{ field: "tonnes", label: "Tonnes", format: number0 }],
    options: { smooth: true },
    yAxis: { format: number0 },
    showDataLabels: true,
    legend: { position: "bottom" },
  }),
  chart({
    name: "costArea",
    chart: "area",
    title: "Cost, stacked",
    subtitle: "area · stacked · no markers",
    api: { name: "productionReport", paths: ["data"] },
    x: { field: "month", format: monthFormat },
    splitBy: "site",
    series: [{ field: "cost", label: "Cost", format: thb }],
    options: { stacked: true, showMarkers: false },
    yAxis: { format: { type: "number", decimals: 0 } },
  }),
];

/* ---------------------------------------------------------- bar + line */

const comboBins: Bin[] = [
  chart({
    name: "sales",
    chart: "barLine",
    title: "Revenue and margin",
    subtitle: "Bars on the left axis, margin as a line on the right",
    api: { name: "salesByMonth", paths: ["data"] },
    x: { field: "month", format: monthFormat },
    series: [
      { field: "revenue", label: "Revenue", format: thb, shape: "bar" },
      { field: "orders", label: "Orders", format: number0, shape: "bar" },
      { field: "margin", label: "Margin", format: { type: "percent", decimals: 1 }, shape: "line", axis: "right", color: "pink" },
    ],
    yAxis: { title: "THB / orders", format: number0 },
    yAxisRight: { title: "Margin", format: { type: "percent", decimals: 0 }, min: 0, max: 0.5 },
    options: { smooth: true },
  }),
  chart({
    name: "shareBar",
    chart: "bar",
    title: "Revenue share by channel",
    subtitle: "orientation: horizontal · one series, so no legend",
    api: { name: "salesShare", paths: ["data"] },
    x: { field: "channel" },
    series: [{ field: "amount", label: "Revenue", format: thb, color: "teal" }],
    options: { orientation: "horizontal", barMaxWidth: 28 },
    xAxis: { showGrid: false },
    yAxis: { format: { type: "number", decimals: 0 } },
    showDataLabels: true,
  }),
];

/* --------------------------------------------------------- pie / funnel */

const partsBins: Bin[] = [
  chart(
    {
      name: "shareDonut",
      chart: "pie",
      title: "Revenue share",
      subtitle: 'innerRadius "60%" · centerText "$total"',
      api: { name: "salesShare", paths: ["data"] },
      x: { field: "channel" },
      series: [{ field: "amount", label: "Revenue", format: thb }],
      options: { innerRadius: "60%", centerText: "$total", labelPosition: "outside" },
      legend: { position: "right" },
      clickState: { stateKey: "shareSelected" },
    },
    third,
  ),
  chart(
    {
      name: "funnel",
      chart: "funnel",
      title: "Sales funnel",
      subtitle: "sort: desc (the API sends the stages unsorted)",
      api: { name: "salesFunnel", paths: ["data"] },
      x: { field: "stage" },
      series: [{ field: "count", label: "Count", format: number0 }],
      options: { labelPosition: "inside" },
      showDataLabels: true,
    },
    third,
  ),
  chart(
    {
      name: "pyramid",
      chart: "funnel",
      title: "Pyramid",
      subtitle: "funnelShape: pyramid · labels outside",
      api: { name: "salesFunnel", paths: ["data"] },
      x: { field: "stage" },
      series: [{ field: "count", label: "Count", format: number0 }],
      options: { funnelShape: "pyramid", labelPosition: "outside" },
      legend: { show: false },
    },
    third,
  ),
];

/* -------------------------------------------------------------- gauges */

const gaugeBins: Bin[] = [
  chart(
    {
      name: "availability",
      chart: "gauge",
      title: "Plant availability",
      subtitle: "Bands red → amber → grass, a target tick at 90",
      api: { name: "plantKpi", paths: ["data"], query: { name: { type: "value", key: "none", value: "availability" } } },
      series: [{ field: "value", label: "Availability", format: { type: "percent", decimals: 1, of: 100 } }],
      options: {
        min: 0,
        max: 100,
        bands: [
          { to: 50, color: "red" },
          { to: 75, color: "amber" },
          { color: "grass" },
        ],
      },
      referenceLines: [{ label: "Target", value: 90, color: "amber" }],
      height: "260px",
    },
    third,
  ),
  chart(
    {
      name: "oee",
      chart: "gauge",
      title: "OEE",
      subtitle: "gaugeShape: linear",
      api: { name: "plantKpi", paths: ["data"], query: { name: { type: "value", key: "none", value: "oee" } } },
      series: [{ field: "value", label: "OEE", format: { type: "percent", decimals: 0, of: 100 }, color: "iris" }],
      options: {
        gaugeShape: "linear",
        min: 0,
        max: 100,
        bands: [
          { to: 40, color: "red" },
          { to: 70, color: "amber" },
          { color: "grass" },
        ],
      },
      referenceLines: [{ label: "World class", value: 85 }],
      height: "120px",
    },
    third,
  ),
  chart(
    {
      name: "nps",
      chart: "gauge",
      title: "Net promoter score",
      subtitle: "min −100 · no bands (the accent fills the arc)",
      api: { name: "plantKpi", paths: ["data"], query: { name: { type: "value", key: "none", value: "nps" } } },
      series: [{ field: "value", label: "NPS", format: number0 }],
      options: { min: -100, max: 100 },
      height: "260px",
    },
    third,
  ),
];

/* ------------------------------------------------------ heatmap / scatter */

const gridBins: Bin[] = [
  chart({
    name: "activity",
    chart: "heatmap",
    title: "Activity by hour",
    subtitle: "hue: teal · values hidden (hover a cell)",
    api: { name: "activityHeat", paths: ["data"] },
    x: { field: "hour" },
    y: { field: "day" },
    value: { field: "count" },
    series: [{ field: "count", label: "Events", format: number0 }],
    options: { hue: "teal" },
    xAxis: { title: "Hour" },
  }),
  chart({
    name: "sites",
    chart: "scatter",
    title: "Output vs headcount",
    subtitle: "Bubble: size = cost · splitBy: region",
    api: { name: "siteStats", paths: ["data"] },
    x: { field: "headcount" },
    splitBy: "region",
    series: [{ field: "output", label: "Output (t/day)", format: { type: "number", decimals: 1 } }],
    options: { sizeField: "cost" },
    xAxis: { title: "Headcount", format: number0 },
    yAxis: { title: "Output", format: number0 },
    referenceLines: [{ label: "Output target", value: 500, dashed: true, color: "amber" }],
    legend: { position: "bottom" },
  }),
];

/* --------------------------------------------------------------- radar */

const radarBins: Bin[] = [
  chart(
    {
      name: "scores",
      chart: "radar",
      title: "Site scorecard",
      subtitle: "splitBy: site · radarMax 100",
      api: { name: "siteScores", paths: ["data"] },
      x: { field: "metric" },
      splitBy: "site",
      series: [{ field: "score", label: "Score", format: number0 }],
      options: { radarMax: 100 },
      legend: { position: "right" },
    },
    half,
  ),
  chart(
    {
      name: "scoresCircle",
      chart: "radar",
      title: "Same data, circle",
      subtitle: "radarShape: circle · legend bottom",
      api: { name: "siteScores", paths: ["data"] },
      x: { field: "metric" },
      splitBy: "site",
      series: [{ field: "score", label: "Score", format: number0 }],
      options: { radarShape: "circle", radarMax: 100 },
      legend: { position: "bottom" },
    },
    half,
  ),
];

const section = (id: string, name: string, title: string, bins: Bin[]): Container => ({
  id,
  name,
  isArray: false,
  bins,
  ...DEFAULT_CONTAINER_GRID,
  gap: "4",
  surface: { title },
});

export const containerChartsDemo: Container[] = [
  section("charts-bar", "ChartsBar", "Bar + reference line", barBins),
  section("charts-lines", "ChartsLines", "Lines", lineBins),
  section("charts-combo", "ChartsCombo", "Bars + lines", comboBins),
  section("charts-parts", "ChartsParts", "Parts of a whole", partsBins),
  section("charts-gauges", "ChartsGauges", "Gauges", gaugeBins),
  section("charts-grid", "ChartsGrid", "Grids & points", gridBins),
  section("charts-radar", "ChartsRadar", "Radar", radarBins),
];
