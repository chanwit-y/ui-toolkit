import { CodeViewer, SegmentedControl } from '../common'
import { FieldConfigPanel } from './FieldConfigPanel'
import { useGridStore, useSelectedItem, type SidebarView } from './gridStore'
import { SelectFieldConfigPanel } from './SelectFieldConfigPanel'
import { ContainerSettingsPanel, ItemSettingsPanel } from './SettingsPanel'
import { TextareaConfigPanel } from './TextareaConfigPanel'
import type { SelectFieldConfig, TextareaConfig, TextFieldConfig } from './types'

const VIEW_OPTIONS = [
  { value: 'layout', label: 'Layout' },
  { value: 'inspector', label: 'Inspector' },
  { value: 'code', label: 'Code' },
]

type SidebarProps = {
  gridConfigJson: string
  fullGridCss: string
}

/**
 * The right sidebar — the single home for all editing, split into three tabs:
 * `inspector` shows the selected item's field config (textfield only);
 * `layout` shows the grid config — the selected item's per-breakpoint spans, or
 * the container settings when nothing is selected; `code` shows the exported
 * JSON / CSS.
 */
export function Sidebar({ gridConfigJson, fullGridCss }: SidebarProps) {
  const sidebarView = useGridStore((s) => s.sidebarView)
  const setSidebarView = useGridStore((s) => s.setSidebarView)
  const selectedItem = useSelectedItem()

  const title =
    sidebarView === 'code'
      ? 'Component config'
      : sidebarView === 'layout'
        ? selectedItem
          ? `Layout: ${selectedItem.label}`
          : 'Grid container'
        : selectedItem
          ? `Grid item: ${selectedItem.label}`
          : 'Inspector'

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
              { id: 'json', label: 'Bins (engine)', language: 'json', code: gridConfigJson },
              { id: 'css', label: 'CSS', language: 'css', code: fullGridCss },
            ]}
          />
        ) : sidebarView === 'layout' ? (
          selectedItem ? <ItemSettingsPanel /> : <ContainerSettingsPanel />
        ) : selectedItem ? (
          selectedItem.type === 'textfield' && selectedItem.config ? (
            <FieldConfigPanel
              itemId={selectedItem.id}
              config={selectedItem.config as TextFieldConfig}
            />
          ) : selectedItem.type === 'textarea' && selectedItem.config ? (
            <TextareaConfigPanel
              itemId={selectedItem.id}
              config={selectedItem.config as TextareaConfig}
            />
          ) : selectedItem.type === 'select' && selectedItem.config ? (
            <SelectFieldConfigPanel
              itemId={selectedItem.id}
              config={selectedItem.config as SelectFieldConfig}
            />
          ) : selectedItem.type === 'autocomplete' && selectedItem.config ? (
            <SelectFieldConfigPanel
              itemId={selectedItem.id}
              config={selectedItem.config as SelectFieldConfig}
              heading="Autocomplete"
            />
          ) : (
            <p className="px-1 py-6 text-center text-sm text-zinc-400">
              No field settings for this component yet.
            </p>
          )
        ) : (
          <p className="px-1 py-6 text-center text-sm text-zinc-400">
            Select a grid item to edit its properties, or open the Layout tab for
            container settings.
          </p>
        )}
      </div>
    </aside>
  )
}
