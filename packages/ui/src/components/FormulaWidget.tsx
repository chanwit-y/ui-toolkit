import { Button, IconButton, Select, Text, TextField } from "@radix-ui/themes";
import { Pencil, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CellFormat } from "../util/format";
import type { Expr, FormulaDef, FormulaWidgetElement } from "./@types";
import { LogicError } from "./core/bound";
import { evaluateFormula, formatResult, logicDeps, type LogicDeps } from "./core/formula";
import { FORMULA_FUNCTIONS, parseFormulaText, printFormulaText } from "./core/formulaText";
import { useLocale } from "./core/locale";
import { useFormLogic, useLogicLibrary, useLogicScope } from "./core/logic";
import { matchPageKey, usePages } from "./core/pages";
import { Modal } from "./Modal";
import { Typography } from "./Typography";

/** What the end user owns: the formula and (optionally) its output format. */
export type FormulaWidgetState = { expr: Expr | null; format?: CellFormat };

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
    const parsed = JSON.parse(raw) as { v?: number; expr?: Expr | null; format?: CellFormat };
    if (parsed?.v !== STORAGE_VERSION) return null;
    return { expr: parsed.expr ?? null, format: parsed.format };
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
  const defaults = useRef<FormulaWidgetState>({ expr: formula ?? null, format });
  defaults.current = { expr: formula ?? null, format };
  const [state, setState] = useState<FormulaWidgetState>(() => readStored(storage, storageKey) ?? defaults.current);
  // Another page / name: pick up that key's formula.
  useEffect(() => {
    setState(readStored(storage, storageKey) ?? defaults.current);
  }, [storage, storageKey]);
  const def = useMemo<FormulaDef | undefined>(
    () => (state.expr ? { expr: state.expr, format: state.format ?? format, onEmpty, onDivideByZero } : undefined),
    [state, format, onEmpty, onDivideByZero],
  );
  const result = useFormulaResult(def);
  const [open, setOpen] = useState(false);
  const { fieldTypes } = useFormLogic();
  const fields = useMemo(() => Object.keys(fieldTypes).filter((f) => f !== name), [fieldTypes, name]);

  const apply = (expr: Expr | null, nextFormat: CellFormat | undefined) => {
    const next: FormulaWidgetState = { expr, ...(nextFormat ? { format: nextFormat } : {}) };
    setState(next);
    const d = defaults.current;
    const isDefault = JSON.stringify(expr) === JSON.stringify(d.expr) && JSON.stringify(nextFormat ?? null) === JSON.stringify(d.format ?? null);
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
          defaultText={formula ? printFormulaText(formula) : ""}
          defaultFormat={format}
          fields={fields}
          allowFormat={allowFormat}
          policies={{ onEmpty, onDivideByZero }}
          onApply={apply}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ---- the modal ----------------------------------------------------------------

type FormatKind = "" | CellFormat["type"];

function formatKind(f: CellFormat | undefined): FormatKind {
  return f?.type ?? "";
}

/** The format edited as flat knobs (kind + the one or two it reads). */
type FormatDraft = { kind: FormatKind; decimals: string; currency: string; pattern: string };

function toDraft(f: CellFormat | undefined): FormatDraft {
  return {
    kind: formatKind(f),
    decimals: f && "decimals" in f && f.decimals !== undefined ? String(f.decimals) : "",
    currency: f?.type === "currency" ? f.currency : "",
    pattern: f && (f.type === "date" || f.type === "datetime") ? (f.pattern ?? "") : "",
  };
}

function fromDraft(d: FormatDraft): CellFormat | undefined {
  const decimals = d.decimals.trim() === "" ? undefined : Math.max(0, Math.min(10, Number(d.decimals) || 0));
  switch (d.kind) {
    case "number":
      return { type: "number", ...(decimals !== undefined ? { decimals } : {}) };
    case "currency":
      return { type: "currency", currency: d.currency.trim().toUpperCase() || "USD", ...(decimals !== undefined ? { decimals } : {}) };
    case "percent":
      return { type: "percent", ...(decimals !== undefined ? { decimals } : {}) };
    case "date":
    case "datetime":
      return { type: d.kind, ...(d.pattern.trim() ? { pattern: d.pattern.trim() } : {}) };
    case "boolean":
      return { type: "boolean" };
    case "text":
      return { type: "text" };
    default:
      return undefined;
  }
}

const FORMAT_OPTIONS: { value: FormatKind; label: string }[] = [
  { value: "", label: "As is" },
  { value: "number", label: "Number" },
  { value: "currency", label: "Currency" },
  { value: "percent", label: "Percent" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "Date & time" },
  { value: "text", label: "Text" },
];

const OPERATORS: { show: string; insert: string }[] = [
  { show: "+", insert: " + " },
  { show: "−", insert: " − " },
  { show: "×", insert: " × " },
  { show: "÷", insert: " ÷ " },
  { show: "&", insert: " & " },
  { show: "( )", insert: "()" },
];

const CHIP = "rounded-full border border-[var(--gray-6)] px-2 py-0.5 text-xs text-[var(--gray-12)] transition-colors hover:border-[var(--accent-8)] hover:bg-[var(--accent-a3)]";

/** The live result of the draft, where the widget sits. */
function DraftResult({ def }: { def: FormulaDef }) {
  const { text, error } = useFormulaResult(def);
  return (
    <Text as="div" size="2" className="gummy-formula-result">
      <span className="text-[var(--gray-11)]">Result: </span>
      {error ? <span className="text-[var(--red-11)]">— {error}</span> : <span className="font-medium">{text || "(empty)"}</span>}
    </Text>
  );
}

export type FormulaEditorModalProps = {
  id: string;
  title: string;
  /** The formula as text (`""` = none yet). */
  text: string;
  format: CellFormat | undefined;
  /** What Reset returns to (the config's). */
  defaultText: string;
  defaultFormat: CellFormat | undefined;
  /** The enclosing form's field names, offered as chips. */
  fields: string[];
  allowFormat: boolean;
  policies: Pick<FormulaDef, "onEmpty" | "onDivideByZero">;
  /** `expr: null` clears the formula. */
  onApply: (expr: Expr | null, format: CellFormat | undefined) => void;
  onClose: () => void;
};

/**
 * The end user's formula editor: a text box over the formula grammar with
 * insert chips (fields, functions, operators), the live result, the output
 * format, and Reset / Cancel / Apply.
 */
export function FormulaEditorModal({ id, title, text: initialText, format, defaultText, defaultFormat, fields, allowFormat, policies, onApply, onClose }: FormulaEditorModalProps) {
  const [text, setText] = useState(initialText);
  const [draft, setDraft] = useState<FormatDraft>(() => toDraft(format));
  const ref = useRef<HTMLTextAreaElement>(null);
  const parsed = useMemo(() => (text.trim() ? parseFormulaText(text) : null), [text]);
  const nextFormat = useMemo(() => fromDraft(draft), [draft]);
  const def = useMemo<FormulaDef | undefined>(() => (parsed?.expr ? { expr: parsed.expr, format: nextFormat, ...policies } : undefined), [parsed, nextFormat, policies]);
  const canApply = !parsed || !!parsed.expr;
  const isDefault = text.trim() === defaultText.trim() && JSON.stringify(nextFormat ?? null) === JSON.stringify(defaultFormat ?? null);

  const insert = (snippet: string, caretBack = 0) => {
    const el = ref.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = text.slice(0, start) + snippet + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + snippet.length - caretBack;
      el?.setSelectionRange(pos, pos);
    });
  };

  return (
    <Modal id={id} open onOpenChange={(o) => !o && onClose()} title={title} width="min(92vw, 40rem)">
      <div className="flex flex-col gap-3">
        <div>
          <textarea
            ref={ref}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            spellCheck={false}
            placeholder="e.g. [quantity] × [price]"
            aria-label="Formula"
            aria-invalid={!!parsed?.error}
            className={`w-full resize-y rounded-md border bg-[var(--color-surface)] p-2 font-mono text-sm text-[var(--gray-12)] focus:outline-none focus:ring-2 ${parsed?.error ? "border-[var(--red-8)] focus:ring-[var(--red-7)]" : "border-[var(--gray-7)] focus:ring-[var(--accent-8)]"}`}
          />
          {parsed?.error ? (
            <Text as="div" size="1" className="text-[var(--red-11)]" role="alert">
              {parsed.error}
            </Text>
          ) : (
            <Text as="div" size="1" color="gray">
              Fields by name, numbers, 'text', ( ), and the functions below. Blank clears the formula.
            </Text>
          )}
        </div>

        {fields.length > 0 && (
          <div>
            <Text as="div" size="1" color="gray" className="mb-1">
              Fields
            </Text>
            <div className="flex flex-wrap gap-1">
              {fields.map((f) => (
                <button key={f} type="button" className={CHIP} onClick={() => insert(`[${f}]`)}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <div>
            <Text as="div" size="1" color="gray" className="mb-1">
              Functions
            </Text>
            <div className="flex flex-wrap gap-1">
              {FORMULA_FUNCTIONS.map((f) => (
                <button key={f.fn} type="button" className={CHIP} title={`${f.fn}(${f.args}) — ${f.hint}`} onClick={() => insert(`${f.fn}()`, 1)}>
                  {f.fn}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Text as="div" size="1" color="gray" className="mb-1">
              Operators
            </Text>
            <div className="flex flex-wrap gap-1">
              {OPERATORS.map((o) => (
                <button key={o.show} type="button" className={CHIP} onClick={() => insert(o.insert, o.insert === "()" ? 1 : 0)}>
                  {o.show}
                </button>
              ))}
            </div>
          </div>
        </div>

        {def && <DraftResult def={def} />}

        {allowFormat && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <Text size="1" color="gray">
                Show as
              </Text>
              <Select.Root value={draft.kind || "asis"} onValueChange={(v) => setDraft((d) => ({ ...d, kind: (v === "asis" ? "" : v) as FormatKind }))}>
                <Select.Trigger aria-label="Output format" />
                <Select.Content>
                  {FORMAT_OPTIONS.map((o) => (
                    <Select.Item key={o.value || "asis"} value={o.value || "asis"}>
                      {o.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </label>
            {(draft.kind === "number" || draft.kind === "currency" || draft.kind === "percent") && (
              <label className="flex flex-col gap-1">
                <Text size="1" color="gray">
                  Decimals
                </Text>
                <TextField.Root type="number" min={0} max={10} value={draft.decimals} onChange={(e) => setDraft((d) => ({ ...d, decimals: e.target.value }))} className="w-20" aria-label="Decimals" />
              </label>
            )}
            {draft.kind === "currency" && (
              <label className="flex flex-col gap-1">
                <Text size="1" color="gray">
                  Currency
                </Text>
                <TextField.Root value={draft.currency} placeholder="USD" onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value }))} className="w-24" aria-label="Currency code" />
              </label>
            )}
            {(draft.kind === "date" || draft.kind === "datetime") && (
              <label className="flex flex-col gap-1">
                <Text size="1" color="gray">
                  Pattern
                </Text>
                <TextField.Root value={draft.pattern} placeholder="DD MMM YYYY" onChange={(e) => setDraft((d) => ({ ...d, pattern: e.target.value }))} className="w-40" aria-label="Date pattern" />
              </label>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          {!isDefault && (
            <Button
              type="button"
              variant="ghost"
              color="gray"
              onClick={() => {
                setText(defaultText);
                setDraft(toDraft(defaultFormat));
              }}
            >
              <RotateCcw size={14} aria-hidden /> Reset
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="soft" color="gray" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" disabled={!canApply} onClick={() => onApply(parsed?.expr ?? null, nextFormat)}>
              Apply
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
