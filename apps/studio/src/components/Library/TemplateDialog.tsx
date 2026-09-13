import { Modal } from '@gummy-ui/ui'
import { useState, type FormEvent } from 'react'
import { Button, Input, Select } from '../common'
import type { PageGrid, TemplateDef } from '../Workspace/types'
import { useTemplates, useWorkspaceStore } from '../Workspace/workspaceStore'

const NEW_CATEGORY = '__new__'

/**
 * New template / template details (the mockup's `new-template` and
 * `tpl-edit` dialogs) on the library Modal. Categories are free text: pick an
 * existing one or type a new one. `grid` seeds a template saved from a page.
 */
export function TemplateDialog({
  template,
  grid,
  onClose,
  onCreated,
}: {
  template?: TemplateDef
  /** For "save this page as a template": the page grid to copy in. */
  grid?: PageGrid
  onClose: () => void
  onCreated?: (template: TemplateDef) => void
}) {
  const templates = useTemplates()
  const addTemplate = useWorkspaceStore((s) => s.addTemplate)
  const updateTemplate = useWorkspaceStore((s) => s.updateTemplate)
  const user = useWorkspaceStore((s) => s.user)
  const categories = [...new Set(templates.map((t) => t.category).filter(Boolean))]

  const [name, setName] = useState(template?.name ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const initialCategory = template?.category ?? categories[0] ?? ''
  const [category, setCategory] = useState(initialCategory)
  const [customCategory, setCustomCategory] = useState('')
  const [isCustom, setIsCustom] = useState(categories.length === 0)
  const [active, setActive] = useState(template?.active ?? true)

  const finalCategory = (isCustom ? customCategory : category).trim() || 'General'

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (template) {
      updateTemplate(template.id, { name, description, category: finalCategory, active })
      onClose()
    } else {
      const created = addTemplate({
        name,
        description,
        category: finalCategory,
        grid,
        createdBy: user,
      })
      onCreated?.(created)
      onClose()
    }
  }

  return (
    <Modal
      id={template ? `studio-template-edit-${template.id}` : 'studio-template-new'}
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={template ? 'Template details' : grid ? 'Save page as a template' : 'New template'}
      description={
        template
          ? 'Rename the template, refile it or hide it from the studio.'
          : grid
            ? 'The page’s blocks are copied into a shared template your team can drop into any page.'
            : 'You will land in the layout editor next, with an empty canvas to build the master layout.'
      }
      width="440px"
    >
      <form onSubmit={submit} className="space-y-3 pt-2 text-ink">
        <label className="block">
          <span className="mb-1 block text-ui-sm font-medium text-ink-2">Name</span>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Approval page"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-ui-sm font-medium text-ink-2">Description</span>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What it is good for"
          />
        </label>
        <div className="block">
          <span className="mb-1 block text-ui-sm font-medium text-ink-2">Category</span>
          {!isCustom && categories.length > 0 ? (
            <Select
              options={[
                ...categories.map((c) => ({ value: c, label: c })),
                { value: NEW_CATEGORY, label: '+ New category…' },
              ]}
              value={category}
              onChange={(v) => {
                if (v === NEW_CATEGORY) setIsCustom(true)
                else setCategory(v)
              }}
            />
          ) : (
            <Input
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              placeholder="Data, Forms, Marketing…"
            />
          )}
        </div>
        {template && (
          <label className="flex cursor-pointer items-center gap-2 text-ui text-ink">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-3.5 w-3.5 accent-accent"
            />
            Available in the studio’s Templates tab
          </label>
        )}
        <div className="flex justify-end gap-2 border-t border-line pt-3">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {template ? 'Save' : grid ? 'Save template' : 'Create and open the editor'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
