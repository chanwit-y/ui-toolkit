import { describe, expect, test } from "bun:test";
import { escapeHtml, renderTemplate, renderUrlTemplate, templateFields } from "./template";

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

describe("renderUrlTemplate", () => {
  test("encodes each value so it stays one path segment", () => {
    expect(renderUrlTemplate("/files/{{name}}/{{id}}", { name: "Q4 report.pdf", id: "a/b?c" })).toBe(
      "/files/Q4%20report.pdf/a%2Fb%3Fc",
    );
  });

  test("a blank placeholder means no URL yet", () => {
    expect(renderUrlTemplate("/files/{{id}}/content", {})).toBeUndefined();
    expect(renderUrlTemplate("/files/{{id}}/content", { id: "" })).toBeUndefined();
    expect(renderUrlTemplate("/files/{{id}}/content", { id: { nested: 1 } })).toBeUndefined();
  });

  test("keeps falsy values that are values", () => {
    expect(renderUrlTemplate("/files/{{id}}", { id: 0 })).toBe("/files/0");
  });

  test("{{value}} reads the value, else a row field", () => {
    expect(renderUrlTemplate("/f/{{value}}", undefined, "n1")).toBe("/f/n1");
    expect(renderUrlTemplate("/f/{{value}}", { value: "n2" })).toBe("/f/n2");
  });

  test("a template with no placeholder is the URL", () => {
    expect(renderUrlTemplate("/files/fixed.pdf", {})).toBe("/files/fixed.pdf");
  });
});
