import { describe, expect, test } from "bun:test";
import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { HttpClientFactory } from "../../api";
import type { TModelMaster } from "../../model/master";
import { converterStats, resetConverterStats } from "../../model/converter";
import type { Bin, Container, TPageEntries } from "../@types";
import { DataProvider, ThemeProvider } from "../context";
import { Core, coreStats, resetCoreStats } from "./core";
import { PageRouter } from "./PageRouter";
import { sharedApiMaster } from "./sharedApiMaster";
import { splitProjectPages, type GummyProject } from "./project";
import type { PageBodyLoader } from "./pageBodies";

/**
 * The large-project benchmark of the grilled design `split-pages-lazy-load`:
 * a synthetic project of ~200 pages × ~40 bins over ~150 models / 120
 * endpoints. Pass criteria: the first route render builds one page whatever
 * the page count, and each model converts to TypeBox once for the whole app.
 */
const SPAN = { sm: "12", md: "6", lg: "4", xl: "3" };

function largeProject(pageCount: number, binsPerPage = 40, modelCount = 150, endpointCount = 120) {
  const model: TModelMaster = {};
  for (let m = 0; m < modelCount; m++) {
    const fields: Record<string, string> = {};
    for (let f = 0; f < 8; f++) fields[`field${f}`] = f % 3 === 0 ? "number" : "string";
    model[`model${m}`] = fields;
  }
  const api: Record<string, unknown> = {};
  for (let e = 0; e < endpointCount; e++) {
    api[`endpoint${e}`] = {
      description: "",
      url: `/collection/thing${e}`,
      methods: e % 2 ? "POST" : "GET",
      response: `model${e % modelCount}`,
      ...(e % 2 ? { body: `model${(e + 1) % modelCount}` } : { query: `model${(e + 2) % modelCount}` }),
      withOptions: false,
    };
  }
  const pages: TPageEntries = {};
  for (let p = 0; p < pageCount; p++) {
    const bins = Array.from({ length: binsPerPage }, (_, b) => ({
      ...SPAN,
      type: "typography",
      element: { text: `Page ${p} · item ${b}`, variant: "body1" },
    })) as unknown as Bin[];
    const container = { grid: { gap: "2" }, bins } as unknown as Container;
    pages[`page${p}`] = { path: `/page-${p}`, title: `Page ${p}`, containers: [container] };
  }
  return { model, api, pages };
}

/** Distinct models the endpoints reference (what must convert, once each). */
function referencedModels(api: Record<string, unknown>): number {
  const refs = new Set<string>();
  for (const e of Object.values(api) as Record<string, string | undefined>[])
    for (const k of ["response", "query", "parameter", "body"]) if (e[k]) refs.add(e[k] as string);
  return refs.size;
}

/** React's server renderer warns about layout effects; the benchmark only cares about the markup. */
function quietly<T>(fn: () => T): T {
  const error = console.error;
  console.error = () => {};
  try {
    return fn();
  } finally {
    console.error = error;
  }
}

function render(element: ReactElement, at: string): string {
  return quietly(() =>
    renderToString(
      <DataProvider>
        <ThemeProvider components={{}}>
          <MemoryRouter initialEntries={[at]}>{element}</MemoryRouter>
        </ThemeProvider>
      </DataProvider>,
    ),
  );
}

const http = () => new HttpClientFactory("", async () => "", "1.0.0", 1000);

