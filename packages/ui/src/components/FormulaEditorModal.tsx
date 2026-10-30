import { Button, SegmentedControl, Select, Switch, TextField } from "@radix-ui/themes";
import { Calendar, ChevronRight, CircleDot, Hash, List, PanelLeft, RotateCcw, Search, ToggleLeft, Type } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import type { CellFormat } from "../util/format";
import type { Expr, FormulaBlankPolicy, FormulaDef } from "./@types";
import { evaluateFormula, formatResult, logicDeps, type LogicDeps } from "./core/formula";
import {
  dataPaths,
  DIVIDE_LABELS,
  draftToFormat,
  fieldOperandType,
  firstNumberField,
  formatToDraft,
  formulaStarters,
  POLICY_LABELS,
  sampleDefault,
  sampleFromValue,
  valueOperandType,
  type FormatDraft,
  type FormulaCatalog,
  type OperandType,
} from "./core/formulaAssist";
import { FORMULA_FUNCTIONS, mixesPrecedence, parseFormulaText, printFormulaText } from "./core/formulaText";
import { useLocale } from "./core/locale";
import { useLogicLibrary, useLogicScope } from "./core/logic";
import { useRouteScope } from "./core/readApi";
import { useRowScope } from "./core/rowScope";
import { getStateStore, stateStoreKeys } from "./core/stateStore";
import { FormulaBar, type FormulaBarHandle } from "./FormulaBar";
import { Modal } from "./Modal";

/** The blank / divide-by-zero policies, unset = the engine's default (`empty`). */
export type FormulaPolicies = { onEmpty?: FormulaBlankPolicy; onDivideByZero?: FormulaBlankPolicy };

const NO_DEPS: LogicDeps = { fields: [], states: [], url: false, row: false };

const SHOW_AS: { value: FormatDraft["kind"]; label: string }[] = [
  { value: "", label: "Raw" },
  { value: "number", label: "Number" },
  { value: "currency", label: "Currency" },
  { value: "percent", label: "Percent" },
  { value: "date", label: "Date" },
  { value: "text", label: "Text" },
];
const EXTRA_SHOW_AS: Partial<Record<FormatDraft["kind"], string>> = { datetime: "Date + time", boolean: "Yes / No" };
const RAW = "raw";

const TYPE_ICON = { text: Type, number: Hash, date: Calendar, boolean: ToggleLeft, list: List, any: CircleDot } as const;

function TypeIcon({ type }: { type: OperandType }) {
  const Icon = TYPE_ICON[type];
  return <Icon aria-hidden size={12} strokeWidth={2.2} />;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="gummy-fx-section">
      <div className="gummy-fx-label">{title}</div>
      {children}
    </section>
  );
}

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="gummy-fx-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

// ---- the catalog ----------------------------------------------------------------

/** Internal slices: sign-in state, not page data. */
const HIDDEN_SLICES = new Set(["auth"]);

