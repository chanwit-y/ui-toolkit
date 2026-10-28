import type { ReactNode } from 'react'
import { IconField, Input, SegmentedControl, Select } from '../common'
import { StyleRulesField } from './StyleRulesField'
import {
  BUTTON_VARIANT_OPTIONS,
  createDefaultExportOptions,
  createDefaultGrouping,
  createDefaultSelection,
  DEFAULT_COLUMNS_BUTTON,
  DEFAULT_EXPORT_BUTTON,
  selectionStateKey,
  type ButtonConfig,
  type DataTableConfig,
  type DataTableExportConfig,
  type DataTableGroupingConfig,
  type DataTableSelectionConfig,
} from './types'

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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2 border-t border-line pt-3">
      <h4 className="sec-label">{title}</h4>
      {children}
    </section>
  )
}

/** A toolbar button's label / icon / variant (Columns, Export). */
function ToolbarButtonFields({ value, fallback, onChange }: { value: ButtonConfig | undefined; fallback: ButtonConfig; onChange: (b: ButtonConfig) => void }) {
  const b = value ?? fallback
  return (
    <div className="grid grid-cols-2 gap-2">
      <Field label="Button label">
        <Input value={b.label} placeholder="(icon only)" onChange={(e) => onChange({ ...b, label: e.target.value })} />
      </Field>
      <Field label="Variant">
        <Select options={BUTTON_VARIANT_OPTIONS} value={b.variant} onChange={(v) => onChange({ ...b, variant: v as ButtonConfig['variant'] })} />
      </Field>
      <div className="col-span-2">
        <IconField label="Icon" value={b.icon} onChange={(icon) => onChange({ ...b, icon })} />
      </div>
    </div>
  )
}

const PERSIST_OPTIONS = [
  { value: 'local', label: 'remember (localStorage)' },
  { value: 'session', label: 'this tab only (sessionStorage)' },
  { value: 'none', label: 'forget on leave' },
]

const EXPANDED_OPTIONS = [
  { value: '0', label: 'all collapsed' },
  { value: '1', label: 'first level open' },
  { value: '2', label: 'two levels open' },
  { value: '3', label: 'three levels open' },
  { value: 'all', label: 'all open' },
]

/**
 * The data table's AG Grid-style features (see the grilled design
 * `datatable-ag-grid-features`): the Columns menu and where the layout is
 * remembered, row selection published as a state slice, row style rules,
 * client-side grouping with totals, CSV export, and scroll mode. Every key is
 * optional on the config — absent is the engine default — and exported only
 * when it differs.
 */
