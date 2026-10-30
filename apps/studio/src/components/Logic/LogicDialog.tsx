import { Modal, type Expr, type FormulaBlankPolicy, type LogicResultType, type Rule } from '@gummy-ui/ui'
import { useMemo, useState, type ReactNode } from 'react'
import { Button, Input, SegmentedControl, Select } from '../common'
import { ColumnFormatFields } from '../Layout/ColumnFormatFields'
import { columnFormatToEngine, defaultColumnFormat, type ColumnFormatConfig } from '../Layout/types'
import {
  createFormulaDef,
  createRuleDef,
  inlineFormula,
  isSavedFormula,
  leftToRight,
  mixesPrecedence,
  parseExpr,
  printCondition,
  printExpr,
  type FormulaLibDef,
  type RuleLibDef,
  type StudioCondition,
  type StudioFormula,
} from '../Workspace/logic'
import { useActiveProject, useWorkspaceStore } from '../Workspace/workspaceStore'
import { CodeInput, InsertContext, type InsertTarget } from './CodeInput'
import { ConditionEditor, Palette, RuleEditor, type LogicEnv } from './editors'
import { evaluateSample, sampleRefs } from './sample'
import { useLogicLibrary, type LogicScopeInfo } from './scope'

/** What the dialog edits: a slot's condition / formula, or a saved item of the Logic tab. */
export type LogicTarget =
  | { kind: 'condition'; value: StudioCondition | null; onSave: (v: StudioCondition | null) => void }
  | { kind: 'formula'; value: StudioFormula | null; onSave: (v: StudioFormula | null) => void }
  | { kind: 'savedFormula'; value: FormulaLibDef; onSave: (v: FormulaLibDef) => void }
  | { kind: 'savedRule'; value: RuleLibDef; onSave: (v: RuleLibDef) => void }

const POLICY_OPTIONS: { value: FormulaBlankPolicy; label: string }[] = [
  { value: 'empty', label: 'Leave the result empty' },
  { value: 'zero', label: 'Treat as 0' },
  { value: 'error', label: 'Show an error' },
]
const DIVIDE_OPTIONS: { value: FormulaBlankPolicy; label: string }[] = [
  { value: 'empty', label: 'Leave the result empty' },
  { value: 'zero', label: 'Show 0' },
  { value: 'error', label: 'Show an error' },
]
const RESULT_TYPES: { value: LogicResultType; label: string }[] = [
  { value: 'boolean', label: 'True / false' },
  { value: 'number', label: 'Number' },
  { value: 'text', label: 'Text' },
  { value: 'date', label: 'Date' },
]

function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="sec-label">{title}</div>
        {aside && <div className="ml-auto">{aside}</div>}
      </div>
      {children}
    </section>
  )
}

/** A formula's text with its parse: the last valid `Expr` stays the value while the text doesn't parse. */
function useFormulaText(initial: Expr, env: LogicEnv) {
  const [text, setText] = useState(() => printExpr(initial, env.names))
  const [expr, setExpr] = useState<Expr>(initial)
  const parsed = useMemo(() => parseExpr(text, env.names), [text, env.names])
  const error = parsed.value === undefined && text.trim() ? { message: parsed.error, at: parsed.at } : null
  const update = (t: string) => {
    setText(t)
    const r = parseExpr(t, env.names)
    if (r.value !== undefined) setExpr(r.value)
  }
  return { text, setText: update, expr, error }
}

