import { Modal } from '@gummy-ui/ui'
import { PanelLeft } from 'lucide-react'
import { useState } from 'react'
import { Button, cn, Input, SegmentedControl } from '../common'
import { createFormulaDef, createRuleDef, inlineFormula, isSavedFormula, type FormulaLibDef, type RuleLibDef, type StudioCondition, type StudioFormula } from '../Workspace/logic'
import { useActiveProject, useWorkspaceStore } from '../Workspace/workspaceStore'
import type { LogicEnv } from './editors'
import { LogicEditor, type EditorValue, type InlineFormula } from './LogicEditor'
import { useLogicLibrary, type LogicScopeInfo } from './scope'

/** What the dialog edits: a slot's condition / formula, or a saved item of the Logic tab. */
export type LogicTarget =
  | { kind: 'condition'; value: StudioCondition | null; onSave: (v: StudioCondition | null) => void }
  | { kind: 'formula'; value: StudioFormula | null; onSave: (v: StudioFormula | null) => void }
  | { kind: 'savedFormula'; value: FormulaLibDef; onSave: (v: FormulaLibDef) => void }
  | { kind: 'savedRule'; value: RuleLibDef; onSave: (v: RuleLibDef) => void }

function initialValue(target: LogicTarget): EditorValue {
  switch (target.kind) {
    case 'condition':
      return { kind: 'condition', cond: target.value ?? { all: [] } }
    case 'formula':
      return { kind: 'formula', formula: (target.value && !isSavedFormula(target.value) ? target.value : inlineFormula({ lit: '' })) as InlineFormula }
    case 'savedFormula':
      return { kind: 'savedFormula', def: target.value }
    case 'savedRule':
      return { kind: 'savedRule', def: target.value }
  }
}

/** A saved item's name problem: blank, or another item of its kind has it. */
export function nameIssue(name: string, id: string, list: { id: string; name: string }[]): string | null {
  if (!name.trim()) return 'Give it a name.'
  if (list.some((x) => x.id !== id && x.name.trim() === name.trim())) return 'Another item already uses this name.'
  return null
}

/**
 * The logic editor in a dialog (spec §14.4): a slot's condition / formula or
 * a saved formula / rule — Insert · editor · Try it, Save as…, Cancel / Done.
 */
export function LogicDialog({ target, scope, title, onClose }: { target: LogicTarget; scope: LogicScopeInfo; title: string; onClose: () => void }) {
  const project = useActiveProject()
  const updateLogic = useWorkspaceStore((s) => s.updateProjectLogic)
  const lib = useLogicLibrary(scope.loads)
  const env: LogicEnv = { scope, formulas: lib.formulas, rules: lib.rules, names: lib.names }
  const [value, setValue] = useState<EditorValue>(() => initialValue(target))
  const [mode, setMode] = useState<'visual' | 'code'>('visual')
  const [insertOpen, setInsertOpen] = useState(target.kind !== 'condition' && window.innerWidth >= 1100)
  const [formulaError, setFormulaError] = useState<string | null>(null)
  const [saveAs, setSaveAs] = useState<string | null>(null)

  const issue =
    value.kind === 'savedFormula' ? nameIssue(value.def.name, value.def.id, lib.formulas) : value.kind === 'savedRule' ? nameIssue(value.def.name, value.def.id, lib.rules) : null
  const canDone = !issue && !(formulaError && (value.kind === 'formula' || value.kind === 'savedFormula'))
  const slotKind = value.kind === 'formula' ? 'formula' : value.kind === 'condition' ? 'rule' : null
  const nameTaken = (n: string) => (slotKind === 'formula' ? lib.formulas : lib.rules).some((x) => x.name.trim() === n.trim())

  const save = () => {
    if (target.kind === 'condition' && value.kind === 'condition') target.onSave(value.cond)
    else if (target.kind === 'formula' && value.kind === 'formula') target.onSave(value.formula)
    else if (target.kind === 'savedFormula' && value.kind === 'savedFormula') target.onSave({ ...value.def, name: value.def.name.trim() })
    else if (target.kind === 'savedRule' && value.kind === 'savedRule') target.onSave({ ...value.def, name: value.def.name.trim() })
  }

  /** Save as formula / rule: a new library item, and the slot now names it. */
  const commitSaveAs = () => {
    if (!project || !saveAs?.trim() || nameTaken(saveAs)) return
    const name = saveAs.trim()
    if (target.kind === 'formula' && value.kind === 'formula') {
      const def = { ...createFormulaDef(name, value.formula.expr), format: value.formula.format, onEmpty: value.formula.onEmpty, onDivideByZero: value.formula.onDivideByZero }
      updateLogic(project.id, { formulas: [...lib.formulas, def] })
      target.onSave({ formulaId: def.id })
    } else if (target.kind === 'condition' && value.kind === 'condition') {
      const cond = value.cond
      const when = 'rule' in cond ? { all: [{ cmp: 'eq' as const, left: { rule: cond.rule }, right: { lit: true } }] } : cond
      const def = { ...createRuleDef(name, 'boolean'), rule: { branches: [{ when, then: { lit: true } }], else: { lit: false } } }
      updateLogic(project.id, { rules: [...lib.rules, def] })
      target.onSave({ rule: def.id })
    }
    onClose()
  }

  const lead = /when$/i.test(title) ? title : 'When'

  return (
    <Modal
      id="studio-logic-editor"
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={title}
      width={insertOpen ? 'min(1120px, 96vw)' : 'min(900px, 96vw)'}
    >
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          aria-pressed={insertOpen}
          onClick={() => setInsertOpen((o) => !o)}
          className={cn('btn btn-sm', insertOpen && 'bg-panel-2')}
          title={insertOpen ? 'Hide the Insert list' : 'Show the Insert list'}
        >
          <PanelLeft aria-hidden className="size-3.5" /> Insert
        </button>
        {value.kind === 'condition' && (
          <SegmentedControl
            className="ml-auto"
            aria-label="Editor mode"
            options={[
              { value: 'visual', label: 'Visual' },
              { value: 'code', label: 'Code' },
            ]}
            value={mode}
            onChange={(m) => {
              setMode(m as 'visual' | 'code')
              if (m === 'code') setInsertOpen(true)
            }}
          />
        )}
      </div>
      <div className="flex max-h-[68vh] min-h-[22rem] flex-col overflow-hidden">
        <LogicEditor value={value} onChange={setValue} env={env} insertOpen={insertOpen} mode={mode} lead={lead} nameIssue={issue} onFormulaError={setFormulaError} />
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
        {slotKind &&
          project &&
          (saveAs === null ? (
            <Button onClick={() => setSaveAs('')} disabled={!!formulaError && slotKind === 'formula'}>
              Save as {slotKind}…
            </Button>
          ) : (
            <div className="flex items-center gap-1.5">
              <Input aria-label="New name" autoFocus value={saveAs} placeholder="Name" onChange={(e) => setSaveAs(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commitSaveAs()} className="w-48" />
              <Button variant="primary" onClick={commitSaveAs} disabled={!saveAs.trim() || nameTaken(saveAs)}>
                Save
              </Button>
              <Button onClick={() => setSaveAs(null)}>Cancel</Button>
              {saveAs.trim() && nameTaken(saveAs) && <span className="text-ui-xs text-danger">That name is taken.</span>}
            </div>
          ))}
        <div className="ml-auto flex gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!canDone}
            onClick={() => {
              save()
              onClose()
            }}
          >
            Done
          </Button>
        </div>
      </div>
    </Modal>
  )
}