/** What the page offers a formula right now. The running app has no model, so page data is read off what has loaded. */
function usePageCatalog(fields: { name: string; kind: string }[]): FormulaCatalog {
  const library = useLogicLibrary();
  const route = useRouteScope();
  const rowScope = useRowScope();
  return useMemo(() => {
    const data = stateStoreKeys()
      .filter((key) => !HIDDEN_SLICES.has(key) && /^[A-Za-z_]\w*$/.test(key))
      .map((key) => ({ key, value: getStateStore(key).getState().data }))
      .filter(({ value }) => value !== undefined && value !== null)
      .map(({ key, value }) => ({ key, paths: dataPaths(key, value) }));
    const row = rowScope?.row;
    return {
      fields,
      data,
      rowFields: row && typeof row === "object" ? Object.entries(row).map(([name, v]) => ({ name, type: valueOperandType(v) })) : [],
      urlParams: Object.keys(route.params ?? {}),
      queryParams: route.searchParams ? [...new Set(route.searchParams.keys())] : [],
      formulas: Object.keys(library?.formulas ?? {}),
      rules: Object.entries(library?.rules ?? {}).map(([name, r]) => ({ name, resultType: r.resultType })),
    };
    // A snapshot for the dialog: one opened with loaded data keeps offering it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, library]);
}

// ---- Insert ---------------------------------------------------------------------

type Choice = { key: string; label: string; code: string; tone: string; type: OperandType };

function catalogChoices(cat: FormulaCatalog): { group: string; items: Choice[] }[] {
  const groups = [
    { group: "Form fields", items: cat.fields.map((f): Choice => ({ key: `f:${f.name}`, label: f.name, code: `[${f.name}]`, tone: "field", type: fieldOperandType(f.kind) })) },
    { group: "Page data", items: cat.data.flatMap((d) => d.paths.map((p): Choice => ({ key: `d:${p.code}`, label: p.label, code: p.code, tone: "data", type: p.type }))) },
    { group: "This row", items: cat.rowFields.map((f): Choice => ({ key: `r:${f.name}`, label: f.name, code: `row.${f.name}`, tone: "data", type: f.type })) },
    {
      group: "URL",
      items: [
        ...cat.urlParams.map((p): Choice => ({ key: `u:${p}`, label: p, code: `url.${p}`, tone: "data", type: "text" })),
        ...cat.queryParams.map((p): Choice => ({ key: `q:${p}`, label: p, code: `query.${p}`, tone: "data", type: "text" })),
      ],
    },
    { group: "Saved formulas", items: cat.formulas.map((f): Choice => ({ key: `s:${f}`, label: f, code: `((${f}))`, tone: "saved", type: "any" })) },
    { group: "Saved rules", items: cat.rules.map((r): Choice => ({ key: `x:${r.name}`, label: r.name, code: `IF((${r.name}))`, tone: "rule", type: "any" })) },
  ];
  return groups.filter((g) => g.items.length > 0);
}

/** The searchable Insert list: operands by source, then the functions; a click inserts at the bar's caret. */
function InsertList({ catalog, onInsert }: { catalog: FormulaCatalog; onInsert: (code: string) => void }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const groups = useMemo(() => catalogChoices(catalog), [catalog]);
  const shown = groups.map((g) => ({ ...g, items: g.items.filter((c) => !q || `${c.label} ${g.group}`.toLowerCase().includes(q)) })).filter((g) => g.items.length > 0);
  const fns = FORMULA_FUNCTIONS.filter((f) => !q || `${f.fn} ${f.hint}`.toLowerCase().includes(q));
  return (
    <aside aria-label="Insert" className="gummy-fx-insert">
      <div className="gummy-fx-label">Insert</div>
      <label className="gummy-fx-search">
        <Search aria-hidden size={14} />
        <input aria-label="Search insertable" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" />
      </label>
      <ul>
        {shown.map((g) => (
          <li key={g.group}>
            <div className="gummy-fx-group">{g.group}</div>
            <ul>
              {g.items.map((c) => (
                <li key={c.key}>
                  <button type="button" aria-label={`Insert ${c.label}`} title={c.code} onMouseDown={(e) => e.preventDefault()} onClick={() => onInsert(c.code)}>
                    <span className={`gummy-fx-pill gummy-fx-tone-${c.tone}`}>
                      <TypeIcon type={c.type} />
                      <span>{c.label}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
        {fns.length > 0 && (
          <li>
            <div className="gummy-fx-group">Functions</div>
            <ul>
              {fns.map((f) => (
                <li key={f.fn}>
                  <button type="button" aria-label={`Insert ${f.fn}`} title={`${f.fn}(${f.args}) — ${f.hint}`} className="gummy-fx-fn" onMouseDown={(e) => e.preventDefault()} onClick={() => onInsert(`${f.fn}(${f.args ? "" : ")"}`)}>
                    <code>{f.fn}</code>
                    <span>{f.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
          </li>
        )}
        {shown.length === 0 && fns.length === 0 && <li className="gummy-fx-none">Nothing matches.</li>}
      </ul>
    </aside>
  );
}

// ---- Show as --------------------------------------------------------------------

function FormatFields({ draft, set }: { draft: FormatDraft; set: (patch: Partial<FormatDraft>) => void }) {
  const decimals = (
    <Labelled label="Decimals">
      <TextField.Root type="number" min={0} max={20} value={draft.decimals} placeholder="auto" aria-label="Decimals" onChange={(e) => set({ decimals: e.target.value })} />
    </Labelled>
  );
  const text = (key: "currency" | "pattern" | "timeZone" | "trueLabel" | "falseLabel", label: string, placeholder: string) => (
    <Labelled label={label}>
      <TextField.Root value={draft[key]} placeholder={placeholder} aria-label={label} onChange={(e) => set({ [key]: e.target.value })} />
    </Labelled>
  );
  switch (draft.kind) {
    case "number":
      return (
        <div className="gummy-fx-row">
          {decimals}
          <label className="gummy-fx-check">
            <Switch size="1" checked={draft.grouping} onCheckedChange={(grouping) => set({ grouping })} />
            <span>Group digits</span>
          </label>
        </div>
      );
    case "currency":
      return (
        <div className="gummy-fx-row">
          {text("currency", "Currency (ISO)", "USD")}
          {decimals}
        </div>
      );
    case "percent":
      return (
        <div className="gummy-fx-row">
          <Labelled label="The value is">
            <Select.Root value={draft.of} onValueChange={(of) => set({ of: of as FormatDraft["of"] })}>
              <Select.Trigger aria-label="The value is" />
              <Select.Content>
                <Select.Item value="1">a ratio (0.25 → 25%)</Select.Item>
                <Select.Item value="100">whole points (25 → 25%)</Select.Item>
              </Select.Content>
            </Select.Root>
          </Labelled>
          {decimals}
        </div>
      );
    case "date":
    case "datetime":
      return (
        <div className="gummy-fx-row">
          {text("pattern", "Pattern", "DD MMM YYYY")}
          {text("timeZone", "Time zone", "viewer’s")}
        </div>
      );
    case "boolean":
      return (
        <div className="gummy-fx-row">
          {text("trueLabel", "When true", "Yes")}
          {text("falseLabel", "When false", "No")}
        </div>
      );
    default:
      return null;
  }
}

function PolicySelect({ label, value, labels, onChange }: { label: string; value: FormulaBlankPolicy; labels: Record<FormulaBlankPolicy, string>; onChange: (p: FormulaBlankPolicy) => void }) {
  return (
    <Labelled label={label}>
      <Select.Root value={value} onValueChange={(v) => onChange(v as FormulaBlankPolicy)}>
        <Select.Trigger aria-label={label} />
        <Select.Content>
          {(Object.keys(labels) as FormulaBlankPolicy[]).map((p) => (
            <Select.Item key={p} value={p}>
              {labels[p]}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </Labelled>
  );
}

function ShowAs({ draft, set, policies, setPolicies, preview }: { draft: FormatDraft; set: (patch: Partial<FormatDraft>) => void; policies: Required<FormulaPolicies>; setPolicies: (p: FormulaPolicies) => void; preview?: string }) {
  const [open, setOpen] = useState(false);
  const extra = EXTRA_SHOW_AS[draft.kind];
  const options = extra ? [...SHOW_AS, { value: draft.kind, label: extra }] : SHOW_AS;
  return (
    <Section title="Show as">
      <div className="gummy-fx-showas">
        <SegmentedControl.Root size="1" aria-label="Show as" value={draft.kind || RAW} onValueChange={(v) => set({ kind: (v === RAW ? "" : v) as FormatDraft["kind"] })}>
          {options.map((o) => (
            <SegmentedControl.Item key={o.value || RAW} value={o.value || RAW}>
              {o.label}
            </SegmentedControl.Item>
          ))}
        </SegmentedControl.Root>
        {preview !== undefined && (
          <span className="gummy-fx-preview" title="The Try-it result in this format">
            {preview}
          </span>
        )}
      </div>
      <FormatFields draft={draft} set={set} />
      <div>
        <button type="button" className="gummy-fx-disclose" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <ChevronRight aria-hidden size={12} />
          {open ? "When inputs are missing" : `If an input is empty: ${POLICY_LABELS[policies.onEmpty]} · ÷ 0: ${DIVIDE_LABELS[policies.onDivideByZero]}`}
        </button>
        {open && (
          <div className="gummy-fx-row">
            <PolicySelect label="If an input is empty" value={policies.onEmpty} labels={POLICY_LABELS} onChange={(onEmpty) => setPolicies({ ...policies, onEmpty })} />
            <PolicySelect label="Divide by 0" value={policies.onDivideByZero} labels={DIVIDE_LABELS} onChange={(onDivideByZero) => setPolicies({ ...policies, onDivideByZero })} />
          </div>
        )}
      </div>
    </Section>
  );
}

// ---- Try it ---------------------------------------------------------------------

type SampleInput = { name: string; type: OperandType; text: string };

/** The formula over sample values: each form field it reads starts from its live value, everything else stays live. */
function useTryIt(expr: Expr | null, format: CellFormat | undefined, policies: FormulaPolicies, fields: FormulaCatalog["fields"]) {
  const library = useLogicLibrary();
  const locale = useLocale();
  const deps = useMemo(() => (expr ? logicDeps(expr, library ?? undefined) : NO_DEPS), [expr, library]);
  const scope = useLogicScope(deps);
  const [typed, setTyped] = useState<Record<string, string>>({});
  const inputs: SampleInput[] = deps.fields.flatMap((name) => {
    const type = fieldOperandType(fields.find((f) => f.name === name)?.kind);
    const live = sampleFromValue(scope.field?.(name));
    if (live === null) return [];
    return [{ name, type, text: typed[name] ?? (live || sampleDefault(type, name)) }];
  });
  const samples = Object.fromEntries(inputs.map((i) => [i.name, i.text]));
  const result = useMemo(() => {
    if (!expr) return null;
    const def: FormulaDef = { expr, format, ...policies };
    const { value, error } = evaluateFormula(def, { ...scope, field: (name) => (name in samples ? samples[name] : scope.field?.(name)) });
    return { raw: value, error, text: error ? "—" : formatResult(value, format, locale) || "(empty)" };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expr, format, policies, JSON.stringify(samples), scope.version, locale]);
  return {
    inputs,
    result,
    live: deps.states.length > 0 || deps.url || deps.row,
    set: (name: string, text: string) => setTyped((t) => ({ ...t, [name]: text })),
    reset: () => setTyped({}),
  };
}

function SampleBox({ input, onChange }: { input: SampleInput; onChange: (text: string) => void }) {
  const label = `Sample [${input.name}]`;
  if (input.type === "boolean")
    return (
      <label className="gummy-fx-check">
        <Switch size="1" aria-label={label} checked={input.text === "true"} onCheckedChange={(on) => onChange(on ? "true" : "false")} />
        <span>{input.text === "true" ? "on" : "off"}</span>
      </label>
    );
  return <TextField.Root aria-label={label} type={input.type === "number" ? "number" : input.type === "date" ? "date" : "text"} value={input.text} placeholder="empty" onChange={(e) => onChange(e.target.value)} />;
}

function TryIt({ state }: { state: ReturnType<typeof useTryIt> }) {
  const { inputs, result, live, set, reset } = state;
  return (
    <aside aria-label="Try it" className="gummy-fx-try">
      <div className="gummy-fx-label">Try it</div>
      <div className="gummy-fx-result">
        <div key={result?.text ?? ""} data-testid="formula-sample-result" className="gummy-fx-result-value">
          {result?.text ?? "(empty)"}
        </div>
        {result?.error ? <p className="gummy-fx-result-error">{result.error}</p> : <p className="gummy-fx-result-raw">raw {result ? (result.raw === null || result.raw === undefined ? "empty" : JSON.stringify(result.raw)) : '""'}</p>}
      </div>
      {inputs.length > 0 && (
        <div className="gummy-fx-samples">
          {inputs.map((i) => (
            <label key={i.name} className="gummy-fx-sample">
              <span>
                <TypeIcon type={i.type} />
                <code>[{i.name}]</code>
              </span>
              <SampleBox input={i} onChange={(text) => set(i.name, text)} />
            </label>
          ))}
          <button type="button" className="gummy-fx-reset" onClick={reset}>
            Reset samples
          </button>
        </div>
      )}
      {inputs.length === 0 && !live && <p className="gummy-fx-note-sm">The result doesn’t read the form or any data.</p>}
      {live && <p className="gummy-fx-note-sm">Page data and the URL use their real values.</p>}
    </aside>
  );
}

// ---- the modal ------------------------------------------------------------------

export type FormulaEditorModalProps = {
  id: string;
  title: string;
  /** The formula as text (`""` = none yet). */
  text: string;
  format: CellFormat | undefined;
  policies: FormulaPolicies;
  /** What Reset returns to (the config's). */
  defaults: { text: string; format: CellFormat | undefined; policies: FormulaPolicies };
  /** The enclosing form's fields. */
  fields: { name: string; kind: string }[];
  allowFormat: boolean;
  /** `expr: null` clears the formula. */
  onApply: (expr: Expr | null, format: CellFormat | undefined, policies: FormulaPolicies) => void;
  onClose: () => void;
};

const withDefaults = (p: FormulaPolicies): Required<FormulaPolicies> => ({ onEmpty: p.onEmpty ?? "empty", onDivideByZero: p.onDivideByZero ?? "empty" });

/**
 * The end user's formula editor — the studio's logic editor over the engine's
 * names: Insert · the formula bar and Show as · Try it. Everything here is the
 * page's own: its form fields, what has loaded, the project's saved formulas.
 */
export function FormulaEditorModal({ id, title, text: initialText, format, policies: initialPolicies, defaults, fields, allowFormat, onApply, onClose }: FormulaEditorModalProps) {
  const [text, setText] = useState(initialText);
  const [draft, setDraft] = useState<FormatDraft>(() => formatToDraft(format));
  const [policies, setPolicies] = useState(() => withDefaults(initialPolicies));
  const [insertOpen, setInsertOpen] = useState(() => typeof window === "undefined" || window.innerWidth >= 1100);
  const bar = useRef<FormulaBarHandle>(null);
  const catalog = usePageCatalog(fields);

  const parsed = useMemo(() => (text.trim() ? parseFormulaText(text) : null), [text]);
  // The last formula that parsed stays the one tried while the text is mid-edit.
  const lastValid = useRef<Expr | null>(parsed?.expr ?? null);
  if (parsed?.expr) lastValid.current = parsed.expr;
  else if (!parsed) lastValid.current = null;
  const expr = lastValid.current;

  const nextFormat = useMemo(() => draftToFormat(draft), [draft]);
  const tryIt = useTryIt(expr, nextFormat, policies, fields);
  const canApply = !parsed || !!parsed.expr;
  const isDefault = text.trim() === defaults.text.trim() && JSON.stringify(nextFormat ?? null) === JSON.stringify(defaults.format ?? null) && JSON.stringify(policies) === JSON.stringify(withDefaults(defaults.policies));

  const starters = useMemo(() => {
    const list = catalog.data.find((d) => d.paths[0]?.type === "list");
    return formulaStarters(fields, list ? { key: list.key, field: firstNumberField(getStateStore(list.key).getState().data) } : undefined);
  }, [catalog, fields]);

  const flat = useMemo(() => {
    // Only for what the user wrote: a starting formula isn't theirs to second-guess.
    if (text === initialText || !parsed?.expr || !mixesPrecedence(text)) return null;
    const other = parseFormulaText(text, { leftToRight: true }).expr;
    return other && JSON.stringify(other) !== JSON.stringify(parsed.expr) ? other : null;
  }, [parsed, text, initialText]);
  const timesHundred = draft.kind === "percent" && draft.of === "1" && expr && "op" in expr && expr.op === "*" && "lit" in expr.args[1] && expr.args[1].lit === 100 ? expr.args[0] : null;

  return (
    <Modal id={id} open onOpenChange={(o) => !o && onClose()} title={title} width={insertOpen ? "min(1120px, 96vw)" : "min(900px, 96vw)"}>
      <div className="gummy-fx">
        <div className="gummy-fx-toolbar">
          <Button type="button" size="1" variant={insertOpen ? "soft" : "surface"} color="gray" aria-pressed={insertOpen} title={insertOpen ? "Hide the Insert list" : "Show the Insert list"} onClick={() => setInsertOpen((o) => !o)}>
            <PanelLeft aria-hidden size={14} /> Insert
          </Button>
        </div>
        <div className="gummy-fx-body" data-insert={insertOpen ? "" : undefined}>
          <div className="gummy-fx-grid" data-insert={insertOpen ? "" : undefined}>
            {insertOpen && <InsertList catalog={catalog} onInsert={(code) => bar.current?.insert(code)} />}
            <div className="gummy-fx-main">
              <Section title="Formula">
                <FormulaBar ref={bar} aria-label="Formula code" value={text} onChange={setText} catalog={catalog} error={parsed?.error} errorAt={parsed?.error ? parsed.at : undefined} placeholder="Type a field name, a number or a function — e.g. quantity × price" />
                {!text.trim() && (
                  <div className="gummy-fx-starters">
                    <div>Start from</div>
                    <div>
                      {starters.map((s) => (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => {
                            setText(s.code);
                            setDraft(formatToDraft(s.format));
                          }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {flat && (
                  <div className="gummy-fx-note">
                    <strong>× and ÷ are calculated before + and −.</strong> It reads <code>{printFormulaText(parsed!.expr!)}</code>; left to right it would be <code>{printFormulaText(flat)}</code>.{" "}
                    <Button type="button" size="1" variant="surface" color="gray" onClick={() => setText(printFormulaText(flat))}>
                      Use left to right
                    </Button>
                  </div>
                )}
                {timesHundred && (
                  <div className="gummy-fx-note">
                    A percent already multiplies by 100, so <code>× 100</code> would show the result 100 times too big.{" "}
                    <Button type="button" size="1" variant="surface" color="gray" onClick={() => setText(printFormulaText(timesHundred))}>
                      Remove × 100
                    </Button>
                  </div>
                )}
              </Section>
              {allowFormat && <ShowAs draft={draft} set={(patch) => setDraft((d) => ({ ...d, ...patch }))} policies={policies} setPolicies={(p) => setPolicies(withDefaults(p))} preview={tryIt.result && !tryIt.result.error ? tryIt.result.text : undefined} />}
            </div>
            <TryIt state={tryIt} />
          </div>
        </div>
        <div className="gummy-fx-footer">
          {!isDefault && (
            <Button
              type="button"
              variant="ghost"
              color="gray"
              onClick={() => {
                setText(defaults.text);
                setDraft(formatToDraft(defaults.format));
                setPolicies(withDefaults(defaults.policies));
              }}
            >
              <RotateCcw size={14} aria-hidden /> Reset
            </Button>
          )}
          <div className="gummy-fx-actions">
            <Button type="button" variant="soft" color="gray" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" disabled={!canApply} onClick={() => onApply(parsed?.expr ?? null, nextFormat, policies)}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
