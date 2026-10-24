import type { GummyPageBody } from "../@types";

/**
 * Loads a split page's body (see the grilled design `split-pages-lazy-load`):
 * `src` is the page entry's `src` (relative to the project document,
 * `pages/<key>.json`), `key` the page key. Resolves the parsed file.
 */
export type PageBodyLoader = (src: string, key: string) => Promise<GummyPageBody>;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** A loaded page file is a `{ containers, loads? }` object — checked before the engine builds it. */
export function assertPageBody(body: unknown, key: string, src: string): GummyPageBody {
  if (!isRecord(body) || !Array.isArray(body.containers))
    throw new Error(`Page "${key}" (${src}) is not a page file: expected { "containers": [...] }.`);
  if (body.loads !== undefined && !Array.isArray(body.loads))
    throw new Error(`Page "${key}" (${src}): "loads" must be an array.`);
  return body as GummyPageBody;
}

/**
 * The default loader: `fetch` the page file. `src` resolves against `base`
 * (the project document's URL or its folder, e.g. `/gummy/projects/shop/`),
 * itself relative to the site root — not to the current route, which would
 * put `pages/…` under `/orders/42/`.
 */
export function fetchPageLoader(base?: string): PageBodyLoader {
  return async (src, key) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const url = new URL(src, new URL(base ?? "/", `${origin}/`)).toString();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} loading page "${key}" from ${url}.`);
    return (await res.json()) as GummyPageBody;
  };
}

/**
 * A loader over a bundler's lazy module map — Vite's
 * `import.meta.glob("../gummy/projects/*\/pages/*.json")` — so each page file
 * is its own chunk, fetched on its first visit and hot-reloaded on save.
 * `projectDir` is the project folder in the map's own key form
 * (`../gummy/projects/shop`); `src` is appended to it.
 */
export function globPageLoader(modules: Record<string, () => Promise<unknown>>, projectDir: string): PageBodyLoader {
  const dir = projectDir.replace(/\/+$/, "");
  return async (src, key) => {
    const path = `${dir}/${src.replace(/^\.\//, "")}`;
    const load = modules[path];
    if (!load) throw new Error(`Page "${key}": no page file ${path} in the bundle.`);
    const mod = await load();
    // `import: "default"` hands the JSON itself; without it the module object carries it as `default`.
    return (isRecord(mod) && "default" in mod && !("containers" in mod) ? mod.default : mod) as GummyPageBody;
  };
}

export type PageBodyEntry =
  | { status: "pending"; promise: Promise<void> }
  | { status: "ready"; body: GummyPageBody }
  | { status: "error"; error: unknown };

/**
 * Loaded page bodies for one `PageRouter`, by page key + `src`: the first
 * read starts the load (a Suspense-style pending entry holding the promise),
 * later reads get the body, a failure is kept until `retry`. `prefetch` warms
 * an entry without rendering it (nothing calls it in v1; `usePrefetchPage`
 * exposes it).
 */
export class PageBodyCache {
  private entries = new Map<string, PageBodyEntry>();

  constructor(private loader: PageBodyLoader) {}

  private id(key: string, src: string) {
    return `${key}\u0000${src}`;
  }

  read(key: string, src: string): PageBodyEntry {
    const id = this.id(key, src);
    const hit = this.entries.get(id);
    if (hit) return hit;
    const promise = Promise.resolve()
      .then(() => this.loader(src, key))
      .then((body) => assertPageBody(body, key, src))
      .then(
        (body) => {
          this.entries.set(id, { status: "ready", body });
        },
        (error: unknown) => {
          console.error(`[gummy-ui] PageRouter: could not load page "${key}" from ${src}:`, error);
          this.entries.set(id, { status: "error", error });
        },
      );
    const entry: PageBodyEntry = { status: "pending", promise };
    this.entries.set(id, entry);
    return entry;
  }

  prefetch(key: string, src: string): Promise<void> {
    const entry = this.read(key, src);
    return entry.status === "pending" ? entry.promise : Promise.resolve();
  }

  /** Forget a failed load so the next read tries again. */
  retry(key: string, src: string): void {
    const id = this.id(key, src);
    if (this.entries.get(id)?.status === "error") this.entries.delete(id);
  }
}
