import { Trash2 } from 'lucide-react'
import { Button, Input } from '../common'
import { MAX_GRID_COLUMNS } from './breakpoints'
import { COMPONENT_BY_TYPE } from './componentCatalog'
import { useGridStore, useSelectedItem } from './gridStore'
import { containerResponsiveFields, itemResponsiveFields } from './gridProperties'
import { ResponsivePropertyForm } from './ResponsivePropertyForm'

export function ContainerSettingsPanel() {
  const settings = useGridStore((s) => s.containerSettings)
  const updateContainer = useGridStore((s) => s.updateContainer)

  return (
    <ResponsivePropertyForm
      title="Grid per breakpoint"
      fields={containerResponsiveFields}
      values={settings}
      maxColumns={MAX_GRID_COLUMNS}
      onChange={updateContainer}
    />
  )
}

export function ItemSettingsPanel() {
  const item = useSelectedItem()
  const previewBreakpoint = useGridStore((s) => s.previewBreakpoint)
  const updateItem = useGridStore((s) => s.updateItem)
  const updateItemLabel = useGridStore((s) => s.updateItemLabel)
  const removeSelectedItem = useGridStore((s) => s.removeSelectedItem)

  if (!item) return null
  const def = COMPONENT_BY_TYPE[item.type]

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-ui-sm font-medium text-ink-2">Label</span>
        <Input
          value={item.label}
          onChange={(e) => updateItemLabel(item.id, e.target.value)}
        />
      </label>
      <ResponsivePropertyForm
        title="Cell per breakpoint"
        fields={itemResponsiveFields}
        defaultBreakpoint={previewBreakpoint}
        values={item.settings}
        maxColumns={MAX_GRID_COLUMNS}
        onChange={(bp, key, value, animate) =>
          updateItem(item.id, bp, key, value, animate)
        }
      />
      <div>
        <span className="mb-1 block text-ui-sm font-medium text-ink-2">Element</span>
        <Button size="sm" onClick={removeSelectedItem} className="text-danger">
          <Trash2 size={12} aria-hidden="true" />
          Delete
        </Button>
      </div>
      <div className="box mt-1 p-3">
        <span className="sec-label mb-2 block">Element</span>
        <div className="flex items-center gap-2 border-b border-line py-1.5">
          <span className="flex-1 font-mono text-ui-sm text-ink">{def?.label ?? item.type}</span>
          <span className="type-pill">{item.type}</span>
        </div>
        <div className="py-1.5 font-mono text-ui-sm text-ink-3">{item.id}</div>
      </div>
    </div>
  )
}
