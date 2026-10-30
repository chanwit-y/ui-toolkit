import { describe, expect, test } from "bun:test";
import { z } from "zod";
import type { Bin, Container } from "../@types";
import { collectFieldGates, computedCycles, gateDecisions, narrowSchema } from "./formLogic";
import { Schema } from "./schema";

const bin = (type: string, element: Record<string, unknown>, extra: Partial<Bin> = {}): Bin =>
  ({ sm: "12", md: "12", lg: "12", xl: "12", type, element, ...extra }) as Bin;
const field = (name: string, extra: Record<string, unknown> = {}) =>
  ({ name, dataType: "string", isRequired: true, errorMessage: `${name} required`, ...extra });
const isBusiness = { cmp: "eq", left: { ref: "field", key: "type" }, right: { lit: "Business" } } as const;
const accepted = { cmp: "eq", left: { ref: "field", key: "accept" }, right: { lit: true } } as const;

const container: Container = {
  id: "c",
  name: "form",
  bins: [
    bin("radio", field("type")),
    bin("textfield", field("company"), { condition: isBusiness }),
    bin("textfield", field("note", { enabledWhen: accepted })),
    bin("textfield", field("locked", { disabled: true })),
    bin("textfield", field("taxId", { isRequired: true, requiredWhen: isBusiness })),
    bin("hidden", { name: "_id", dataType: "string" }, { condition: isBusiness }),
    bin("textfield", field("total", { valueMode: "computed", value: { type: "formula", key: "none", expr: { lit: 1 } } })),
    { sm: "12", md: "12", lg: "12", xl: "12", type: "container", condition: isBusiness, container: { id: "n", name: "n", bins: [bin("textfield", field("vat"))] } } as Bin,
    bin("tab", { tabs: [{ label: "A", container: { id: "t", name: "t", bins: [bin("textfield", field("inTab"))] } }] }, { condition: isBusiness }),
  ],
} as unknown as Container;

const gates = collectFieldGates([container]);
const decide = (values: Record<string, unknown>) => gateDecisions(gates, { field: (n) => values[n] }, {});

describe("form gates", () => {
  test("collects fields through nested containers and tabs, with inherited conditions", () => {
    const byName = Object.fromEntries(gates.map((g) => [g.name, g]));
    expect(Object.keys(byName).sort()).toEqual(["_id", "company", "inTab", "locked", "note", "taxId", "total", "type", "vat"]);
    expect(byName.taxId.requiredWhen).toBeDefined();
    expect(byName.vat.conditions).toHaveLength(1);
    expect(byName.inTab.conditions).toHaveLength(1);
    expect(byName._id.conditions).toHaveLength(0); // a hidden bin is never hidden away
    expect(byName.total.computed).toBeDefined();
  });

  test("hidden fields are skipped, disabled ones relaxed, computed ones kept", () => {
    const personal = decide({ type: "Personal", accept: false });
    expect([...personal.skip].sort()).toEqual(["company", "inTab", "vat"]);
    expect([...personal.relax].sort()).toEqual(["locked", "note"]);
    const business = decide({ type: "Business", accept: true });
    expect(business.skip.size).toBe(0);
    expect([...business.relax]).toEqual(["locked"]);
    // requiredWhen: optional while it doesn't hold, required while it does.
    expect([...personal.optional]).toEqual(["taxId"]);
    expect(business.optional.size).toBe(0);
  });

  test("a requiredWhen field may be blank while the condition fails, must be filled while it holds", () => {
    const schema = new Schema([container]).generate();
    const base = { type: "Business", company: "c", note: "n", locked: "l", total: "1", _id: "x", vat: "v", inTab: "i", accept: true };
    const business = narrowSchema(schema, decide({ type: "Business", accept: true }));
    expect(business.safeParse({ ...base, taxId: "" }).success).toBe(false);
    expect(business.safeParse({ ...base, taxId: "TH-1" }).success).toBe(true);
    const personal = narrowSchema(schema, decide({ type: "Personal", accept: true }));
    const out = personal.safeParse({ ...base, type: "Personal", taxId: "" });
    expect(out.success).toBe(true);
    if (out.success) expect("taxId" in out.data).toBe(true); // still submitted
  });

  test("the narrowed schema neither validates nor returns hidden fields", () => {
    const schema = new Schema([container]).generate();
    const narrowed = narrowSchema(schema, decide({ type: "Personal" }));
    const out = narrowed.safeParse({ type: "Personal", company: "", note: "", locked: "", total: "1", _id: "x", vat: "" });
    expect(out.success).toBe(true);
    if (out.success) expect("company" in out.data).toBe(false);
    // Unnarrowed, the hidden required company blocks the submit.
    expect(schema.safeParse({ type: "Personal", company: "", note: "n", locked: "l", total: "1", _id: "x", vat: "v", inTab: "i" }).success).toBe(false);
  });

  test("narrowSchema leaves non-object schemas alone", () => {
    const s = z.string();
    expect(narrowSchema(s, { skip: new Set(["a"]), relax: new Set(), optional: new Set() })).toBe(s);
  });

  test("computed fields reading each other are cyclic", () => {
    const cyc = collectFieldGates([
      {
        id: "x",
        name: "x",
        bins: [
          bin("textfield", field("a", { valueMode: "computed", value: { type: "formula", key: "none", expr: { op: "+", args: [{ ref: "field", key: "b" }, { lit: 1 }] } } })),
          bin("textfield", field("b", { valueMode: "computed", value: { type: "formula", key: "none", expr: { ref: "field", key: "a" } } })),
          bin("textfield", field("c", { valueMode: "computed", value: { type: "formula", key: "none", expr: { ref: "field", key: "a" } } })),
        ],
      } as unknown as Container,
    ]);
    expect([...computedCycles(cyc, undefined)].sort()).toEqual(["a", "b"]);
  });
});
