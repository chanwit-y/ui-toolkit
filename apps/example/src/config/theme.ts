import type { ThemeComponents, ThemeProps } from "@gummy-ui/ui";

/**
 * App-wide theme config.
 *
 * `theme`      — Radix global tokens (appearance, accentColor, radius, panelBackground).
 *                Omitted keys fall back to ThemeProvider defaults.
 * `components` — per-component color overrides (Radix accent tokens).
 *
 * Passed to <ThemeProvider> in App.tsx. Mirrors the engine's config-driven
 * style: a plain object describing the screen, kept out of JSX.
 */
export const theme: ThemeProps = {
  accentColor: "teal",
};

export const components: ThemeComponents = {
  button: { color: "teal" },
  // DataTable styling. Every role is optional — any field left unset follows the
  // global `accentColor` via Radix `--accent-*` vars and flips with dark mode.
  //
  // header background/hover, pagination and row-hover are left UNSET here so the
  // header renders as the solid accent (teal) and correctly flips in dark mode.
  // Pinning a named color (e.g. `headerColor: "teal"`) opts into the legacy
  // static map, which is a light-only tint with no dark variant.
  dataTable: {
    // Header font (header-only). Unset → text-xs / font-bold.
    headerFontSize: "sm",
    headerFontWeight: "semibold",
    // headerTextColor: "teal", // tint the label; pairs with a named light headerColor
    editButtonColor: "teal",
    deleteButtonColor: "red",
  },
};
