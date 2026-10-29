import type { EChartsOption } from "echarts";
import type { ChartAxisDef, ChartElement } from "../@types";
import { formatCell, type CellFormat } from "../../util/format";
import { escapeHtml } from "../../util/template";
import { hueHex } from "./chartPalette";
import { centerTextOf, type ChartModel, type ChartModelRefLine, type ChartModelSeries } from "./chartModel";
import type { ChartThemeTokens } from "./chartTheme";

/**
 * `ChartModel` → ECharts option (see `spec/gummy-chart-spec.md` §5.3). Pure:
 * the only inputs are the model, the element's look keys, the theme tokens
 * and the legend's hidden set. Every series of the model is always emitted
 * (a hidden one with no data) so ECharts' `seriesIndex` / `dataIndex` in a
 * click map straight back to the model. ECharts' own `legend` and `title`
 * are never set — the frame draws them in HTML.
 */

// Loose shapes: ECharts' option union is too wide to type the builder against.
type Obj = Record<string, unknown>;

export type ChartOptionInput = {
  model: ChartModel;
  element: Pick<ChartElement, "chart" | "options" | "xAxis" | "yAxis" | "yAxisRight" | "showDataLabels" | "series">;
  tokens: ChartThemeTokens;
  /** Legend keys toggled off. */
  hidden?: ReadonlySet<string>;
  locale?: string;
};

const fmt = (value: unknown, format: CellFormat | undefined, locale?: string): string => {
  const text = formatCell(value, format, locale);
  return text !== "" ? text : value === null || value === undefined ? "" : String(value);
};

/** `max` rounded up to 1 / 2 / 5 × 10ⁿ (radar indicator ceilings). */
export function niceCeil(max: number): number {
  if (!(max > 0)) return 1;
  const exp = Math.floor(Math.log10(max));
  const base = Math.pow(10, exp);
  const n = max / base;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * base;
}

/** Marker size for a bubble: a sqrt scale over the size field, 8–40 px. */
export function bubbleSize(value: number | undefined, min: number, max: number): number {
  if (value === undefined || !Number.isFinite(value)) return 10;
  if (max <= min) return 24;
  const t = Math.sqrt(Math.max(0, value - min) / (max - min));
  return 8 + t * 32;
}

function tooltipBase(tokens: ChartThemeTokens): Obj {
  return {
    show: true,
    confine: true,
    appendToBody: true,
    backgroundColor: tokens.tooltipBg,
    borderColor: tokens.tooltipBorder,
    borderWidth: 1,
    padding: 8,
    borderRadius: 4,
    extraCssText: `box-shadow: ${tokens.tooltipShadow};`,
    textStyle: { color: tokens.text, fontSize: 12, fontFamily: tokens.fontFamily },
  };
}

const swatch = (color: string) =>
  `<span style="display:inline-block;width:10px;height:10px;border-radius:9999px;background:${color};margin-right:6px;vertical-align:middle"></span>`;

function tooltipRows(rows: { color: string; label: string; value: string }[], tokens: ChartThemeTokens, header?: string): string {
  const head = header ? `<div style="margin-bottom:4px;color:${tokens.textSecondary}">${escapeHtml(header)}</div>` : "";
  const body = rows
    .map(
      (r) =>
        `<tr><td style="padding:1px 8px 1px 0;white-space:nowrap">${swatch(r.color)}${escapeHtml(r.label)}</td><td style="padding:1px 0;text-align:right;font-variant-numeric:tabular-nums">${escapeHtml(r.value)}</td></tr>`,
    )
    .join("");
  return `${head}<table style="border-collapse:collapse">${body}</table>`;
}

