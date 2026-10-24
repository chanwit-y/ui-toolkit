import { afterEach, describe, expect, test } from "bun:test";
import { assertPageBody, fetchPageLoader, globPageLoader, PageBodyCache } from "./pageBodies";

const body = { containers: [{ grid: {}, bins: [] }] };

describe("assertPageBody", () => {
  test("accepts { containers, loads? } and names the page otherwise", () => {
    expect(assertPageBody(body, "home", "pages/home.json")).toBe(body as never);
    expect(() => assertPageBody({}, "home", "pages/home.json")).toThrow('Page "home" (pages/home.json) is not a page file');
    expect(() => assertPageBody({ containers: [], loads: {} }, "home", "x")).toThrow('"loads" must be an array');
  });
});

describe("PageBodyCache", () => {
  const quiet = console.error;
  afterEach(() => {
    console.error = quiet;
  });

  test("one load per page: pending, then ready, shared by later reads", async () => {
    let calls = 0;
    const cache = new PageBodyCache(async () => {
      calls += 1;
      return body as never;
    });
    const first = cache.read("home", "pages/home.json");
    expect(first.status).toBe("pending");
    expect(cache.read("home", "pages/home.json")).toBe(first);
    await cache.prefetch("home", "pages/home.json");
    const ready = cache.read("home", "pages/home.json");
    expect(ready.status).toBe("ready");
    expect(ready.status === "ready" && ready.body).toBe(body as never);
    expect(calls).toBe(1);
  });

  test("a failure is kept until retry, then loads again", async () => {
    console.error = () => {};
    let ok = false;
    const cache = new PageBodyCache(async () => {
      if (!ok) throw new Error("offline");
      return body as never;
    });
    await cache.prefetch("home", "pages/home.json");
    const failed = cache.read("home", "pages/home.json");
    expect(failed.status).toBe("error");
    expect(failed.status === "error" && (failed.error as Error).message).toBe("offline");
    ok = true;
    cache.retry("home", "pages/home.json");
    await cache.prefetch("home", "pages/home.json");
    expect(cache.read("home", "pages/home.json").status).toBe("ready");
  });

  test("a file that is not a page body is an error, not a crash at build", async () => {
    console.error = () => {};
    const cache = new PageBodyCache(async () => ({ nope: true }) as never);
    await cache.prefetch("home", "pages/home.json");
    expect(cache.read("home", "pages/home.json").status).toBe("error");
  });
});

describe("loaders", () => {
  test("globPageLoader resolves src under the project folder, with or without `import: default`", async () => {
    const plain = globPageLoader({ "../gummy/projects/shop/pages/home.json": async () => body }, "../gummy/projects/shop/");
    expect(await plain("pages/home.json", "home")).toBe(body as never);
    const wrapped = globPageLoader({ "../gummy/projects/shop/pages/home.json": async () => ({ default: body }) }, "../gummy/projects/shop");
    expect(await wrapped("./pages/home.json", "home")).toBe(body as never);
    await expect(plain("pages/missing.json", "missing")).rejects.toThrow("no page file ../gummy/projects/shop/pages/missing.json");
  });

  test("fetchPageLoader resolves src against the project URL from the site root", async () => {
    const seen: string[] = [];
    const real = globalThis.fetch;
    globalThis.fetch = (async (url: string) => {
      seen.push(String(url));
      return new Response(JSON.stringify(body), { status: url.includes("missing") ? 404 : 200 });
    }) as typeof fetch;
    try {
      await fetchPageLoader("/gummy/projects/shop/")("pages/home.json", "home");
      await fetchPageLoader("/gummy/projects/shop/project.json")("pages/home.json", "home");
      await fetchPageLoader()("pages/home.json", "home");
      await expect(fetchPageLoader()("pages/missing.json", "missing")).rejects.toThrow("HTTP 404");
    } finally {
      globalThis.fetch = real;
    }
    expect(seen.slice(0, 3)).toEqual([
      "http://localhost/gummy/projects/shop/pages/home.json",
      "http://localhost/gummy/projects/shop/pages/home.json",
      "http://localhost/pages/home.json",
    ]);
  });
});
