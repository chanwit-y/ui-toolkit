import { useMemo, useState } from 'react'
import { Button, CodeViewer, ConfirmDialog, Input } from '../common'
import {
  createFormulaDef,
  createRuleDef,
  libraryIssues,
  logicLibraryToEngine,
  logicRefIds,
  printExpr,
  ruleSummary,
  type FormulaLibDef,
  type RuleLibDef,
} from '../Workspace/logic'
import type { PageDef } from '../Workspace/types'
import { useActiveProject, useWorkspaceStore } from '../Workspace/workspaceStore'
import { LogicDialog, type LogicTarget } from './LogicDialog'
import { useLibraryLogicScope, useLogicLibrary } from './scope'

/** Where each saved item is used: page names (items on them) and other saved items. */
function usages(pages: PageDef[], formulas: FormulaLibDef[], rules: RuleLibDef[]): Map<string, string[]> {
  const out = new Map<string, string[]>()
  const add = (id: string, where: string) => out.set(id, [...(out.get(id) ?? []), where])
  for (const pg of pages) {
    const refs = logicRefIds(pg.grid.items)
    for (const id of [...refs.formulas, ...refs.rules]) add(id, `page ${pg.name}`)
  }
  for (const f of formulas) {
    const refs = logicRefIds(f.expr)
    for (const id of [...refs.formulas, ...refs.rules]) add(id, `formula ${f.name}`)
  }
  for (const r of rules) {
    const refs = logicRefIds(r.rule)
    for (const id of [...refs.formulas, ...refs.rules]) add(id, `rule ${r.name}`)
  }
  return out
}

/**
 * The project's **Logic** tab (spec §8.2): its saved formulas and rules, with
 * where each is used, problems, and the runtime JSON they export as. Items
 * reference them by id, so a rename is safe; a used item can't be deleted.
 */
