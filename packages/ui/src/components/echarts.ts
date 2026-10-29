/**
 * The one place the library touches ECharts' registry: the eight v1 chart
 * modules, the components they need and the canvas renderer, imported from
 * `echarts/*` so the bundle stays tree-shaken (never `echarts/index`).
 */
import { use, init as echartsInit, type EChartsType, type SetOptionOpts, type ECElementEvent } from "echarts/core";
import { BarChart, LineChart, PieChart, ScatterChart, RadarChart, GaugeChart, HeatmapChart, FunnelChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  MarkLineComponent,
  MarkAreaComponent,
  MarkPointComponent,
  VisualMapComponent,
  RadarComponent,
  GraphicComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

let registered = false;

/** Register the chart types and components once (idempotent). */
export function ensureECharts(): void {
  if (registered) return;
  registered = true;
  use([
    BarChart,
    LineChart,
    PieChart,
    ScatterChart,
    RadarChart,
    GaugeChart,
    HeatmapChart,
    FunnelChart,
    GridComponent,
    TooltipComponent,
    MarkLineComponent,
    MarkAreaComponent,
    MarkPointComponent,
    VisualMapComponent,
    RadarComponent,
    GraphicComponent,
    CanvasRenderer,
  ]);
}

export type { EChartsType, SetOptionOpts, ECElementEvent };

export function initECharts(el: HTMLElement): EChartsType {
  ensureECharts();
  return echartsInit(el, undefined, { renderer: "canvas" });
}