function axisOption(
  def: ChartAxisDef | undefined,
  kind: "category" | "value",
  tokens: ChartThemeTokens,
  opts: { categories?: string[]; defaultGrid: boolean; horizontal?: boolean; locale?: string; boundaryGap?: boolean; inverse?: boolean; position?: "left" | "right" },
): Obj {
  const many = (opts.categories?.length ?? 0) > 12;
  const format = def?.format;
  return {
    type: kind,
    ...(opts.categories ? { data: opts.categories } : {}),
    ...(def?.title ? { name: def.title, nameLocation: "middle", nameGap: opts.horizontal ? 36 : kind === "value" ? 44 : 28, nameTextStyle: { color: tokens.textSecondary, fontSize: 12 } } : {}),
    ...(def?.min !== undefined ? { min: def.min } : {}),
    ...(def?.max !== undefined ? { max: def.max } : {}),
    ...(opts.boundaryGap !== undefined ? { boundaryGap: opts.boundaryGap } : {}),
    ...(opts.inverse ? { inverse: true } : {}),
    ...(opts.position ? { position: opts.position } : {}),
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      color: tokens.textSecondary,
      fontSize: 12,
      fontFamily: tokens.fontFamily,
      ...(kind === "value" && format ? { formatter: (v: unknown) => fmt(v, format, opts.locale) } : {}),
      ...(kind === "category" && many && !opts.horizontal ? { rotate: 45, interval: "auto" } : {}),
      ...(kind === "category" ? { hideOverlap: true } : {}),
    },
    splitLine: { show: def?.showGrid ?? opts.defaultGrid, lineStyle: { color: tokens.line, width: 1 } },
  };
}

function gridOption(element: ChartOptionInput["element"], horizontal: boolean, rightAxis: boolean): Obj {
  const xTitle = !!element.xAxis?.title;
  const yTitle = !!element.yAxis?.title;
  // A horizontal bar's end labels sit past the bar: leave them room on the right.
  const labelRoom = horizontal && element.showDataLabels ? 72 : 16;
  return {
    left: (horizontal ? xTitle : yTitle) ? 56 : 12,
    right: rightAxis ? (element.yAxisRight?.title ? 56 : 12) : labelRoom,
    top: 20,
    bottom: (horizontal ? yTitle : xTitle) ? 44 : 12,
    containLabel: true,
  };
}

function markLine(lines: ChartModelRefLine[], tokens: ChartThemeTokens, horizontal: boolean): Obj | undefined {
  if (lines.length === 0) return undefined;
  return {
    silent: true,
    symbol: "none",
    animation: false,
    data: lines.map((l) => {
      // `axis: y` = the line crosses the y axis (a horizontal line on a vertical chart);
      // horizontal orientation swaps which ECharts axis carries the values.
      const onValueAxis = l.axis === "y";
      const key = horizontal ? (onValueAxis ? "xAxis" : "yAxis") : onValueAxis ? "yAxis" : "xAxis";
      return {
        [key]: l.value,
        name: l.label,
        lineStyle: { color: l.color ?? tokens.textSecondary, type: l.dashed ? "dashed" : "solid", width: 1 },
        label: { show: true, formatter: l.label, position: horizontal && onValueAxis ? "insideEndTop" : "insideEndTop", color: tokens.textSecondary, fontSize: 11, fontFamily: tokens.fontFamily },
      };
    }),
  };
}

function lastPointIndex(s: ChartModelSeries): number {
  for (let i = s.points.length - 1; i >= 0; i--) if (s.points[i].value !== null) return i;
  return -1;
}