export function LogicPage() {
  const project = useActiveProject()
  const update = useWorkspaceStore((s) => s.updateProjectLogic)
  const scope = useLibraryLogicScope()
  const { formulas, rules, names } = useLogicLibrary(scope.loads)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<LogicTarget | null>(null)
  const [deleting, setDeleting] = useState<{ kind: 'formula' | 'rule'; id: string; name: string } | null>(null)
  const pages = project?.snapshot.pages ?? []
  const used = useMemo(() => usages(pages, formulas, rules), [pages, formulas, rules])
  const issues = useMemo(() => libraryIssues(formulas, rules), [formulas, rules])
  const json = useMemo(() => JSON.stringify(logicLibraryToEngine(formulas, rules, scope.loads), null, 2), [formulas, rules, scope.loads])
  if (!project) return null

  const setFormulas = (next: FormulaLibDef[]) => update(project.id, { formulas: next })
  const setRules = (next: RuleLibDef[]) => update(project.id, { rules: next })
  const match = (x: { name: string; description: string }) => !query.trim() || `${x.name} ${x.description}`.toLowerCase().includes(query.trim().toLowerCase())
  const editFormula = (f: FormulaLibDef) =>
    setEditing({ kind: 'savedFormula', value: f, onSave: (v) => setFormulas((project.snapshot.formulas ?? []).map((x) => (x.id === v.id ? v : x))) })
  const editRule = (r: RuleLibDef) => setEditing({ kind: 'savedRule', value: r, onSave: (v) => setRules((project.snapshot.rules ?? []).map((x) => (x.id === v.id ? v : x))) })

  const row = (kind: 'formula' | 'rule', item: FormulaLibDef | RuleLibDef, code: string, tag: string) => {
    const where = used.get(item.id) ?? []
    return (
      <li key={item.id} className="list-row flex items-start gap-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-medium text-ink">{item.name || <span className="text-danger">(unnamed)</span>}</span>
            <span className="tag">{tag}</span>
            <span className="text-ui-xs text-ink-3" title={where.join(', ')}>
              Used by {where.length}
            </span>
          </div>
          {item.description && <p className="text-ui-sm text-ink-2">{item.description}</p>}
          <p className="truncate font-mono text-ui-xs text-ink-2" title={code}>
            {code}
          </p>
        </div>
        <Button size="sm" onClick={() => (kind === 'formula' ? editFormula(item as FormulaLibDef) : editRule(item as RuleLibDef))}>
          Edit
        </Button>
        <Button
          size="sm"
          disabled={where.length > 0}
          title={where.length ? `In use: ${where.join(', ')}` : undefined}
          onClick={() => setDeleting({ kind, id: item.id, name: item.name })}
        >
          Delete
        </Button>
      </li>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-surface">
      <div className="mx-auto max-w-[880px] px-6 pb-16 pt-6">
        <h2 className="text-[15px] font-semibold text-ink">Logic</h2>
        <p className="mt-1 text-ui text-ink-2">
          Saved formulas and rules, reused by name from any page: an item’s Show when / Enabled when, a field’s or a text’s value, a table’s
          computed column or style rule. A formula computes a value; a rule picks one (IF / ELSE IF / ELSE) — a true / false rule is also a
          condition. Fields are read by name wherever the item is used.
        </p>

        <div className="mt-4 flex items-center gap-2">
          <Input aria-label="Search logic" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="w-60" />
          <div className="ml-auto flex gap-2">
            <Button
              onClick={() => {
                const def = createFormulaDef('')
                setEditing({ kind: 'savedFormula', value: def, onSave: (v) => setFormulas([...(project.snapshot.formulas ?? []), v]) })
              }}
            >
              + New formula
            </Button>
            <Button
              onClick={() => {
                const def = createRuleDef('', 'boolean')
                setEditing({ kind: 'savedRule', value: def, onSave: (v) => setRules([...(project.snapshot.rules ?? []), v]) })
              }}
            >
              + New rule
            </Button>
          </div>
        </div>

        {issues.length > 0 && (
          <ul className="mt-3 space-y-0.5 rounded-md border border-danger/40 bg-panel p-2">
            {issues.map((i, n) => (
              <li key={n} className={i.level === 'error' ? 'text-ui-sm text-danger' : 'text-ui-sm text-warn'}>
                ⚠ {i.where}: {i.message}
              </li>
            ))}
          </ul>
        )}

        <section className="mt-5 box p-3">
          <span className="sec-label block">Formulas ({formulas.length})</span>
          {formulas.length === 0 ? (
            <p className="mt-1 text-ui-sm text-ink-3">None yet — create one here, or “Save as formula…” from any formula slot.</p>
          ) : (
            <ul className="mt-1 divide-y divide-line">{formulas.filter(match).map((f) => row('formula', f, printExpr(f.expr, names), f.format.type || 'raw'))}</ul>
          )}
        </section>

        <section className="mt-4 box p-3">
          <span className="sec-label block">Rules ({rules.length})</span>
          {rules.length === 0 ? (
            <p className="mt-1 text-ui-sm text-ink-3">None yet — create one here, or “Save as rule…” from any condition.</p>
          ) : (
            <ul className="mt-1 divide-y divide-line">{rules.filter(match).map((r) => row('rule', r, ruleSummary(r.rule, names), r.resultType))}</ul>
          )}
        </section>

        <section className="mt-4">
          <CodeViewer tabs={[{ id: 'logic', label: 'project.formulas / rules', language: 'json', code: json }]} />
        </section>
      </div>
      {editing && <LogicDialog target={editing} scope={scope} title={editing.kind === 'savedFormula' ? 'Formula' : 'Rule'} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.kind} ${deleting.name || '(unnamed)'}?`}
          body="Nothing uses it. This can’t be undone."
          confirmLabel="Delete"
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            if (deleting.kind === 'formula') setFormulas(formulas.filter((f) => f.id !== deleting.id))
            else setRules(rules.filter((r) => r.id !== deleting.id))
            setDeleting(null)
          }}
        />
      )}
    </div>
  )
}
