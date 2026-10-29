import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { EChartsOption } from "echarts";
import type { ChartElement, ChartProps } from "./@types";
import { ButtonBase } from "./Button";
import { useTheme } from "./context/ThemeProvider";
import {
  buildChartModel,
  datumAt,
  DEFAULT_CHART_EMPTY_TEXT,
  DEFAULT_CHART_HEIGHT,
  isCartesian,
  type ChartDatum,
  type ChartModel,
  type ChartModelInput,
} from "./core/chartModel";
import { toEChartsOption } from "./core/chartOption";
import { readChartTheme, type ChartThemeTokens } from "./core/chartTheme";
import { useLocale } from "./core/locale";
import { useNavigateTo } from "./core/pages";
import { useDataValue, useSkeleton } from "./core/rowScope";
import { getStateStore } from "./core/stateStore";
import { useReadApi } from "./core/useReadApi";
import { initECharts, type EChartsType, type ECElementEvent } from "./echarts";
import { formatCell } from "../util/format";

/**
 * The `chart` element (see `spec/gummy-chart-spec.md`): `Chart` fetches
 * (`api`, like a repeater's read, the **raw** response so reference-line
 * paths can read it) or binds (`items`), publishes the clicked datum and
 * navigates; `ChartView` is the hook-light frame — header, HTML legend, the
 * ECharts canvas, footnote, the loading / empty / error states — that the
 * studio canvas also renders over sample rows.
 */

export type ChartPoint = { seriesIndex: number; dataIndex: number };

export type ChartViewStatus = "loading" | "held" | "error" | "ready";

export type ChartViewElement = ChartModelInput;

export type ChartViewProps = {
  element: ChartViewElement;
  /** The API response (or the bound array). */
  raw: unknown;
  status: ChartViewStatus;
  /** A refetch while the current chart stays up (the header spinner). */
  refreshing?: boolean;
  error?: unknown;
  onRetry?: () => void;
  /** A mark was clicked (`null` datum = the empty plot area). */
  onDatumClick?: (datum: ChartDatum | null, point: ChartPoint | null) => void;
  /** The emphasised mark. */
  selected?: ChartPoint | null;
  /** Drawn at the frame's top-right (the studio's "Sample data" pill). */
  badge?: ReactNode;
  className?: string;
  locale?: string;
};

/** Below this frame width (px) a left / right legend is drawn as a row instead. */
const COMPACT_WIDTH = 420;

const REPLACE_MERGE = ["series", "xAxis", "yAxis", "grid", "visualMap", "radar", "graphic"] as const;

/** The ECharts instance on a sized div: resize by `ResizeObserver`, one click handler, emphasis on `selected`. */
function EChartsCanvas({
  option,
  resetKey,
  selected,
  onPointClick,
  onEmptyClick,
}: {
  option: EChartsOption;
  /** A change clears the instance before the next `setOption` (a type switch). */
  resetKey: string;
  selected?: ChartPoint | null;
  onPointClick?: (e: ECElementEvent) => void;
  onEmptyClick?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const pointRef = useRef(onPointClick);
  const emptyRef = useRef(onEmptyClick);
  pointRef.current = onPointClick;
  emptyRef.current = onEmptyClick;
  const lastReset = useRef(resetKey);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const chart = initECharts(el);
    chartRef.current = chart;
    chart.on("click", (e) => pointRef.current?.(e as ECElementEvent));
    chart.getZr().on("click", (e: { target?: unknown }) => {
      if (!e.target) emptyRef.current?.();
    });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => chart.resize()) : null;
    ro?.observe(el);
    return () => {
      ro?.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (lastReset.current !== resetKey) {
      chart.clear();
      lastReset.current = resetKey;
    }
    chart.setOption(option, { notMerge: false, lazyUpdate: false, replaceMerge: [...REPLACE_MERGE] });
  }, [option, resetKey]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.dispatchAction({ type: "downplay" });
    if (selected) chart.dispatchAction({ type: "highlight", seriesIndex: selected.seriesIndex, dataIndex: selected.dataIndex });
  }, [selected, option]);

  return <div ref={ref} className="absolute inset-0" aria-hidden />;
}