export function DataTableGridPanel({
  config,
  set,
  serverPaged,
}: {
  config: DataTableConfig
  set: <K extends keyof DataTableConfig>(key: K, value: DataTableConfig[K]) => void
  /** Server pagination / sort is on: grouping and scroll mode don't apply. */
  serverPaged: boolean
}) {
  const selection = config.selection ?? createDefaultSelection()
  const setSelection = (p: Partial<DataTableSelectionConfig>) => set('selection', { ...selection, ...p })
  const grouping = config.grouping ?? createDefaultGrouping()
  const setGrouping = (p: Partial<DataTableGroupingConfig>) => set('grouping', { ...grouping, ...p })
  const exportOptions = config.exportOptions ?? createDefaultExportOptions()
  const setExport = (p: Partial<DataTableExportConfig>) => set('exportOptions', { ...exportOptions, ...p })
  const columns = config.columns.filter((c) => c.accessor)
  const rowFields = columns.map((c) => c.accessor)

  return (
    <div className="space-y-3">
      <Section title="Columns menu">
        <Toggle label="Columns menu (show / hide, reorder, group by)" checked={config.canChooseColumns !== false} onChange={(v) => set('canChooseColumns', v)} />
        {config.canChooseColumns !== false && (
          <>
            <Field label="Remember the layout">
              <Select options={PERSIST_OPTIONS} value={config.columnPersist ?? 'local'} onChange={(v) => set('columnPersist', v as DataTableConfig['columnPersist'])} />
            </Field>
            <ToolbarButtonFields value={config.columnsButton} fallback={DEFAULT_COLUMNS_BUTTON} onChange={(b) => set('columnsButton', b)} />
            <p className="text-ui-xs text-ink-3">Per column: Hide (starts hidden) and Lock visible in the column card’s More.</p>
          </>
        )}
      </Section>

      <Section title="Row selection">
        <Toggle label="Checkbox column" checked={selection.enabled} onChange={(v) => setSelection({ enabled: v })} />
        {selection.enabled && (
          <>
            <SegmentedControl
              options={[{ value: 'multi', label: 'Many' }, { value: 'single', label: 'One' }]}
              value={selection.mode}
              onChange={(v) => setSelection({ mode: v as DataTableSelectionConfig['mode'] })}
            />
            {selection.mode === 'multi' && (
              <Field label="Header checkbox selects">
                <Select
                  options={[{ value: 'page', label: 'the page' }, { value: 'all', label: 'every row (after search)' }, { value: 'none', label: 'no header checkbox' }]}
                  value={selection.headerCheckbox}
                  onChange={(v) => setSelection({ headerCheckbox: v as DataTableSelectionConfig['headerCheckbox'] })}
                />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Field label="Row id field">
                <Input value={selection.idKey} placeholder="_id" className="font-mono" onChange={(e) => setSelection({ idKey: e.target.value })} />
              </Field>
              <Field label="State key">
                <Input value={selection.stateKey} placeholder={`${config.name}Selected`} className="font-mono" onChange={(e) => setSelection({ stateKey: e.target.value })} />
              </Field>
            </div>
            <Toggle label="Keep picks across pages" checked={selection.keepAcrossPages} onChange={(v) => setSelection({ keepAcrossPages: v })} />
            <p className="text-ui-xs text-ink-3">
              Published as page data <span className="font-mono">{selectionStateKey(config.name, selection)}</span> — {'{ ids, rows, count }'}. Bind a button’s request or a text to it; Reload data on this table clears it.
            </p>
          </>
        )}
      </Section>

      <Section title="Row styles">
        <StyleRulesField label="Rules (read the row)" scope="row" rules={config.rowStyles} onChange={(rowStyles) => set('rowStyles', rowStyles)} fieldSuggestions={rowFields} />
      </Section>

      <Section title="Grouping and totals">
        <Toggle label="Group rows" checked={grouping.enabled} onChange={(v) => setGrouping({ enabled: v })} />
        {grouping.enabled && (
          <>
            {serverPaged && <p className="text-ui-xs text-warn">Grouping is client-side: it stays off while server pagination or sort is on.</p>}
            <div className="space-y-1">
              <span className="text-ui-sm font-medium text-ink-2">Group by (in order)</span>
              {columns.map((c) => {
                const level = grouping.by.indexOf(c.accessor)
                return (
                  <label key={c.id} className="flex items-center gap-2 text-ui-sm text-ink-2">
                    <input
                      type="checkbox"
                      checked={level !== -1}
                      onChange={(e) => setGrouping({ by: e.target.checked ? [...grouping.by, c.accessor] : grouping.by.filter((a) => a !== c.accessor) })}
                      className="h-4 w-4 rounded border-line-strong text-ink focus:ring-focus/30"
                    />
                    <span className="flex-1">{c.header || c.accessor}</span>
                    {level !== -1 && <span className="tag">{level + 1}</span>}
                  </label>
                )
              })}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Open at first">
                <Select options={EXPANDED_OPTIONS} value={grouping.expanded} onChange={(v) => setGrouping({ expanded: v as DataTableGroupingConfig['expanded'] })} />
              </Field>
              <Field label="Total row">
                <Select
                  options={[{ value: 'none', label: 'none' }, { value: 'top', label: 'top' }, { value: 'bottom', label: 'bottom' }]}
                  value={grouping.totalRow}
                  onChange={(v) => setGrouping({ totalRow: v as DataTableGroupingConfig['totalRow'] })}
                />
              </Field>
            </div>
            <Toggle label="Count after the group label" checked={grouping.showCount} onChange={(v) => setGrouping({ showCount: v })} />
            <Toggle label="Users can regroup (Columns menu)" checked={grouping.userCanGroup} onChange={(v) => setGrouping({ userCanGroup: v })} />
            <p className="text-ui-xs text-ink-3">Group and total rows summarise columns that set an Aggregate (column card’s More).</p>
          </>
        )}
      </Section>

      <Section title="Export (CSV)">
        <Toggle label="Export button" checked={!!config.canExport} onChange={(v) => set('canExport', v)} />
        {config.canExport && (
          <>
            <Field label="File name">
              <Input value={exportOptions.fileName} placeholder={`${config.name}.csv · orders-{{date}}`} className="font-mono" onChange={(e) => setExport({ fileName: e.target.value })} />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Columns">
                <Select options={[{ value: 'visible', label: 'visible' }, { value: 'all', label: 'all' }]} value={exportOptions.columns} onChange={(v) => setExport({ columns: v as DataTableExportConfig['columns'] })} />
              </Field>
              <Field label="Values">
                <Select options={[{ value: 'formatted', label: 'as shown' }, { value: 'raw', label: 'raw' }]} value={exportOptions.values} onChange={(v) => setExport({ values: v as DataTableExportConfig['values'] })} />
              </Field>
              <Field label="Rows">
                <Select options={[{ value: 'all', label: 'all' }, { value: 'page', label: 'this page' }]} value={exportOptions.rows} onChange={(v) => setExport({ rows: v as DataTableExportConfig['rows'] })} />
              </Field>
            </div>
            <ToolbarButtonFields value={config.exportButton} fallback={DEFAULT_EXPORT_BUTTON} onChange={(b) => set('exportButton', b)} />
            {serverPaged && <p className="text-ui-xs text-ink-3">With server pagination the export holds the loaded page.</p>}
          </>
        )}
      </Section>

      <Section title="Paging">
        <SegmentedControl
          options={[{ value: 'pages', label: 'Pages' }, { value: 'scroll', label: 'Scroll' }]}
          value={config.paging ?? 'pages'}
          onChange={(v) => set('paging', v as DataTableConfig['paging'])}
        />
        <p className="text-ui-xs text-ink-3">
          Scroll puts every row in the table’s scroller (client-side only). Either way, more than 60 rows on screen are virtualised.
        </p>
      </Section>
    </div>
  )
}
