import { describe, expect, test } from "bun:test";
import type { ContainerLoad } from "../@types";
import { ConditionExpression, conditionStateKeys } from "./expression";
import { loadCycles, loadDependencies, resolveLoadRequest } from "./pageLoads";
import { getStateStore, readSlice } from "./stateStore";
import { resolveDataValue } from "./dataValue";

const load = (key: string, reads: string[] = []): ContainerLoad => ({
  key,
  api: {
    name: `api-${key}`,
    params: Object.fromEntries(reads.map((r) => [r, { type: "state", key: r, path: "id" }])),
  } as ContainerLoad["api"],
});

describe("resolveLoadRequest — hold until resolved", () => {
  test("a URL :param with no value holds the request", () => {
    const r = resolveLoadRequest({ params: { id: { type: "url", key: "code" } } }, { params: {} }, "/countries/:id");
    expect(r.held).toBe(true);
  });

  test("resolved :params fire", () => {
    const r = resolveLoadRequest({ params: { id: { type: "url", key: "code" } } }, { params: { code: "TH" } }, "/countries/:id");
    expect(r).toEqual({ query: {}, params: { id: "TH" }, body: {}, held: false });
  });

  test("a state value that hasn't landed holds; it fires once the slice has data", () => {
    const api = { query: { region: { type: "state" as const, key: "pl-test-country", path: "region" } } };
    getStateStore("pl-test-country").getState().clear();
    expect(resolveLoadRequest(api, {}, "/regions").held).toBe(true);
    getStateStore("pl-test-country").getState().setData({ region: "asia" });
    const r = resolveLoadRequest(api, {}, "/regions");
    expect(r.held).toBe(false);
    expect(r.query).toEqual({ region: "asia" });
  });

  test("literals never hold", () => {
    expect(resolveLoadRequest({ query: { limit: { type: "value", key: "none", value: 5 } } }, {}, "/x").held).toBe(false);
  });
});

describe("load graph", () => {
  test("dependencies are the state keys a load reads", () => {
    expect(loadDependencies([load("a"), load("b", ["a"])])).toEqual({ a: [], b: ["a"] });
  });

  test("a chain has no cycle", () => {
    expect(loadCycles([load("a"), load("b", ["a"]), load("c", ["b"])])).toEqual([]);
  });

  test("a two-load cycle is reported once", () => {
    const cycles = loadCycles([load("a", ["b"]), load("b", ["a"])]);
    expect(cycles).toHaveLength(1);
    expect(cycles[0][0]).toBe(cycles[0][cycles[0].length - 1]);
  });

  test("a self-reference is a cycle", () => {
    expect(loadCycles([load("a", ["a"])])).toEqual([["a", "a"]]);
  });

  test("a slice filled elsewhere is not part of the graph", () => {
    expect(loadCycles([load("a", ["outside"])])).toEqual([]);
  });
});

describe("slice status — $status / $error", () => {
  test("readSlice reads status and error off the slice, anything else drills data", () => {
    const s = getStateStore("pl-test-status").getState();
    s.setLoad({ data: { name: "Thailand" }, status: "error", error: { message: "404" } });
    expect(readSlice("pl-test-status", "$status")).toBe("error");
    expect(readSlice("pl-test-status", "$error.message")).toBe("404");
    expect(readSlice("pl-test-status", "name")).toBe("Thailand");
    expect(resolveDataValue({ type: "state", key: "pl-test-status", path: "$status" })).toBe("error");
  });

  test("clear resets data and status", () => {
    getStateStore("pl-test-status").getState().clear();
    expect(readSlice("pl-test-status", "$status")).toBe("idle");
    expect(readSlice("pl-test-status")).toBeUndefined();
  });
});

describe("conditions — source: state", () => {
  test("a state ref reads the slice, not the context", () => {
    getStateStore("pl-test-cond").getState().setLoad({ data: { featured: true }, status: "success" });
    const expr = new ConditionExpression({ "pl-test-cond": { featured: false } });
    expect(expr.expression({ left: { source: "state", key: "pl-test-cond", path: "featured" }, operator: "eq", right: { val: true } })).toBe(true);
    expect(expr.expression({ left: { key: "pl-test-cond", path: "featured" }, operator: "eq", right: { val: true } })).toBe(false);
    expect(expr.expression({ left: { source: "state", key: "pl-test-cond", path: "$status" }, operator: "eq", right: { val: "success" } })).toBe(true);
  });

  test("conditionStateKeys walks nested expressions", () => {
    expect(
      conditionStateKeys([
        {
          left: { left: { source: "state", key: "a", path: "x" }, operator: "eq", right: { val: 1 } },
          operator: "and",
          right: { left: { source: "state", key: "b", path: "$status" }, operator: "eq", right: { val: "error" } },
        },
        { left: { key: "ctx", path: "_id" }, operator: "eq", right: { val: undefined } },
        undefined,
      ]),
    ).toEqual(["a", "b"]);
  });
});
