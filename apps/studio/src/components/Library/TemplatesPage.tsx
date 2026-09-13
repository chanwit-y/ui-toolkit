import { Copy, LayoutGrid, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, cn, ConfirmDialog, IconButton } from '../common'
import { countComponents } from '../Workspace/snapshots'
import type { TemplateDef } from '../Workspace/types'
import { useTemplates, useWorkspaceStore } from '../Workspace/workspaceStore'
import { useLibraryUiStore } from './libraryUiStore'
import { TemplateDialog } from './TemplateDialog'
import { TemplateThumb } from './TemplateThumb'

/** "just now" / "5m ago" / "3h ago" / "2d ago". */
function timeAgo(ts: number): string {
  const s = (Date.now() - ts) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

type Dialog = { kind: 'new' } | { kind: 'edit'; template: TemplateDef } | { kind: 'delete'; template: TemplateDef } | null

/**
 * The portal's Templates page (the mockup's `templatePage`): cards grouped
 * by category, each with a wireframe thumbnail, meta, and Layout / Details /
 * Duplicate / Activate toggle / Delete. A deactivated template dims and
 * leaves the studio's Templates tab without being deleted.
 */
export function TemplatesPage() {
  const templates = useTemplates()
  const query = useLibraryUiStore((s) => s.query)
  const user = useWorkspaceStore((s) => s.user)
  const updateTemplate = useWorkspaceStore((s) => s.updateTemplate)
  const duplicateTemplate = useWorkspaceStore((s) => s.duplicateTemplate)
  const deleteTemplate = useWorkspaceStore((s) => s.deleteTemplate)
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<Dialog>(null)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return templates
    return templates.filter(
      (t) => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q),
    )
  }, [templates, query])
  const categories = [...new Set(list.map((t) => t.category))]

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto max-w-[1060px] px-6 pb-16 pt-6">
        <div className="mb-2 flex items-end gap-3.5">
          <div>
            <h1 className="text-[21px] font-[650] tracking-[-0.02em] text-ink">Templates</h1>
            <p className="mt-0.5 text-ui text-ink-2">
              Starting layouts your team can drop into any page. Turn one off to hide it without
              deleting it.
            </p>
          </div>
          <div className="flex-1" />
          <Button variant="primary" onClick={() => setDialog({ kind: 'new' })}>
            <Plus size={14} aria-hidden="true" />
            New template
          </Button>
        </div>

        {list.length === 0 ? (
          <div className="mt-4 rounded-[10px] border border-dashed border-line-strong px-6 py-10 text-center text-ui text-ink-2">
            <b className="mb-1 block text-[13.5px] text-ink">
              {query ? 'No template matches that search.' : 'No templates yet.'}
            </b>
            Create one here, or save any page you have already laid out from the studio.
          </div>
        ) : (
          categories.map((cat) => (
            <section key={cat}>
              <span className="sec-label mb-2.5 mt-4 block">{cat}</span>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
                {list
                  .filter((t) => t.category === cat)
                  .map((t) => (
                    <article
                      key={t.id}
                      className={cn(
                        'flex flex-col overflow-hidden rounded-[10px] border border-line bg-surface',
                        !t.active && 'opacity-60',
                      )}
                    >
                      <button
                        type="button"
                        title="Edit the layout"
                        onClick={() => navigate(`/library/templates/${t.id}/layout`)}
                        className="block bg-sunken p-3 text-left transition-colors hover:bg-panel-2"
                      >
                        <TemplateThumb grid={t.grid} />
                      </button>
                      <div className="flex flex-1 flex-col gap-0.5 px-3.5 pt-3">
                        <b className="text-[13.5px] font-semibold text-ink">{t.name}</b>
                        <span className="text-ui text-ink-2">{t.description}</span>
                        <span className="mt-1 font-mono text-ui-xs text-ink-3">
                          {countComponents(t.grid.items)} block(s) · {t.createdBy} ·{' '}
                          {timeAgo(t.updatedAt)}
                          {t.builtin && ' · builtin'}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line px-3 py-2.5">
                        <Button size="sm" onClick={() => navigate(`/library/templates/${t.id}/layout`)}>
                          <LayoutGrid size={12} aria-hidden="true" />
                          Layout
                        </Button>
                        <Button size="sm" onClick={() => setDialog({ kind: 'edit', template: t })}>
                          <Pencil size={12} aria-hidden="true" />
                          Details
                        </Button>
                        <Button size="sm" onClick={() => duplicateTemplate(t.id, user)}>
                          <Copy size={12} aria-hidden="true" />
                          Duplicate
                        </Button>
                        <Button size="sm" onClick={() => updateTemplate(t.id, { active: !t.active })}>
                          {t.active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <span className="flex-1" />
                        <IconButton
                          label={`Delete ${t.name}`}
                          className="btn-icon-sm h-6! text-ink-3 hover:text-danger"
                          onClick={() => setDialog({ kind: 'delete', template: t })}
                        >
                          <Trash2 size={12} aria-hidden="true" />
                        </IconButton>
                      </div>
                    </article>
                  ))}
              </div>
            </section>
          ))
        )}
      </div>

      {dialog?.kind === 'new' && (
        <TemplateDialog
          onClose={() => setDialog(null)}
          onCreated={(t) => navigate(`/library/templates/${t.id}/layout`)}
        />
      )}
      {dialog?.kind === 'edit' && (
        <TemplateDialog template={dialog.template} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog
          title={`Delete “${dialog.template.name}”?`}
          body="Pages already built from it keep their blocks; only the template goes. There is no undo."
          confirmLabel="Delete template"
          onConfirm={() => {
            deleteTemplate(dialog.template.id)
            setDialog(null)
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}
