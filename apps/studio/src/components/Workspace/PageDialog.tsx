import { Modal } from '@gummy-ui/ui'
import { useState, type FormEvent } from 'react'
import { Button, Input } from '../common'
import { normalizePath, pathParams, slugPath } from './snapshots'
import type { PageDef } from './types'
import { useWorkspaceStore } from './workspaceStore'

/**
 * New page / page settings (the mockup's `new-page` and `page-settings`
 * dialogs) on the library Modal. The route follows the name as a slug until
 * it is edited by hand; `:params` in it are listed back so the author sees
 * what a link to this page will have to supply.
 */
export function PageDialog({
  projectId,
  page,
  onClose,
  onCreated,
}: {
  projectId: string
  /** Editing an existing page; omitted for a new one. */
  page?: PageDef
  onClose: () => void
  onCreated?: (page: PageDef) => void
}) {
  const addPage = useWorkspaceStore((s) => s.addPage)
  const updatePage = useWorkspaceStore((s) => s.updatePage)
  const [name, setName] = useState(page?.name ?? '')
  const [path, setPath] = useState(page?.path ?? '')
  const [pathTouched, setPathTouched] = useState(!!page)

  const effectivePath = pathTouched ? path : slugPath(name || 'page')
  const params = pathParams(normalizePath(effectivePath, name || 'page'))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (page) {
      updatePage(projectId, page.id, { name, path: effectivePath })
      onClose()
    } else {
      const created = addPage(projectId, { name, path: effectivePath })
      onCreated?.(created)
      onClose()
    }
  }

  return (
    <Modal
      id={page ? `studio-page-edit-${page.id}` : 'studio-page-new'}
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={page ? 'Page settings' : 'New page'}
      description={
        page
          ? 'Rename the page or change the route it is served at.'
          : 'A page is one screen of the app, with its own canvas and route.'
      }
      width="440px"
    >
      <form onSubmit={submit} className="space-y-3 pt-2 text-ink">
        <label className="block">
          <span className="mb-1 block text-ui-sm font-medium text-ink-2">Page name</span>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Country detail"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-ui-sm font-medium text-ink-2">Route</span>
          <Input
            value={effectivePath}
            onChange={(e) => {
              setPathTouched(true)
              setPath(e.target.value)
            }}
            placeholder="/countries/:code"
            className="font-mono"
          />
          <span className="mt-1 block text-ui-xs text-ink-3">
            {params.length
              ? `Expects ${params.map((p) => `:${p}`).join(', ')} — a link to this page supplies ${params.length === 1 ? 'it' : 'them'}.`
              : 'Use :name for a parameter, e.g. /countries/:code.'}
          </span>
        </label>
        <div className="flex justify-end gap-2 border-t border-line pt-3">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {page ? 'Save' : 'Create page'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
