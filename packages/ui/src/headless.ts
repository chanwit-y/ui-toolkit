/**
 * `@gummy-ui/ui/headless` — the React-free part of the library: the project
 * document's checks and transforms plus the constants the studio's export
 * reads. Nothing here imports React, the router or a component, so it runs in
 * Node (the `gummy mcp` server bundles it through `@gummy-ui/studio/headless`).
 */
export {
  GUMMY_PROJECT_SCHEMA_VERSION,
  GummyProjectError,
  assertGummyProject,
  projectApiToEngine,
  splitProjectPages,
} from "./components/core/project";
export type {
  GummyProject,
  GummyProjectApi,
  GummyProjectAuth,
  GummyProjectCustomComponent,
  GummyProjectShell,
  GummyProjectTheme,
} from "./components/core/project";
export { DEFAULT_PAGE_TRANSITION_DURATION } from "./components/core/pageTransitionDefaults";
export { DEFAULT_AUTH_ENV_NAMES, DEFAULT_USER_MENU_KEYS } from "./auth/azure/config";
export { urlParamNames } from "./components/core/urlParams";
export { TEMPLATE_VALUE_KEY, escapeHtml, renderTemplate, templateFields } from "./util/template";
export { formatCell, columnFormat, NUMERIC_FORMATS, type CellFormat, type CellFormatType } from "./util/format";
export { toCsv, csvCell, csvFileName } from "./util/csv";
export {
  buildChartModel,
  chartKind,
  chartRows,
  parseChartRaw,
  isCartesian,
  supportsSplitBy,
  singleSeries,
  supportsReferenceLines,
  needsXField,
  CHART_TYPES,
  DEFAULT_CHART_HEIGHT,
  DEFAULT_CHART_EMPTY_TEXT,
  type ChartModel,
  type ChartModelInput,
} from "./components/core/chartModel";
export { CHART_PALETTE, CHART_HUES, CHART_HUE_NAMES, LOW_CONTRAST_HUES, MAX_SERIES, hueHex, seriesColor } from "./components/core/chartPalette";
export type * from "./components/@types";
