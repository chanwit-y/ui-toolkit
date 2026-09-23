import { useMemo, type ReactNode } from 'react'
import { Input } from '../common'
import { useActivePages } from '../Workspace/workspaceStore'
import { ColumnHtmlField, type PickableFields } from './ColumnHtmlField'
import { buildHtmlPreviewValue } from './dataTablePreview'
import { useGridStore } from './gridStore'
import { ItemBindingField } from './ItemBindingField'
import { useRepeaterScope } from './repeaterScope'
import type { HtmlContentConfig } from './types'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-ui-sm font-medium text-ink-2">{label}</span>
      {children}
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-ui-sm font-medium text-ink-2">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-line-strong text-ink focus:ring-focus/30"
      />
    </label>
  )
}

const NO_ITEM: PickableFields = { fields: null, reason: 'Not inside a repeater — the placeholders read nothing here; static markup only.' }

/**
 * Inspector for an HTML content block: the template through the data table's
 * `ColumnHtmlField` (textarea, "Insert field" over the enclosing repeater's
 * item fields, snippets, sanitiser-checked preview), the binding the
 * placeholders read (offered inside a repeater's template — the item itself by
 * default), and the prose toggle.
 */
export function HtmlContentConfigPanel({ itemId, config }: { itemId: string; config: HtmlContentConfig }) {
  const updateItemConfig = useGridStore((s) => s.updateItemConfig)
  const set = <K extends keyof HtmlContentConfig>(key: K, value: HtmlContentConfig[K]) =>
    updateItemConfig(itemId, { [key]: value } as Partial<HtmlContentConfig>)
  const scope = useRepeaterScope()
  const pages = useActivePages()
  // "Insert field" lists the bound value's fields: the item's when the block
  // reads the item itself, nothing pickable when it reads one field of it.
  const rowModel: PickableFields = useMemo(() => {
    if (!scope) return NO_ITEM
    if (config.binding && config.binding.key !== 'none')
      return { fields: null, reason: `The placeholders read inside "${config.binding.key}" — type its paths by hand.` }
    return scope.itemFields
  }, [scope, config.binding])
  const previewRow = useMemo(() => buildHtmlPreviewValue(config.html), [config.html])

  return (
    <div className="space-y-3">
      <h3 className="text-ui-sm font-semibold uppercase tracking-wide text-ink-3">HTML content</h3>
      <Field label="Name">
        <Input value={config.name} onChange={(e) => set('name', e.target.value)} className="font-mono" />
      </Field>
      <span className="block text-ui-sm font-medium text-ink-2">Markup</span>
      <ColumnHtmlField
        column={{ html: config.html, accessor: 'value' }}
        onChange={(html) => set('html', html)}
        rowModel={rowModel}
        pages={pages}
        previewRow={previewRow}
        rows={10}
        previewLabel="Preview"
        prose={config.prose}
      />
      <ItemBindingField
        label="Placeholders read"
        binding={config.binding}
        onChange={(b) => set('binding', b ? { ...b, key: b.key || 'none' } : null)}
        scope={scope}
      />
      <Toggle label="Prose defaults (headings, lists, tables)" checked={config.prose} onChange={(v) => set('prose', v)} />
    </div>
  )
}
