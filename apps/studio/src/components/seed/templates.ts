import { createDefaultDesignConfig, type ChartConfig, type StatConfig } from '../Layout/designTypes'
import {
  createChildCanvas,
  createDefaultAutocompleteConfig,
  createDefaultButtonItemConfig,
  createDefaultDataTableConfig,
  createDefaultDateConfig,
  createDefaultItemSettings,
  createDefaultModalConfig,
  createDefaultPaperConfig,
  createDefaultSelectFieldConfig,
  createDefaultTextareaConfig,
  createDefaultTextConfig,
  createDefaultTextFieldConfig,
  createDefaultTypographyConfig,
  createDefaultUploadImageConfig,
  defaultContainerSettings,
  type GridItemData,
  type Responsive,
} from '../Layout/types'
import type { ComponentType } from '../Layout/componentCatalog'
import type { PageGrid, TemplateDef } from '../Workspace/types'

/**
 * The seeded page templates (the mockup's BUILTIN set), built from the same
 * default configs the palette drops. Ids are fixed so a reset gives the same
 * library back; inserting a template clones its items with fresh ids anyway.
 */

type Span = Partial<Responsive<number>> & { lg: number }

let seq = 0
function item(
  type: ComponentType,
  label: string,
  config: GridItemData['config'],
  span: Span,
  extra?: Partial<GridItemData>,
): GridItemData {
  seq += 1
  return {
    id: `seed-tpl-item-${seq}`,
    label,
    type,
    settings: createDefaultItemSettings({
      colSpan: {
        xs: span.xs ?? 4,
        sm: span.sm ?? Math.min(6, Math.max(1, Math.round((span.lg / 12) * 6))),
        md: span.md ?? Math.min(8, Math.max(1, Math.round((span.lg / 12) * 8))),
        lg: span.lg,
      },
    }),
    config,
    ...extra,
  }
}

const full: Span = { xs: 4, sm: 6, md: 8, lg: 12 }

function heading(text: string): GridItemData {
  return item('typography', 'Typography', { ...createDefaultTypographyConfig(), text, variant: 'h4' }, full)
}

function text(value: string): GridItemData {
  return item('text', 'Text', { ...createDefaultTextConfig(), text: value, isLabel: false }, full)
}

function table(name: string, title: string): GridItemData {
  return item('datatable', 'Data Table', { ...createDefaultDataTableConfig(name), title }, full)
}

function stat(label: string): GridItemData {
  return item(
    'stat',
    'Stat',
    { ...(createDefaultDesignConfig('stat') as StatConfig), label, value: '—' },
    { xs: 2, sm: 3, md: 2, lg: 3 },
  )
}

function chart(type: 'barchart' | 'piechart' | 'linechart', title: string, span: Span): GridItemData {
  return item(type, type === 'barchart' ? 'Bar chart' : type === 'piechart' ? 'Pie / donut' : 'Line chart',
    { ...(createDefaultDesignConfig(type) as ChartConfig), title }, span)
}

function grid(items: GridItemData[]): PageGrid {
  return { items, containerSettings: defaultContainerSettings, fieldSeq: 0 }
}

