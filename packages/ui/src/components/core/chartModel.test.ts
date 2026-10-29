import { describe, expect, test } from "bun:test";
import type { ChartElement } from "../@types";
import { buildChartModel, chartRows, datumAt, parseChartRaw, resolveReferenceLines, OTHER_SERIES_LABEL } from "./chartModel";
import { CHART_HUES, OTHER_SERIES_COLOR, seriesColor } from "./chartPalette";
import { bubbleSize, niceCeil } from "./chartOption";

const base = (over: Partial<ChartElement>): ChartElement => ({
  name: "c",
  chart: "bar",
  series: [{ field: "value" }],
  x: { field: "month" },
  ...over,
});

const rows = [
  { month: "Jan", site: "A", value: 10, other: 1 },
  { month: "Feb", site: "A", value: 20, other: 2 },
  { month: "Jan", site: "B", value: 5, other: 3 },
  { month: "Mar", site: "B", value: 7, other: 4 },
];

describe("buildChartModel — category types", () => {
  test("manual series: one per entry, categories first-seen, duplicates summed", () => {
    const m = buildChartModel(base({ series: [{ field: "value", label: "Value" }, { field: "other" }] }), rows);
    expect(m.kind).toBe("category");
    expect(m.categories).toEqual(["Jan", "Feb", "Mar"]);
    expect(m.series.map((s) => s.label)).toEqual(["Value", "other"]);
    expect(m.series[0].points.map((p) => p.value)).toEqual([15, 20, 7]);
    expect(m.series[0].color).toBe(CHART_HUES.blue);
    expect(m.series[1].color).toBe(CHART_HUES.orange);
    expect(m.legend.show).toBe(true);
    // Two rows made Jan: the datum is the category + derived keys, not a row.
    expect(m.series[0].points[0].datum).toEqual({ month: "Jan", $series: "Value", $value: 15 });
    // One row made Feb: the row itself plus the derived keys.
    expect(m.series[0].points[1].datum).toMatchObject({ month: "Feb", site: "A", value: 20, $series: "Value", $value: 20 });
  });

  test("single series hides the legend", () => {
    const m = buildChartModel(base({}), rows);
    expect(m.legend.show).toBe(false);
    expect(m.legend.items).toHaveLength(1);
  });

  test("pivot: one series per distinct splitBy value, first-seen order, gaps as null", () => {
    const m = buildChartModel(base({ splitBy: "site" }), rows);
    expect(m.series.map((s) => s.label)).toEqual(["A", "B"]);
    expect(m.series[0].points.map((p) => p.value)).toEqual([10, 20, null]);
    expect(m.series[1].points.map((p) => p.value)).toEqual([5, null, 7]);
    expect(m.series[1].points[0].datum).toMatchObject({ site: "B", month: "Jan", $series: "B", $value: 5 });
    expect(m.series[0].points[2].datum).toBeNull();
  });

  test("pivot colour follows the entity: a filter that removes a group keeps the survivors' slots", () => {
    const all = buildChartModel(base({ splitBy: "site" }), rows);
    const onlyB = buildChartModel(base({ splitBy: "site" }), rows.filter((r) => r.site === "B"));
    // First-seen order is positional, so B moves to slot 1 — the spec's guarantee is first-seen order, not a sticky slot.
    expect(all.series[1].color).toBe(CHART_HUES.orange);
    expect(onlyB.series[0].color).toBe(CHART_HUES.blue);
  });

  test("more than eight pivot groups fold into Other (summed)", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ month: "Jan", site: `S${i}`, value: i + 1 }));
    const m = buildChartModel(base({ splitBy: "site" }), many);
    expect(m.series).toHaveLength(9);
    expect(m.series[8].label).toBe(OTHER_SERIES_LABEL);
    expect(m.series[8].color).toBe(OTHER_SERIES_COLOR);
    expect(m.series[8].points[0].value).toBe(9 + 10);
  });

  test("more than eight manual series fold the rest into Other", () => {
    const series = Array.from({ length: 10 }, (_, i) => ({ field: `f${i}` }));
    const row: Record<string, unknown> = { month: "Jan" };
    series.forEach((s, i) => (row[s.field] = i + 1));
    const m = buildChartModel(base({ series }), [row]);
    expect(m.series).toHaveLength(9);
    expect(m.series[8].label).toBe(OTHER_SERIES_LABEL);
    expect(m.series[8].points[0].value).toBe(9 + 10);
  });

  test("a date xFormat with a pattern buckets rows by their formatted label", () => {
    const daily = [
      { day: "2026-01-03", value: 1 },
      { day: "2026-01-20", value: 2 },
      { day: "2026-02-01", value: 3 },
    ];
    const m = buildChartModel(base({ x: { field: "day", format: { type: "date", pattern: "MMM" } } }), daily);
    expect(m.categories).toEqual(["Jan", "Feb"]);
    expect(m.series[0].points.map((p) => p.value)).toEqual([3, 3]);
  });

  test("empty rows and all-null series are empty", () => {
    expect(buildChartModel(base({}), []).empty).toBe(true);
    expect(buildChartModel(base({ series: [{ field: "missing" }] }), rows).empty).toBe(true);
    expect(buildChartModel(base({}), rows).empty).toBe(false);
  });
});

