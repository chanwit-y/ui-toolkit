import type { CSSProperties } from "react";
import type { AppBarConfig } from "../@types";

/** How the top bar is painted: the neutral panel, the theme accent, or a configured colour / gradient. */
export type AppBarTone = "panel" | "accent" | "custom";

const LIGHT_TEXT = "#ffffff";
const DARK_TEXT = "#1c1c1c";

export function appBarTone(bar: AppBarConfig): AppBarTone {
  if (bar.variant === "custom") return "custom";
  if (bar.variant === "accent") return "accent";
  if (!bar.variant && (bar.background || bar.gradient)) return "custom";
  return "panel";
}

const NAMED: Record<string, [number, number, number]> = {
  white: [255, 255, 255],
  black: [0, 0, 0],
};

/** `#rgb` / `#rrggbb` (with or without alpha) / `rgb(a)(…)` / `white` / `black` → `[r, g, b]`, else undefined. */
export function parseColor(color: string): [number, number, number] | undefined {
  const c = color.trim().toLowerCase();
  if (NAMED[c]) return NAMED[c];
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(c);
  if (hex) {
    let h = hex[1];
    if (h.length <= 4) h = h.split("").map((ch) => ch + ch).join("");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(c);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return undefined;
}

/** WCAG relative luminance (0 = black, 1 = white), undefined when the colour can't be parsed. */
export function colorLuminance(color: string): number | undefined {
  const rgb = parseColor(color);
  if (!rgb) return undefined;
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The CSS `background` of a custom bar: the gradient when set, else the colour. */
export function appBarBackground(bar: AppBarConfig): string | undefined {
  if (bar.gradient?.from && bar.gradient.to) {
    const { from, to, angle = 90 } = bar.gradient;
    return `linear-gradient(${angle}deg, ${from}, ${to})`;
  }
  return bar.background || undefined;
}

/**
 * The text colour of a custom bar and whether it is light (so the hover /
 * active tints are white-alpha) — `foreground` as given, else picked from
 * the luminance of the gradient start / background, else light.
 */
export function appBarForeground(bar: AppBarConfig): { color: string; light: boolean } {
  const fg = bar.foreground?.trim();
  if (fg === "light") return { color: LIGHT_TEXT, light: true };
  if (fg === "dark") return { color: DARK_TEXT, light: false };
  if (fg) {
    const l = colorLuminance(fg);
    return { color: fg, light: l === undefined ? true : l > 0.5 };
  }
  const base = bar.gradient?.from || bar.background;
  const l = base ? colorLuminance(base) : undefined;
  const light = l === undefined ? true : l < 0.5;
  return light ? { color: LIGHT_TEXT, light: true } : { color: DARK_TEXT, light: false };
}

/**
 * The inline style of the top bar: height and padding always; on a custom
 * bar also the paint and the `--gummy-bar-*` vars the bar's chrome (buttons,
 * top-strip links, dividers, the user menu) reads.
 */
export function appBarStyle(bar: AppBarConfig): CSSProperties {
  const style: Record<string, string> = { height: bar.height ?? "3rem" };
  if (bar.padding) style.padding = bar.padding;
  if (appBarTone(bar) !== "custom") return style;
  const background = appBarBackground(bar);
  if (background) style.background = background;
  const { color, light } = appBarForeground(bar);
  style.color = color;
  style["--gummy-bar-fg"] = color;
  style["--gummy-bar-hover"] = light ? "rgba(255, 255, 255, 0.16)" : "rgba(0, 0, 0, 0.08)";
  style["--gummy-bar-active"] = light ? "rgba(255, 255, 255, 0.28)" : "rgba(0, 0, 0, 0.14)";
  style["--gummy-bar-line"] = light ? "rgba(255, 255, 255, 0.28)" : "rgba(0, 0, 0, 0.14)";
  return style;
}