export function builtinTemplates(): TemplateDef[] {
  seq = 0
  const at = Date.now() - 7 * 86400000
  const base = { active: true, builtin: true, createdBy: 'System', updatedAt: at }

  const recordList = grid([
    heading('Records'),
    text('Everything in this collection, searchable.'),
    item(
      'autocomplete',
      'Autocomplete',
      { ...createDefaultAutocompleteConfig('search'), label: 'Search', placeholder: 'Type to search' },
      { lg: 4 },
    ),
    table('dtRecords', 'Records'),
  ])

  const addButton = item(
    'button',
    'Button',
    { ...createDefaultButtonItemConfig(), label: 'Add record', icon: 'puls' },
    { xs: 2, sm: 2, md: 2, lg: 2 },
  )
  const filters = item('container', 'Container', undefined, full, {
    childCanvases: [
      {
        ...createChildCanvas(),
        items: [
          item(
            'autocomplete',
            'Autocomplete',
            { ...createDefaultAutocompleteConfig('search'), label: 'Search', placeholder: 'Name or code' },
            { lg: 4 },
          ),
          item(
            'select',
            'Select',
            { ...createDefaultSelectFieldConfig('status'), label: 'Status', placeholder: 'All' },
            { lg: 3 },
          ),
          item(
            'daterangepicker',
            'Date Range',
            { ...createDefaultDateConfig('range', 'updatedBetween'), label: 'Updated between' },
            { lg: 5 },
          ),
        ],
      },
    ],
  })
  const createManage = grid([
    heading('Records'),
    addButton,
    filters,
    table('dtRecords', 'Records'),
    item(
      'modal',
      'Modal',
      {
        ...createDefaultModalConfig('recordModal'),
        title: 'Add record',
        description: 'Create a record',
        maxWidth: '520px',
        trigger: { label: 'Add record', icon: 'puls' },
      },
      { xs: 2, sm: 2, md: 2, lg: 2 },
      {
        childCanvases: [
          {
            ...createChildCanvas(),
            items: [
              item('textfield', 'Text Field', { ...createDefaultTextFieldConfig('code'), label: 'Code', placeholder: 'TH' }, { lg: 3 }),
              item('textfield', 'Text Field', { ...createDefaultTextFieldConfig('name'), label: 'Name', placeholder: 'Thailand' }, { lg: 6 }),
            ],
          },
        ],
      },
    ),
  ])

  const dashboard = grid([
    heading('Overview'),
    stat('Total records'),
    stat('Active'),
    stat('This month'),
    stat('Pending'),
    chart('barchart', 'By category', { lg: 6 }),
    chart('piechart', 'Share', { lg: 6 }),
    table('dtActivity', 'Latest activity'),
  ])

  const report = grid([
    heading('Monthly report'),
    text('Figures refresh from the bound endpoint.'),
    chart('linechart', 'Trend', full),
    table('dtBreakdown', 'Breakdown'),
  ])

  const formPage = grid([
    heading('New entry'),
    item('paper', 'Paper', createDefaultPaperConfig(), full, {
      childCanvases: [
        {
          ...createChildCanvas(),
          items: [
            item('textfield', 'Text Field', { ...createDefaultTextFieldConfig('code'), label: 'Code' }, { lg: 3 }),
            item('textfield', 'Text Field', { ...createDefaultTextFieldConfig('name'), label: 'Name' }, { lg: 6 }),
            item('select', 'Select', { ...createDefaultSelectFieldConfig('status'), label: 'Status', placeholder: 'Choose' }, { lg: 3 }),
            item('datepicker', 'Date Picker', { ...createDefaultDateConfig('date', 'effectiveDate'), label: 'Effective date' }, { lg: 4 }),
            item('textarea', 'Textarea', { ...createDefaultTextareaConfig('notes'), label: 'Notes' }, { lg: 8 }),
            item('uploadimage', 'Upload Image', { ...createDefaultUploadImageConfig('attachment'), label: 'Attachment' }, { lg: 4 }),
          ],
        },
      ],
    }),
    item('button', 'Button', { ...createDefaultButtonItemConfig(), label: 'Save', icon: 'save' }, { xs: 2, sm: 2, md: 2, lg: 2 }),
    item('button', 'Button', { ...createDefaultButtonItemConfig(), label: 'Cancel' }, { xs: 2, sm: 2, md: 2, lg: 2 }),
  ])

  return [
    {
      id: 'seed-tpl-record-list',
      name: 'Record list',
      description: 'Heading, search and a bound table.',
      category: 'Data',
      grid: recordList,
      ...base,
    },
    {
      id: 'seed-tpl-create-manage',
      name: 'Create and manage',
      description: 'CRUD page — filters, table and a form modal.',
      category: 'Data',
      grid: createManage,
      ...base,
    },
    {
      id: 'seed-tpl-dashboard',
      name: 'Dashboard',
      description: 'Four stats, two charts and a table.',
      category: 'Data',
      grid: dashboard,
      ...base,
    },
    {
      id: 'seed-tpl-report',
      name: 'Report',
      description: 'Trend line over a data table.',
      category: 'Data',
      grid: report,
      ...base,
    },
    {
      id: 'seed-tpl-form',
      name: 'Form page',
      description: 'A grouped form with save and cancel.',
      category: 'Forms',
      grid: formPage,
      ...base,
    },
  ]
}
