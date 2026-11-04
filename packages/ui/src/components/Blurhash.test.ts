import { describe, expect, test } from "bun:test";
import { blurhashCanvasSize, blurhashHold, decodeBlurhash } from "./Blurhash";

describe("blurhashHold", () => {
  test("whole milliseconds, clamped to 0–10 s", () => {
    expect(blurhashHold(1500.4)).toBe(1500);
    expect(blurhashHold(-1)).toBe(0);
    expect(blurhashHold(60_000)).toBe(10_000);
  });

  test("anything but a number is no hold", () => {
    for (const delay of [undefined, null, "500", Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(blurhashHold(delay)).toBe(0);
    }
  });
});

describe("decodeBlurhash", () => {
  test("a valid hash decodes to opaque RGBA pixels", () => {
    const pixels = decodeBlurhash("LEHV6nWB2yk8pyo0adR*.7kCMdnj", 8);
    expect(pixels?.length).toBe(8 * 8 * 4);
    expect(pixels?.[3]).toBe(255);
  });

  test("anything else draws nothing", () => {
    for (const hash of ["", "not a hash", "LEHV6nWB2yk8", "http://x.test/a.png"]) {
      expect(decodeBlurhash(hash)).toBeUndefined();
    }
  });
});

describe("blurhashCanvasSize", () => {
  test("keeps the image's aspect ratio at a longer side of 256", () => {
    expect(blurhashCanvasSize(640, 360)).toEqual({ width: 256, height: 144 });
    expect(blurhashCanvasSize(36, 64)).toEqual({ width: 144, height: 256 });
    expect(blurhashCanvasSize(100, 100)).toEqual({ width: 256, height: 256 });
  });

  test("a side never rounds to nothing", () => {
    expect(blurhashCanvasSize(1, 10_000)).toEqual({ width: 1, height: 256 });
  });

  test("anything but a positive size is no size", () => {
    for (const [w, h] of [[0, 10], [10, -1], [Number.NaN, 10], ["640", 360], [undefined, undefined], [Number.POSITIVE_INFINITY, 1]] as const) {
      expect(blurhashCanvasSize(w, h)).toBeUndefined();
    }
  });
});
