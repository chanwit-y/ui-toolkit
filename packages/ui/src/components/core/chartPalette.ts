/**
 * Series colours for the `chart` element (see `spec/gummy-chart-spec.md` §6.3).
 *
 * A series `color` is a Radix hue **name**; it resolves through this table,
 * not through `var(--<hue>-10)`: Radix's dark scales put steps 9–10 well above
 * the dark-surface lightness band, so the variable read in dark mode fails the
 * data-viz validator (amber-11 dark is `#FFCA16`). The light step-10 values
 * pass on both the light (`#fcfcfb`) and the dark (`#191919`) surface, so one
 * table serves both appearances. The light hues (`sky`, `mint`, `lime`,
 * `yellow`) take step 11 like `amber` does, since their step 10 is near white.
 *
 * The eight categorical slots were validated on 2026-10-29: adjacent-pair
 * CVD ΔE ≥ 10.1, normal-vision ΔE ≥ 19.9, contrast ≥ 3:1 on both surfaces.
 */
export const CHART_PALETTE: readonly string[] = ["blue", "orange", "teal", "amber", "pink", "grass", "plum", "red"];

/** Hue name → hex, both appearances. */
export const CHART_HUES: Readonly<Record<string, string>> = {
  blue: "#0588f0",
  orange: "#ef5f00",
  teal: "#0d9b8a",
  amber: "#ab6400",
  pink: "#cf3897",
  grass: "#3e9b4f",
  plum: "#a144af",
  red: "#dc3e42",
  iris: "#5151cd",
  indigo: "#3358d4",
  crimson: "#df3478",
  violet: "#654dc4",
  cyan: "#0797b9",
  jade: "#26997b",
  tomato: "#dd4425",
  purple: "#8347b9",
  ruby: "#dc3b5d",
  green: "#2b9a66",
  brown: "#a07553",
  gold: "#8c7a5e",
  bronze: "#957468",
  sky: "#00749e",
  mint: "#027864",
  lime: "#5c7c2f",
  yellow: "#9e6c00",
  gray: "#838383",
};

/** Hues that sit too close to the grays to carry a series; the studio warns. */
export const LOW_CONTRAST_HUES: ReadonlySet<string> = new Set(["brown", "gold", "bronze", "gray"]);

/** The colour of the "Other" series that the 9th and later series fold into. */
export const OTHER_SERIES_COLOR = CHART_HUES.gray;

/** How many series draw on their own before the rest fold into "Other". */
export const MAX_SERIES = CHART_PALETTE.length;

/** Every hue name the panel may offer, palette slots first. */
export const CHART_HUE_NAMES: readonly string[] = [
  ...CHART_PALETTE,
  ...Object.keys(CHART_HUES).filter((h) => !CHART_PALETTE.includes(h)),
];

/** The hex of a named hue, or `undefined` for an unknown name. */
export function hueHex(name: string | undefined): string | undefined {
  return name ? CHART_HUES[name] : undefined;
}

/**
 * The colour of the series at `index`: its own hue when named and known, else
 * the palette slot at that position (never cycled — past the last slot the
 * caller has already folded the series into "Other").
 */
export function seriesColor(name: string | undefined, index: number): string {
  return hueHex(name) ?? CHART_HUES[CHART_PALETTE[Math.min(index, CHART_PALETTE.length - 1)]];
}
