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
import { COMPONENT_META_GROUPS, type ComponentType } from './componentMeta'

export type { ComponentType } from './componentMeta'

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

/** Each type's palette glyph. */
const ICONS: Record<ComponentType, LucideIcon> = {
  textfield: TextCursorInput,
  textarea: TextWrap,
  select: ListFilter,
  autocomplete: Search,
  multiAutocomplete: ListChecks,
  checkbox: SquareCheck,
  switch: ToggleLeft,
  radio: CircleDot,
  datepicker: Calendar,
  daterangepicker: CalendarRange,
  datetimepicker: CalendarClock,
  uploadimage: ImagePlus,
  uploadfile: Upload,
  workfloweditor: GitBranch,
  datatable: Table,
  datatableeditable: FileSpreadsheet,
  formlist: ListPlus,
  repeater: Repeat2,
  text: Type,
  typography: Pilcrow,
  avatar: User,
  divider: SeparatorHorizontal,
  html: Code,
  custom: Puzzle,
  approvalline: Workflow,
  switchprofile: UserCheck,
  replaceprofile: UserCog,
  container: Box,
  tab: PanelTop,
  paper: StickyNote,
  card: CreditCard,
  modal: AppWindow,
  drawer: PanelRight,
  popover: MessageSquare,
  button: MousePointerClick,
  hidden: EyeOff,
  empty: SquareDashed,
}

/**
 * The toolbox palette, grouped into categories. Order here is the render order
 * (`componentMeta.ts` holds the types, labels and categories; adding a component
 * is a new entry there plus its glyph here).
 */
export const COMPONENT_GROUPS: ComponentGroup[] = COMPONENT_META_GROUPS.map((group) => ({
  category: group.category,
  items: group.items.map((item) => ({ ...item, icon: ICONS[item.type] })),
}))

/** Flat lookup: ComponentType → its palette definition (type-name label + icon). */
export const COMPONENT_BY_TYPE = Object.fromEntries(
  COMPONENT_GROUPS.flatMap((group) => group.items).map((def) => [def.type, def]),
) as Record<ComponentType, ComponentDef>
