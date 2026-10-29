import { get } from "lodash";
import type { ChartElement, ChartGaugeBand, ChartReferenceLine, ChartSeriesDef, ChartType } from "../@types";
import { formatCell, type CellFormat } from "../../util/format";
import { drillPaths } from "./dataValue";
import { CHART_PALETTE, CHART_HUES, MAX_SERIES, OTHER_SERIES_COLOR, hueHex, seriesColor } from "./chartPalette";

/**
 * The `chart` element's data pipeline (see `spec/gummy-chart-spec.md` §2 and
 * §5.2): `raw → parse → paths → rows → series / slices / cells → ChartModel`.
 * Pure — no DOM, no ECharts — so it is unit-tested on its own and shared by
 * the engine, the studio canvas (over sample rows) and the headless validator.
 * `toEChartsOption` (chartOption.ts) turns the model into the ECharts option.
 */

export type ChartRow = Record<string, unknown>;

/** What the model needs of an element: the data keys and `api.paths` (the view passes the resolved element). */
export type ChartModelInput = Omit<ChartElement, "api" | "items" | "clickNavigate" | "clickState"> & { api?: { paths?: string[] } };

/** The clicked datum: the source row's fields plus `$`-prefixed derived keys (§2.5). */
export type ChartDatum = Record<string, unknown>;

export type ChartKind = "category" | "pie" | "scatter" | "radar" | "gauge" | "heatmap" | "funnel";

export type ChartPoint = { value: number | null; datum: ChartDatum | null };

export type ChartScatterPoint = { x: number; y: number; size?: number; label?: string; datum: ChartDatum };

export type ChartModelSeries = {
  /** Stable identity: the field (manual) or the group value (pivot); legend toggles key on it. */
  key: string;
  label: string;
  /** Hex, from the palette table. */
  color: string;
  axis: "left" | "right";
  shape: "bar" | "line";
  stack?: string;
  format?: CellFormat;
  /** One entry per category (category types, radar). */
  points: ChartPoint[];
  /** Scatter only. */
  scatter: ChartScatterPoint[];
};

export type ChartSlice = { key: string; label: string; value: number; percent: number; color: string; datum: ChartDatum };

export type ChartHeatCell = { xi: number; yi: number; value: number | null; datum: ChartDatum };

export type ChartModelRefLine = { label: string; value: number; axis: "x" | "y"; color?: string; dashed: boolean };

export type ChartLegendItem = { key: string; label: string; color: string };

export type ChartModel = {
  type: ChartType;
  kind: ChartKind;
  /** Display labels of the x categories / radar indicators, first-seen order. */
  categories: string[];
  series: ChartModelSeries[];
  /** pie / funnel */
  slices: ChartSlice[];
  total: number;
  gauge?: {
    value: number | null;
    min: number;
    max: number;
    bands: { to: number; color: string }[];
    format?: CellFormat;
    datum: ChartDatum | null;
  };
  heatmap?: { xs: string[]; ys: string[]; cells: ChartHeatCell[]; min: number; max: number };
  referenceLines: ChartModelRefLine[];
  legend: { show: boolean; position: "top" | "bottom" | "left" | "right"; items: ChartLegendItem[]; ramp?: { min: string; max: string } };
  empty: boolean;
  rowCount: number;
  xFormat?: CellFormat;
  /** The value format of single-value types (`series[0].format`). */
  valueFormat?: CellFormat;
};

export const DEFAULT_CHART_HEIGHT = "320px";
export const DEFAULT_CHART_EMPTY_TEXT = "No data";
export const OTHER_SERIES_LABEL = "Other";

export const CHART_TYPES: readonly ChartType[] = ["bar", "line", "area", "barLine", "pie", "scatter", "radar", "gauge", "heatmap", "funnel"];

export function chartKind(type: ChartType): ChartKind {
  switch (type) {
    case "pie":
      return "pie";
    case "scatter":
      return "scatter";
    case "radar":
      return "radar";
    case "gauge":
      return "gauge";
    case "heatmap":
      return "heatmap";
    case "funnel":
      return "funnel";
    default:
      return "category";
  }
}

/** Types that draw on a cartesian grid (axes, grid lines, reference lines). */
export function isCartesian(type: ChartType): boolean {
  return type === "bar" || type === "line" || type === "area" || type === "barLine" || type === "scatter";
}

/** Types whose series may come from a `splitBy` pivot. */
export function supportsSplitBy(type: ChartType): boolean {
  return type === "bar" || type === "line" || type === "area" || type === "scatter" || type === "radar";
}

