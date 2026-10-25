import { describe, expect, test } from "bun:test";
import type { Bin, Container } from "../@types";
import { Schema } from "./schema";

function bin(type: string, element: Record<string, unknown>): Bin {
  return { type, element, sm: 12, md: 12, lg: 12, xl: 12 } as unknown as Bin;
}

function schemaOf(...bins: Bin[]) {
  const container = { id: "c", name: "form", bins } as unknown as Container;
  return new Schema([container]).generate();
}

function errors(result: ReturnType<ReturnType<typeof schemaOf>["safeParse"]>): Record<string, string> {
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((i) => [i.path.join("."), i.message]));
}

describe("Schema — optional fields accept null", () => {
  const schema = schemaOf(
    bin("textfield", { name: "note", dataType: "string", isRequired: false }),
    bin("textfield", { name: "score", dataType: "number", isRequired: false }),
    bin("autocomplete", { name: "team", dataType: "string" }),
  );

  test("null passes for an optional string and number", () => {
    const result = schema.safeParse({ note: null, score: null, team: null });
    expect(errors(result)).toEqual({});
  });

  test("undefined still passes, a wrong type still fails", () => {
    expect(schema.safeParse({}).success).toBe(true);
    expect(errors(schema.safeParse({ score: "7" })).score).toBe("Expected number, received string");
  });

  test("a required field still rejects null", () => {
    const required = schemaOf(
      bin("textfield", { name: "title", dataType: "string", isRequired: true }),
      bin("textfield", { name: "score", dataType: "number", isRequired: true, errorMessage: "Score is required" }),
    );
    expect(errors(required.safeParse({ title: null, score: null }))).toEqual({
      title: "Required",
      score: "Score is required",
    });
    expect(required.safeParse({ title: "Ship it", score: 0 }).success).toBe(true);
  });
});

describe("Schema — dataType any (checkbox group)", () => {
  test("an array value is accepted", () => {
    const schema = schemaOf(bin("checkbox", { name: "days", dataType: "any", isRequired: false }));
    expect(errors(schema.safeParse({ days: ["mon", "tue"] }))).toEqual({});
    expect(schema.safeParse({ days: null }).success).toBe(true);
  });

  test("required means something is chosen", () => {
    const schema = schemaOf(bin("checkbox", { name: "days", dataType: "any", isRequired: true, errorMessage: "Pick a day" }));
    expect(schema.safeParse({ days: ["mon"] }).success).toBe(true);
    expect(errors(schema.safeParse({ days: [] })).days).toBe("Pick a day");
    expect(errors(schema.safeParse({})).days).toBe("Pick a day");
  });
});

describe("Schema — a name without a dataType", () => {
  test("an html item never blocks the save, its value passes through", () => {
    const schema = schemaOf(
      bin("html", { name: "hint", html: "<b>Note</b>" }),
      bin("textfield", { name: "title", dataType: "string", isRequired: true }),
    );
    expect(schema.safeParse({ title: "Ship it" }).success).toBe(true);
    const parsed = schema.safeParse({ title: "Ship it", hint: 42 });
    expect(parsed.success && parsed.data).toEqual({ title: "Ship it", hint: 42 });
  });
});