function categoryOption(input: ChartOptionInput): EChartsOption {
  const { model, element, tokens, locale } = input;
  const hidden = input.hidden ?? new Set<string>();
  const o = element.options ?? {};
  const type = element.chart;
  const horizontal = type === "bar" && o.orientation === "horizontal";
  const mode = o.mode ?? "grouped";
  const rightAxis = type === "barLine" && model.series.some((s) => s.axis === "right");
  const hasBars = type === "bar" || (type === "barLine" && model.series.some((s) => s.shape === "bar"));
  const labelBudget = model.categories.length * model.series.length <= 24;

  const categoryAxis = axisOption(element.xAxis, "category", tokens, { categories: model.categories, defaultGrid: false, horizontal, locale, boundaryGap: hasBars, inverse: horizontal });
  const valueAxis = axisOption(element.yAxis, "value", tokens, { defaultGrid: true, horizontal, locale });
  const valueAxisRight = axisOption(element.yAxisRight, "value", tokens, { defaultGrid: false, horizontal, locale, position: "right" });

  const refLines = markLine(model.referenceLines, tokens, horizontal);
  let refLinesPlaced = false;
  let refLinesRightPlaced = false;

  const series = model.series.map((s) => {
    const isHidden = hidden.has(s.key);
    const data = isHidden ? [] : s.points.map((p) => p.value);
    const shape = type === "bar" ? "bar" : type === "barLine" ? s.shape : "line";
    const stacked = type === "area" ? !!o.stacked : type === "bar" ? mode !== "grouped" : false;
    const stack = type === "bar" ? (mode === "stacked" ? "all" : mode === "stackGroup" ? s.stack || s.key : undefined) : type === "area" && o.stacked ? "all" : undefined;
    const valueFormat = s.format;
    const base: Obj = {
      name: s.label,
      data,
      ...(type === "barLine" && s.axis === "right" ? { yAxisIndex: 1 } : {}),
    };
    let mark: Obj | undefined;
    if (refLines && !isHidden) {
      if (type === "barLine" && s.axis === "right") {
        if (!refLinesRightPlaced && !refLinesPlaced) {
          mark = refLines;
          refLinesRightPlaced = true;
        }
      } else if (!refLinesPlaced) {
        mark = refLines;
        refLinesPlaced = true;
      }
    }
    if (shape === "bar") {
      const radius = stacked ? 0 : horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0];
      return {
        ...base,
        type: "bar",
        ...(stack ? { stack } : {}),
        ...(o.barMaxWidth ? { barMaxWidth: o.barMaxWidth } : {}),
        barGap: "8%",
        barCategoryGap: "32%",
        itemStyle: { color: s.color, borderRadius: radius, borderColor: tokens.surface, borderWidth: stacked ? 1 : 0 },
        emphasis: { itemStyle: { borderColor: tokens.surface, borderWidth: 2 } },
        label: {
          show: !!element.showDataLabels && labelBudget,
          position: stacked ? "inside" : horizontal ? "right" : "top",
          color: stacked ? tokens.surface : tokens.text,
          fontSize: 11,
          fontFamily: tokens.fontFamily,
          formatter: (p: { value: unknown }) => fmt(p.value, valueFormat, locale),
        },
        ...(mark ? { markLine: mark } : {}),
      };
    }
    const last = element.showDataLabels ? lastPointIndex(s) : -1;
    return {
      ...base,
      type: "line",
      ...(stack ? { stack } : {}),
      smooth: !!o.smooth,
      showSymbol: o.showMarkers !== false,
      symbol: o.showMarkers === false ? "none" : "circle",
      symbolSize: 8,
      connectNulls: false,
      lineStyle: { width: 2, color: s.color },
      itemStyle: { color: s.color, borderColor: tokens.surface, borderWidth: 2 },
      emphasis: { itemStyle: { borderColor: tokens.surface, borderWidth: 2 }, scale: 1.4 },
      ...(type === "area" ? { areaStyle: { opacity: 0.18, color: s.color } } : {}),
      label: { show: false },
      ...(last >= 0 && !isHidden
        ? {
            data: data.map((v, i) =>
              i === last
                ? { value: v, label: { show: true, position: horizontal ? "right" : "top", color: tokens.text, fontSize: 11, fontFamily: tokens.fontFamily, formatter: (p: { value: unknown }) => fmt(p.value, valueFormat, locale) } }
                : v,
            ),
          }
        : {}),
      ...(mark ? { markLine: mark } : {}),
    };
  });

  const axisTrigger = type === "line" || type === "area" || type === "barLine" || (type === "bar" && model.series.length >= 2);
  const tooltip = {
    ...tooltipBase(tokens),
    trigger: axisTrigger ? "axis" : "item",
    axisPointer: axisTrigger
      ? { type: hasBars && type === "bar" ? "shadow" : "line", lineStyle: { color: tokens.crosshair, type: "dashed", width: 1 }, shadowStyle: { color: tokens.crosshair, opacity: 0.12 } }
      : undefined,
    formatter: (params: unknown) => {
      const list = (Array.isArray(params) ? params : [params]) as { seriesIndex: number; dataIndex: number; name: string; value: unknown; color: string }[];
      const header = list[0]?.name;
      const rows = list
        .filter((p) => p.value !== null && p.value !== undefined && p.value !== "")
        .map((p) => {
          const s = model.series[p.seriesIndex];
          return { color: s?.color ?? String(p.color), label: s?.label ?? "", value: fmt(p.value, s?.format, locale) };
        });
      return tooltipRows(rows, tokens, header);
    },
  };

  return {
    animationDuration: 400,
    textStyle: { color: tokens.text, fontFamily: tokens.fontFamily },
    grid: gridOption(element, horizontal, rightAxis),
    tooltip,
    xAxis: horizontal ? valueAxis : categoryAxis,
    yAxis: horizontal ? categoryAxis : rightAxis ? [valueAxis, valueAxisRight] : valueAxis,
    series,
  } as EChartsOption;
}

