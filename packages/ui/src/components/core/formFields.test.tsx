import { describe, expect, test } from "bun:test";
import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { FormProvider, useForm, type FieldValues, type UseFormReturn } from "react-hook-form";
import type { BinType, TElement } from "../@types";
import { DataProvider, ThemeProvider } from "../context";
import { toNumberValue } from "../hoc/withForm";
import { toSelectedValues } from "../MultiAutocomplete";
import { ElementContext } from "./elementBuilder";

/** React's server renderer warns about layout effects; the tests only read the markup. */
function quietly<T>(fn: () => T): T {
  const error = console.error;
  console.error = () => {};
  try {
    return fn();
  } finally {
    console.error = error;
  }
}

/**
 * Builds `element` as the engine does and renders it on a form holding
 * `values` (its defaults are `defaults`, the row an edit modal opened on).
 */
function renderOnForm(type: BinType, element: Record<string, unknown>, defaults: FieldValues, values?: FieldValues): string {
  function Host() {
    const form = useForm({ defaultValues: defaults });
    for (const [k, v] of Object.entries(values ?? {})) form.setValue(k, v);
    const built = new ElementContext(element as unknown as TElement)
      .Form(form as UseFormReturn)
      .APIs({ api: {}, apis: {} } as never)
      .build(type);
    return <FormProvider {...form}>{built?.create() as ReactElement}</FormProvider>;
  }
  return quietly(() =>
    renderToString(
      <DataProvider>
        <ThemeProvider components={{}}>
          <Host />
        </ThemeProvider>
      </DataProvider>,
    ),
  );
}

const SPAN = { sm: 12, md: 12, lg: 12, xl: 12 };

describe("tab — panels draw on the enclosing form", () => {
  test("a field in a tab shows (and so edits) the modal form's value", () => {
    const tab = {
      tabs: [
        {
          value: "general",
          label: "General",
          container: {
            id: "general",
            name: "general",
            bins: [{ ...SPAN, type: "textfield", element: { name: "title", dataType: "string", isRequired: true, label: "Title" } }],
          },
        },
      ],
    };
    // A panel with a form of its own rendered this field blank (its form had no row).
    expect(renderOnForm("tab", tab, { title: "Quarterly review" })).toContain('value="Quarterly review"');
  });
});

describe("textfield — number", () => {
  const score = { name: "score", dataType: "number", label: "Score" };

  test("blank text is null, not undefined", () => {
    expect(toNumberValue("")).toBeNull();
    expect(toNumberValue(null)).toBeNull();
    expect(toNumberValue(undefined)).toBeNull();
    expect(toNumberValue("42")).toBe(42);
    expect(toNumberValue("4.5")).toBe(4.5);
    expect(toNumberValue("abc")).toBeNaN();
  });

  test("a cleared field stays blank instead of snapping back to the row's value", () => {
    expect(renderOnForm("textfield", score, { score: 80 })).toContain('value="80"');
    const cleared = renderOnForm("textfield", score, { score: 80 }, { score: toNumberValue("") });
    expect(cleared).toContain('value=""');
    expect(cleared).not.toContain('value="80"');
  });
});

describe("textfield — helperText / isRequired", () => {
  test("the helper text and the required marker render", () => {
    const html = renderOnForm(
      "textfield",
      { name: "title", dataType: "string", label: "Title", helperText: "Shown on the card", isRequired: true },
      {},
    );
    expect(html).toContain("Shown on the card");
    expect(html).toContain('aria-required="true"');
    expect(html).toContain(">*</span>");
  });
});

describe("multiAutocomplete — saved values", () => {
  const teams = {
    name: "teams",
    dataType: "array",
    label: "Teams",
    keys: { search: "name", id: "id", display: "name" },
    options: [
      { id: "t1", name: "Platform" },
      { id: "t2", name: "Payments" },
      { id: "t3", name: "Growth" },
    ],
  };

  test("a form value becomes the selected ids", () => {
    expect(toSelectedValues(["t1", 2])).toEqual(["t1", "2"]);
    expect(toSelectedValues("t1")).toEqual(["t1"]);
    expect(toSelectedValues(null)).toEqual([]);
    expect(toSelectedValues("")).toEqual([]);
    expect(toSelectedValues(undefined)).toEqual([]);
  });

  test("the row's array shows as the selection", () => {
    const html = renderOnForm("multiAutocomplete", teams, { teams: ["t1", "t3"] });
    expect(html).toContain("Platform");
    expect(html).toContain("Growth");
    expect(html).not.toContain("Payments");
  });
});