/** The formula body: Visual tokens or Code text, the output settings and the two checks. */
function FormulaBody({
  ft,
  env,
  format,
  setFormat,
  onEmpty,
  setOnEmpty,
  onDivide,
  setOnDivide,
}: {
  ft: ReturnType<typeof useFormulaText>
  env: LogicEnv
  format: ColumnFormatConfig
  setFormat: (f: ColumnFormatConfig) => void
  onEmpty: FormulaBlankPolicy
  setOnEmpty: (p: FormulaBlankPolicy) => void
  onDivide: FormulaBlankPolicy
  setOnDivide: (p: FormulaBlankPolicy) => void
}) {
  const flat = mixesPrecedence(ft.text) ? leftToRight(ft.text, env.names) : null
  const timesHundred =
    format.type === 'percent' && format.percentOf === '1' && 'op' in ft.expr && ft.expr.op === '*' && 'lit' in ft.expr.args[1] && ft.expr.args[1].lit === 100
  return (
    <div className="space-y-3">
      <CodeInput
        aria-label="Formula code"
        value={ft.text}
        onChange={ft.setText}
        error={ft.error?.message}
        errorAt={ft.error?.at}
        scope={env.scope}
        formulas={env.formulas}
        rules={env.rules}
        operators
        placeholder="Type a field name, a number or a function — e.g. qty × price"
      />
      {flat && (
        <div className="rounded-md border border-warn/50 bg-panel p-2 text-ui-sm text-ink-2">
          <strong className="text-ink">× and ÷ are calculated before + and −.</strong> Check this is what you meant: it reads{' '}
          <span className="font-mono">{printExpr(ft.expr, env.names)}</span>; left to right it would be <span className="font-mono">{printExpr(flat, env.names)}</span>.{' '}
          <Button size="sm" onClick={() => ft.setText(printExpr(flat, env.names))}>
            Use left to right (add brackets)
          </Button>
        </div>
      )}
      {timesHundred && 'op' in ft.expr && (
        <div className="rounded-md border border-warn/50 bg-panel p-2 text-ui-sm text-ink-2">
          A percent output already multiplies by 100, so <span className="font-mono">× 100</span> would show the result 100 times too big.{' '}
          <Button size="sm" onClick={() => 'op' in ft.expr && ft.setText(printExpr(ft.expr.args[0], env.names))}>
            Remove × 100
          </Button>
        </div>
      )}
      <Section title="Output">
        <ColumnFormatFields column={{ format }} onChange={setFormat} />
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-ui-sm font-medium text-ink-2">Empty input</span>
            <Select aria-label="Empty input" options={POLICY_OPTIONS} value={onEmpty} onChange={(v) => setOnEmpty(v as FormulaBlankPolicy)} />
          </label>
          <label className="space-y-1">
            <span className="text-ui-sm font-medium text-ink-2">Divide by 0</span>
            <Select aria-label="Divide by 0" options={DIVIDE_OPTIONS} value={onDivide} onChange={(v) => setOnDivide(v as FormulaBlankPolicy)} />
          </label>
        </div>
      </Section>
    </div>
  )
}

/** Sample inputs for every operand the node reads, and the engine's result for them. */
function SamplePanel({
  kind,
  node,
  out,
  env,
}: {
  kind: 'formula' | 'condition' | 'rule'
  node: Expr | StudioCondition | Rule
  out: { format?: ColumnFormatConfig; onEmpty?: FormulaBlankPolicy; onDivideByZero?: FormulaBlankPolicy }
  env: LogicEnv
}) {
  const [samples, setSamples] = useState<Record<string, string>>({})
  const refs = useMemo(() => sampleRefs(node, env.formulas, env.rules, env.names), [node, env])
  const fieldTypes = useMemo(() => Object.fromEntries(env.scope.fields.map((f) => [f.name, f.kind])), [env.scope.fields])
  const result = useMemo(
    () =>
      evaluateSample(kind, node, { format: columnFormatToEngine(out.format), onEmpty: out.onEmpty, onDivideByZero: out.onDivideByZero }, refs, samples, env.formulas, env.rules, env.names, fieldTypes),
    [kind, node, out.format, out.onEmpty, out.onDivideByZero, refs, samples, env, fieldTypes],
  )
  return (
    <Section title="Sample result">
      {refs.length === 0 ? (
        <p className="text-ui-xs text-ink-3">Nothing to fill in — the result doesn’t depend on the form or the data.</p>
      ) : (
        <div className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] items-center gap-x-2 gap-y-1">
          {refs.map((r) => (
            <label key={r.id} className="contents">
              <span className="truncate font-mono text-ui-xs text-ink-2" title={r.label}>
                {r.label}
              </span>
              <Input aria-label={`Sample ${r.label}`} value={samples[r.id] ?? ''} placeholder="empty" onChange={(e) => setSamples((s) => ({ ...s, [r.id]: e.target.value }))} className="font-mono" />
            </label>
          ))}
        </div>
      )}
      <div className="flex items-baseline gap-2 rounded-md bg-panel-2 px-2 py-1.5">
        <span className="text-ui-xs text-ink-3">Result</span>
        <span className="font-mono text-ui font-semibold text-ink" data-testid="logic-sample-result">
          {result.text}
        </span>
        {result.error && <span className="text-ui-xs text-danger">{result.error}</span>}
        {kind === 'rule' && result.branch !== undefined && (
          <span className="ml-auto text-ui-xs text-ink-3">{result.branch >= 0 ? `branch ${result.branch + 1}` : 'ELSE'}</span>
        )}
      </div>
    </Section>
  )
}

