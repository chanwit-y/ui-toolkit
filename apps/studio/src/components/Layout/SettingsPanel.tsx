import { Input } from '../common'
import { MAX_GRID_COLUMNS } from './breakpoints'
import { useGridStore, useSelectedItem } from './gridStore'
import { containerResponsiveFields, itemResponsiveFields } from './gridProperties'
import { ResponsivePropertyForm } from './ResponsivePropertyForm'

export function ContainerSettingsPanel() {
  const settings = useGridStore((s) => s.containerSettings)
  const updateContainer = useGridStore((s) => s.updateContainer)

  return (
    <ResponsivePropertyForm
      title="Container per breakpoint"
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

  return (
    <div className="space-y-4">
      <label className="block space-y-1">
        <span className="text-xs font-medium text-zinc-600">Label</span>
        <Input
          value={item.label}
          onChange={(e) => updateItemLabel(item.id, e.target.value)}
        />
      </label>
      <ResponsivePropertyForm
        title="Item per breakpoint"
        fields={itemResponsiveFields}
        defaultBreakpoint={previewBreakpoint}
        values={item.settings}
        maxColumns={MAX_GRID_COLUMNS}
        onChange={(bp, key, value, animate) =>
          updateItem(item.id, bp, key, value, animate)
        }
      />
      <button
        type="button"
        onClick={removeSelectedItem}
        className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
      >
        Remove item
      </button>
    </div>
  )
}
