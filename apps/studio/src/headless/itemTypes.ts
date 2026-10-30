import { COMPONENT_META_GROUPS, type ComponentType } from '../components/Layout/componentMeta'
import { isBlockedInRepeater } from '../components/Layout/repeaterRules'
import type { GridItemData, TabConfig } from '../components/Layout/types'

/*
 * What the MCP knows about each component type (see the grilled design
 * `mcp-server`): the config type its schema is generated from, a one-line
 * summary, what its child canvases hold and which guide explains it. A
 * `Record` over every `ComponentType`, so a new type that lands without an
 * entry here fails to compile — and the drift test then wants its schema and
 * guide too.
 */

export type ItemTypeInfo = {
  /** The studio config type (`schemas.generated.json` definition); `null` = config-less. */
  configType: string | null
  summary: string
  /** What each child canvas is, in index order (a tab has one per tab header). */
  canvases: (item?: GridItemData) => string[]
  /** The guide topic (`gummy://guide/<topic>`) that explains the type; several types may share one. */
  guide: string
}

const none = () => []
const one = (label: string) => () => [label]

export const ITEM_TYPES: Record<ComponentType, ItemTypeInfo> = {
  textfield: { configType: 'TextFieldConfig', summary: 'A single-line text / number / email / password input bound to a form field.', canvases: none, guide: 'textfield' },
  textarea: { configType: 'TextareaConfig', summary: 'A multi-line text input bound to a form field.', canvases: none, guide: 'textarea' },
  select: { configType: 'SelectFieldConfig', summary: 'A single choice from static options or options fetched from an endpoint.', canvases: none, guide: 'select' },
  autocomplete: { configType: 'SelectFieldConfig', summary: 'A searchable single choice; static options or an endpoint (load once, search as you type, or dependent on another field).', canvases: none, guide: 'select' },
  multiAutocomplete: { configType: 'MultiAutocompleteConfig', summary: 'A searchable multiple choice (chips); the value is the id list.', canvases: none, guide: 'select' },
  checkbox: { configType: 'CheckboxConfig', summary: 'One or several checkboxes; required single checkbox = must be checked.', canvases: none, guide: 'checkbox' },
  switch: { configType: 'SwitchConfig', summary: 'An on / off toggle; required = must be on; can be enabled only while another switch is on.', canvases: none, guide: 'switch' },
  radio: { configType: 'RadioConfig', summary: 'One choice from a short list of radio options.', canvases: none, guide: 'radio' },
  datepicker: { configType: 'DateConfig', summary: 'A date input.', canvases: none, guide: 'date' },
  daterangepicker: { configType: 'DateConfig', summary: 'A from–to date range input.', canvases: none, guide: 'date' },
  datetimepicker: { configType: 'DateConfig', summary: 'A date + time input.', canvases: none, guide: 'date' },
  uploadimage: { configType: 'UploadImageConfig', summary: 'A single hero-image picker that uploads to an endpoint.', canvases: none, guide: 'upload' },
  uploadfile: { configType: 'UploadFileConfig', summary: 'A general file uploader (single or multiple, accepted types, previews).', canvases: none, guide: 'upload' },
  workfloweditor: { configType: 'WorkflowEditorConfig', summary: 'A form field holding one approval line (steps with roles and users), saved with the form.', canvases: none, guide: 'workfloweditor' },
  datatable: {
    configType: 'DataTableConfig',
    summary: 'A data table over an endpoint or page data: columns, search, server pagination / sort / filters, row edit / delete / add through its own modal.',
    canvases: () => ['edit modal (the form shown by Edit and Add; context = the selected row)', 'filter form (the table’s own filter inputs)'],
    guide: 'datatable',
  },
  datatableeditable: { configType: 'DataTableEditableConfig', summary: 'A table edited in place, row by row.', canvases: none, guide: 'datatableeditable' },
  formlist: { configType: 'FormListConfig', summary: 'A repeating form backed by CRUD endpoints: one row form per record with Save / Remove / Add.', canvases: one('row template (fields only, one form per row)'), guide: 'formlist' },
  filecollection: {
    configType: 'FileCollectionConfig',
    summary: 'A tree of collections → folders → files over a list endpoint, with create / rename / move / duplicate / delete slots; the selected node is page data.',
    canvases: none,
    guide: 'filecollection',
  },
  chart: {
    configType: 'ChartConfig',
    summary: 'A chart over an endpoint or page data: ten types, series, axes, reference lines, click-through.',
    canvases: none,
    guide: 'chart',
  },
  repeater: { configType: 'RepeaterConfig', summary: 'A read-only list: its item template renders once per array item, with the item in scope for bindings.', canvases: one('item template (bind with source "row")'), guide: 'repeater' },
  text: { configType: 'TextConfig', summary: 'A short piece of text (static or bound).', canvases: none, guide: 'display' },
  typography: { configType: 'TypographyConfig', summary: 'A heading / body text in a typography variant (static or bound).', canvases: none, guide: 'display' },
  avatar: { configType: 'AvatarConfig', summary: 'A round image with a fallback (static or bound).', canvases: none, guide: 'display' },
  divider: { configType: 'DividerConfig', summary: 'A horizontal rule.', canvases: none, guide: 'display' },
  html: { configType: 'HtmlContentConfig', summary: 'A sanitised HTML block, optionally a {{path}} template over a bound value.', canvases: none, guide: 'html' },
  custom: { configType: 'CustomComponentConfig', summary: 'A React component the app registers by name (declared under the project’s custom components).', canvases: none, guide: 'custom' },
  approvalline: { configType: 'ApprovalLineConfig', summary: 'An approval workflow tracker drawn from raw step rows.', canvases: none, guide: 'approvalline' },
  switchprofile: { configType: 'SwitchProfileConfig', summary: 'Lets the signed-in person switch between their profiles (a global-state slice).', canvases: none, guide: 'profile' },
  replaceprofile: { configType: 'ReplaceProfileConfig', summary: 'Lets an admin view the app as another person.', canvases: none, guide: 'profile' },
  container: { configType: 'ContainerConfig', summary: 'A nested grid with its own layout (and optional surface).', canvases: one('content'), guide: 'container' },
  tab: {
    configType: 'TabConfig',
    summary: 'Tabs; each tab header owns one child canvas (add / remove tabs with add_tab / remove_tab).',
    canvases: (item) => ((item?.config as TabConfig | undefined)?.tabs ?? []).map((t) => `tab "${t.label || t.value}"`),
    guide: 'tab',
  },
  paper: { configType: 'PaperConfig', summary: 'A surface (outlined / elevated) holding a nested grid.', canvases: one('content'), guide: 'container' },
  card: { configType: 'CardConfig', summary: 'A card after MUI: header (avatar, title, action), media, content, actions, an expandable section, optional click-through.', canvases: () => ['content', 'expanded section (exported only while collapse is enabled)'], guide: 'card' },
  modal: { configType: 'ModalConfig', summary: 'A dialog opened by its trigger button; its content is its own form.', canvases: one('content (its own form)'), guide: 'modal' },
  drawer: { configType: 'DrawerConfig', summary: 'A panel sliding in from an edge, opened by its trigger; its content is its own form.', canvases: one('content (its own form)'), guide: 'modal' },
  popover: { configType: 'PopoverConfig', summary: 'A small floating panel anchored to its trigger.', canvases: one('content (its own form)'), guide: 'modal' },
  button: { configType: 'ButtonItemConfig', summary: 'A button running an action chain: submit the form to an endpoint, navigate, close a modal, reload a table, custom actions…', canvases: none, guide: 'button' },
  hidden: { configType: 'HiddenConfig', summary: 'A hidden form field (e.g. the `_id` an edit form submits).', canvases: none, guide: 'textfield' },
  empty: { configType: null, summary: 'An empty placeholder cell.', canvases: none, guide: 'start' },
}

export type ItemTypeEntry = { type: ComponentType; label: string; category: string } & ItemTypeInfo

/** Every type in palette order, with its palette label and category. */
export function listItemTypes(): ItemTypeEntry[] {
  return COMPONENT_META_GROUPS.flatMap((group) =>
    group.items.map((item) => ({ type: item.type, label: item.label, category: group.category, ...ITEM_TYPES[item.type] })),
  )
}

/** The palette label a dropped item is named with (`Data Table`). */
export function paletteLabel(type: ComponentType): string {
  for (const group of COMPONENT_META_GROUPS) for (const item of group.items) if (item.type === type) return item.label
  return type
}

export function isComponentType(type: string): type is ComponentType {
  return Object.prototype.hasOwnProperty.call(ITEM_TYPES, type)
}

export { isBlockedInRepeater }