describe("buildChartModel — sources", () => {
  test("a string response is parsed and api.paths applied", () => {
    const raw = JSON.stringify({ data: rows, status: 200 });
    const m = buildChartModel(base({ api: { name: "x", paths: ["data"] } }), raw);
    expect(m.rowCount).toBe(4);
    expect(chartRows(parseChartRaw(raw), ["data"])).toHaveLength(4);
    expect(chartRows(parseChartRaw(raw), ["nope"])).toEqual([]);
  });

  test("reference lines: a number as is, a path into the raw response, nothing hides the line", () => {
    const parsed = { data: rows, crossline: [{ value: 12 }], targets: [{ value: "x" }] };
    const lines = resolveReferenceLines(
      [
        { value: 5, label: "Five" },
        { value: { path: ["crossline[0]", "value"] }, color: "amber", dashed: true },
        { value: { path: ["targets[0]", "value"] } },
        { value: { path: ["missing"] } },
      ],
      parsed,
      { type: "number", decimals: 1 },
    );
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ label: "Five", value: 5, axis: "y", dashed: false });
    expect(lines[1]).toMatchObject({ label: "12.0", value: 12, color: CHART_HUES.amber, dashed: true });
  });

  test("reference lines are dropped on types that don't honour them", () => {
    const m = buildChartModel(base({ chart: "pie", referenceLines: [{ value: 1 }] }), rows);
    expect(m.referenceLines).toEqual([]);
  });
});

