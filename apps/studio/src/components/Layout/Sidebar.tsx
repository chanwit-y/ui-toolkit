import { CodeViewer, SegmentedControl } from '../common'
import { FieldConfigPanel } from './FieldConfigPanel'
import { useGridStore, useSelectedItem, type SidebarView } from './gridStore'
import { ContainerSettingsPanel, ItemSettingsPanel } from './SettingsPanel'

const VIEW_OPTIONS = [
  { value: 'inspector', label: 'Inspector' },
  { value: 'code', label: 'Code' },
]

type SidebarProps = {
  gridConfigJson: string
  fullGridCss: string
}

/**
 * The right sidebar — the single home for all editing. In `inspector` view it
 * shows the selected item's field config (textfield only) + grid layout, or the
 * container settings when nothing is selected. In `code` view it shows the
 * exported JSON / CSS. Replaces the former anchored popovers.
 */
export function Sidebar({ gridConfigJson, fullGridCss }: SidebarProps) {
  const sidebarView = useGridStore((s) => s.sidebarView)
  const setSidebarView = useGridStore((s) => s.setSidebarView)
  const selectedItem = useSelectedItem()

  const title =
    sidebarView === 'code'
      ? 'Component config'
      : selectedItem
        ? `Grid item: ${selectedItem.label}`
        : 'Grid container'

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-zinc-200 bg-white">
      <div className="shrink-0 space-y-2 border-b border-zinc-200 px-4 py-3">
        <h2 className="truncate text-sm font-semibold text-zinc-800">{title}</h2>
        <SegmentedControl
          options={VIEW_OPTIONS}
          value={sidebarView}
          onChange={(v) => setSidebarView(v as SidebarView)}
          className="rounded-lg border border-zinc-200 bg-zinc-50 p-1"
          aria-label="Sidebar view"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {sidebarView === 'code' ? (
          <CodeViewer
            maxHeightClassName="max-h-[calc(100vh-12rem)]"
            tabs={[
              { id: 'json', label: 'JSON config', language: 'json', code: gridConfigJson },
              { id: 'css', label: 'CSS', language: 'css', code: fullGridCss },
            ]}
          />
        ) : selectedItem ? (
          <div className="space-y-6">
            {selectedItem.type === 'textfield' && selectedItem.config && (
              <FieldConfigPanel itemId={selectedItem.id} config={selectedItem.config} />
            )}
            <ItemSettingsPanel />
          </div>
        ) : (
          <ContainerSettingsPanel />
        )}
      </div>
    </aside>
  )
}
