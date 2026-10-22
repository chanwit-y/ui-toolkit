import { describe, expect, test } from "bun:test";
import { assertGummyProject, GummyProjectError, projectApiToEngine } from "./project";

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

describe("projectApiToEngine", () => {
  test("fills the engine-required description and withOptions", () => {
    const api = projectApiToEngine({ one: { url: "/one", methods: "GET", response: "res" } });
    expect(api.one).toEqual({ url: "/one", methods: "GET", response: "res", description: "", withOptions: false });
  });
});