function scatterOption(input: ChartOptionInput): EChartsOption {
  const { model, element, tokens, locale } = input;
  const hidden = input.hidden ?? new Set<string>();
  const o = element.options ?? {};
  const sizes = model.series.flatMap((s) => s.scatter.map((p) => p.size)).filter((v): v is number => v !== undefined);
  const sizeMin = sizes.length ? Math.min(...sizes) : 0;
  const sizeMax = sizes.length ? Math.max(...sizes) : 0;
  const refLines = markLine(model.referenceLines, tokens, false);
  let placed = false;
  const series = model.series.map((s) => {
    const isHidden = hidden.has(s.key);
    const mark = refLines && !isHidden && !placed ? ((placed = true), refLines) : undefined;
    return {
      type: "scatter",
      name: s.label,
      data: isHidden ? [] : s.scatter.map((p) => [p.x, p.y, p.size ?? null, p.label ?? ""]),
      symbolSize: o.sizeField ? (v: unknown[]) => bubbleSize(typeof v[2] === "number" ? v[2] : undefined, sizeMin, sizeMax) : 10,
      itemStyle: { color: s.color, borderColor: tokens.surface, borderWidth: 2, opacity: 0.9 },
      emphasis: { itemStyle: { borderColor: tokens.surface, borderWidth: 2 }, scale: 1.3 },
      ...(o.labelField
        ? { label: { show: true, position: "top", color: tokens.text, fontSize: 11, fontFamily: tokens.fontFamily, formatter: (p: { value: unknown[] }) => String(p.value[3] ?? "") } }
        : {}),
      ...(mark ? { markLine: mark } : {}),
    };
  });
  const tooltip = {
    ...tooltipBase(tokens),
    trigger: "item",
    formatter: (p: { seriesIndex: number; dataIndex: number; value: unknown[] }) => {
      const s = model.series[p.seriesIndex];
      const point = s?.scatter[p.dataIndex];
      const rows = [
        { color: s?.color ?? tokens.text, label: element.xAxis?.title || "x", value: fmt(point?.x, element.xAxis?.format, locale) },
        { color: s?.color ?? tokens.text, label: s?.label ?? "y", value: fmt(point?.y, s?.format, locale) },
        ...(point?.size !== undefined ? [{ color: s?.color ?? tokens.text, label: o.sizeField ?? "size", value: fmt(point.size, undefined, locale) }] : []),
      ];
      return tooltipRows(rows, tokens, point?.label);
    },
  };
  return {
    animationDuration: 400,
    textStyle: { color: tokens.text, fontFamily: tokens.fontFamily },
    grid: gridOption(element, false, false),
    tooltip,
    xAxis: axisOption(element.xAxis, "value", tokens, { defaultGrid: false, locale }),
    yAxis: axisOption(element.yAxis, "value", tokens, { defaultGrid: true, locale }),
    series,
  } as EChartsOption;
}

