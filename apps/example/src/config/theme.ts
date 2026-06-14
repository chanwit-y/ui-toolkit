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
  // DataTable colors. Every role is optional — any field left unset follows the
  // global `accentColor` via Radix `--accent-*` vars and flips with dark mode.
  // Set a field to pin a specific named color for that role.
  dataTable: {
    headerColor: "teal",
    headerHoverColor: "teal",
    paginationButtonColor: "teal",
    paginationButtonHoverColor: "teal",
    rowHoverColor: "teal",
    editButtonColor: "teal",
    deleteButtonColor: "red",
  },
};
