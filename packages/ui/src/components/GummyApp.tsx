import { useEffect, useMemo, type ReactElement, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { HttpClientFactory } from "../api";
import type { TActionMaster, TComponentMaster } from "./@types";
import { AppShell, type AppShellProps } from "./AppShell";
import { DataProvider, ThemeProvider } from "./context";
import { ActionsProvider } from "./core/actions";
import { ComponentsProvider } from "./core/components";
import { GlobalLoads } from "./core/GlobalLoads";
import { PageRouter } from "./core/PageRouter";
import { assertGummyProject, projectApiToEngine, type GummyProject, type GummyProjectShell } from "./core/project";

export type GummyAppProps = {
  /** The project document the studio wrote (`gummy/projects/<key>.json`). */
  project: GummyProject;
  /** Bearer token for every request (default: none). */
  getToken?: () => Promise<string>;
  /** HTTP base URL; wins over `env.API_URL`. */
  apiUrl?: string;
  /** Per-environment overrides of the project's `env`. */
  env?: Record<string, string>;
  /** A ready client (interceptors, custom error handling); wins over `apiUrl` / `getToken`. */
  http?: HttpClientFactory;
  /** The functions the configs name as `fn:<name>`. */
  actions?: TActionMaster;
  /** The React components the configs place by name. */
  components?: TComponentMaster;
  /**
   * `false` renders the routed pages with no `AppShell`; an object overrides
   * the project's shell settings (plus the shell's embedding props `height` /
   * `className`). Default: the project's shell.
   */
  shell?: boolean | GummyAppShell;
  /** `AppShell` slots. */
  brand?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  /**
   * Rendered for paths no page matches. Default: the root `/` redirects to the
   * first page when no page claims it (a studio project's pages start at
   * `/page-1`), any other path shows a short note.
   */
  notFound?: ReactNode;
  /** Mirror page titles into `document.title` (default true). */
  documentTitle?: boolean;
  /** Wraps the routed pages (padding, a page transition). Default: a `p-8` block. */
  renderPages?: (pages: ReactElement) => ReactNode;
  className?: string;
};

/** The project shell settings plus what only an embedding host sets. */
export type GummyAppShell = GummyProjectShell & Pick<AppShellProps, "height" | "className">;

const DEFAULT_RENDER = (pages: ReactElement) => <div className="p-8">{pages}</div>;

/** The default `notFound`: `/` → the first page (when none is at `/`), else a note. */
function DefaultNotFound({ firstPath }: { firstPath: string | undefined }) {
  const { pathname } = useLocation();
  if (pathname === "/" && firstPath && firstPath !== "/" && !firstPath.includes(":")) return <Navigate to={firstPath} replace />;
  return (
    <p className="text-sm text-[var(--gray-11)]">
      No page matches <code className="font-mono">{pathname}</code>.
    </p>
  );
}

/**
 * Renders a studio project at runtime (see the grilled library / CLI design):
 * `ThemeProvider` from `project.theme`, `ActionsProvider` / `ComponentsProvider`
 * from the app's registries, `GlobalLoads` from `project.globalLoads`,
 * `AppShell` from `project.shell` + `project.menu`, and `PageRouter` over
 * `project.pages` — the wiring every hand-written consumer repeated. Mount it
 * **inside your own router** (`<BrowserRouter>`), like `PageRouter`, so other
 * routes can live beside it.
 *
 * ```tsx
 * import project from "./gummy/projects/demo.json";
 * <BrowserRouter>
 *   <GummyApp project={project} getToken={getToken} actions={actions} components={components} />
 * </BrowserRouter>
 * ```
 */
export function GummyApp({
  project: rawProject,
  getToken,
  apiUrl,
  env: envOverrides,
  http: ownHttp,
  actions,
  components,
  shell = true,
  brand,
  header,
  footer,
  notFound,
  documentTitle,
  renderPages = DEFAULT_RENDER,
  className,
}: GummyAppProps): ReactElement {
  // Validated once per document — a hand-edited JSON fails here with the reason, not deep inside a page.
  const project = useMemo(() => assertGummyProject(rawProject), [rawProject]);
  const env = useMemo(() => ({ ...project.env, ...envOverrides }), [project.env, envOverrides]);
  const baseUrl = apiUrl ?? env.API_URL ?? "";

  const http = useMemo(
    () => ownHttp ?? new HttpClientFactory(baseUrl, getToken ?? (async () => ""), "1.0.0", 30000),
    [ownHttp, baseUrl, getToken],
  );
  const api = useMemo(() => projectApiToEngine(project.api), [project.api]);
  const globalLoads = project.globalLoads ?? [];
  const menu = project.menu ?? [];

  // The registries the configs expect, so a missing function / component is reported once, up front.
  useEffect(() => {
    for (const name of project.customActions ?? [])
      if (!actions?.[name]) console.warn(`[gummy-ui] GummyApp: project "${project.name}" names custom action "${name}", which is not in \`actions\`.`);
    for (const c of project.customComponents ?? [])
      if (!components?.[c.name]) console.warn(`[gummy-ui] GummyApp: project "${project.name}" places custom component "${c.name}", which is not in \`components\`.`);
  }, [project, actions, components]);

  const shellProps: GummyAppShell | null = shell === false ? null : { ...project.shell, ...(shell === true ? {} : shell) };

  const firstPath = Object.values(project.pages)[0]?.path;
  const pages = (
    <PageRouter
      http={http}
      model={project.model}
      api={api}
      pages={project.pages}
      notFound={notFound ?? <DefaultNotFound firstPath={firstPath} />}
      documentTitle={documentTitle}
    />
  );
  const content = (
    <>
      {globalLoads.length > 0 && <GlobalLoads http={http} model={project.model} api={api} loads={globalLoads} />}
      {renderPages(pages)}
    </>
  );

  return (
    <DataProvider>
      <ThemeProvider theme={project.theme?.theme} components={project.theme?.components ?? {}} className={className}>
        <ActionsProvider actions={actions ?? {}}>
          <ComponentsProvider components={components ?? {}}>
            {shellProps ? (
              <AppShell pages={project.pages} menu={menu} brand={brand} header={header} footer={footer} {...shellProps}>
                {content}
              </AppShell>
            ) : (
              content
            )}
          </ComponentsProvider>
        </ActionsProvider>
      </ThemeProvider>
    </DataProvider>
  );
}
