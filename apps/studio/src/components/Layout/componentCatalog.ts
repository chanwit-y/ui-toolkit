import {
  AppWindow,
  UserCheck,
  UserCog,
  Box,
  Calendar,
  CalendarClock,
  CalendarRange,
  CircleDot,
  Code,
  Workflow,
  GitBranch,
  CreditCard,
  EyeOff,
  FileSpreadsheet,
  ImagePlus,
  ListChecks,
  ListFilter,
  ListPlus,
  MessageSquare,
  MousePointerClick,
  PanelRight,
  PanelTop,
  Pilcrow,
  Puzzle,
  Repeat2,
  Search,
  SeparatorHorizontal,
  SquareCheck,
  SquareDashed,
  StickyNote,
  Table,
  TextCursorInput,
  TextWrap,
  ToggleLeft,
  Type,
  type LucideIcon,
  Upload,
  User,
} from 'lucide-react'

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

export type ComponentDef = {
  type: ComponentType
  /** Human-readable name shown in the toolbox and used as the new item's label. */
  label: string
  icon: LucideIcon
  /** A `custom` tile for one declaration of the project's registry (Env →
   * Custom components): the dropped item is mapped onto it right away. */
  componentId?: string
  /** Shown under the tile label / in search (a declaration's description). */
  hint?: string
}

export type ComponentGroup = {
  category: string
  items: ComponentDef[]
}

/**
 * The toolbox palette, grouped into categories. Order here is the render order.
 * Adding a new component is just a new entry (keep the `ComponentType` union in
 * sync).
 */
export const COMPONENT_GROUPS: ComponentGroup[] = [
  {
    category: 'Inputs',
    items: [
      { type: 'textfield', label: 'Text Field', icon: TextCursorInput },
      { type: 'textarea', label: 'Textarea', icon: TextWrap },
      { type: 'select', label: 'Select', icon: ListFilter },
      { type: 'autocomplete', label: 'Autocomplete', icon: Search },
      { type: 'multiAutocomplete', label: 'Multi Autocomplete', icon: ListChecks },
      { type: 'checkbox', label: 'Checkbox', icon: SquareCheck },
      { type: 'switch', label: 'Switch', icon: ToggleLeft },
      { type: 'radio', label: 'Radio', icon: CircleDot },
    ],
  },
  {
    category: 'Date & time',
    items: [
      { type: 'datepicker', label: 'Date Picker', icon: Calendar },
      { type: 'daterangepicker', label: 'Date Range', icon: CalendarRange },
      { type: 'datetimepicker', label: 'Date Time', icon: CalendarClock },
    ],
  },
  {
    category: 'Upload',
    items: [
      { type: 'uploadimage', label: 'Upload Image', icon: ImagePlus },
      { type: 'uploadfile', label: 'Upload File', icon: Upload },
      { type: 'workfloweditor', label: 'Workflow editor', icon: GitBranch },
    ],
  },
  {
    category: 'Data',
    items: [
      { type: 'datatable', label: 'Data Table', icon: Table },
      { type: 'datatableeditable', label: 'Editable Table', icon: FileSpreadsheet },
      { type: 'formlist', label: 'Form List', icon: ListPlus },
      { type: 'repeater', label: 'Repeater', icon: Repeat2 },
    ],
  },
  {
    category: 'Display',
    items: [
      { type: 'text', label: 'Text', icon: Type },
      { type: 'typography', label: 'Typography', icon: Pilcrow },
      { type: 'avatar', label: 'Avatar', icon: User },
      { type: 'divider', label: 'Divider', icon: SeparatorHorizontal },
      { type: 'html', label: 'HTML', icon: Code },
      { type: 'custom', label: 'Custom', icon: Puzzle },
      { type: 'approvalline', label: 'Approval line', icon: Workflow },
      { type: 'switchprofile', label: 'Switch profile', icon: UserCheck },
      { type: 'replaceprofile', label: 'Replace profile', icon: UserCog },
    ],
  },
  {
    category: 'Layout',
    items: [
      { type: 'container', label: 'Container', icon: Box },
      { type: 'tab', label: 'Tab', icon: PanelTop },
      { type: 'paper', label: 'Paper', icon: StickyNote },
      { type: 'card', label: 'Card', icon: CreditCard },
    ],
  },
  {
    category: 'Overlay',
    items: [
      { type: 'modal', label: 'Modal', icon: AppWindow },
      { type: 'drawer', label: 'Drawer', icon: PanelRight },
      { type: 'popover', label: 'Popover', icon: MessageSquare },
    ],
  },
  {
    category: 'Utility',
    items: [
      { type: 'button', label: 'Button', icon: MousePointerClick },
      { type: 'hidden', label: 'Hidden', icon: EyeOff },
      { type: 'empty', label: 'Empty', icon: SquareDashed },
    ],
  },
]

/** Flat lookup: ComponentType → its palette definition (type-name label + icon). */
export const COMPONENT_BY_TYPE = Object.fromEntries(
  COMPONENT_GROUPS.flatMap((group) => group.items).map((def) => [def.type, def]),
) as Record<ComponentType, ComponentDef>
