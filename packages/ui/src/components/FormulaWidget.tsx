import { IconButton, Text } from "@radix-ui/themes";
import { Pencil } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CellFormat } from "../util/format";
import type { Expr, FormulaDef, FormulaWidgetElement } from "./@types";
import { LogicError } from "./core/bound";
import { evaluateFormula, formatResult, logicDeps, type LogicDeps } from "./core/formula";
import { printFormulaText } from "./core/formulaText";
import { useLocale } from "./core/locale";
import { useFormLogic, useLogicLibrary, useLogicScope } from "./core/logic";
import { matchPageKey, usePages } from "./core/pages";
import { FormulaEditorModal, type FormulaPolicies } from "./FormulaEditorModal";
import { Typography } from "./Typography";

/** What the end user owns: the formula and (optionally) its output format and blank policies. */
export type FormulaWidgetState = { expr: Expr | null; format?: CellFormat } & FormulaPolicies;

const STORAGE_VERSION = 1;
const NO_DEPS: LogicDeps = { fields: [], states: [], url: false, row: false };

function storageOf(persist: FormulaWidgetElement["persist"]): Storage | null {
  try {
    if (persist === "none" || typeof window === "undefined") return null;
    return persist === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

function readStored(storage: Storage | null, key: string): FormulaWidgetState | null {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { v?: number; expr?: Expr | null } & Omit<FormulaWidgetState, "expr">;
    if (parsed?.v !== STORAGE_VERSION) return null;
    const { v: _v, ...state } = parsed;
    return { ...state, expr: parsed.expr ?? null };
  } catch {
    return null;
  }
}

function writeStored(storage: Storage | null, key: string, state: FormulaWidgetState | null): void {
  try {
    if (!storage) return;
    if (state) storage.setItem(key, JSON.stringify({ v: STORAGE_VERSION, ...state }));
    else storage.removeItem(key);
  } catch {
    /* storage blocked: the formula lives for the page */
  }
}

/** Evaluate a formula where the widget sits (the enclosing form, page data, route, row), formatted for display. */
export function useFormulaResult(def: FormulaDef | undefined): { value: unknown; text: string; error?: string } {
  const library = useLogicLibrary();
  const locale = useLocale();
  const deps = useMemo(() => (def ? logicDeps(def.expr, library ?? undefined) : NO_DEPS), [def, library]);
  const scope = useLogicScope(deps);
  const result = useMemo(
    () => (def ? evaluateFormula(def, scope) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [def, scope.version, scope.row, scope.index],
  );
  if (!def || !result) return { value: undefined, text: "" };
  return { value: result.value, text: formatResult(result.value, def.format, locale), error: result.error };
}

export type FormulaWidgetViewProps = Pick<FormulaWidgetElement, "label" | "placeholder" | "variant" | "weight" | "color" | "align" | "editLabel" | "className"> & {
  /** The formatted result (`""` while blank). */
  text: string;
  error?: string;
  /** Whether a formula is set at all (else the placeholder shows). */
  hasFormula: boolean;
  onEdit?: () => void;
};

/**
 * The hook-light view: the caption, the result (or the placeholder) as a
 * clickable typography, and the edit button. The studio canvas renders it
 * over a sample result.
 */
export function FormulaWidgetView({ label, placeholder = "Click to set a formula", variant = "h5", weight, color, align, editLabel = "Edit formula", className, text, error, hasFormula, onEdit }: FormulaWidgetViewProps) {
  return (
    <div className={`gummy-formula flex w-full items-start gap-1 ${className ?? ""}`} data-formula-widget>
      <button
        type="button"
        onClick={onEdit}
        title={editLabel}
        className="min-w-0 flex-1 rounded-md px-2 py-1 text-left transition-colors hover:bg-[var(--gray-a3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-8)]"
      >
        {label && (
          <Text as="div" size="1" color="gray" className="mb-0.5">
            {label}
          </Text>
        )}
        {hasFormula ? (
          <LogicError error={error}>
            <Typography text={text || "—"} variant={variant} weight={weight} color={color} align={align} />
          </LogicError>
        ) : (
          <Typography text={placeholder} variant={variant} weight={weight} color="gray" align={align} />
        )}
      </button>
      <IconButton variant="ghost" size="1" color="gray" aria-label={editLabel} onClick={onEdit} className="mt-1 shrink-0">
        <Pencil size={14} aria-hidden />
      </IconButton>
    </div>
  );
}

/**
 * The `formula` element (see `FormulaWidgetElement`): the end user's own
 * formula over the page, shown through its format and edited in a modal.
 */
export function FormulaWidget(props: FormulaWidgetElement) {
  const { name, persist = "local", formula, format, onEmpty, onDivideByZero, allowFormat = true, editLabel = "Edit formula", label } = props;
  const pages = usePages();
  const storageKey = useMemo(() => {
    const path = typeof window === "undefined" ? "" : window.location.pathname;
    const pageKey = pages ? matchPageKey(pages, path) : null;
    return `gummy.formula.${pageKey ?? "_"}.${name}`;
  }, [pages, name]);
  const storage = useMemo(() => storageOf(persist), [persist]);
  const defaults = useRef<FormulaWidgetState>({ expr: formula ?? null, format, onEmpty, onDivideByZero });
  defaults.current = { expr: formula ?? null, format, onEmpty, onDivideByZero };
  const [state, setState] = useState<FormulaWidgetState>(() => readStored(storage, storageKey) ?? defaults.current);
  // Another page / name: pick up that key's formula.
  useEffect(() => {
    setState(readStored(storage, storageKey) ?? defaults.current);
  }, [storage, storageKey]);
  const def = useMemo<FormulaDef | undefined>(
    () => (state.expr ? { expr: state.expr, format: state.format ?? format, onEmpty: state.onEmpty ?? onEmpty, onDivideByZero: state.onDivideByZero ?? onDivideByZero } : undefined),
    [state, format, onEmpty, onDivideByZero],
  );
  const result = useFormulaResult(def);
  const [open, setOpen] = useState(false);
  const { fieldTypes } = useFormLogic();
  const fields = useMemo(() => Object.entries(fieldTypes).flatMap(([f, kind]) => (f === name ? [] : [{ name: f, kind }])), [fieldTypes, name]);

  const apply = (expr: Expr | null, nextFormat: CellFormat | undefined, policies: FormulaPolicies) => {
    const next: FormulaWidgetState = { expr, ...(nextFormat ? { format: nextFormat } : {}), ...policies };
    setState(next);
    const d = defaults.current;
    const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
    const isDefault = same(expr, d.expr) && same(nextFormat, d.format) && (policies.onEmpty ?? "empty") === (d.onEmpty ?? "empty") && (policies.onDivideByZero ?? "empty") === (d.onDivideByZero ?? "empty");
    writeStored(storage, storageKey, isDefault ? null : next);
    setOpen(false);
  };

  return (
    <>
      <FormulaWidgetView {...props} text={result.text} error={result.error} hasFormula={!!state.expr} onEdit={() => setOpen(true)} />
      {open && (
        <FormulaEditorModal
          id={`formula-${name}`}
          title={label ? `${label} — ${editLabel.toLowerCase()}` : editLabel}
          text={state.expr ? printFormulaText(state.expr) : ""}
          format={state.format ?? format}
          policies={{ onEmpty: state.onEmpty ?? onEmpty, onDivideByZero: state.onDivideByZero ?? onDivideByZero }}
          defaults={{ text: formula ? printFormulaText(formula) : "", format, policies: { onEmpty, onDivideByZero } }}
          fields={fields}
          allowFormat={allowFormat}
          onApply={apply}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