/** Types that read exactly one series (the value field). */
export function singleSeries(type: ChartType): boolean {
  return type === "pie" || type === "gauge" || type === "heatmap" || type === "funnel";
}

/** Types that honour `referenceLines`. */
export function supportsReferenceLines(type: ChartType): boolean {
  return isCartesian(type) || type === "gauge";
}

/** Types that read `x.field` as a category / label. */
export function needsXField(type: ChartType): boolean {
  return type !== "gauge";
}

export function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  return null;
}

/** A string body is `JSON.parse`d (twice when double-encoded); anything else passes through. */
export function parseChartRaw(raw: unknown): unknown {
  let value = raw;
  for (let i = 0; i < 2 && typeof value === "string"; i++) {
    try {
      value = JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

/** The row array under `paths` (`[]` when it isn't one). */
export function chartRows(parsed: unknown, paths: string[] | undefined): ChartRow[] {
  const data = drillPaths(parsed, paths);
  if (!Array.isArray(data)) return [];
  return data.filter((r): r is ChartRow => !!r && typeof r === "object");
}

const field = (row: ChartRow, path: string | undefined): unknown => (path ? get(row, path) : undefined);

const keyOf = (v: unknown): string => (v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));

const displayOf = (v: unknown, format: CellFormat | undefined, locale?: string): string => {
  const text = formatCell(v, format, locale);
  return text !== "" ? text : keyOf(v);
};

type Category = { key: string; raw: unknown; label: string; rows: ChartRow[] };

/**
 * Distinct `x.field` values in first-seen order. A `date` / `datetime` format
 * with a pattern buckets rows whose formatted label is equal (the month of
 * daily rows), so the key is the label then.
 */
function categoriesOf(rows: ChartRow[], xField: string | undefined, xFormat: CellFormat | undefined, locale?: string): Category[] {
  const byKey = new Map<string, Category>();
  const dateBucket = xFormat?.type === "date" || xFormat?.type === "datetime";
  for (const row of rows) {
    const raw = field(row, xField);
    const label = displayOf(raw, xFormat, locale);
    const key = dateBucket ? label : keyOf(raw);
    let c = byKey.get(key);
    if (!c) {
      c = { key, raw, label, rows: [] };
      byKey.set(key, c);
    }
    c.rows.push(row);
  }
  return [...byKey.values()];
}

/** The datum of a category point: the one source row, else the category + derived keys. */
function pointDatum(
  rows: ChartRow[],
  value: number | null,
  seriesLabel: string,
  xField: string | undefined,
  categoryRaw: unknown,
  extra: Record<string, unknown> = {},
): ChartDatum {
  const base: ChartDatum = rows.length === 1 ? { ...rows[0] } : { ...(xField ? { [xField]: categoryRaw } : {}) };
  return { ...base, ...extra, $series: seriesLabel, $value: value };
}

/** Sum the numeric values of `f` over `rows`; `null` when none is numeric (a gap, not 0). */
function sumField(rows: ChartRow[], f: string): number | null {
  let sum: number | null = null;
  for (const r of rows) {
    const n = toNumber(field(r, f));
    if (n !== null) sum = (sum ?? 0) + n;
  }
  return sum;
}

type SeriesSpec = {
  key: string;
  label: string;
  color?: string;
  def: ChartSeriesDef;
  /** Row filter: the group's rows in pivot mode, every row in manual mode. */
  pick: (row: ChartRow) => boolean;
  folded?: boolean;
};

/**
 * Which series to draw: manual (`series[]`, one per entry) or pivot (`splitBy`:
 * one per distinct value of that field, first-seen order so a colour follows
 * its entity across refetches). Past {@link MAX_SERIES} the rest fold into one
 * "Other" series (summed).
 */
function seriesSpecs(element: ChartModelInput, rows: ChartRow[]): SeriesSpec[] {
  const defs = element.series ?? [];
  const specs: SeriesSpec[] = [];
  if (element.splitBy && supportsSplitBy(element.chart) && defs[0]) {
    const splitBy = element.splitBy;
    const seen = new Map<string, unknown>();
    for (const row of rows) {
      const v = field(row, splitBy);
      const k = keyOf(v);
      if (!seen.has(k)) seen.set(k, v);
    }
    const groups = [...seen.entries()];
    const own = groups.slice(0, groups.length > MAX_SERIES ? MAX_SERIES : groups.length);
    for (const [k] of own) specs.push({ key: k, label: k, def: defs[0], pick: (r) => keyOf(field(r, splitBy)) === k });
    if (groups.length > MAX_SERIES) {
      const rest = new Set(groups.slice(MAX_SERIES).map(([k]) => k));
      specs.push({ key: "$other", label: OTHER_SERIES_LABEL, def: defs[0], pick: (r) => rest.has(keyOf(field(r, element.splitBy!))), folded: true });
    }
    return specs;
  }
  const limit = defs.length > MAX_SERIES ? MAX_SERIES : defs.length;
  for (const def of defs.slice(0, limit)) specs.push({ key: def.field, label: def.label || def.field, color: def.color, def, pick: () => true });
  if (defs.length > MAX_SERIES) {
    specs.push({ key: "$other", label: OTHER_SERIES_LABEL, def: { ...defs[limit], field: "$other" }, pick: () => true, folded: true });
  }
  return specs;
}

const makeSeries = (spec: SeriesSpec, index: number): ChartModelSeries => ({
  key: spec.key,
  label: spec.label,
  color: spec.folded ? OTHER_SERIES_COLOR : seriesColor(spec.color, index),
  axis: spec.def.axis === "right" ? "right" : "left",
  shape: spec.def.shape === "line" ? "line" : "bar",
  stack: spec.def.stack,
  format: spec.def.format,
  points: [],
  scatter: [],
});

/** The value of `spec` over `rows` (the folded "Other" series sums every folded field). */
function specValue(spec: SeriesSpec, rows: ChartRow[], foldedFields: string[]): number | null {
  const picked = rows.filter(spec.pick);
  if (!spec.folded) return sumField(picked, spec.def.field);
  if (foldedFields.length === 0) return sumField(picked, spec.def.field);
  let sum: number | null = null;
  for (const f of foldedFields) {
    const n = sumField(picked, f);
    if (n !== null) sum = (sum ?? 0) + n;
  }
  return sum;
}

function categorySeries(element: ChartModelInput, rows: ChartRow[], locale?: string): { categories: Category[]; series: ChartModelSeries[] } {
  const xField = element.x?.field;
  const categories = categoriesOf(rows, xField, element.x?.format, locale);
  const specs = seriesSpecs(element, rows);
  const manual = !(element.splitBy && supportsSplitBy(element.chart));
  const foldedFields = manual ? (element.series ?? []).slice(MAX_SERIES).map((d) => d.field) : [];
  const series = specs.map((spec, i) => {
    const s = makeSeries(spec, i);
    s.points = categories.map((c) => {
      const picked = c.rows.filter(spec.pick);
      const value = specValue(spec, c.rows, foldedFields);
      const extra = element.splitBy && !manual ? { [element.splitBy]: spec.folded ? OTHER_SERIES_LABEL : spec.key } : {};
      const datum = picked.length || value !== null ? pointDatum(picked, value, s.label, xField, c.raw, extra) : null;
      return { value, datum };
    });
    return s;
  });
  return { categories, series };
}

function scatterSeries(element: ChartModelInput, rows: ChartRow[]): ChartModelSeries[] {
  const xField = element.x?.field;
  const sizeField = element.options?.sizeField;
  const labelField = element.options?.labelField;
  const specs = seriesSpecs(element, rows);
  return specs.map((spec, i) => {
    const s = makeSeries(spec, i);
    for (const row of rows) {
      if (!spec.pick(row)) continue;
      const x = toNumber(field(row, xField));
      const y = toNumber(field(row, spec.def.field));
      if (x === null || y === null) continue;
      const size = sizeField ? toNumber(field(row, sizeField)) ?? undefined : undefined;
      const labelRaw = labelField ? field(row, labelField) : undefined;
      const label = labelRaw === undefined || labelRaw === null ? undefined : String(labelRaw);
      s.scatter.push({ x, y, size, label, datum: { ...row, $series: s.label, $x: x, $y: y, $size: size ?? null } });
    }
    return s;
  });
}

function slicesOf(element: ChartModelInput, rows: ChartRow[], locale?: string): ChartSlice[] {
  const xField = element.x?.field;
  const valueField = element.series?.[0]?.field;
  const raw = rows
    .map((row) => ({ row, label: displayOf(field(row, xField), element.x?.format, locale), value: toNumber(field(row, valueField)) }))
    .filter((s): s is { row: ChartRow; label: string; value: number } => s.value !== null);
  // A pyramid is an ascending funnel; a pie keeps the row order.
  const sort =
    element.chart === "funnel" ? (element.options?.funnelShape === "pyramid" ? "asc" : element.options?.sort ?? "desc") : "none";
  if (sort === "asc") raw.sort((a, b) => a.value - b.value);
  else if (sort === "desc") raw.sort((a, b) => b.value - a.value);
  const total = raw.reduce((sum, s) => sum + s.value, 0);
  const fold = element.chart === "pie" && raw.length > MAX_SERIES;
  const own = fold ? raw.slice(0, MAX_SERIES - 1) : raw;
  const slices: ChartSlice[] = own.map((s, i) => ({
    key: `${i}:${s.label}`,
    label: s.label,
    value: s.value,
    percent: total ? (s.value / total) * 100 : 0,
    color: i < CHART_PALETTE.length ? CHART_HUES[CHART_PALETTE[i]] : OTHER_SERIES_COLOR,
    datum: { ...s.row, $value: s.value, $percent: total ? (s.value / total) * 100 : 0 },
  }));
  if (fold) {
    const rest = raw.slice(MAX_SERIES - 1);
    const value = rest.reduce((sum, s) => sum + s.value, 0);
    const percent = total ? (value / total) * 100 : 0;
    slices.push({
      key: "$other",
      label: OTHER_SERIES_LABEL,
      value,
      percent,
      color: OTHER_SERIES_COLOR,
      datum: { ...(xField ? { [xField]: OTHER_SERIES_LABEL } : {}), $value: value, $percent: percent, $folded: rest.length },
    });
  }
  return slices;
}

function gaugeOf(element: ChartModelInput, rows: ChartRow[]): NonNullable<ChartModel["gauge"]> {
  const first = rows[0];
  const def = element.series?.[0];
  const min = element.options?.min ?? 0;
  const max = element.options?.max ?? 100;
  const value = first && def ? toNumber(field(first, def.field)) : null;
  const bands = bandsOf(element.options?.bands, max);
  return {
    value,
    min,
    max,
    bands,
    format: def?.format,
    datum: first ? { ...first, $value: value } : null,
  };
}

/** Gauge bands ordered by `to`; a band without `to` closes at `max`. */
export function bandsOf(bands: ChartGaugeBand[] | undefined, max: number): { to: number; color: string }[] {
  const list = (bands ?? []).map((b, i) => ({ to: b.to ?? max, color: hueHex(b.color) ?? CHART_HUES[CHART_PALETTE[i % CHART_PALETTE.length]] }));
  return list.sort((a, b) => a.to - b.to);
}

function heatmapOf(element: ChartModelInput, rows: ChartRow[], locale?: string): NonNullable<ChartModel["heatmap"]> {
  const xField = element.x?.field;
  const yField = element.y?.field;
  const valueField = element.value?.field;
  const xs = new Map<string, number>();
  const ys = new Map<string, number>();
  const xLabels: string[] = [];
  const yLabels: string[] = [];
  const cells: ChartHeatCell[] = [];
  let min = Infinity;
  let max = -Infinity;
  for (const row of rows) {
    const xRaw = field(row, xField);
    const yRaw = field(row, yField);
    const xk = keyOf(xRaw);
    const yk = keyOf(yRaw);
    if (!xs.has(xk)) {
      xs.set(xk, xLabels.length);
      xLabels.push(displayOf(xRaw, element.x?.format, locale));
    }
    if (!ys.has(yk)) {
      ys.set(yk, yLabels.length);
      yLabels.push(keyOf(yRaw));
    }
    const value = toNumber(field(row, valueField));
    if (value !== null) {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    cells.push({ xi: xs.get(xk)!, yi: ys.get(yk)!, value, datum: { ...row, $x: xRaw, $y: yRaw, $value: value } });
  }
  if (!Number.isFinite(min)) {
    min = 0;
    max = 0;
  }
  return { xs: xLabels, ys: yLabels, cells, min, max };
}

/**
 * Reference lines resolved against the parsed **raw** response: a number as
 * is, a path through lodash `get` (`crossline[0].value`); one that resolves to
 * nothing is dropped.
 */
export function resolveReferenceLines(
  lines: ChartReferenceLine[] | undefined,
  parsed: unknown,
  format: CellFormat | undefined,
  locale?: string,
): ChartModelRefLine[] {
  const out: ChartModelRefLine[] = [];
  for (const line of lines ?? []) {
    const value = typeof line.value === "number" ? line.value : toNumber(get(parsed, line.value.path.join(".")));
    if (value === null) continue;
    out.push({
      label: line.label || formatCell(value, format, locale),
      value,
      axis: line.axis === "x" ? "x" : "y",
      color: hueHex(line.color),
      dashed: !!line.dashed,
    });
  }
  return out;
}

/**
 * Build the model of `element` over `raw` (the API response, or the bound
 * array when the source is page data). `paths` is applied here — the engine
 * fetches the raw response so reference-line paths can read it.
 */
export function buildChartModel(element: ChartModelInput, raw: unknown, locale?: string): ChartModel {
  const parsed = parseChartRaw(raw);
  const rows = chartRows(parsed, element.api?.paths);
  const kind = chartKind(element.chart);
  const position = element.legend?.position ?? "top";
  const legendOn = element.legend?.show !== false;
  const valueFormat = element.series?.[0]?.format;

  const model: ChartModel = {
    type: element.chart,
    kind,
    categories: [],
    series: [],
    slices: [],
    total: 0,
    referenceLines: supportsReferenceLines(element.chart)
      ? resolveReferenceLines(element.referenceLines, parsed, element.yAxis?.format ?? valueFormat, locale)
      : [],
    legend: { show: false, position, items: [] },
    empty: rows.length === 0,
    rowCount: rows.length,
    xFormat: element.x?.format,
    valueFormat,
  };

  switch (kind) {
    case "category":
    case "radar": {
      const { categories, series } = categorySeries(element, rows, locale);
      model.categories = categories.map((c) => c.label);
      model.series = series;
      model.empty = rows.length === 0 || series.every((s) => s.points.every((p) => p.value === null));
      model.legend.items = series.map((s) => ({ key: s.key, label: s.label, color: s.color }));
      model.legend.show = legendOn && series.length > 1;
      break;
    }
    case "scatter": {
      const series = scatterSeries(element, rows);
      model.series = series;
      model.empty = series.every((s) => s.scatter.length === 0);
      model.legend.items = series.map((s) => ({ key: s.key, label: s.label, color: s.color }));
      model.legend.show = legendOn && series.length > 1;
      break;
    }
    case "pie":
    case "funnel": {
      const slices = slicesOf(element, rows, locale);
      model.slices = slices;
      model.total = slices.reduce((sum, s) => sum + s.value, 0);
      model.empty = slices.length === 0;
      model.legend.items = slices.map((s) => ({ key: s.key, label: s.label, color: s.color }));
      model.legend.show = legendOn && slices.length > 1;
      break;
    }
    case "gauge": {
      model.gauge = gaugeOf(element, rows);
      model.empty = model.gauge.value === null;
      break;
    }
    case "heatmap": {
      const hm = heatmapOf(element, rows, locale);
      model.heatmap = hm;
      model.empty = hm.cells.length === 0;
      model.legend.show = legendOn && hm.cells.length > 0;
      model.legend.ramp = {
        min: formatCell(hm.min, element.value ? valueFormat : undefined, locale),
        max: formatCell(hm.max, element.value ? valueFormat : undefined, locale),
      };
      break;
    }
  }
  return model;
}

/** The datum behind an ECharts click (`seriesIndex` / `dataIndex` as ECharts reports them for the option `toEChartsOption` builds). */
export function datumAt(model: ChartModel, seriesIndex: number, dataIndex: number): ChartDatum | null {
  switch (model.kind) {
    case "category":
      return model.series[seriesIndex]?.points[dataIndex]?.datum ?? null;
    case "radar": {
      // One ECharts radar series whose data[] holds one polygon per model series.
      const s = model.series[dataIndex];
      if (!s) return null;
      const values: Record<string, number | null> = {};
      model.categories.forEach((c, i) => (values[c] = s.points[i]?.value ?? null));
      return { $series: s.label, $values: values };
    }
    case "scatter":
      return model.series[seriesIndex]?.scatter[dataIndex]?.datum ?? null;
    case "pie":
    case "funnel":
      return model.slices[dataIndex]?.datum ?? null;
    case "gauge":
      return model.gauge?.datum ?? null;
    case "heatmap":
      return model.heatmap?.cells[dataIndex]?.datum ?? null;
  }
}

/** The sum of a donut's values, for `centerText: "$total"`. */
export function centerTextOf(model: ChartModel, centerText: string | undefined, locale?: string): string | undefined {
  if (!centerText) return undefined;
  if (centerText === "$total") return formatCell(model.total, model.valueFormat ?? { type: "number" }, locale);
  return centerText;
}
