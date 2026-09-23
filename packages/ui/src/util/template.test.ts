import { describe, expect, test } from "bun:test";
import { escapeHtml, renderTemplate, templateFields } from "./template";

const row = {
  name: "Thailand",
  code: "TH",
  region: { name: "Asia" },
  tags: ["a", "b"],
  evil: '<img src=x onerror="alert(1)">',
  empty: null,
  count: 0,
};

describe("renderTemplate", () => {
  test("fills row paths, tolerating whitespace", () => {
    expect(renderTemplate("<b>{{name}}</b> · {{ region.name }} · {{tags.0}}", row)).toBe(
      "<b>Thailand</b> · Asia · a",
    );
  });

  test("escapes every interpolated value", () => {
    expect(renderTemplate("<span>{{evil}}</span>", row)).toBe(
      "<span>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;</span>",
    );
  });

  test("{{value}} is the column's formatted value, not a row field", () => {
    expect(renderTemplate("{{value}}", { value: "row field" }, "01/02/2026")).toBe("01/02/2026");
  });

  test("nullish and missing paths render empty; falsy primitives render", () => {
    expect(renderTemplate("[{{empty}}][{{missing.deep}}][{{count}}]", row)).toBe("[][][0]");
  });

  test("primitive arrays join, objects render empty", () => {
    expect(renderTemplate("{{tags}}|{{region}}", row)).toBe("a, b|");
  });

  test("leaves single braces and CSS alone", () => {
    expect(renderTemplate('<i style="color: red">{name}</i>', row)).toBe('<i style="color: red">{name}</i>');
  });
});

describe("templateFields", () => {
  test("distinct row paths in order, without the value alias", () => {
    expect(templateFields("{{name}} {{value}} {{code}} {{name}} {{region.name}}")).toEqual([
      "name",
      "code",
      "region.name",
    ]);
  });
});

describe("escapeHtml", () => {
  test("escapes the five significant characters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
});
