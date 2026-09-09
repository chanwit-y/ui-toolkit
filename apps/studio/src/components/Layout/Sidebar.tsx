import { CodeViewer, cn } from '../common'
import { ButtonConfigPanel } from './ButtonConfigPanel'
import { CheckboxConfigPanel } from './CheckboxConfigPanel'
import {
  ContainerConfigPanel,
  ModalConfigPanel,
  PaperConfigPanel,
  PopoverConfigPanel,
  TabConfigPanel,
} from './ContainerHostConfigPanel'
import { DataTableConfigPanel } from './DataTableConfigPanel'
import { DataTableEditableConfigPanel } from './DataTableEditableConfigPanel'
import { DateConfigPanel } from './DateConfigPanel'
import { DesignConfigPanel } from './DesignConfigPanel'
import { isDesignOnly } from './designTypes'
import {
  AvatarConfigPanel,
  DividerConfigPanel,
  HiddenConfigPanel,
  TextConfigPanel,
  TypographyConfigPanel,
} from './DisplayConfigPanel'
import { FieldConfigPanel } from './FieldConfigPanel'
import { useBreadcrumb, useGridStore, useSelectedItem, type SidebarView } from './gridStore'
import { RadioConfigPanel } from './RadioConfigPanel'
import { SelectFieldConfigPanel } from './SelectFieldConfigPanel'
import { ContainerSettingsPanel, ItemSettingsPanel } from './SettingsPanel'
import { StylePanel } from './StylePanel'
import { TextareaConfigPanel } from './TextareaConfigPanel'
import { UploadFileConfigPanel, UploadImageConfigPanel } from './UploadConfigPanel'
import type {
  AvatarConfig,
  ButtonItemConfig,
  CheckboxConfig,
  DataTableConfig,
  DataTableEditableConfig,
  DateConfig,
  DividerConfig,
  HiddenConfig,
  ModalConfig,
  PaperConfig,
  PopoverConfig,
  RadioConfig,
  SelectFieldConfig,
  TabConfig,
  TextareaConfig,
  TextConfig,
  TextFieldConfig,
  TypographyConfig,
  UploadFileConfig,
  UploadImageConfig,
} from './types'

const VIEW_OPTIONS: { value: SidebarView; label: string }[] = [
  { value: 'layout', label: 'Layout' },
  { value: 'inspector', label: 'Props' },
  { value: 'style', label: 'Style' },
  { value: 'code', label: 'Code' },
]

/** The mockup's inspector path line: root / …drill-in hosts… / selected cell.
 * Each ancestor jumps back up (which also clears the selection). */
