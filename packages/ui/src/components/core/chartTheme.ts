/**
 * The Radix → ECharts theme bridge (see `spec/gummy-chart-spec.md` §6.2).
 * Canvas drawing can't read CSS variables, so the frame reads them once per
 * appearance / surface / accent change through `getComputedStyle` and hands
 * the resolved colours to `toEChartsOption`. Radix may define a variable in
 * `color(display-p3 …)` on wide-gamut displays, which zrender can't parse, so
 * every value is normalised to `rgba()` through a 1×1 canvas.
 */
export type ChartThemeTokens = {
  /** `--gray-12`: labels, the donut centre text. */
  text: string;
  /** `--gray-11`: tick labels, axis names, reference-line default. */
  textSecondary: string;
  /** `--gray-5` (`--gray-a5` on glass): grid / axis lines, gauge track, empty heatmap cell. */
  line: string;
  /** `--gray-a8`: the crosshair. */
  crosshair: string;
  /** The frame background: mark gaps, marker rings, the emphasis ring. */
  surface: string;
  /** Tooltip panel. */
  tooltipBg: string;
  tooltipBorder: string;
  tooltipShadow: string;
  /** `--accent-9`: the default heatmap ramp hue is read as steps 3 → 11 of this scale. */
  accent: string;
  /** Steps 3 → 11 of the heatmap hue (or the accent). */
  ramp: string[];
  /** The CSS `font-family` of the frame. */
  fontFamily: string;
};

const RAMP_STEPS = [3, 4, 5, 6, 7, 8, 9, 10, 11];

let probe: CanvasRenderingContext2D | null | undefined;
const colorCache = new Map<string, string>();

/** A CSS colour string as `rgba(r, g, b, a)`, or the input when it can't be resolved. */
export function resolveCssColor(value: string): string {
  const raw = value.trim();
  if (!raw) return raw;
  const cached = colorCache.get(raw);
  if (cached) return cached;
  if (probe === undefined) {
    try {
      const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
      if (canvas) {
        canvas.width = 1;
        canvas.height = 1;
      }
      probe = canvas?.getContext("2d", { willReadFrequently: true }) ?? null;
    } catch {
      probe = null;
    }
  }
  let out = raw;
  if (probe) {
    try {
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = "#000000";
      probe.fillStyle = raw;
      const parsed = probe.fillStyle;
      if (typeof parsed === "string" && parsed !== "#000000") {
        probe.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
        out = `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
      } else if (parsed === "#000000" && /black|#000|rgb\(0,\s*0,\s*0\)/i.test(raw)) {
        out = "rgba(0, 0, 0, 1)";
      }
    } catch {
      out = raw;
    }
  }
  colorCache.set(raw, out);
  return out;
}

/** Forget the resolved colours (a theme change re-reads them). */
export function resetChartThemeCache(): void {
  colorCache.clear();
}

/** Read one CSS variable off `el`, resolved to `rgba()`; `fallback` when it is unset. */
function cssVar(style: CSSStyleDeclaration, name: string, fallback: string): string {
  const raw = style.getPropertyValue(name);
  return raw && raw.trim() ? resolveCssColor(raw) : fallback;
}

/**
 * The theme tokens for a chart frame. `glass` switches the grid line to the
 * alpha gray and the gap colour to the glass panel's base colour (the glass
 * panel exposes no opaque background; `--gummy-surface-base` is the colour its
 * alpha is mixed from).
 */
export function readChartTheme(el: HTMLElement, options: { glass?: boolean; hue?: string } = {}): ChartThemeTokens {
  const style = getComputedStyle(el);
  const hue = options.hue;
  const ramp = RAMP_STEPS.map((step) => (hue ? cssVar(style, `--${hue}-${step}`, "") : cssVar(style, `--accent-${step}`, "")));
  const surface = options.glass
    ? cssVar(style, "--gummy-surface-base", cssVar(style, "--color-panel-solid", "#ffffff"))
    : cssVar(style, "--color-panel-solid", "#ffffff");
  return {
    text: cssVar(style, "--gray-12", "#1c2024"),
    textSecondary: cssVar(style, "--gray-11", "#60646c"),
    line: options.glass ? cssVar(style, "--gray-a5", "rgba(0,0,0,0.1)") : cssVar(style, "--gray-5", "#e0e1e6"),
    crosshair: cssVar(style, "--gray-a8", "rgba(0,0,0,0.3)"),
    surface,
    tooltipBg: cssVar(style, "--color-panel-solid", "#ffffff"),
    tooltipBorder: cssVar(style, "--gray-a6", "rgba(0,0,0,0.12)"),
    tooltipShadow: "0 4px 12px rgba(0, 0, 0, 0.18)",
    accent: cssVar(style, "--accent-9", "#3e63dd"),
    ramp: ramp.every((c) => c) ? ramp : [],
    fontFamily: style.fontFamily || "inherit",
  };
}
