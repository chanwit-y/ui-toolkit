import {
  AppWindow,
  Box,
  Calendar,
  CalendarClock,
  CalendarRange,
  CircleDot,
  EyeOff,
  FileSpreadsheet,
  ImagePlus,
  ListChecks,
  ListFilter,
  MessageSquare,
  MousePointerClick,
  PanelTop,
  Pilcrow,
  Search,
  SeparatorHorizontal,
  SquareCheck,
  SquareDashed,
  StickyNote,
  Table,
  TextCursorInput,
  TextWrap,
  Type,
  Upload,
  User,
  type LucideIcon,
} from 'lucide-react'

/** Every component kind the toolbox can drop onto the canvas. */
export type ComponentType =
  | 'hidden'
  | 'multiAutocomplete'
  | 'modal'
  | 'button'
  | 'datatable'
  | 'datatableeditable'
  | 'autocomplete'
  | 'textfield'
  | 'select'
  | 'checkbox'
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
  | 'container'
  | 'tab'
  | 'paper'
  | 'popover'
  | 'divider'
  | 'empty'

export type ComponentDef = {
  type: ComponentType
  /** Human-readable name shown in the toolbox and used as the new item's label. */
  label: string
  icon: LucideIcon
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
    ],
  },
  {
    category: 'Data',
    items: [
      { type: 'datatable', label: 'Data Table', icon: Table },
      { type: 'datatableeditable', label: 'Editable Table', icon: FileSpreadsheet },
    ],
  },
  {
    category: 'Display',
    items: [
      { type: 'text', label: 'Text', icon: Type },
      { type: 'typography', label: 'Typography', icon: Pilcrow },
      { type: 'avatar', label: 'Avatar', icon: User },
      { type: 'divider', label: 'Divider', icon: SeparatorHorizontal },
    ],
  },
  {
    category: 'Layout',
    items: [
      { type: 'container', label: 'Container', icon: Box },
      { type: 'tab', label: 'Tab', icon: PanelTop },
      { type: 'paper', label: 'Paper', icon: StickyNote },
    ],
  },
  {
    category: 'Overlay',
    items: [
      { type: 'modal', label: 'Modal', icon: AppWindow },
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
