import { describe, expect, test } from "bun:test";
import { resolveDataValue, resolveDataValues } from "./dataValue";
import { getStateStore } from "./stateStore";

describe("resolveDataValue — row scope (repeater items)", () => {
  const row = { _id: "c1", name: "Thailand", flag: { png: "/th.png" }, languages: ["th", "en"] };

  test("reads a field off the row", () => {
    expect(resolveDataValue({ type: "row", key: "name" }, { row })).toBe("Thailand");
  });

  test("drills `path` into the field", () => {
    expect(resolveDataValue({ type: "row", key: "flag", path: "png" }, { row })).toBe("/th.png");
  });

  test('`key:"none"` is the row itself — an item of a primitive array', () => {
    expect(resolveDataValue({ type: "row", key: "none" }, { row: "THA" })).toBe("THA");
    expect(resolveDataValue({ type: "row", key: "none", path: "flag.png" }, { row })).toBe("/th.png");
  });

  test("an array field feeds a nested repeater", () => {
    expect(resolveDataValue({ type: "row", key: "languages" }, { row })).toEqual(["th", "en"]);
  });

  test("is undefined outside a row scope", () => {
    expect(resolveDataValue({ type: "row", key: "name" }, {})).toBeUndefined();
  });

  test("falsy primitive rows still resolve", () => {
    expect(resolveDataValue({ type: "row", key: "none" }, { row: 0 })).toBe(0);
  });
});

describe("resolveDataValue — state source (repeater `items`)", () => {
  test("drills an array out of a global-state slice", () => {
    getStateStore("dv-test-country").getState().setData({ borders: [{ code: "LAO" }, { code: "MYS" }] });
    expect(
      resolveDataValue({ type: "state", key: "dv-test-country", path: "borders" })
    ).toEqual([{ code: "LAO" }, { code: "MYS" }]);
  });
});

describe("resolveDataValues", () => {
  test("mixes row, url and literal sources and drops unresolved entries", () => {
    expect(
      resolveDataValues(
        {
          id: { type: "row", key: "_id" },
          tab: { type: "url", key: "tab", source: "query" },
          kind: { type: "value", key: "kind", value: "card" },
          missing: { type: "row", key: "nope" },
        },
        { row: { _id: "c1" }, searchParams: new URLSearchParams("tab=info") }
      )
    ).toEqual({ id: "c1", tab: "info", kind: "card" });
  });
});

describe("type:\"filter\" (a data table's applied filters)", () => {
  const filters = { name: "an", code: "", editors: [], active: false, min: 0, range: { from: "2025-01-01" } };

  test("reads the applied filter by field name, drilled by path", () => {
    expect(resolveDataValue({ type: "filter", key: "name" }, { filters })).toBe("an");
    expect(resolveDataValue({ type: "filter", key: "range", path: "from" }, { filters })).toBe("2025-01-01");
  });

  test("a blank filter is undefined, so resolveDataValues leaves its key out", () => {
    const map = {
      name: { type: "filter", key: "name" },
      code: { type: "filter", key: "code" },
      editors: { type: "filter", key: "editors" },
      missing: { type: "filter", key: "nope" },
    } as const;
    expect(resolveDataValues(map, { filters })).toEqual({ name: "an" });
  });

  test("false and 0 are real filter values", () => {
    expect(resolveDataValue({ type: "filter", key: "active" }, { filters })).toBe(false);
    expect(resolveDataValue({ type: "filter", key: "min" }, { filters })).toBe(0);
  });

  test("`value` is the fallback while the filter is blank (a URL :param)", () => {
    expect(resolveDataValue({ type: "filter", key: "code", value: "all" }, { filters })).toBe("all");
    expect(resolveDataValue({ type: "filter", key: "name", value: "all" }, { filters })).toBe("an");
    expect(resolveDataValue({ type: "filter", key: "code", value: "all" }, {})).toBe("all");
  });
});
