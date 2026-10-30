import { GitBranch, PanelLeft, Plus, Search, Sigma } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CodeViewer, cn, ConfirmDialog, SegmentedControl } from '../common'
import type { GridItemData } from '../Layout/types'
import { createFormulaDef, createRuleDef, libraryIssues, logicLibraryToEngine, logicRefIds, type FormulaLibDef, type RuleLibDef } from '../Workspace/logic'
import type { PageDef } from '../Workspace/types'
import { useActiveProject, useWorkspaceStore } from '../Workspace/workspaceStore'
import type { LogicEnv } from './editors'
import { nameIssue } from './LogicDialog'
import { LogicEditor, type EditorValue } from './LogicEditor'
import { MenuButton } from './MenuButton'
import { formatSummary } from './model'
import { useLibraryLogicScope, useLogicLibrary } from './scope'

/** One place a saved item is used: an item on a page, or another saved item. */
type Usage = { label: string; pageId?: string; itemId?: string; savedId?: string }

function itemLabel(item: GridItemData): string {
  const c = item.config as { name?: string; label?: string; title?: string; text?: unknown } | undefined
  const name = c?.label || c?.name || c?.title || (typeof c?.text === 'string' ? c.text : '')
  const short = name.length > 36 ? `${name.slice(0, 35)}…` : name
  return short ? `${item.type} “${short}”` : item.type
}

/** Where each saved item is used: items on pages (the innermost item holding the reference) and other saved items. */
function usages(pages: PageDef[], formulas: FormulaLibDef[], rules: RuleLibDef[]): Map<string, Usage[]> {
  const out = new Map<string, Usage[]>()
  const add = (id: string, u: Usage) => out.set(id, [...(out.get(id) ?? []), u])
  const walk = (page: PageDef, items: GridItemData[]) => {
    for (const item of items) {
      const own = logicRefIds({ ...item, childCanvases: undefined })
      for (const id of new Set([...own.formulas, ...own.rules])) add(id, { label: `${itemLabel(item)} · ${page.name}`, pageId: page.id, itemId: item.id })
      for (const c of item.childCanvases ?? []) walk(page, c.items)
    }
  }
  for (const pg of pages) walk(pg, pg.grid.items)
  for (const f of formulas) for (const id of new Set([...logicRefIds(f.expr).formulas, ...logicRefIds(f.expr).rules])) add(id, { label: `formula ${f.name}`, savedId: f.id })
  for (const r of rules) for (const id of new Set([...logicRefIds(r.rule).formulas, ...logicRefIds(r.rule).rules])) add(id, { label: `rule ${r.name}`, savedId: r.id })
  return out
}

const uniqueName = (base: string, taken: { name: string }[]) => {
  let n = base
  for (let i = 2; taken.some((x) => x.name.trim() === n); i++) n = `${base} ${i}`
  return n
}

/**
 * The project's **Logic** tab (spec §14.8): the saved formulas and rules on
 * the left, the selected one's editor inline on the right (autosaved), with
 * where it is used and the JSON it exports as.
 */