function pieOption(input: ChartOptionInput): EChartsOption {
  const { model, element, tokens, locale } = input;
  const hidden = input.hidden ?? new Set<string>();
  const o = element.options ?? {};
  const position = o.labelPosition ?? "outside";
  const format = model.valueFormat;
  const center = centerTextOf(model, o.centerText, locale);
  const data = model.slices.map((s) => {
    const isHidden = hidden.has(s.key);
    return {
      name: s.label,
      value: isHidden ? 0 : s.value,
      itemStyle: { color: s.color, borderColor: tokens.surface, borderWidth: 2 },
      ...(isHidden ? { label: { show: false }, labelLine: { show: false } } : {}),
    };
  });
  const labelFormatter = (p: { name: string; percent: number; value: number }) =>
    position === "inside" ? `${Math.round(p.percent)}%` : element.showDataLabels ? `${p.name}  ${fmt(p.value, format, locale)}` : p.name;
  return {
    animationDuration: 400,
    textStyle: { color: tokens.text, fontFamily: tokens.fontFamily },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "item",
      formatter: (p: { dataIndex: number }) => {
        const s = model.slices[p.dataIndex];
        return s ? tooltipRows([{ color: s.color, label: s.label, value: `${fmt(s.value, format, locale)} · ${s.percent.toFixed(1)}%` }], tokens) : "";
      },
    },
    ...(center && o.innerRadius
      ? { graphic: [{ type: "text", left: "center", top: "center", silent: true, style: { text: center, fill: tokens.text, fontSize: 18, fontWeight: 600, fontFamily: tokens.fontFamily, textAlign: "center" } }] }
      : {}),
    series: [
      {
        type: "pie",
        radius: [o.innerRadius || 0, "72%"],
        center: ["50%", "50%"],
        avoidLabelOverlap: true,
        minShowLabelAngle: 8,
        data,
        label:
          position === "none"
            ? { show: false }
            : { show: true, position, color: position === "inside" ? tokens.surface : tokens.text, fontSize: 11, fontFamily: tokens.fontFamily, formatter: labelFormatter },
        labelLine: { show: position === "outside", lineStyle: { color: tokens.line } },
        emphasis: { scale: true, scaleSize: 4, itemStyle: { borderColor: tokens.surface, borderWidth: 2 } },
      },
    ],
  } as EChartsOption;
}

function radarOption(input: ChartOptionInput): EChartsOption {
  const { model, element, tokens, locale } = input;
  const hidden = input.hidden ?? new Set<string>();
  const o = element.options ?? {};
  const indicator = model.categories.map((name, i) => {
    const max = o.radarMax ?? niceCeil(Math.max(0, ...model.series.map((s) => s.points[i]?.value ?? 0)));
    return { name, max };
  });
  const data = model.series.map((s) => {
    const isHidden = hidden.has(s.key);
    return {
      name: s.label,
      value: isHidden ? model.categories.map(() => null) : s.points.map((p) => p.value ?? 0),
      itemStyle: { color: s.color, borderColor: tokens.surface, borderWidth: 2 },
      lineStyle: { width: 2, color: s.color },
      areaStyle: { opacity: 0.12, color: s.color },
      symbolSize: 6,
      label: { show: false },
    };
  });
  return {
    animationDuration: 400,
    textStyle: { color: tokens.text, fontFamily: tokens.fontFamily },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "item",
      formatter: (p: { dataIndex: number }) => {
        const s = model.series[p.dataIndex];
        if (!s) return "";
        return tooltipRows(
          model.categories.map((c, i) => ({ color: s.color, label: c, value: fmt(s.points[i]?.value, s.format, locale) })),
          tokens,
          s.label,
        );
      },
    },
    radar: {
      indicator: indicator.length ? indicator : [{ name: "", max: 1 }],
      shape: o.radarShape ?? "polygon",
      radius: "58%",
      ...(element.xAxis?.title ? { nameGap: 10 } : {}),
      axisName: { color: tokens.textSecondary, fontSize: 12, fontFamily: tokens.fontFamily },
      splitLine: { lineStyle: { color: tokens.line, width: 1 } },
      axisLine: { lineStyle: { color: tokens.line, width: 1 } },
      splitArea: { show: false },
    },
    series: [{ type: "radar", data, emphasis: { lineStyle: { width: 3 } } }],
  } as EChartsOption;
}

