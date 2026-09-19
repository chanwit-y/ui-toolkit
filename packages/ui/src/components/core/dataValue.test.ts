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
