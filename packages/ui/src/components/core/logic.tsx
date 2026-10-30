import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { useFormContext, type UseFormReturn } from "react-hook-form";
import type { AnyCondition, DataValue, FormulaDef, LogicLibrary } from "../@types";
import {
  evaluateCondition,
  evaluateFormula,
  formatResult,
  formulaOf,
  isLegacyCondition,
  libraryCycles,
  logicDeps,
  type LogicDeps,
  type LogicScope,
} from "./formula";
import { useLocale } from "./locale";
import { useRouteScope, useStateVersion } from "./readApi";
import { useRowScope } from "./rowScopeContext";
import { readSlice } from "./stateStore";

/**
 * Logic at runtime (see `spec/gummy-logic-spec.md`): the project's saved
 * formulas and rules, provided once above the routes beside `ActionsProvider`
 * (`<GummyApp>` mounts it from `project.formulas` / `project.rules`), and the
 * hooks that evaluate a formula or a condition where it is used — each
 * subscribes to exactly what its node reads.
 */
const LogicContext = createContext<LogicLibrary | null>(null);

export type FormulasProviderProps = LogicLibrary & { children: ReactNode };

const warnedCycles = new Set<string>();

export function FormulasProvider({ formulas, rules, children }: FormulasProviderProps) {
  const library = useMemo(() => ({ formulas, rules }), [formulas, rules]);
  useEffect(() => {
    for (const id of libraryCycles(library)) {
      if (warnedCycles.has(id)) continue;
      warnedCycles.add(id);
      console.warn(`[gummy-ui] ${id.replace(":", ' "')}" refers to itself — it evaluates as an error.`);
    }
  }, [library]);
  return <LogicContext.Provider value={library}>{children}</LogicContext.Provider>;
}

/** The nearest provider's saved formulas and rules, or `null`. */
export function useLogicLibrary(): LogicLibrary | null {
  return useContext(LogicContext);
}

/**
 * Per-form facts the evaluator needs beyond the values: each field's
 * `dataType` (a date field compares as a date) and the computed fields that
 * read each other (skipped). Provided by the container renderer around its form.
 */
export type FormLogic = { fieldTypes: Record<string, string>; cyclic: Set<string> };

const FormLogicContext = createContext<FormLogic>({ fieldTypes: {}, cyclic: new Set() });
export const FormLogicProvider = FormLogicContext.Provider;

export function useFormLogic(): FormLogic {
  return useContext(FormLogicContext);
}

/** Re-renders when one of `fields` changes in the enclosing form (none ⇒ never). */
function useFormVersion(form: UseFormReturn | null, fields: string[]): number {
  const [version, bump] = useReducer((x: number) => x + 1, 0);
  const sig = fields.join("|");
  useEffect(() => {
    if (!form || !fields.length) return;
    const sub = form.watch((_values, { name }) => {
      if (!name || fields.some((f) => name === f || name.startsWith(`${f}.`) || f.startsWith(`${name}.`))) bump();
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, sig]);
  return version;
}

/**
 * The scope a node evaluates in, re-rendering when what it reads changes:
 * the enclosing form's fields, the global-state slices, the URL, the nearest
 * item (`row` — falls back to `rowFallback`, a container's context data).
 */
export function useLogicScope(deps: LogicDeps, rowFallback?: unknown): LogicScope & { version: string } {
  const library = useLogicLibrary();
  const form = useFormContext() as UseFormReturn | null;
  const { fieldTypes } = useContext(FormLogicContext);
  const formVersion = useFormVersion(form, deps.fields);
  const stateVersion = useStateVersion(deps.states);
  const route = useRouteScope();
  const rowScope = useRowScope();
  return {
    field: (name) => form?.getValues(name),
    state: readSlice,
    fieldType: (name) => fieldTypes[name],
    row: rowScope ? rowScope.row : rowFallback,
    index: rowScope?.index,
    params: route.params,
    searchParams: route.searchParams,
    library: library ?? undefined,
    version: `${formVersion}:${stateVersion}:${deps.url ? JSON.stringify(route.params) + (route.searchParams?.toString() ?? "") : ""}`,
  };
}

const NO_DEPS: LogicDeps = { fields: [], states: [], url: false, row: false };

/**
 * Whether a `Cond` / saved-rule condition holds; `true` with none. The old
 * `CondExpression` is the caller's (it reads the container context through
 * `ConditionExpression`) and also answers `true` here.
 */
export function useCondition(cond: AnyCondition | undefined, rowFallback?: unknown): boolean {
  const library = useLogicLibrary();
  const active = cond && !isLegacyCondition(cond) ? cond : undefined;
  const deps = useMemo(() => (active ? logicDeps(active, library ?? undefined) : NO_DEPS), [active, library]);
  const scope = useLogicScope(deps, rowFallback);
  if (!active) return true;
  return evaluateCondition(active, scope);
}

export type FormulaValue = {
  /** Whether the DataValue is a formula at all. */
  active: boolean;
  /** The raw result (feeds a field, a condition, another formula). */
  value: unknown;
  /** The result through the formula's `format` (what a display shows). */
  text: string;
  error?: string;
};

const warnedErrors = new Set<string>();

/** Evaluate a `type:"formula"` DataValue where it is used; `active: false` for any other value. */
export function useFormula(dv: DataValue | undefined, rowFallback?: unknown): FormulaValue {
  const library = useLogicLibrary();
  const locale = useLocale();
  const def: FormulaDef | undefined = useMemo(() => formulaOf(dv, library ?? undefined), [dv, library]);
  const deps = useMemo(() => (def ? logicDeps(def.expr, library ?? undefined) : NO_DEPS), [def, library]);
  const scope = useLogicScope(deps, rowFallback);
  const result = useMemo(
    () => (def ? evaluateFormula(def, scope) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [def, scope.version, scope.row, scope.index],
  );
  useEffect(() => {
    const key = `${JSON.stringify(dv)}:${result?.error}`;
    if (!result?.error || warnedErrors.has(key)) return;
    warnedErrors.add(key);
    console.warn(`[gummy-ui] Formula ${dv?.formula ? `"${dv.formula}"` : "(inline)"}: ${result.error}`);
  }, [result?.error, dv]);
  if (!def || !result) return { active: false, value: undefined, text: "" };
  return { active: true, value: result.value, text: formatResult(result.value, def.format, locale), error: result.error };
}