function PathCrumb({ label }: { label: string }) {
  const trail = useBreadcrumb()
  const exitToDepth = useGridStore((s) => s.exitToDepth)
  return (
    <div className="mb-2.5 flex flex-wrap items-center gap-1 font-mono text-ui-sm text-ink-3">
      <button
        type="button"
        onClick={() => exitToDepth(0)}
        className="hover:text-ink hover:underline"
      >
        root
      </button>
      {trail.map((seg, i) => (
        <span key={`${seg.itemId}-${seg.canvasIndex}`} className="flex items-center gap-1">
          <span aria-hidden="true">/</span>
          <button
            type="button"
            onClick={() => exitToDepth(i + 1)}
            className="max-w-28 truncate hover:text-ink hover:underline"
          >
            {seg.label}
          </button>
        </span>
      ))}
      <span aria-hidden="true">/</span>
      <span className="truncate text-ink">{label}</span>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-8 text-center text-ui text-ink-3">{children}</p>
}

type SidebarProps = {
  gridConfigJson: string
  fullGridCss: string
}

/**
 * The right sidebar — the single home for all editing, split into four tabs:
 * `inspector` shows the selected item's component config; `layout` shows the
 * grid config — the selected item's per-breakpoint spans, or the container
 * settings when nothing is selected; `style` the selected item's design-only
 * colours; `code` shows the exported JSON / CSS.
 */
export function Sidebar({ gridConfigJson, fullGridCss }: SidebarProps) {
  const sidebarView = useGridStore((s) => s.sidebarView)
  const setSidebarView = useGridStore((s) => s.setSidebarView)
  const selectedItem = useSelectedItem()

  return (
    <aside className="flex w-[292px] shrink-0 flex-col border-l border-line bg-panel">
      <div className="flex shrink-0 gap-0.5 border-b border-line p-1.5" role="tablist" aria-label="Inspector">
        {VIEW_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={sidebarView === opt.value}
            onClick={() => setSidebarView(opt.value)}
            className="mini-tab"
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className={cn('min-h-0 flex-1 overflow-y-auto p-3', sidebarView === 'code' && 'p-2')}>
        {sidebarView !== 'code' && selectedItem && <PathCrumb label={selectedItem.label} />}
        {sidebarView === 'code' ? (
          <CodeViewer
            maxHeightClassName="max-h-[calc(100vh-9rem)]"
            tabs={[
              { id: 'json', label: 'Bins (engine)', language: 'json', code: gridConfigJson },
              { id: 'css', label: 'CSS', language: 'css', code: fullGridCss },
            ]}
          />
        ) : sidebarView === 'layout' ? (
          selectedItem ? <ItemSettingsPanel /> : <ContainerSettingsPanel />
        ) : sidebarView === 'style' ? (
          selectedItem ? (
            <StylePanel item={selectedItem} />
          ) : (
            <Empty>
              Select an element to give it its own colours.
              <br />
              <br />
              <span className="text-ink-3">Project-wide colours live in the Theme tab.</span>
            </Empty>
          )
        ) : selectedItem ? (
          isDesignOnly(selectedItem.type) ? (
            <DesignConfigPanel item={selectedItem} />
          ) : selectedItem.type === 'textfield' && selectedItem.config ? (
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
          ) : selectedItem.type === 'multiAutocomplete' && selectedItem.config ? (
            <SelectFieldConfigPanel
              itemId={selectedItem.id}
              config={selectedItem.config as SelectFieldConfig}
              heading="Multi Autocomplete"
              multi
            />
          ) : selectedItem.type === 'checkbox' && selectedItem.config ? (
            <CheckboxConfigPanel
              itemId={selectedItem.id}
              config={selectedItem.config as CheckboxConfig}
            />
          ) : selectedItem.type === 'radio' && selectedItem.config ? (
            <RadioConfigPanel
              itemId={selectedItem.id}
              config={selectedItem.config as RadioConfig}
            />
          ) : (selectedItem.type === 'datepicker' ||
              selectedItem.type === 'daterangepicker' ||
              selectedItem.type === 'datetimepicker') &&
            selectedItem.config ? (
            <DateConfigPanel
              itemId={selectedItem.id}
              config={selectedItem.config as DateConfig}
            />
          ) : selectedItem.type === 'uploadimage' && selectedItem.config ? (
            <UploadImageConfigPanel
              itemId={selectedItem.id}
              config={selectedItem.config as UploadImageConfig}
            />
          ) : selectedItem.type === 'uploadfile' && selectedItem.config ? (
            <UploadFileConfigPanel
              itemId={selectedItem.id}
              config={selectedItem.config as UploadFileConfig}
            />
          ) : selectedItem.type === 'datatable' && selectedItem.config ? (
            <DataTableConfigPanel
              itemId={selectedItem.id}
              config={selectedItem.config as DataTableConfig}
            />
          ) : selectedItem.type === 'datatableeditable' && selectedItem.config ? (
            <DataTableEditableConfigPanel
              itemId={selectedItem.id}
              config={selectedItem.config as DataTableEditableConfig}
            />
          ) : selectedItem.type === 'text' && selectedItem.config ? (
            <TextConfigPanel
              itemId={selectedItem.id}
              config={selectedItem.config as TextConfig}
            />
          ) : selectedItem.type === 'typography' && selectedItem.config ? (
            <TypographyConfigPanel
              itemId={selectedItem.id}
              config={selectedItem.config as TypographyConfig}
            />
          ) : selectedItem.type === 'avatar' && selectedItem.config ? (
            <AvatarConfigPanel
              itemId={selectedItem.id}
              config={selectedItem.config as AvatarConfig}
            />
          ) : selectedItem.type === 'divider' && selectedItem.config ? (
            <DividerConfigPanel
              itemId={selectedItem.id}
              config={selectedItem.config as DividerConfig}
            />
          ) : selectedItem.type === 'button' && selectedItem.config ? (
            <ButtonConfigPanel
              itemId={selectedItem.id}
              config={selectedItem.config as ButtonItemConfig}
            />
          ) : selectedItem.type === 'hidden' && selectedItem.config ? (
            <HiddenConfigPanel
              itemId={selectedItem.id}
              config={selectedItem.config as HiddenConfig}
            />
          ) : selectedItem.type === 'container' ? (
            <ContainerConfigPanel itemId={selectedItem.id} />
          ) : selectedItem.type === 'paper' && selectedItem.config ? (
            <PaperConfigPanel
              itemId={selectedItem.id}
              config={selectedItem.config as PaperConfig}
            />
          ) : selectedItem.type === 'tab' && selectedItem.config ? (
            <TabConfigPanel
              itemId={selectedItem.id}
              config={selectedItem.config as TabConfig}
            />
          ) : selectedItem.type === 'modal' && selectedItem.config ? (
            <ModalConfigPanel
              itemId={selectedItem.id}
              config={selectedItem.config as ModalConfig}
            />
          ) : selectedItem.type === 'popover' && selectedItem.config ? (
            <PopoverConfigPanel
              itemId={selectedItem.id}
              config={selectedItem.config as PopoverConfig}
            />
          ) : (
            <Empty>No field settings for this component yet.</Empty>
          )
        ) : (
          <Empty>
            Select an element on the canvas to edit it.
            <br />
            <br />
            <span className="text-ink-3">
              Containers hold other components — drill in to edit what is inside.
            </span>
          </Empty>
        )}
      </div>
    </aside>
  )
}
