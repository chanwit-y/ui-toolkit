import type { ThemeProps } from "@radix-ui/themes";
import type { TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import type { AppBarConfig, PageLoad, ThemeComponents, TMenu, TPageMaster } from "../@types";

/**
 * The project document a Gummy app renders at runtime (see the grilled
 * library / CLI design): everything the studio knows about an app, in the
 * **engine's own shapes**, so `<GummyApp>` hands the pieces straight to
 * `PageRouter`, `AppShell`, `GlobalLoads` and `ThemeProvider` with no code
 * generation in between. The studio writes one of these per project
 * (`gummy/projects/<key>.json`); a consumer imports it and renders it.
 *
 * What the JSON cannot carry — the token getter, the custom action functions
 * and the custom React components — is supplied by the app as props.
 */
export const GUMMY_PROJECT_SCHEMA_VERSION = 1 as const;

/** The `AppShell` layout props a project authors (its `children`, `brand`, `header`, `footer` are the app's). */
export type GummyProjectShell = {
  navigation?: "sidebar" | "top";
  breadcrumbs?: boolean;
  appBar?: AppBarConfig;
  menuIcons?: boolean;
  collapsible?: boolean;
  sidebarWidth?: string;
};

/** The `ThemeProvider` config: Radix global tokens + per-component colours. */
export type GummyProjectTheme = {
  theme?: ThemeProps;
  components?: ThemeComponents;
};

/** A custom component the project places by name; its props are documented, not enforced. */
export type GummyProjectCustomComponent = {
  name: string;
  description?: string;
  props?: { key: string; kind: "text" | "number" | "boolean" | "select" | "json"; label?: string; options?: string[]; defaultValue?: unknown }[];
};

/** One endpoint as authored in the JSON: `description` / `withOptions` may be left out. */
export type GummyProjectApi = Record<
  string,
  Omit<TApiMaster<TModelMaster>[string], "description" | "withOptions"> & {
    description?: string;
    withOptions?: boolean;
  }
>;

export type GummyProject = {
  schemaVersion: typeof GUMMY_PROJECT_SCHEMA_VERSION;
  name: string;
  description?: string;
  /** Plain settings the app reads; `API_URL` is the HTTP base URL unless the app overrides it. */
  env?: Record<string, string>;
  model: TModelMaster;
  api: GummyProjectApi;
  pages: TPageMaster;
  menu?: TMenu;
  shell?: GummyProjectShell;
  theme?: GummyProjectTheme;
  /** App-wide loads, fetched once (`<GlobalLoads>`). */
  globalLoads?: PageLoad[];
  /** Names the configs reference as `fn:<name>`; the app registers the functions. */
  customActions?: string[];
  /** Components the configs place by name; the app registers the React components. */
  customComponents?: GummyProjectCustomComponent[];
};

export class GummyProjectError extends Error {
  constructor(message: string) {
    super(`[gummy-ui] Invalid project: ${message}`);
    this.name = "GummyProjectError";
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Checks the parts `<GummyApp>` relies on and returns the value typed, or
 * throws a `GummyProjectError` naming the first problem. Deliberately a
 * structural check, not a full schema: the engine validates bins as it
 * renders, and a hand-edited JSON should fail at the page, not the whole app.
 */
export function assertGummyProject(value: unknown): GummyProject {
  if (!isRecord(value)) throw new GummyProjectError("expected an object.");
  if (value.schemaVersion !== GUMMY_PROJECT_SCHEMA_VERSION)
    throw new GummyProjectError(
      `schemaVersion ${JSON.stringify(value.schemaVersion)} is not supported by this version of @gummy-ui/ui (expected ${GUMMY_PROJECT_SCHEMA_VERSION}).`,
    );
  if (typeof value.name !== "string") throw new GummyProjectError("`name` must be a string.");
  if (!isRecord(value.model)) throw new GummyProjectError("`model` must be an object of model names.");
  if (!isRecord(value.api)) throw new GummyProjectError("`api` must be an object of endpoint names.");
  for (const [name, entry] of Object.entries(value.api)) {
    if (!isRecord(entry) || typeof entry.url !== "string" || typeof entry.methods !== "string")
      throw new GummyProjectError(`api.${name} needs \`url\` and \`methods\`.`);
    for (const ref of ["response", "query", "parameter", "body"] as const) {
      const m = entry[ref];
      if (m !== undefined && m !== null && !(typeof m === "string" && m in value.model))
        throw new GummyProjectError(`api.${name}.${ref} refers to model ${JSON.stringify(m)}, which is not in \`model\`.`);
    }
  }
  if (!isRecord(value.pages)) throw new GummyProjectError("`pages` must be an object of page keys.");
  if (Object.keys(value.pages).length === 0) throw new GummyProjectError("`pages` is empty — nothing to render.");
  for (const [key, page] of Object.entries(value.pages)) {
    if (!isRecord(page) || typeof page.path !== "string" || !Array.isArray(page.containers))
      throw new GummyProjectError(`pages.${key} needs a \`path\` string and a \`containers\` array.`);
    if (page.parent !== undefined && !(typeof page.parent === "string" && page.parent in value.pages))
      throw new GummyProjectError(`pages.${key}.parent refers to page ${JSON.stringify(page.parent)}, which does not exist.`);
  }
  if (value.menu !== undefined && !Array.isArray(value.menu)) throw new GummyProjectError("`menu` must be an array.");
  if (value.globalLoads !== undefined && !Array.isArray(value.globalLoads))
    throw new GummyProjectError("`globalLoads` must be an array.");
  return value as unknown as GummyProject;
}

/** Fills the engine-required `description` / `withOptions` on every endpoint. */
export function projectApiToEngine(api: GummyProjectApi): TApiMaster<TModelMaster> {
  const out: TApiMaster<TModelMaster> = {};
  for (const [name, entry] of Object.entries(api)) {
    out[name] = {
      ...entry,
      response: entry.response ?? undefined,
      description: entry.description ?? "",
      withOptions: entry.withOptions ?? false,
    };
  }
  return out;
}
