import { describe, expect, test } from "bun:test";
import { assertGummyProject, GummyProjectError, projectApiToEngine, splitProjectPages, type GummyProject } from "./project";

const valid = () => ({
  schemaVersion: 1,
  name: "Demo",
  model: { res: { data: "any" }, param: { id: "string" } },
  api: { one: { url: "/one/:id", methods: "GET", response: "res", parameter: "param" } },
  pages: { home: { path: "/", containers: [] }, child: { path: "/c/:id", parent: "home", containers: [] } },
});

describe("assertGummyProject", () => {
  test("returns a valid document", () => {
    expect(assertGummyProject(valid()).name).toBe("Demo");
  });

  test("rejects another schema version with the expected one in the message", () => {
    expect(() => assertGummyProject({ ...valid(), schemaVersion: 2 })).toThrow(/schemaVersion 2 .*expected 1/);
  });

  test("names an endpoint whose model reference is missing", () => {
    const p = valid();
    (p.api.one as { response: string }).response = "nope";
    expect(() => assertGummyProject(p)).toThrow(/api\.one\.response .*"nope"/);
  });

  test("names a page whose parent does not exist", () => {
    const p = valid();
    (p.pages.child as { parent: string }).parent = "gone";
    expect(() => assertGummyProject(p)).toThrow(/pages\.child\.parent .*"gone"/);
  });

  test("rejects an empty pages record and non-objects", () => {
    expect(() => assertGummyProject({ ...valid(), pages: {} })).toThrow(GummyProjectError);
    expect(() => assertGummyProject(null)).toThrow(GummyProjectError);
  });
});

describe("assertGummyProject: theme", () => {
  test("accepts surface and background on the theme", () => {
    const p = { ...valid(), theme: { theme: { accentColor: "iris", surface: "glass", background: "linear-gradient(#000, #fff)" } } };
    expect(assertGummyProject(p).theme?.theme?.surface).toBe("glass");
  });

  test("rejects a surface that is neither flat nor glass", () => {
    const p = { ...valid(), theme: { theme: { surface: "frosted" } } };
    expect(() => assertGummyProject(p)).toThrow(/theme\.theme\.surface .*"frosted"/);
  });

  test("rejects a non-string background", () => {
    const p = { ...valid(), theme: { theme: { surface: "glass", background: { from: "#000" } } } };
    expect(() => assertGummyProject(p)).toThrow(/theme\.theme\.background/);
  });
});

describe("projectApiToEngine", () => {
  test("fills the engine-required description and withOptions", () => {
    const api = projectApiToEngine({ one: { url: "/one", methods: "GET", response: "res" } });
    expect(api.one).toEqual({ url: "/one", methods: "GET", response: "res", description: "", withOptions: false });
  });
});

describe("assertGummyProject: auth", () => {
  const withAuth = (auth: unknown) => ({ ...valid(), auth });

  test("accepts an azure block whose profile endpoint exists", () => {
    const p = withAuth({ provider: "azure", profile: { api: { name: "one", paths: ["data"] }, emailParam: "id" } });
    expect(assertGummyProject(p).auth?.provider).toBe("azure");
  });

  test("rejects another provider", () => {
    expect(() => assertGummyProject(withAuth({ provider: "okta" }))).toThrow(/auth\.provider/);
  });

  test("rejects a non-string env var name", () => {
    expect(() => assertGummyProject(withAuth({ provider: "azure", env: { tenantId: 1 } }))).toThrow(/auth\.env\.tenantId/);
  });

  test("names a profile endpoint that is not in api", () => {
    expect(() => assertGummyProject(withAuth({ provider: "azure", profile: { api: { name: "nope" }, emailParam: "email" } }))).toThrow(/auth\.profile\.api\.name .*"nope"/);
  });
});

describe("split pages", () => {
  test("a page entry may carry `src` instead of `containers`", () => {
    const p = valid();
    (p.pages as Record<string, unknown>).child = { path: "/c/:id", parent: "home", src: "pages/child.json" };
    expect(assertGummyProject(p).pages.child.src).toBe("pages/child.json");
  });

  test("a page with neither a body nor a file is named", () => {
    const p = valid();
    (p.pages as Record<string, unknown>).child = { path: "/c/:id" };
    expect(() => assertGummyProject(p)).toThrow(/pages\.child needs a `containers` array or a `src` page file/);
    (p.pages as Record<string, unknown>).child = { path: "/c/:id", src: "  " };
    expect(() => assertGummyProject(p)).toThrow(GummyProjectError);
  });

  test("splitProjectPages keeps the route meta, moves the bodies into files, leaves split pages alone", () => {
    const loads = [{ key: "me", api: { name: "one" } }];
    const doc = {
      ...valid(),
      pages: {
        home: { path: "/", title: "Home", containers: [{ bins: [] }], loads },
        "detail/view": { path: "/d", parent: "home", breadcrumb: false, containers: [] },
        done: { path: "/x", src: "pages/done.json" },
      },
    } as unknown as GummyProject;
    const { project, pages } = splitProjectPages(doc);
    expect(project.pages.home).toEqual({ path: "/", title: "Home", src: "pages/home.json" });
    expect(project.pages["detail/view"]).toEqual({ path: "/d", parent: "home", breadcrumb: false, src: "pages/detail_view.json" });
    expect(project.pages.done).toEqual({ path: "/x", src: "pages/done.json" });
    expect(pages).toEqual({ home: { containers: [{ bins: [] }], loads }, detail_view: { containers: [] } } as never);
    expect(assertGummyProject(project).name).toBe("Demo");
    // The input is untouched.
    expect(doc.pages.home.containers).toHaveLength(1);
  });
});
