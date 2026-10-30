import type { Cond, Expr, LogicLibrary } from "@gummy-ui/ui";

/**
 * The example's saved formulas and rules (see `spec/gummy-logic-spec.md`),
 * mounted once in App.tsx through `<FormulasProvider>` and referenced by name
 * from the Logic page (./logicDemo.ts): `{ formula: "subtotal" }`,
 * `{ rule: "isBusiness" }`. A `<GummyApp>` reads the same shapes off
 * `project.formulas` / `project.rules`.
 */
const field = (key: string): Expr => ({ ref: "field", key });
const lit = (v: number | string | boolean): Expr => ({ lit: v });
const gte = (left: Expr, right: Expr): Cond => ({ cmp: "gte", left, right });

export const logicLibrary: LogicLibrary = {
  formulas: {
    // Qty × Unit price.
    subtotal: { expr: { op: "*", args: [field("qty"), field("unitPrice")] } },
    // Subtotal less the tiered discount, plus 7 % VAT.
    total: {
      expr: {
        op: "*",
        args: [
          { op: "*", args: [{ formula: "subtotal" }, { op: "-", args: [lit(1), { rule: "discountRate" }] }] },
          lit(1.07),
        ],
      },
      format: { type: "currency", currency: "THB", decimals: 2 },
    },
    // Population per km², one decimal: the countries table's computed column.
    density: {
      expr: { fn: "ROUND", args: [{ op: "/", args: [{ ref: "row", key: "population" }, { ref: "row", key: "area_km2" }] }, lit(1)] },
      format: { type: "number", decimals: 1 },
    },
  },
  rules: {
    // A tiered discount on the subtotal: 10 % from 10,000, 5 % from 5,000.
    discountRate: {
      resultType: "number",
      format: { type: "percent", decimals: 0 },
      rule: {
        branches: [
          { when: gte({ formula: "subtotal" }, lit(10000)), then: lit(0.1) },
          { when: gte({ formula: "subtotal" }, lit(5000)), then: lit(0.05) },
        ],
        else: lit(0),
      },
    },
    // A boolean rule: usable as a condition (`{ rule: "isBusiness" }`).
    isBusiness: {
      resultType: "boolean",
      rule: { branches: [{ when: { cmp: "eq", left: field("customerType"), right: lit("Business") }, then: lit(true) }], else: lit(false) },
    },
  },
};
