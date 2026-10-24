import type { ThemeProps } from "@radix-ui/themes";
import type { TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import type { AppBarConfig, GummyPageBody, PageLoad, PageTransition, ThemeComponents, TMenu, TPageEntries } from "../@types";
import type { AzureAuthConfig } from "../../auth/azure/config";

/**
 * The project document a Gummy app renders at runtime (see the grilled
 * library / CLI design): everything the studio knows about an app, in the
 * **engine's own shapes**, so `<GummyApp>` hands the pieces straight to
 * `PageRouter`, `AppShell`, `GlobalLoads` and `ThemeProvider` with no code
 * generation in between. The studio writes one of these per project —
 * `gummy/projects/<key>/project.json` with each page's body in
 * `pages/<pageKey>.json` (a page entry's `src`), or the older single file
 * `gummy/projects/<key>.json` with every page inline; both are schema 1.
 * A consumer imports it and renders it.
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
  /** Text colour of the active sidebar menu item (any CSS colour); default the accent's contrast. */
  menuActiveColor?: string;
  /** How a page enters on a pathname change (enter-only animation); absent = none. */
  pageTransition?: PageTransition;
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

/**
 * The project's sign-in (see the grilled design `azure-sso-auth`): `GummyApp`
 * wraps the app in `AzureAuth` when present. Only Azure for now; the union
 * grows per provider.
 */
export type GummyProjectAuth = AzureAuthConfig;

export type GummyProject = {
  schemaVersion: typeof GUMMY_PROJECT_SCHEMA_VERSION;
  name: string;
  description?: string;
  /** Plain settings the app reads; `API_URL` is the HTTP base URL unless the app overrides it. */
  env?: Record<string, string>;
  model: TModelMaster;
  api: GummyProjectApi;
  /** Page entries: route meta + the body inline, or `src` (a page file loaded on the first visit). */
  pages: TPageEntries;
  menu?: TMenu;
  shell?: GummyProjectShell;
  theme?: GummyProjectTheme;
  /** App-wide loads, fetched once (`<GlobalLoads>`). */
  globalLoads?: PageLoad[];
  /** Names the configs reference as `fn:<name>`; the app registers the functions. */
  customActions?: string[];
  /** Components the configs place by name; the app registers the React components. */
  customComponents?: GummyProjectCustomComponent[];
  /** Sign-in; absent = no gate, no token. */
  auth?: GummyProjectAuth;
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
    if (!isRecord(page) || typeof page.path !== "string")
      throw new GummyProjectError(`pages.${key} needs a \`path\` string.`);
    const inline = Array.isArray(page.containers);
    if (!inline && !(typeof page.src === "string" && page.src.trim() !== ""))
      throw new GummyProjectError(`pages.${key} needs a \`containers\` array or a \`src\` page file.`);
    if (page.containers !== undefined && !inline) throw new GummyProjectError(`pages.${key}.containers must be an array.`);
    if (page.parent !== undefined && !(typeof page.parent === "string" && page.parent in value.pages))
      throw new GummyProjectError(`pages.${key}.parent refers to page ${JSON.stringify(page.parent)}, which does not exist.`);
  }
  if (value.menu !== undefined && !Array.isArray(value.menu)) throw new GummyProjectError("`menu` must be an array.");
  if (value.globalLoads !== undefined && !Array.isArray(value.globalLoads))
    throw new GummyProjectError("`globalLoads` must be an array.");
  if (value.auth !== undefined) {
    if (!isRecord(value.auth) || value.auth.provider !== "azure")
      throw new GummyProjectError(`\`auth.provider\` must be "azure" (got ${JSON.stringify(isRecord(value.auth) ? value.auth.provider : value.auth)}).`);
    if (value.auth.env !== undefined) {
      if (!isRecord(value.auth.env)) throw new GummyProjectError("`auth.env` must be an object of env var names.");
      for (const [k, v] of Object.entries(value.auth.env))
        if (typeof v !== "string") throw new GummyProjectError(`auth.env.${k} must be an env var name (string).`);
    }
    if (value.auth.profile !== undefined) {
      const p = value.auth.profile;
      if (!isRecord(p) || !isRecord(p.api) || typeof p.api.name !== "string" || typeof p.emailParam !== "string")
        throw new GummyProjectError("`auth.profile` needs `api.name` and `emailParam`.");
      if (!(p.api.name in value.api))
        throw new GummyProjectError(`auth.profile.api.name refers to endpoint ${JSON.stringify(p.api.name)}, which is not in \`api\`.`);
    }
  }
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

/**
 * A project document split for writing (see the grilled design
 * `split-pages-lazy-load`): the manifest — every page reduced to its route
 * meta plus `src: "pages/<file>.json"` — and each page's body by file name
 * (the page key, made path-safe). Pages that are already split keep their
 * `src` and have no body here. Pure; the
 * studio calls it before handing the files to the CLI / the folder picker.
 */
export function splitProjectPages(project: GummyProject, dir = "pages"): { project: GummyProject; pages: Record<string, GummyPageBody> } {
  const bodies: Record<string, GummyPageBody> = {};
  const entries: TPageEntries = {};
  // File names are the page keys, made path-safe (studio keys already are) and unique.
  const taken = new Set<string>();
  const fileName = (key: string) => {
    const base = key.replace(/[^A-Za-z0-9_-]/g, "_") || "page";
    let name = base;
    for (let n = 2; taken.has(name); n++) name = `${base}-${n}`;
    taken.add(name);
    return name;
  };
  for (const [key, page] of Object.entries(project.pages)) {
    const { containers, loads, src: _src, ...meta } = page;
    if (!containers) {
      entries[key] = page;
      continue;
    }
    const name = fileName(key);
    bodies[name] = { containers, ...(loads?.length ? { loads } : {}) };
    entries[key] = { ...meta, src: `${dir}/${name}.json` };
  }
  return { project: { ...project, pages: entries }, pages: bodies };
}