function gaugeOption(input: ChartOptionInput): EChartsOption {
  const { model, element, tokens, locale } = input;
  const g = model.gauge!;
  const o = element.options ?? {};
  const progress = hueHex(element.series?.[0]?.color) ?? tokens.accent;
  const span = g.max - g.min || 1;
  const format = g.format;
  const value = g.value ?? g.min;
  if ((o.gaugeShape ?? "radial") === "linear") {
    let prev = g.min;
    const areas = g.bands.map((b) => {
      const a = [{ xAxis: prev, itemStyle: { color: b.color, opacity: 0.25 } }, { xAxis: Math.min(b.to, g.max) }];
      prev = b.to;
      return a;
    });
    return {
      animationDuration: 400,
      textStyle: { color: tokens.text, fontFamily: tokens.fontFamily },
      tooltip: { show: false },
      grid: { left: 12, right: 12, top: 28, bottom: 28, containLabel: true },
      xAxis: { type: "value", min: g.min, max: g.max, axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { color: tokens.textSecondary, fontSize: 11, formatter: (v: unknown) => fmt(v, format, locale) } },
      yAxis: { type: "category", data: [""], show: false },
      series: [
        {
          type: "bar",
          data: [value],
          barWidth: 18,
          itemStyle: { color: progress, borderRadius: 9 },
          showBackground: true,
          backgroundStyle: { color: tokens.line, borderRadius: 9 },
          label: { show: true, position: "right", color: tokens.text, fontSize: 14, fontWeight: 600, fontFamily: tokens.fontFamily, formatter: (p: { value: unknown }) => fmt(p.value, format, locale) },
          ...(areas.length ? { markArea: { silent: true, data: areas } } : {}),
          ...(model.referenceLines.length
            ? {
                markLine: {
                  silent: true,
                  symbol: ["none", "triangle"],
                  symbolSize: 8,
                  animation: false,
                  data: model.referenceLines.map((l) => ({
                    xAxis: l.value,
                    name: l.label,
                    lineStyle: { color: l.color ?? tokens.textSecondary, type: l.dashed ? "dashed" : "solid", width: 1 },
                    label: { show: true, formatter: l.label, position: "end", color: tokens.textSecondary, fontSize: 11, fontFamily: tokens.fontFamily },
                  })),
                },
              }
            : {}),
        },
      ],
    } as EChartsOption;
  }
  const common = { type: "gauge", min: g.min, max: g.max, startAngle: 210, endAngle: -30, radius: "92%", center: ["50%", "62%"] };
  const bandColors: [number, string][] = g.bands.length
    ? [...g.bands.map((b): [number, string] => [Math.min(1, (b.to - g.min) / span), b.color]), ...(g.bands[g.bands.length - 1].to < g.max ? [[1, tokens.line] as [number, string]] : [])]
    : [[1, tokens.line]];
  const targets = model.referenceLines.map((l, i) => ({
    ...common,
    axisLine: { show: false },
    progress: { show: false },
    splitLine: { show: false },
    axisTick: { show: false },
    axisLabel: { show: false },
    pointer: { show: true, icon: "triangle", length: 10, width: 8, offsetCenter: [0, "-86%"], itemStyle: { color: l.color ?? tokens.textSecondary } },
    anchor: { show: false },
    title: { show: true, offsetCenter: [0, `${34 + i * 16}%`], fontSize: 11, color: tokens.textSecondary, fontFamily: tokens.fontFamily },
    detail: { show: false },
    silent: true,
    animation: false,
    data: [{ value: l.value, name: l.label }],
  }));
  return {
    animationDuration: 400,
    textStyle: { color: tokens.text, fontFamily: tokens.fontFamily },
    tooltip: { show: false },
    series: [
      {
        ...common,
        progress: { show: true, width: 14, roundCap: true, itemStyle: { color: progress } },
        axisLine: { roundCap: true, lineStyle: { width: 14, color: bandColors } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: false },
        anchor: { show: false },
        title: { show: false },
        detail: { valueAnimation: true, offsetCenter: [0, "-6%"], fontSize: 24, fontWeight: 600, color: tokens.text, fontFamily: tokens.fontFamily, formatter: (v: unknown) => fmt(v, format, locale) },
        data: [{ value }],
      },
      ...targets,
    ],
  } as EChartsOption;
}

