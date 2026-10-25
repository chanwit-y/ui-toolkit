import type { CSSProperties } from "react";
import type { SidebarConfig } from "../@types";

export type SidebarVariant = "plain" | "pill";

export function sidebarVariant(sidebar: SidebarConfig = {}): SidebarVariant {
  return sidebar.variant === "pill" ? "pill" : "plain";
}

/** The icon rail's CSS width: the configured one, else the variant's (sized so an item's icon column sits centred). */
export function sidebarRailWidth(sidebar: SidebarConfig = {}): string {
  return sidebar.railWidth || (sidebarVariant(sidebar) === "pill" ? "4.5rem" : "3.5rem");
}

/** Whether the active item gets the edge indicator: as configured, else only for pill. */
export function sidebarIndicator(sidebar: SidebarConfig = {}): boolean {
  return sidebar.indicator ?? sidebarVariant(sidebar) === "pill";
}

/** The CSS `background` of the active pill: the gradient when both stops are set, else the colour, else undefined (the default). */
export function sidebarActiveBackground(sidebar: SidebarConfig = {}): string | undefined {
  if (sidebar.activeGradient?.from && sidebar.activeGradient.to) {
    const { from, to, angle = 90 } = sidebar.activeGradient;
    return `linear-gradient(${angle}deg, ${from}, ${to})`;
  }
  return sidebar.activeBackground || undefined;
}

/**
 * The `--gummy-side-*` vars of the overrides that are set — the sidebar
 * stylesheet falls back to the accent for the rest, so nothing is written for
 * a default sidebar.
 */
export function sidebarStyle(sidebar: SidebarConfig = {}): CSSProperties {
  const style: Record<string, string> = {};
  if (sidebar.itemBackground) style["--gummy-side-item"] = sidebar.itemBackground;
  const active = sidebarActiveBackground(sidebar);
  if (active) style["--gummy-side-active"] = active;
  if (sidebar.indicatorColor) style["--gummy-side-indicator"] = sidebar.indicatorColor;
  return style;
}
