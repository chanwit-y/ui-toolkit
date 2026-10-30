import {
  AppWindow,
  UserCheck,
  UserCog,
  Box,
  ChartColumn,
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
  FolderTree,
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
  Sigma,
  Upload,
  User,
} from 'lucide-react'
import { COMPONENT_META_GROUPS, type ComponentType } from './componentMeta'

export type { ComponentType } from './componentMeta'

/**
 * A tile that is a preset of an existing type, not a type of its own:
 * `formula` drops a `typography` already bound to an inline formula and opens
 * the formula editor at once (see `spec/gummy-logic-spec.md` — formulas are
 * value kinds in existing slots, never a Bin).
 */
export type ComponentPreset = 'formula'

export type ComponentDef = {
  type: ComponentType
  /** Human-readable name shown in the toolbox and used as the new item's label. */
  label: string
  icon: LucideIcon
  /** A `custom` tile for one declaration of the project's registry (Env →
   * Custom components): the dropped item is mapped onto it right away. */
  componentId?: string
  /** A preset tile of `type` (see {@link ComponentPreset}). */
  preset?: ComponentPreset
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
  filecollection: FolderTree,
  chart: ChartColumn,
  text: Type,
  typography: Pilcrow,
  avatar: User,
  divider: SeparatorHorizontal,
  html: Code,
  formula: Sigma,
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

/** The preset tiles, keyed by the type each sits right after. They are not in
 * `componentMeta.ts`: that list is the type list the MCP and `COMPONENT_TYPES`
 * read, where a second `typography` would be a duplicate type. */
const PRESET_TILES_AFTER: Partial<Record<ComponentType, ComponentDef[]>> = {
  typography: [{ type: 'typography', preset: 'formula', label: 'Formula', icon: Sigma, hint: 'A typography showing a formula’s result' }],
}

/**
 * The toolbox palette, grouped into categories. Order here is the render order
 * (`componentMeta.ts` holds the types, labels and categories; adding a component
 * is a new entry there plus its glyph here).
 */
export const COMPONENT_GROUPS: ComponentGroup[] = COMPONENT_META_GROUPS.map((group) => ({
  category: group.category,
  items: group.items.flatMap((item) => [{ ...item, icon: ICONS[item.type] }, ...(PRESET_TILES_AFTER[item.type] ?? [])]),
}))

/** Flat lookup: ComponentType → its palette definition (type-name label + icon). Preset tiles are left out. */
export const COMPONENT_BY_TYPE = Object.fromEntries(
  COMPONENT_GROUPS.flatMap((group) => group.items)
    .filter((def) => !def.preset)
    .map((def) => [def.type, def]),
) as Record<ComponentType, ComponentDef>
