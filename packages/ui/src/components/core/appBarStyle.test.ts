import { describe, expect, test } from "bun:test";
import { appBarBackground, appBarForeground, appBarStyle, appBarTone, colorLuminance, parseColor } from "./appBarStyle";

describe("appBarTone", () => {
  test("panel by default, accent / custom by variant, custom implied by a paint", () => {
    expect(appBarTone({})).toBe("panel");
    expect(appBarTone({ variant: "accent" })).toBe("accent");
    expect(appBarTone({ variant: "custom" })).toBe("custom");
    expect(appBarTone({ background: "#123" })).toBe("custom");
    expect(appBarTone({ gradient: { from: "#000", to: "#fff" } })).toBe("custom");
    expect(appBarTone({ variant: "panel", background: "#123" })).toBe("panel");
  });
});

describe("colours", () => {
  test("parses hex, rgb and the two named colours", () => {
    expect(parseColor("#fff")).toEqual([255, 255, 255]);
    expect(parseColor("#0F766E")).toEqual([15, 118, 110]);
    expect(parseColor("#0f766e80")).toEqual([15, 118, 110]);
    expect(parseColor("rgb(15, 118, 110)")).toEqual([15, 118, 110]);
    expect(parseColor("rgba(15 118 110 / 0.5)")).toEqual([15, 118, 110]);
    expect(parseColor("white")).toEqual([255, 255, 255]);
    expect(parseColor("var(--teal-9)")).toBeUndefined();
  });
  test("luminance orders black < teal < white", () => {
    expect(colorLuminance("#000")).toBe(0);
    expect(colorLuminance("#fff")).toBeCloseTo(1);
    expect(colorLuminance("#0f766e")!).toBeLessThan(0.5);
    expect(colorLuminance("#ffe")!).toBeGreaterThan(0.5);
  });
});

describe("appBarBackground / appBarForeground", () => {
  test("gradient wins over background, 90deg by default", () => {
    expect(appBarBackground({ background: "#123" })).toBe("#123");
    expect(appBarBackground({ background: "#123", gradient: { from: "#000", to: "#fff" } })).toBe("linear-gradient(90deg, #000, #fff)");
    expect(appBarBackground({ gradient: { from: "#000", to: "#fff", angle: 135 } })).toBe("linear-gradient(135deg, #000, #fff)");
    expect(appBarBackground({})).toBeUndefined();
  });
  test("foreground: explicit, or picked from the paint's luminance, else light", () => {
    expect(appBarForeground({ background: "#0f766e" })).toEqual({ color: "#ffffff", light: true });
    expect(appBarForeground({ background: "#fff7ed" })).toEqual({ color: "#1c1c1c", light: false });
    expect(appBarForeground({ gradient: { from: "#fff", to: "#000" } }).light).toBe(false);
    expect(appBarForeground({ background: "var(--teal-9)" }).light).toBe(true);
    expect(appBarForeground({ background: "#fff", foreground: "light" }).color).toBe("#ffffff");
    expect(appBarForeground({ background: "#000", foreground: "dark" }).color).toBe("#1c1c1c");
    expect(appBarForeground({ background: "#000", foreground: "#ffd700" })).toEqual({ color: "#ffd700", light: true });
  });
});

describe("appBarStyle", () => {
  test("height and padding always; paint and vars only on a custom bar", () => {
    expect(appBarStyle({})).toEqual({ height: "3rem" });
    expect(appBarStyle({ height: "4rem", padding: "0 2rem", variant: "accent" })).toEqual({ height: "4rem", padding: "0 2rem" });
    const custom = appBarStyle({ background: "#0f766e", padding: "0 1rem" }) as Record<string, string>;
    expect(custom.background).toBe("#0f766e");
    expect(custom.color).toBe("#ffffff");
    expect(custom["--gummy-bar-fg"]).toBe("#ffffff");
    expect(custom["--gummy-bar-hover"]).toBe("rgba(255, 255, 255, 0.16)");
    expect(custom.padding).toBe("0 1rem");
    const dark = appBarStyle({ gradient: { from: "#fff", to: "#eee" } }) as Record<string, string>;
    expect(dark["--gummy-bar-hover"]).toBe("rgba(0, 0, 0, 0.08)");
  });
});
