import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../common'
import { TemplateDialog } from '../Library/TemplateDialog'
import { TemplateThumb } from '../Library/TemplateThumb'
import { useTemplates } from '../Workspace/workspaceStore'
import { cloneItems } from './cloneItems'
import { useGridStore } from './gridStore'

/**
 * The studio's Templates tab (the mockup's `tplPanel`): the library's active
 * templates as thumbnails — click one to append its blocks (freshly id'd,
 * references remapped) to the end of the active canvas — and "Save this page
 * as a template", which copies the whole page grid into the library.
 */
export function TemplatesPanel() {
  const templates = useTemplates().filter((t) => t.active)
  const appendItems = useGridStore((s) => s.appendItems)
  const [saving, setSaving] = useState(false)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2">
      <p className="mb-2 px-1 text-ui-xs leading-snug text-ink-3">
        Click one to drop its blocks at the end of this canvas.
      </p>
      <div className="flex flex-col gap-2">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => appendItems(cloneItems(t.grid.items))}
            title={`Insert “${t.name}”`}
            className="group rounded-md border border-line bg-surface p-1.5 text-left transition-colors hover:border-line-strong hover:bg-panel"
          >
            <TemplateThumb grid={t.grid} className="gap-0.5 p-1.5" />
            <span className="mt-1.5 flex items-baseline gap-1.5 px-0.5">
              <b className="min-w-0 flex-1 truncate text-ui font-semibold text-ink">{t.name}</b>
              <span className="font-mono text-ui-xs text-ink-3">{t.grid.items.length} block(s)</span>
            </span>
          </button>
        ))}
        {templates.length === 0 && (
          <p className="px-1 py-6 text-center text-ui text-ink-3">
            No active template.{' '}
            <Link to="/library/templates" className="underline hover:text-ink">
              Turn some on in the library.
            </Link>
          </p>
        )}
      </div>
      <Button size="sm" className="mt-3 w-full" onClick={() => setSaving(true)}>
        <Plus size={13} aria-hidden="true" />
        Save this page as a template
      </Button>

      {saving && (
        <TemplateDialog
          grid={(() => {
            const g = useGridStore.getState()
            return {
              items: cloneItems(g.items),
              containerSettings: g.containerSettings,
              fieldSeq: g.fieldSeq,
            }
          })()}
          onClose={() => setSaving(false)}
        />
      )}
    </div>
  )
}