describe("buildChartModel — other kinds", () => {
  test("pie: slices in row order with percent, legend on", () => {
    const m = buildChartModel(base({ chart: "pie", x: { field: "site" } }), rows.slice(0, 2).map((r, i) => ({ ...r, site: `S${i}` })));
    expect(m.kind).toBe("pie");
    expect(m.slices.map((s) => s.label)).toEqual(["S0", "S1"]);
    expect(m.total).toBe(30);
    expect(m.slices[1].percent).toBeCloseTo(66.67, 1);
    expect(m.slices[1].datum).toMatchObject({ site: "S1", $value: 20 });
    expect(m.legend.show).toBe(true);
  });

  test("funnel: sorted desc by default, asc for a pyramid, none keeps the rows", () => {
    const stages = [
      { stage: "a", value: 5 },
      { stage: "b", value: 20 },
      { stage: "c", value: 10 },
    ];
    const el = base({ chart: "funnel", x: { field: "stage" } });
    expect(buildChartModel(el, stages).slices.map((s) => s.label)).toEqual(["b", "c", "a"]);
    expect(buildChartModel({ ...el, options: { funnelShape: "pyramid" } }, stages).slices.map((s) => s.label)).toEqual(["a", "c", "b"]);
    expect(buildChartModel({ ...el, options: { sort: "none" } }, stages).slices.map((s) => s.label)).toEqual(["a", "b", "c"]);
  });

  test("gauge: first row, bands ordered, blank last band closes at max", () => {
    const m = buildChartModel(
      base({ chart: "gauge", options: { max: 200, bands: [{ color: "red" }, { to: 50, color: "grass" }, { to: 120, color: "amber" }] } }),
      rows,
    );
    expect(m.gauge?.value).toBe(10);
    expect(m.gauge?.max).toBe(200);
    expect(m.gauge?.bands.map((b) => b.to)).toEqual([50, 120, 200]);
    expect(m.gauge?.bands[0].color).toBe(CHART_HUES.grass);
    expect(m.gauge?.datum).toMatchObject({ month: "Jan", $value: 10 });
    expect(buildChartModel(base({ chart: "gauge" }), []).empty).toBe(true);
  });

  test("scatter: numeric x per series, bubble size, pivot supported", () => {
    const pts = [
      { x: 1, y: 2, w: 3, g: "A", n: "p1" },
      { x: "2", y: 4, w: 9, g: "B", n: "p2" },
      { x: "no", y: 4, w: 9, g: "B", n: "p3" },
    ];
    const m = buildChartModel(base({ chart: "scatter", x: { field: "x" }, series: [{ field: "y" }], splitBy: "g", options: { sizeField: "w", labelField: "n" } }), pts);
    expect(m.series.map((s) => s.label)).toEqual(["A", "B"]);
    expect(m.series[1].scatter).toHaveLength(1);
    expect(m.series[1].scatter[0]).toMatchObject({ x: 2, y: 4, size: 9, label: "p2" });
    expect(m.series[1].scatter[0].datum).toMatchObject({ g: "B", $series: "B", $x: 2, $y: 4, $size: 9 });
  });

  test("heatmap: x / y categories first-seen, cells with min / max", () => {
    const cells = [
      { d: "Mon", h: 9, v: 2 },
      { d: "Tue", h: 9, v: 8 },
      { d: "Mon", h: 10, v: 5 },
    ];
    const m = buildChartModel(base({ chart: "heatmap", x: { field: "d" }, y: { field: "h" }, value: { field: "v" } }), cells);
    expect(m.heatmap?.xs).toEqual(["Mon", "Tue"]);
    expect(m.heatmap?.ys).toEqual(["9", "10"]);
    expect(m.heatmap?.min).toBe(2);
    expect(m.heatmap?.max).toBe(8);
    expect(m.heatmap?.cells[2]).toMatchObject({ xi: 0, yi: 1, value: 5 });
    expect(m.legend.ramp).toEqual({ min: "2", max: "8" });
  });

  test("radar: indicators are the categories, one point per series", () => {
    const m = buildChartModel(base({ chart: "radar", splitBy: "site" }), rows);
    expect(m.kind).toBe("radar");
    expect(m.categories).toEqual(["Jan", "Feb", "Mar"]);
    expect(datumAt(m, 0, 1)).toEqual({ $series: "B", $values: { Jan: 5, Feb: null, Mar: 7 } });
  });
});

describe("datumAt", () => {
  test("maps ECharts indices back per kind", () => {
    const cat = buildChartModel(base({ splitBy: "site" }), rows);
    expect(datumAt(cat, 1, 2)).toMatchObject({ $series: "B", $value: 7 });
    expect(datumAt(cat, 5, 0)).toBeNull();
    const pie = buildChartModel(base({ chart: "pie", x: { field: "month" } }), rows.slice(0, 2));
    expect(datumAt(pie, 0, 1)).toMatchObject({ month: "Feb", $value: 20 });
  });
});

describe("palette + option helpers", () => {
  test("seriesColor: own hue, else the slot by position, never cycled", () => {
    expect(seriesColor("teal", 0)).toBe(CHART_HUES.teal);
    expect(seriesColor("", 1)).toBe(CHART_HUES.orange);
    expect(seriesColor(undefined, 7)).toBe(CHART_HUES.red);
    expect(seriesColor("nope", 20)).toBe(CHART_HUES.red);
  });
  test("niceCeil / bubbleSize", () => {
    expect(niceCeil(0)).toBe(1);
    expect(niceCeil(7)).toBe(10);
    expect(niceCeil(42)).toBe(50);
    expect(niceCeil(150)).toBe(200);
    expect(niceCeil(1000)).toBe(1000);
    expect(bubbleSize(undefined, 0, 10)).toBe(10);
    expect(bubbleSize(0, 0, 10)).toBe(8);
    expect(bubbleSize(10, 0, 10)).toBe(40);
    expect(bubbleSize(5, 5, 5)).toBe(24);
  });
});