function LegendPills({
  model,
  hidden,
  onToggle,
  vertical,
  ramp,
}: {
  model: ChartModel;
  hidden: ReadonlySet<string>;
  onToggle: (key: string) => void;
  vertical: boolean;
  /** The resolved heatmap ramp (steps 3 → 11), for the swatch. */
  ramp: string[];
}) {
  if (model.kind === "heatmap" && model.legend.ramp) {
    const stops = ramp.length ? ramp : ["var(--accent-3)", "var(--accent-11)"];
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--gray-11)]">
        <span>{model.legend.ramp.min}</span>
        <span className="h-2.5 w-10 rounded-full" style={{ background: `linear-gradient(90deg, ${stops.join(", ")})` }} aria-hidden />
        <span>{model.legend.ramp.max}</span>
      </div>
    );
  }
  return (
    <div className={`flex ${vertical ? "flex-col items-start" : "flex-row flex-wrap items-center"} gap-1`} role="group" aria-label="Legend">
      {model.legend.items.map((item) => {
        const off = hidden.has(item.key);
        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={!off}
            title={item.label}
            onClick={() => onToggle(item.key)}
            className={`inline-flex max-w-[160px] items-center gap-2 rounded px-2 py-1 text-xs text-[var(--gray-11)] hover:bg-[var(--gray-a3)] ${off ? "opacity-40 line-through" : ""}`}
          >
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ChartSkeleton({ cartesian }: { cartesian: boolean }) {
  if (!cartesian) return <div className="h-full w-full animate-pulse rounded bg-[var(--gray-a3)]" aria-hidden />;
  const heights = ["55%", "80%", "40%", "70%", "60%"];
  return (
    <div className="flex h-full w-full items-end gap-3 px-4 pb-2" aria-hidden>
      {heights.map((h, i) => (
        <div key={i} className="flex-1 animate-pulse rounded-t bg-[var(--gray-a3)]" style={{ height: h }} />
      ))}
    </div>
  );
}

/** The visually-hidden data table: series × categories (or slices / cells) with formatted values. */
function SrTable({ model, locale }: { model: ChartModel; locale?: string }) {
  if (model.kind === "gauge") {
    return (
      <table className="sr-only">
        <tbody>
          <tr>
            <th scope="row">Value</th>
            <td>{formatCell(model.gauge?.value, model.gauge?.format, locale)}</td>
          </tr>
        </tbody>
      </table>
    );
  }
  if (model.kind === "pie" || model.kind === "funnel") {
    return (
      <table className="sr-only">
        <tbody>
          {model.slices.map((s) => (
            <tr key={s.key}>
              <th scope="row">{s.label}</th>
              <td>{formatCell(s.value, model.valueFormat, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (model.kind === "heatmap" && model.heatmap) {
    const hm = model.heatmap;
    return (
      <table className="sr-only">
        <thead>
          <tr>
            <th />
            {hm.xs.map((x) => (
              <th key={x} scope="col">{x}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hm.ys.map((y, yi) => (
            <tr key={y}>
              <th scope="row">{y}</th>
              {hm.xs.map((_, xi) => {
                const cell = hm.cells.find((c) => c.xi === xi && c.yi === yi);
                return <td key={xi}>{formatCell(cell?.value, model.valueFormat, locale)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (model.kind === "scatter") {
    return (
      <table className="sr-only">
        <tbody>
          {model.series.flatMap((s) =>
            s.scatter.map((p, i) => (
              <tr key={`${s.key}-${i}`}>
                <th scope="row">{s.label}</th>
                <td>{p.x}</td>
                <td>{formatCell(p.y, s.format, locale)}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    );
  }
  return (
    <table className="sr-only">
      <thead>
        <tr>
          <th />
          {model.categories.map((c, i) => (
            <th key={`${c}-${i}`} scope="col">{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {model.series.map((s) => (
          <tr key={s.key}>
            <th scope="row">{s.label}</th>
            {s.points.map((p, i) => (
              <td key={i}>{formatCell(p.value, s.format, locale)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ChartView({ element, raw, status, refreshing, error, onRetry, onDatumClick, selected, badge, className, locale: localeProp }: ChartViewProps) {
  const appLocale = useLocale();
  const locale = localeProp ?? appLocale;
  const theme = useTheme();
  const frameRef = useRef<HTMLElement>(null);
  const [tokens, setTokens] = useState<ChartThemeTokens | null>(null);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
  // A left / right legend needs room: below this frame width it drops to a row.
  const [compact, setCompact] = useState(false);
  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => setCompact(el.clientWidth < COMPACT_WIDTH);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const glass = theme.surface === "glass";
  const hue = element.options?.hue;
  const accent = theme.theme?.accentColor;

  // Theme bridge: re-read the Radix variables when the appearance, surface or accent changes.
  useLayoutEffect(() => {
    if (frameRef.current) setTokens(readChartTheme(frameRef.current, { glass, hue }));
  }, [theme.appearance, glass, accent, hue]);

  const model = useMemo(() => buildChartModel(element, raw, locale), [element, raw, locale]);
  const option = useMemo(() => (tokens ? toEChartsOption({ model, element, tokens, hidden, locale }) : null), [model, element, tokens, hidden, locale]);

  useEffect(() => {
    if (model.kind === "scatter" && model.series.length > 3) {
      console.warn(`[gummy-ui] Chart "${element.name}": ${model.series.length} scatter series — the palette is validated for every pair only up to 3.`);
    }
  }, [model, element.name]);

  const toggle = useCallback((key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const onPointClick = useCallback(
    (e: ECElementEvent) => {
      if (!onDatumClick) return;
      const seriesIndex = e.seriesIndex ?? 0;
      const dataIndex = e.dataIndex ?? 0;
      onDatumClick(datumAt(model, seriesIndex, dataIndex), { seriesIndex, dataIndex });
    },
    [model, onDatumClick],
  );
  const onEmptyClick = useCallback(() => onDatumClick?.(null, null), [onDatumClick]);

  const height = element.height || DEFAULT_CHART_HEIGHT;
  const hasHeader = !!(element.title || element.subtitle);
  const position = model.legend.position;
  const legendVertical = (position === "left" || position === "right") && !compact;
  const showLegend = status === "ready" && !model.empty && model.legend.show;
  const cartesian = isCartesian(element.chart);
  const message =
    status === "held" ? "Waiting for filters" : status === "ready" && model.empty ? element.emptyText || DEFAULT_CHART_EMPTY_TEXT : null;

  const legend = showLegend ? <LegendPills model={model} hidden={hidden} onToggle={toggle} vertical={legendVertical} ramp={tokens?.ramp ?? []} /> : null;

  // No `flex-1` here: in the column layout a zero flex-basis would beat the explicit height.
  const plot = (
    <div className="relative w-full min-w-0" style={{ height }}>
      {status === "loading" && <ChartSkeleton cartesian={cartesian} />}
      {status === "error" && (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-[var(--gray-11)]">
          <span>Couldn't load chart</span>
          {onRetry && <ButtonBase label="Retry" variant="text" onClick={onRetry} />}
        </div>
      )}
      {message && <div className="flex h-full items-center justify-center text-sm text-[var(--gray-11)]">{message}</div>}
      {status === "ready" && !model.empty && option && (
        <EChartsCanvas option={option} resetKey={element.chart} selected={selected} onPointClick={onPointClick} onEmptyClick={onEmptyClick} />
      )}
    </div>
  );

  return (
    <figure
      ref={frameRef}
      role="figure"
      aria-label={element.title || element.name}
      data-chart={element.name}
      data-chart-type={element.chart}
      className={`gummy-surface gummy-chart relative flex w-full flex-col gap-3 rounded-[var(--radius-3)] border border-[var(--gray-a5)] p-4 ${className ?? ""}`}
    >
      {badge}
      {(hasHeader || refreshing) && (
        <div className={`flex min-h-10 items-start justify-between gap-3 ${badge ? "pr-24" : ""}`}>
          <div className="min-w-0">
            {element.title && <div className="truncate text-sm font-semibold text-[var(--gray-12)]">{element.title}</div>}
            {element.subtitle && <div className="text-xs text-[var(--gray-11)]">{element.subtitle}</div>}
          </div>
          {refreshing && <Loader2 size={14} className="mt-1 shrink-0 animate-spin text-[var(--gray-11)]" aria-label="Refreshing" />}
        </div>
      )}
      {(position === "top" || (compact && position === "left")) && legend}
      {legendVertical ? (
        <div className={`flex gap-4 ${position === "left" ? "flex-row" : "flex-row-reverse"}`}>
          {legend && <div className="max-w-[40%] shrink-0">{legend}</div>}
          <div className="min-w-0 flex-1">{plot}</div>
        </div>
      ) : (
        plot
      )}
      {(position === "bottom" || (compact && position === "right")) && legend}
      {element.footnote && <figcaption className="text-xs text-[var(--gray-11)]">{element.footnote}</figcaption>}
      {status === "ready" && !model.empty && <SrTable model={model} locale={locale} />}
    </figure>
  );
}

/** The engine element: fetch / bind, publish the clicked datum, navigate. */
export function Chart(props: ChartProps) {
  const { api, items, clickNavigate, clickState, ...rest } = props;
  // The hook drills `paths` itself; the model needs the raw response for reference-line paths.
  const readApi = useMemo(() => (api ? { ...api, paths: undefined } : undefined), [api]);
  const { data, isLoading, isFetching, error, held, refetch } = useReadApi(props.name, readApi);
  const bound = useDataValue(api ? undefined : items);
  const boundPending = useSkeleton(api ? undefined : items);
  const navigateTo = useNavigateTo();

  const raw = api ? data : bound;
  const status: ChartViewStatus = api
    ? held
      ? "held"
      : error
        ? "error"
        : isLoading
          ? "loading"
          : "ready"
    : boundPending
      ? "loading"
      : "ready";

  const stateKey = clickState?.stateKey || `${props.name}Selected`;
  const [selected, setSelected] = useState<ChartPoint | null>(null);
  const publish = useCallback(
    (datum: ChartDatum | null) => {
      if (clickState) getStateStore(stateKey).getState().setLoad({ data: datum, status: "success" });
    },
    [clickState, stateKey],
  );
  // A refetch (new data) clears the selection.
  useEffect(() => {
    setSelected(null);
    publish(null);
  }, [raw, publish]);
  useEffect(() => () => {
    if (clickState) getStateStore(stateKey).getState().clear();
  }, [clickState, stateKey]);

  const onDatumClick = useCallback(
    (datum: ChartDatum | null, point: ChartPoint | null) => {
      if (!datum || !point) {
        setSelected(null);
        publish(null);
        return;
      }
      const same = selected && selected.seriesIndex === point.seriesIndex && selected.dataIndex === point.dataIndex;
      setSelected(same ? null : point);
      publish(same ? null : datum);
      if (clickNavigate && !same) navigateTo(clickNavigate, { row: datum });
    },
    [selected, publish, clickNavigate, navigateTo],
  );

  const element = useMemo<ChartViewElement>(() => ({ ...rest, api: api ? { paths: api.paths } : undefined }), [rest, api]);

  return (
    <ChartView
      element={element}
      raw={raw}
      status={status}
      refreshing={!!api && isFetching && !isLoading}
      error={error}
      onRetry={() => void refetch()}
      onDatumClick={clickState || clickNavigate ? onDatumClick : undefined}
      selected={selected}
    />
  );
}

export type { ChartElement };
