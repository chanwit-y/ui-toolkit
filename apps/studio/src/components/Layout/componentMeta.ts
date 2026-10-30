/*
 * The palette's pure metadata — every component type with its label and
 * category, in palette order. React-free (the icons live in
 * `componentCatalog.ts`), so the headless `gummy mcp` lists the same types.
 */

/** Every component kind the toolbox can drop onto the canvas. */
export type ComponentType =
  | 'hidden'
  | 'multiAutocomplete'
  | 'modal'
  | 'drawer'
  | 'button'
  | 'datatable'
  | 'datatableeditable'
  | 'formlist'
  | 'repeater'
  | 'filecollection'
  | 'chart'
  | 'autocomplete'
  | 'textfield'
  | 'select'
  | 'checkbox'
  | 'switch'
  | 'radio'
  | 'textarea'
  | 'datepicker'
  | 'daterangepicker'
  | 'datetimepicker'
  | 'text'
  | 'typography'
  | 'avatar'
  | 'uploadimage'
  | 'uploadfile'
  | 'workfloweditor'
  | 'container'
  | 'tab'
  | 'paper'
  | 'card'
  | 'html'
  | 'custom'
  | 'approvalline'
  | 'switchprofile'
  | 'replaceprofile'
  | 'popover'
  | 'divider'
  | 'empty'

export type ComponentMeta = { type: ComponentType; label: string }

export const COMPONENT_META_GROUPS: { category: string; items: ComponentMeta[] }[] = [
  {
    category: 'Inputs',
    items: [
      { type: 'textfield', label: 'Text Field' },
      { type: 'textarea', label: 'Textarea' },
      { type: 'select', label: 'Select' },
      { type: 'autocomplete', label: 'Autocomplete' },
      { type: 'multiAutocomplete', label: 'Multi Autocomplete' },
      { type: 'checkbox', label: 'Checkbox' },
      { type: 'switch', label: 'Switch' },
      { type: 'radio', label: 'Radio' },
    ],
  },
  {
    category: 'Date & time',
    items: [
      { type: 'datepicker', label: 'Date Picker' },
      { type: 'daterangepicker', label: 'Date Range' },
      { type: 'datetimepicker', label: 'Date Time' },
    ],
  },
  {
    category: 'Upload',
    items: [
      { type: 'uploadimage', label: 'Upload Image' },
      { type: 'uploadfile', label: 'Upload File' },
      { type: 'workfloweditor', label: 'Workflow editor' },
    ],
  },
  {
    category: 'Data',
    items: [
      { type: 'datatable', label: 'Data Table' },
      { type: 'datatableeditable', label: 'Editable Table' },
      { type: 'formlist', label: 'Form List' },
      { type: 'repeater', label: 'Repeater' },
      { type: 'filecollection', label: 'File Collection' },
      { type: 'chart', label: 'Chart' },
    ],
  },
  {
    category: 'Display',
    items: [
      { type: 'text', label: 'Text' },
      { type: 'typography', label: 'Typography' },
      { type: 'avatar', label: 'Avatar' },
      { type: 'divider', label: 'Divider' },
      { type: 'html', label: 'HTML' },
      { type: 'custom', label: 'Custom' },
      { type: 'approvalline', label: 'Approval line' },
      { type: 'switchprofile', label: 'Switch profile' },
      { type: 'replaceprofile', label: 'Replace profile' },
    ],
  },
  {
    category: 'Layout',
    items: [
      { type: 'container', label: 'Container' },
      { type: 'tab', label: 'Tab' },
      { type: 'paper', label: 'Paper' },
      { type: 'card', label: 'Card' },
    ],
  },
  {
    category: 'Overlay',
    items: [
      { type: 'modal', label: 'Modal' },
      { type: 'drawer', label: 'Drawer' },
      { type: 'popover', label: 'Popover' },
    ],
  },
  {
    category: 'Utility',
    items: [
      { type: 'button', label: 'Button' },
      { type: 'hidden', label: 'Hidden' },
      { type: 'empty', label: 'Empty' },
    ],
  },
]

/** Every component type, in palette order. */
export const COMPONENT_TYPES: ComponentType[] = COMPONENT_META_GROUPS.flatMap((g) => g.items.map((i) => i.type))
