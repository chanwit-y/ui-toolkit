import { describe, expect, test } from "bun:test";
import { sidebarActiveBackground, sidebarIndicator, sidebarRailWidth, sidebarStyle, sidebarVariant } from "./sidebarStyle";

describe("sidebarVariant", () => {
  test("plain unless pill", () => {
    expect(sidebarVariant()).toBe("plain");
    expect(sidebarVariant({ variant: "plain" })).toBe("plain");
    expect(sidebarVariant({ variant: "pill" })).toBe("pill");
  });
});

describe("sidebarRailWidth", () => {
  test("per variant, overridable", () => {
    expect(sidebarRailWidth()).toBe("3.5rem");
    expect(sidebarRailWidth({ variant: "pill" })).toBe("4.5rem");
    expect(sidebarRailWidth({ variant: "pill", railWidth: "5rem" })).toBe("5rem");
    expect(sidebarRailWidth({ railWidth: "" })).toBe("3.5rem");
  });
});

describe("sidebarIndicator", () => {
  test("on for pill, off for plain, explicit wins", () => {
    expect(sidebarIndicator()).toBe(false);
    expect(sidebarIndicator({ variant: "pill" })).toBe(true);
    expect(sidebarIndicator({ variant: "pill", indicator: false })).toBe(false);
    expect(sidebarIndicator({ indicator: true })).toBe(true);
  });
});

describe("sidebarActiveBackground", () => {
  test("gradient with both stops wins, else the colour", () => {
    expect(sidebarActiveBackground()).toBeUndefined();
    expect(sidebarActiveBackground({ activeBackground: "#c4b5fd" })).toBe("#c4b5fd");
    expect(
      sidebarActiveBackground({ activeBackground: "#c4b5fd", activeGradient: { from: "#e0f2fe", to: "#c4b5fd" } })
    ).toBe("linear-gradient(90deg, #e0f2fe, #c4b5fd)");
    expect(sidebarActiveBackground({ activeGradient: { from: "#e0f2fe", to: "#c4b5fd", angle: 135 } })).toBe(
      "linear-gradient(135deg, #e0f2fe, #c4b5fd)"
    );
    expect(sidebarActiveBackground({ activeGradient: { from: "#e0f2fe", to: "" } })).toBeUndefined();
  });
});

describe("sidebarStyle", () => {
  test("only the overrides that are set", () => {
    expect(sidebarStyle()).toEqual({});
    expect(sidebarStyle({ variant: "pill" })).toEqual({});
    expect(
      sidebarStyle({ itemBackground: "#f5f3ff", activeGradient: { from: "#e0f2fe", to: "#c4b5fd" }, indicatorColor: "#3730a3" })
    ).toEqual({
      "--gummy-side-item": "#f5f3ff",
      "--gummy-side-active": "linear-gradient(90deg, #e0f2fe, #c4b5fd)",
      "--gummy-side-indicator": "#3730a3",
    });
  });
});