/** The logic editor (spec §8.2): one dialog for a slot's condition / formula and for a saved formula / rule. */
export function LogicDialog({ target, scope, title, onClose }: { target: LogicTarget; scope: LogicScopeInfo; title: string; onClose: () => void }) {
  const project = useActiveProject()
  const updateLogic = useWorkspaceStore((s) => s.updateProjectLogic)
  const lib = useLogicLibrary(scope.loads)
  const env: LogicEnv = { scope, formulas: lib.formulas, rules: lib.rules, names: lib.names }
  const [insertTarget, setInsertTarget] = useState<InsertTarget | null>(null)
  const insertCtx = useMemo(() => ({ setTarget: setInsertTarget, insert: (t: string) => insertTarget?.insert(t) }), [insertTarget])
  const [mode, setMode] = useState<'visual' | 'code'>('visual')

  // ---- drafts
  const formulaInit: StudioFormula | null =
    target.kind === 'formula' ? target.value : target.kind === 'savedFormula' ? { expr: target.value.expr, format: target.value.format, onEmpty: target.value.onEmpty, onDivideByZero: target.value.onDivideByZero } : null
  const [useSaved, setUseSaved] = useState(formulaInit && isSavedFormula(formulaInit) ? formulaInit.formulaId : target.kind === 'condition' && target.value && 'rule' in target.value ? target.value.rule : '')
  const inline = formulaInit && !isSavedFormula(formulaInit) ? formulaInit : (inlineFormula({ lit: 0 }) as Exclude<StudioFormula, { formulaId: string }>)
  const ft = useFormulaText(inline.expr, env)
  const [format, setFormat] = useState<ColumnFormatConfig>(inline.format ?? defaultColumnFormat())
  const [onEmpty, setOnEmpty] = useState<FormulaBlankPolicy>(inline.onEmpty)
  const [onDivide, setOnDivide] = useState<FormulaBlankPolicy>(inline.onDivideByZero)
  const [cond, setCond] = useState<StudioCondition>(target.kind === 'condition' && target.value && !('rule' in target.value) ? target.value : { all: [] })
  const [rule, setRule] = useState<Rule | null>(target.kind === 'savedRule' ? target.value.rule : null)
  const [resultType, setResultType] = useState<LogicResultType>(target.kind === 'savedRule' ? target.value.resultType : 'boolean')
  const [ruleFormat, setRuleFormat] = useState<ColumnFormatConfig>(target.kind === 'savedRule' ? target.value.format : defaultColumnFormat())
  const [name, setName] = useState(target.kind === 'savedFormula' || target.kind === 'savedRule' ? target.value.name : '')
  const [description, setDescription] = useState(target.kind === 'savedFormula' || target.kind === 'savedRule' ? target.value.description : '')
  const [saveAs, setSaveAs] = useState<string | null>(null)

  const savedOptions =
    target.kind === 'formula'
      ? [
          { value: '', label: 'A formula written here' },
          ...lib.formulas.filter((f) => f.name.trim()).map((f) => ({ value: f.id, label: `Saved formula: ${f.name}` })),
          ...lib.rules.filter((r) => r.name.trim()).map((r) => ({ value: r.id, label: `Saved rule: ${r.name} (${r.resultType})` })),
        ]
      : target.kind === 'condition'
        ? [{ value: '', label: 'Conditions written here' }, ...lib.rules.filter((r) => r.name.trim() && r.resultType === 'boolean').map((r) => ({ value: r.id, label: `Saved rule: ${r.name}` }))]
        : []
  const savedPick = useSaved ? (lib.formulas.find((f) => f.id === useSaved) ?? lib.rules.find((r) => r.id === useSaved)) : undefined

  const inlineValue = (): Exclude<StudioFormula, { formulaId: string }> => ({ expr: ft.expr, format, onEmpty, onDivideByZero: onDivide })
  const nameTaken = (list: { id: string; name: string }[], n: string, self?: string) => list.some((x) => x.id !== self && x.name.trim() === n.trim())

  const save = () => {
    switch (target.kind) {
      case 'formula':
        return target.onSave(useSaved ? { formulaId: useSaved } : inlineValue())
      case 'condition':
        return target.onSave(useSaved ? { rule: useSaved } : cond)
      case 'savedFormula':
        return target.onSave({ ...target.value, name: name.trim(), description, expr: ft.expr, format, onEmpty, onDivideByZero: onDivide })
      case 'savedRule':
        return target.onSave({ ...target.value, name: name.trim(), description, resultType, rule: rule!, format: ruleFormat })
    }
  }

  /** Save as formula / rule: a new library item, and the slot now names it. */
  const commitSaveAs = () => {
    if (!project || !saveAs?.trim()) return
    if (target.kind === 'formula') {
      if (nameTaken(lib.formulas, saveAs)) return
      const def = { ...createFormulaDef(saveAs.trim(), ft.expr), format, onEmpty, onDivideByZero: onDivide }
      updateLogic(project.id, { formulas: [...lib.formulas, def] })
      target.onSave({ formulaId: def.id })
    } else if (target.kind === 'condition') {
      if (nameTaken(lib.rules, saveAs)) return
      const def = { ...createRuleDef(saveAs.trim(), 'boolean'), rule: { branches: [{ when: 'rule' in cond ? { all: [] } : cond, then: { lit: true } }], else: { lit: false } } }
      updateLogic(project.id, { rules: [...lib.rules, def] })
      target.onSave({ rule: def.id })
    }
    onClose()
  }

  const isSavedItem = target.kind === 'savedFormula' || target.kind === 'savedRule'
  const duplicate = isSavedItem && name.trim() && nameTaken(target.kind === 'savedFormula' ? lib.formulas : lib.rules, name, target.value.id)
  const canSave = !ft.error || !!useSaved || target.kind === 'condition' || target.kind === 'savedRule'
  const showFormula = target.kind === 'savedFormula' || (target.kind === 'formula' && !useSaved)
  const showCondition = target.kind === 'condition' && !useSaved
  const sampleNode: Expr | StudioCondition | Rule | null = showFormula ? ft.expr : showCondition ? cond : target.kind === 'savedRule' ? rule : savedPick ? ('expr' in savedPick ? savedPick.expr : savedPick.rule) : null
  const sampleKind = showFormula ? 'formula' : showCondition ? 'condition' : target.kind === 'savedRule' || (savedPick && 'rule' in savedPick) ? 'rule' : 'formula'

  return (
    <Modal
      id="studio-logic-editor"
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={title}
      width="min(1080px, 96vw)"
    >
      <InsertContext.Provider value={insertCtx}>
        <div className="grid max-h-[72vh] grid-cols-[minmax(0,14rem)_minmax(0,1fr)] gap-4 overflow-hidden pt-1">
          <div className="min-h-0 overflow-y-auto pr-1">
            <Palette env={env} condition={target.kind === 'condition' && mode === 'code'} />
          </div>
          <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
            {isSavedItem && (
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2">
                <label className="space-y-1">
                  <span className="text-ui-sm font-medium text-ink-2">Name</span>
                  <Input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder={target.kind === 'savedFormula' ? 'Subtotal' : 'Discount rate'} />
                  {duplicate && <span className="text-ui-xs text-danger">Another item already uses this name.</span>}
                </label>
                <label className="space-y-1">
                  <span className="text-ui-sm font-medium text-ink-2">Description</span>
                  <Input aria-label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
                </label>
              </div>
            )}
            {savedOptions.length > 0 && (
              <Section title="Use">
                <Select aria-label="Use" options={savedOptions} value={useSaved} onChange={setUseSaved} />
                {savedPick && (
                  <p className="font-mono text-ui-sm text-ink-2">
                    {'expr' in savedPick ? printExpr(savedPick.expr, lib.names) : `IF … → ${savedPick.resultType}`} — edit it on the Logic tab.
                  </p>
                )}
              </Section>
            )}
            {target.kind === 'savedRule' && rule && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="text-ui-sm font-medium text-ink-2">Result type</span>
                    <Select aria-label="Result type" options={RESULT_TYPES} value={resultType} onChange={(v) => setResultType(v as LogicResultType)} />
                  </label>
                </div>
                <RuleEditor value={rule} onChange={setRule} resultType={resultType} env={env} highlight={undefined} />
                {resultType !== 'boolean' && (
                  <Section title="Output">
                    <ColumnFormatFields column={{ format: ruleFormat }} onChange={setRuleFormat} />
                  </Section>
                )}
              </>
            )}
            {(showFormula || showCondition) && (
              <Section
                title={showFormula ? 'Formula' : 'Conditions'}
                aside={
                  showCondition && <SegmentedControl
                    aria-label="Editor mode"
                    options={[
                      { value: 'visual', label: 'Visual' },
                      { value: 'code', label: 'Code' },
                    ]}
                    value={mode}
                    onChange={(v) => setMode(v as 'visual' | 'code')}
                  />
                }
              >
                {showFormula ? (
                  <FormulaBody ft={ft} env={env} format={format} setFormat={setFormat} onEmpty={onEmpty} setOnEmpty={setOnEmpty} onDivide={onDivide} setOnDivide={setOnDivide} />
                ) : (
                  <ConditionEditor value={cond} onChange={setCond} env={env} mode={mode} />
                )}
              </Section>
            )}
            {sampleNode && (
              <SamplePanel
                kind={sampleKind}
                node={sampleNode}
                out={showFormula ? { format, onEmpty, onDivideByZero: onDivide } : target.kind === 'savedRule' ? { format: ruleFormat } : savedPick && 'format' in savedPick ? { format: savedPick.format } : {}}
                env={env}
              />
            )}
            {showCondition && <p className="text-ui-xs text-ink-3">Reads as: <span className="font-mono">{printCondition(cond, lib.names)}</span></p>}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
          {(showFormula || showCondition) && !isSavedItem && project && (
            saveAs === null ? (
              <Button onClick={() => setSaveAs('')} disabled={!!ft.error && showFormula}>
                Save as {showFormula ? 'formula' : 'rule'}…
              </Button>
            ) : (
              <div className="flex items-center gap-1.5">
                <Input aria-label="New name" autoFocus value={saveAs} placeholder="Name" onChange={(e) => setSaveAs(e.target.value)} className="w-48" />
                <Button variant="primary" onClick={commitSaveAs} disabled={!saveAs.trim() || nameTaken(showFormula ? lib.formulas : lib.rules, saveAs)}>
                  Save
                </Button>
                <Button onClick={() => setSaveAs(null)}>Cancel</Button>
                {saveAs.trim() && nameTaken(showFormula ? lib.formulas : lib.rules, saveAs) && <span className="text-ui-xs text-danger">That name is taken — reuse it from “Use” instead.</span>}
              </div>
            )
          )}
          <div className="ml-auto flex gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!canSave || !!duplicate || (isSavedItem && !name.trim())}
              onClick={() => {
                save()
                onClose()
              }}
            >
              Done
            </Button>
          </div>
        </div>
      </InsertContext.Provider>
    </Modal>
  )
}