export function LogicPage() {
  const project = useActiveProject()
  const update = useWorkspaceStore((s) => s.updateProjectLogic)
  const scope = useLibraryLogicScope()
  const { formulas, rules, names } = useLogicLibrary(scope.loads)
  const env: LogicEnv = useMemo(() => ({ scope, formulas, rules, names }), [scope, formulas, rules, names])
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'formulas' | 'rules'>('all')
  const [tab, setTab] = useState<'editor' | 'used' | 'json'>('editor')
  const [insertOpen, setInsertOpen] = useState(() => window.innerWidth >= 1360)
  const [deleting, setDeleting] = useState<{ kind: 'formula' | 'rule'; id: string; name: string } | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const pages = project?.snapshot.pages ?? []
  const used = useMemo(() => usages(pages, formulas, rules), [pages, formulas, rules])
  const issues = useMemo(() => libraryIssues(formulas, rules), [formulas, rules])
  if (!project) return null

  const selectedId = params.get('item') ?? formulas[0]?.id ?? rules[0]?.id ?? null
  const selected = formulas.find((f) => f.id === selectedId) ?? rules.find((r) => r.id === selectedId) ?? null
  const select = (id: string) => {
    setParams({ item: id }, { replace: true })
    setTab('editor')
  }
  const setFormulas = (next: FormulaLibDef[]) => update(project.id, { formulas: next })
  const setRules = (next: RuleLibDef[]) => update(project.id, { rules: next })
  const hasIssue = (name: string) => issues.some((i) => i.level === 'error' && (i.where.endsWith(` ${name}`) || i.where === name))

  const newFormula = () => {
    const def = createFormulaDef(uniqueName('New formula', formulas), { lit: '' })
    setFormulas([...formulas, def])
    select(def.id)
  }
  const newRule = () => {
    const def = createRuleDef(uniqueName('New rule', rules), 'boolean')
    setRules([...rules, def])
    select(def.id)
  }
  const duplicate = (item: FormulaLibDef | RuleLibDef) => {
    if ('expr' in item) {
      const def = { ...item, id: createFormulaDef().id, name: uniqueName(`${item.name} copy`, formulas) }
      setFormulas([...formulas, def])
      select(def.id)
    } else {
      const def = { ...item, id: createRuleDef().id, name: uniqueName(`${item.name} copy`, rules) }
      setRules([...rules, def])
      select(def.id)
    }
  }

  const q = query.trim().toLowerCase()
  const match = (x: { name: string; description: string }) => !q || `${x.name} ${x.description}`.toLowerCase().includes(q)
  const rows: (FormulaLibDef | RuleLibDef)[] = [...(filter !== 'rules' ? formulas.filter(match) : []), ...(filter !== 'formulas' ? rules.filter(match) : [])]

  const editorValue: EditorValue | null = selected ? ('expr' in selected ? { kind: 'savedFormula', def: selected } : { kind: 'savedRule', def: selected }) : null
  const onEdit = (v: EditorValue) => {
    if (v.kind === 'savedFormula') setFormulas(formulas.map((f) => (f.id === v.def.id ? v.def : f)))
    else if (v.kind === 'savedRule') setRules(rules.map((r) => (r.id === v.def.id ? v.def : r)))
  }
  const where = selected ? (used.get(selected.id) ?? []) : []
  // The whole library: a saved item's references only resolve to names against it.
  const engine = logicLibraryToEngine(formulas, rules, scope.loads)
  const name = selected?.name.trim() ?? ''
  const exported = selected && ('expr' in selected ? engine.formulas : engine.rules)?.[name]
  const json = selected ? JSON.stringify(exported ? { [name]: exported } : {}, null, 2) : ''

  return (
    <div className="flex min-h-0 flex-1 bg-surface">
      {/* ---- the list */}
      <aside aria-label="Saved logic" className="flex w-72 shrink-0 flex-col border-r border-line bg-panel">
        <div className="space-y-2 border-b border-line p-3">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-ink">Logic</h2>
            <div className="ml-auto">
              <NewMenu onFormula={newFormula} onRule={newRule} />
            </div>
          </div>
          <label className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-2">
            <Search aria-hidden className="size-3.5 text-ink-3" />
            <input aria-label="Search logic" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="h-7 w-full bg-transparent text-ui-sm text-ink outline-none placeholder:text-ink-3" />
          </label>
          <SegmentedControl
            aria-label="Show"
            options={[
              { value: 'all', label: 'All' },
              { value: 'formulas', label: `Formulas ${formulas.length}` },
              { value: 'rules', label: `Rules ${rules.length}` },
            ]}
            value={filter}
            onChange={(v) => setFilter(v as typeof filter)}
          />
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {rows.length === 0 && <li className="p-2 text-ui-sm text-ink-3">{formulas.length + rules.length ? 'Nothing matches.' : 'None yet — create one with + New, or “Save as…” from any slot.'}</li>}
          {rows.map((item) => {
            const isFormula = 'expr' in item
            const count = used.get(item.id)?.length ?? 0
            const active = item.id === selected?.id
            return (
              <li key={item.id} className={cn('group flex items-center gap-1 rounded-md pr-1', active ? 'bg-panel-2' : 'hover:bg-panel-2/60')}>
                <button type="button" aria-current={active} onClick={() => select(item.id)} className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left">
                  <span className={cn('grid size-6 shrink-0 place-items-center rounded-md', isFormula ? 'bg-logic-saved-tint text-logic-saved' : 'bg-logic-rule-tint text-logic-rule')}>
                    {isFormula ? <Sigma aria-hidden className="size-3.5" /> : <GitBranch aria-hidden className="size-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-ui font-medium text-ink">{item.name || '(unnamed)'}</span>
                      {hasIssue(item.name) && <span aria-label="has a problem" className="size-1.5 shrink-0 rounded-full bg-danger" />}
                    </span>
                    <span className="block truncate text-ui-xs text-ink-3">{isFormula ? formatSummary(item.format) : `gives ${item.resultType === 'boolean' ? 'yes / no' : item.resultType}`}</span>
                  </span>
                  <span title={`Used in ${count} place${count === 1 ? '' : 's'}`} className={cn('shrink-0 rounded-full px-1.5 text-ui-xs', count ? 'bg-panel text-ink-2' : 'text-ink-3')}>
                    {count}
                  </span>
                </button>
                <MenuButton
                  label={`${item.name} options`}
                  className="opacity-0 group-hover:opacity-100 focus-within:opacity-100"
                  items={[
                    { label: 'Duplicate', onClick: () => duplicate(item) },
                    {
                      label: 'Rename',
                      onClick: () => {
                        select(item.id)
                        requestAnimationFrame(() => nameRef.current?.select())
                      },
                    },
                    {
                      label: 'Delete',
                      danger: true,
                      disabled: count > 0,
                      title: count ? `In use: ${(used.get(item.id) ?? []).map((u) => u.label).join(', ')}` : undefined,
                      onClick: () => setDeleting({ kind: isFormula ? 'formula' : 'rule', id: item.id, name: item.name }),
                    },
                  ]}
                />
              </li>
            )
          })}
        </ul>
      </aside>

      {/* ---- the detail */}
      <section className="flex min-w-0 flex-1 flex-col">
        {!selected || !editorValue ? (
          <div className="grid flex-1 place-items-center p-6 text-center text-ui text-ink-3">
            <div>
              <p>Saved formulas and rules are reused by name from any page — Show when, Enabled when, a field’s or a text’s value, a computed column, a style rule.</p>
              <p className="mt-2">Create one with + New.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-line px-4 py-2">
              <div role="tablist" aria-label="Item" className="flex gap-1">
                {(
                  [
                    ['editor', 'Editor'],
                    ['used', `Used by ${where.length}`],
                    ['json', 'JSON'],
                  ] as const
                ).map(([key, label]) => (
                  <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={cn('mini-tab whitespace-nowrap', tab === key && 'text-ink')}>
                    {label}
                  </button>
                ))}
              </div>
              {tab === 'editor' && (
                <button type="button" aria-pressed={insertOpen} onClick={() => setInsertOpen((o) => !o)} className={cn('btn btn-sm ml-auto', insertOpen && 'bg-panel-2')}>
                  <PanelLeft aria-hidden className="size-3.5" /> Insert
                </button>
              )}
            </div>
            <div className="flex min-h-0 flex-1 flex-col p-4">
              {tab === 'editor' && (
                <LogicEditor
                  key={selected.id}
                  value={editorValue}
                  onChange={onEdit}
                  env={env}
                  insertOpen={insertOpen}
                  nameRef={nameRef}
                  nameIssue={'expr' in selected ? nameIssue(selected.name, selected.id, formulas) : nameIssue(selected.name, selected.id, rules)}
                />
              )}
              {tab === 'used' &&
                (where.length === 0 ? (
                  <p className="text-ui text-ink-3">Nothing uses it yet.</p>
                ) : (
                  <ul className="max-w-xl divide-y divide-line rounded-lg border border-line">
                    {where.map((u, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-ui text-ink hover:bg-panel-2"
                          onClick={() => {
                            if (u.savedId) select(u.savedId)
                            else if (u.pageId) navigate(`/p/${project.id}/pages/${u.pageId}`, { state: { selectItem: u.itemId } })
                          }}
                        >
                          {u.label}
                          <span className="ml-auto text-ui-xs text-ink-3">{u.savedId ? 'open' : 'go to item →'}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ))}
              {tab === 'json' && <CodeViewer tabs={[{ id: 'logic', label: `${'expr' in selected ? 'project.formulas' : 'project.rules'} · ${selected.name}`, language: 'json', code: json }]} />}
            </div>
          </>
        )}
      </section>

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
            setParams({}, { replace: true })
          }}
        />
      )}
    </div>
  )
}

function NewMenu({ onFormula, onRule }: { onFormula: () => void; onRule: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" className="btn btn-sm" onClick={onFormula} title="New formula">
        <Plus aria-hidden className="size-3.5" /> Formula
      </button>
      <button type="button" className="btn btn-sm" onClick={onRule} title="New rule">
        <Plus aria-hidden className="size-3.5" /> Rule
      </button>
    </div>
  )
}