function heatmapOption(input: ChartOptionInput): EChartsOption {
  const { model, element, tokens, locale } = input;
  const hm = model.heatmap!;
  const o = element.options ?? {};
  const format = model.valueFormat;
  return {
    animationDuration: 400,
    textStyle: { color: tokens.text, fontFamily: tokens.fontFamily },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "item",
      formatter: (p: { dataIndex: number }) => {
        const c = hm.cells[p.dataIndex];
        if (!c) return "";
        return tooltipRows([{ color: tokens.accent, label: `${hm.xs[c.xi]} · ${hm.ys[c.yi]}`, value: fmt(c.value, format, locale) }], tokens);
      },
    },
    grid: { left: element.yAxis?.title ? 56 : 12, right: 12, top: 12, bottom: element.xAxis?.title ? 44 : 12, containLabel: true },
    xAxis: { ...axisOption(element.xAxis, "category", tokens, { categories: hm.xs, defaultGrid: false, locale }), splitArea: { show: false } },
    yAxis: { ...axisOption(element.yAxis, "category", tokens, { categories: hm.ys, defaultGrid: false, locale, inverse: true }), splitArea: { show: false } },
    visualMap: {
      show: false,
      min: hm.min,
      max: hm.max === hm.min ? hm.min + 1 : hm.max,
      calculable: false,
      inRange: { color: tokens.ramp.length ? tokens.ramp : [tokens.line, tokens.accent] },
    },
    series: [
      {
        type: "heatmap",
        data: hm.cells.map((c) => [c.xi, c.yi, c.value]),
        label: { show: !!o.showValues, color: tokens.text, fontSize: 11, fontFamily: tokens.fontFamily, formatter: (p: { value: unknown[] }) => fmt(p.value[2], format, locale) },
        itemStyle: { borderColor: tokens.surface, borderWidth: 2 },
        emphasis: { itemStyle: { borderColor: tokens.surface, borderWidth: 2, shadowBlur: 0 } },
      },
    ],
  } as EChartsOption;
}

function funnelOption(input: ChartOptionInput): EChartsOption {
  const { model, element, tokens, locale } = input;
  const hidden = input.hidden ?? new Set<string>();
  const o = element.options ?? {};
  const horizontal = o.orientation === "horizontal";
  const position = o.labelPosition ?? "outside";
  const format = model.valueFormat;
  const data = model.slices.map((s) => {
    const isHidden = hidden.has(s.key);
    return { name: s.label, value: isHidden ? 0 : s.value, itemStyle: { color: s.color, borderColor: tokens.surface, borderWidth: 2 }, ...(isHidden ? { label: { show: false } } : {}) };
  });
  return {
    animationDuration: 400,
    textStyle: { color: tokens.text, fontFamily: tokens.fontFamily },
    tooltip: {
      ...tooltipBase(tokens),
      trigger: "item",
      formatter: (p: { dataIndex: number }) => {
        const s = model.slices[p.dataIndex];
        return s ? tooltipRows([{ color: s.color, label: s.label, value: `${fmt(s.value, format, locale)} · ${s.percent.toFixed(1)}%` }], tokens) : "";
      },
    },
    series: [
      {
        type: "funnel",
        // The model already ordered the slices (`sort`, pyramid = ascending).
        sort: "none",
        funnelAlign: "center",
        orient: horizontal ? "horizontal" : "vertical",
        left: position === "outside" && !horizontal ? "6%" : "4%",
        width: position === "outside" && !horizontal ? "70%" : "92%",
        top: 8,
        bottom: 8,
        gap: 2,
        minSize: o.funnelShape === "pyramid" ? "0%" : "8%",
        data,
        label:
          position === "none"
            ? { show: false }
            : {
                show: true,
                position: position === "inside" ? "inside" : horizontal ? "top" : "right",
                color: position === "inside" ? tokens.surface : tokens.text,
                fontSize: 11,
                fontFamily: tokens.fontFamily,
                formatter: (p: { name: string; value: number }) => (element.showDataLabels ? `${p.name}  ${fmt(p.value, format, locale)}` : p.name),
              },
        labelLine: { show: position === "outside", lineStyle: { color: tokens.line } },
        emphasis: { itemStyle: { borderColor: tokens.surface, borderWidth: 2 } },
      },
    ],
  } as EChartsOption;
}

/** The ECharts option for a model (see the module comment). */
export function toEChartsOption(input: ChartOptionInput): EChartsOption {
  switch (input.model.kind) {
    case "category":
      return categoryOption(input);
    case "scatter":
      return scatterOption(input);
    case "pie":
      return pieOption(input);
    case "radar":
      return radarOption(input);
    case "gauge":
      return gaugeOption(input);
    case "heatmap":
      return heatmapOption(input);
    case "funnel":
      return funnelOption(input);
  }
}