describe("large project", () => {
  test("the first route render builds one page, whatever the page count", () => {
    const timings: Record<number, number> = {};
    // Warm the renderer and module caches so the two sizes are compared fairly.
    const warm = largeProject(2);
    render(<PageRouter http={http()} model={warm.model} api={warm.api} pages={warm.pages} />, "/page-1");
    for (const count of [20, 200]) {
      const { model, api, pages } = largeProject(count);
      resetCoreStats();
      const t0 = performance.now();
      const html = render(<PageRouter http={http()} model={model} api={api} pages={pages} />, "/page-7");
      timings[count] = performance.now() - t0;
      expect(html).toContain("Page 7 · item 39");
      expect(html).not.toContain("Page 8 · item 0");
      expect(coreStats().constructed).toBe(1);
    }
    // What the router did before: every page's tree built at mount (no render, just construction).
    const { model, api, pages } = largeProject(200);
    const client = http();
    const t0 = performance.now();
    for (const page of Object.values(pages)) new Core(client, model, api, page.containers ?? []).run();
    const eager = performance.now() - t0;
    console.info(
      `[bench] first route render: 20 pages ${timings[20].toFixed(1)} ms · 200 pages ${timings[200].toFixed(1)} ms` +
        ` (building all 200 pages up front, the old way: ${eager.toFixed(1)} ms before any render)`,
    );
  });

  test("every page shares one ApiMaster, and each model converts once for the app", () => {
    const { model, api, pages } = largeProject(200);
    const client = http();
    const distinct = referencedModels(api);
    resetConverterStats();
    const first = sharedApiMaster(client, model, api);
    void first.api;
    expect(converterStats().conversions).toBe(distinct);
    // Another page's Core, GlobalLoads, the sign-in's profile load: the same instance, no new conversion.
    expect(sharedApiMaster(client, model, api)).toBe(first);
    for (const key of ["page0", "page1", "page199"]) new Core(client, model, api, pages[key].containers ?? []);
    void sharedApiMaster(client, model, api).api;
    expect(converterStats().conversions).toBe(distinct);
    // A different config object is a different app: its own instance.
    expect(sharedApiMaster(client, { ...model }, api)).not.toBe(first);
    // The old cost: every page built its own ApiMaster and converted every endpoint's models again
    // on its first render. A deep copy defeats the identity memo, as a separate ApiMaster per page did.
    const fresh = () => JSON.parse(JSON.stringify(model)) as TModelMaster;
    const t0 = performance.now();
    for (let i = 0; i < 10; i++) void sharedApiMaster(client, fresh(), api).api;
    const perPage = (performance.now() - t0) / 10;
    console.info(
      `[bench] ${Object.keys(api).length} endpoints over ${distinct} referenced models → ${distinct} conversions for the whole app;` +
        ` the old per-page ApiMaster cost ${perPage.toFixed(1)} ms on every page's first visit`,
    );
  });

  test("split, the first visit loads the manifest and one page instead of the whole document", () => {
    const { model, api, pages } = largeProject(200);
    const doc = { schemaVersion: 1, name: "Large", model, api, pages } as unknown as GummyProject;
    const whole = JSON.stringify(doc).length;
    const split = splitProjectPages(doc);
    const manifest = JSON.stringify(split.project).length;
    const onePage = JSON.stringify(split.pages.page7).length;
    expect(Object.keys(split.pages)).toHaveLength(200);
    expect(manifest + onePage).toBeLessThan(whole / 5);
    const t0 = performance.now();
    JSON.parse(JSON.stringify(doc));
    const parseWhole = performance.now() - t0;
    console.info(
      `[bench] 200-page document ${(whole / 1024).toFixed(0)} KB (parse ${parseWhole.toFixed(1)} ms) → manifest ${(manifest / 1024).toFixed(0)} KB + one page ${(onePage / 1024).toFixed(1)} KB on the first visit`,
    );
  });

  test("a split page shows the fallback and asks the loader for its file", async () => {
    const { model, api, pages } = largeProject(3);
    const calls: [string, string][] = [];
    const loadPage: PageBodyLoader = (src, key) => {
      calls.push([src, key]);
      return new Promise(() => {});
    };
    const split: TPageEntries = { ...pages, page1: { path: "/page-1", src: "pages/page1.json" } };
    resetCoreStats();
    const html = render(<PageRouter http={http()} model={model} api={api} pages={split} loadPage={loadPage} />, "/page-1");
    expect(html).toContain("Loading page…");
    await new Promise((r) => setTimeout(r, 0)); // the load starts on the next tick
    expect(calls).toEqual([["pages/page1.json", "page1"]]);
    expect(coreStats().constructed).toBe(0);
  });
});
