import { z } from "zod";
import type { AnyCondition, Bin, CardElement, Container, DataValue, LogicLibrary, TabElement } from "../@types";
import { ConditionExpression } from "./expression";
import { evaluateCondition, formulaOf, isLegacyCondition, logicDeps, type LogicScope } from "./formula";

/**
 * What the logic does to a form's fields at submit (spec §7): a field hidden
 * by its bin's `condition` (or an enclosing bin's) is out of the form — not
 * validated, not submitted; a field disabled by `enabledWhen` or a static
 * `disabled` is not validated but is submitted; a computed field is both.
 * Pure: the container renderer feeds it the values and its scope from the
 * form's resolver.
 */

/** One field of a form, with every condition that can hide or disable it. */
export type FieldGate = {
  name: string;
  dataType?: string;
  /** The bin's own condition and its enclosing bins' (all must hold to show it). */
  conditions: AnyCondition[];
  /** A `Cond` / saved-rule `enabledWhen` (the observe form is the component's own). */
  enabledWhen?: AnyCondition;
  disabled: boolean;
  /** `valueMode: "computed"` with a formula `value`. */
  computed?: DataValue;
};

/** Bins whose names aren't fields of the enclosing form (see `schema.ts`). */
const NOT_FIELDS = new Set(["formlist", "repeater", "filecollection", "chart", "custom", "switchprofile", "replaceprofile"]);

type FieldLike = {
  name?: string;
  dataType?: string;
  disabled?: boolean;
  enabledWhen?: AnyCondition;
  valueMode?: string;
  value?: DataValue;
};

/** Every field of `containers` drawn on one form, the same walk as `schema.ts` (tab panels, card slots, nested containers). */
export function collectFieldGates(containers: Container[]): FieldGate[] {
  const out: FieldGate[] = [];
  const walk = (bins: Bin[], inherited: AnyCondition[]) => {
    for (const b of bins) {
      if (NOT_FIELDS.has(b.type)) continue;
      const conditions = b.condition ? [...inherited, b.condition] : inherited;
      const el = b.element as (FieldLike & Partial<TabElement> & Partial<CardElement>) | undefined;
      if (b.type === "tab" && el?.tabs) {
        el.tabs.forEach((t) => walk(t.container.bins, conditions));
        continue;
      }
      if (b.type === "card" && el) {
        [el.content, el.collapse].forEach((c) => c && walk(c.bins, conditions));
        continue;
      }
      if (!el && b.container) {
        walk(b.container.bins, conditions);
        continue;
      }
      if (!el?.name || !el.dataType) continue;
      out.push({
        name: el.name,
        dataType: el.dataType,
        // A `hidden` bin (`_id`) carries the record's identity: never hidden away.
        conditions: b.type === "hidden" ? [] : conditions,
        enabledWhen: el.enabledWhen && !isLegacyCondition(el.enabledWhen) ? el.enabledWhen : undefined,
        disabled: el.disabled === true,
        computed: el.valueMode === "computed" && el.value?.type === "formula" ? el.value : undefined,
      });
    }
  };
  containers.forEach((c) => walk(c.bins, []));
  return out;
}

/** A condition held against the form's scope; the old `CondExpression` reads the container context. */
export function conditionHolds(c: AnyCondition, scope: LogicScope, legacyCtx: Record<string, unknown>): boolean {
  if (isLegacyCondition(c)) {
    try {
      return !!new ConditionExpression(legacyCtx).expression(c);
    } catch {
      return false;
    }
  }
  return evaluateCondition(c, scope);
}

export type GateDecisions = {
  /** Hidden by a condition: left out of validation and of the payload. */
  skip: Set<string>;
  /** Disabled: validated as anything, still submitted. */
  relax: Set<string>;
};

export function gateDecisions(gates: FieldGate[], scope: LogicScope, legacyCtx: Record<string, unknown>): GateDecisions {
  const shown = new Set<string>();
  const hidden = new Set<string>();
  const relax = new Set<string>();
  for (const g of gates) {
    if (!g.conditions.every((c) => conditionHolds(c, scope, legacyCtx))) {
      hidden.add(g.name);
      continue;
    }
    shown.add(g.name);
    if (g.computed) continue;
    if (g.disabled || (g.enabledWhen && !conditionHolds(g.enabledWhen, scope, legacyCtx))) relax.add(g.name);
  }
  // A name drawn twice stays in the form while one of its bins shows.
  const skip = new Set([...hidden].filter((n) => !shown.has(n)));
  return { skip, relax };
}

/** The form schema without the skipped fields and with the relaxed ones accepting anything. */
export function narrowSchema(schema: z.ZodTypeAny, { skip, relax }: GateDecisions): z.ZodTypeAny {
  if ((!skip.size && !relax.size) || !(schema instanceof z.ZodObject)) return schema;
  const shape = { ...(schema.shape as Record<string, z.ZodTypeAny>) };
  skip.forEach((n) => delete shape[n]);
  relax.forEach((n) => {
    if (n in shape) shape[n] = z.any();
  });
  return z.object(shape);
}

/** Computed fields that read each other (A from B, B from A): they are skipped with a warning. */
export function computedCycles(gates: FieldGate[], library: LogicLibrary | undefined): Set<string> {
  const reads = new Map<string, string[]>();
  for (const g of gates) {
    if (!g.computed) continue;
    const def = formulaOf(g.computed, library);
    reads.set(g.name, def ? logicDeps(def.expr, library).fields.filter((f) => f !== undefined) : []);
  }
  const cyclic = new Set<string>();
  for (const start of reads.keys()) {
    const stack = [...(reads.get(start) ?? [])];
    const seen = new Set<string>();
    while (stack.length) {
      const n = stack.pop()!;
      if (n === start) {
        cyclic.add(start);
        break;
      }
      if (seen.has(n) || !reads.has(n)) continue;
      seen.add(n);
      stack.push(...reads.get(n)!);
    }
  }
  return cyclic;
}
