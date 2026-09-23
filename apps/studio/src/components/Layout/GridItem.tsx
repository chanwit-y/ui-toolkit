import type { DataTableAddButton, DataType } from '@gummy-ui/ui'
import {
  AutocompleteBase2,
  Avatar,
  ButtonBase,
  CardView,
  CheckboxBase,
  SwitchBase,
  DataTable2,
  HtmlCell,
  DataTableEditable,
  DatePickerBase,
  DateRangePickerBase,
  DateTimePickerBase,
  Divider,
  MultiAutocompleteBase,
  Paper,
  RadioButtonBase,
  Tab,
  Text,
  TextareaBase,
  TextFieldBase,
  Typography,
  UploadFileBase,
  UploadImageBase,
} from '@gummy-ui/ui'
import { IconData, groupColumns } from '@gummy-ui/ui'
import type { TypographyProps, UploadedFile } from '@gummy-ui/ui'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  AppWindow,
  Box,
  Calendar,
  EyeOff,
  Expand,
  GripVertical,
  Hash,
  ImagePlus,
  Link,
  ListChecks,
  ListFilter,
  Lock,
  Mail,
  MessageSquare,
  MousePointerClick,
  PanelRight,
  PanelTop,
  Phone,
  Pilcrow,
  Plus,
  Search,
  SeparatorHorizontal,
  SquareCheck,
  ToggleLeft,
  StickyNote,
  CreditCard,
  Code,
  Table,
  TextWrap,
  Trash2,
  Type,
  Upload,
  User,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import dayjs from 'dayjs'
import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { cn, IconButton } from '../common'
import { COMPONENT_BY_TYPE } from './componentCatalog'
import { renderDesignPreview } from './DesignPreviews'
import { elementStyleVars, hasElementStyle, isDesignOnly } from './designTypes'
import { ENTER_DURATION_MS, prefersReducedMotion, UPGRADE_FADE_MS } from './gridAnimation'
import { useGridStore, useIsEntering } from './gridStore'
import { buildDataTablePreviewRows, buildHtmlPreviewValue, DATATABLE_PREVIEW_ROW_COUNT } from './dataTablePreview'
import { bindingToken } from './ItemBindingField'
import type {
  AvatarConfig,
  ButtonConfig,
  CheckboxConfig,
  SwitchConfig,
  ChildCanvas,
  ColumnSizingConfig,
  DataTableColumnConfig,
  DataTableConfig,
  DataTableEditableColumnConfig,
  DataTableEditableConfig,
  DateConfig,
  DividerConfig,
  FormListConfig,
  RepeaterConfig,
  GridItemData,
  ModalConfig,
  DrawerConfig,
  MultiAutocompleteConfig,
  PaperConfig,
  CardConfig,
  CardActionConfig,
  HtmlContentConfig,
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
import { uploadAccept } from './types'
import { escapeClassName } from './utils'

type GridItemProps = {
  item: GridItemData
  isSelected: boolean
}

/** dataType → glyph, so a collapsed chip is scannable at a glance. */
const DATA_TYPE_ICONS: Partial<Record<DataType, LucideIcon>> = {
  email: Mail,
  password: Lock,
  number: Hash,
  date: Calendar,
  'datetime-local': Calendar,
  month: Calendar,
  week: Calendar,
  time: Calendar,
  search: Search,
  tel: Phone,
  url: Link,
}

function iconForDataType(dataType: DataType): LucideIcon {
  return DATA_TYPE_ICONS[dataType] ?? Type
}

/**
 * Cell-width thresholds (content-box px) that gate the chip ↔ live preview
 * switch. A hysteresis band (flip to live at `liveMin`, back to chip only below
 * `chipMax`) keeps a cell resting near the boundary from strobing between the
 * two subtrees as it resizes. The numbers differ by component kind: a single
 * field reads at ~14rem, but a data table (4 columns + search + action + footer)
 * needs real width before it's worth rendering live.
 */
type LiveThresholds = { liveMin: number; chipMax: number }
const FIELD_THRESHOLDS: LiveThresholds = { liveMin: 224, chipMax: 208 } // ~14rem / ~13rem
const TABLE_THRESHOLDS: LiveThresholds = { liveMin: 480, chipMax: 440 } // a table needs room
// The display types (divider, text, typography, avatar, button) are legible at
// any width — a divider is just a line — so they render live unconditionally
// (see the grilled design). liveMin 0 makes the first synchronous measurement
// flip to live; chipMax -1 means no width can flip back.
const ALWAYS_LIVE: LiveThresholds = { liveMin: 0, chipMax: -1 }

/** The live/chip thresholds for a given component kind. */
function thresholdsForType(type: GridItemData['type']): LiveThresholds {
  if (type === 'datatable' || type === 'datatableeditable' || type === 'formlist')
    return TABLE_THRESHOLDS
  if (
    type === 'divider' ||
    type === 'text' ||
    type === 'typography' ||
    type === 'avatar' ||
    type === 'button' ||
    // A switch is a thumb and a label — legible in the narrowest cell.
    type === 'switch' ||
    // Overlays render only their trigger on the canvas — as cheap as a button.
    type === 'modal' ||
    type === 'drawer' ||
    type === 'popover' ||
    // A repeater previews its item template like the other container hosts.
    type === 'repeater' ||
    // A card's slots are display parts; the real component lays them out at any width.
    type === 'card' ||
    // An HTML block is markup — legible at any width.
    type === 'html' ||
    // Design-only kinds are the design itself — nothing heavier to gate.
    isDesignOnly(type)
  ) {
    return ALWAYS_LIVE
  }
  return FIELD_THRESHOLDS
}

/** Content-box width of an element (excludes its padding and border). */
function contentWidth(el: HTMLElement): number {
  const cs = getComputedStyle(el)
  return el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
}

/**
 * True once the observed element is wide enough to host a live component, with
 * hysteresis so a cell oscillating around the threshold doesn't flicker. The
 * element is passed as state (not a ref) so the effect re-runs when the node
 * mounts. We measure synchronously up front (`useLayoutEffect` +
 * `getBoundingClientRect`-style read) so the correct state is set before paint —
 * the ResizeObserver only handles later resizes. Relying on the observer's
 * async initial callback alone would flash a chip on mount and never fire at
 * all in throttled contexts (e.g. a hidden/background tab).
 */
function useIsLiveWidth(el: HTMLElement | null, { liveMin, chipMax }: LiveThresholds): boolean {
  const [isLive, setIsLive] = useState(false)
  useLayoutEffect(() => {
    if (!el) return
    const apply = (w: number) =>
      setIsLive((prev) => (w >= liveMin ? true : w <= chipMax ? false : prev))
    apply(contentWidth(el)) // synchronous initial measurement
    const ro = new ResizeObserver((entries) => {
      apply(entries[entries.length - 1].contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [el, liveMin, chipMax])
  return isLive
}

/**
 * The cell's visual content when NOT active. A textfield shows a compact,
 * size-aware chip (icon + label + dataType); every other component type shows
 * its label as a placeholder.
 */
function CellContent({ item }: { item: GridItemData }) {
  if (item.type === 'textfield' && item.config) {
    return <TextFieldChip config={item.config as TextFieldConfig} />
  }
  if (item.type === 'textarea' && item.config) {
    return <GlyphChip Icon={TextWrap} />
  }
  if (item.type === 'select' && item.config) {
    return <GlyphChip Icon={ListFilter} />
  }
  if (item.type === 'autocomplete' && item.config) {
    return <GlyphChip Icon={Search} />
  }
  if (item.type === 'multiAutocomplete' && item.config) {
    return <GlyphChip Icon={ListChecks} />
  }
  if (item.type === 'checkbox' && item.config) {
    return <GlyphChip Icon={SquareCheck} />
  }
  if (item.type === 'switch' && item.config) {
    return <GlyphChip Icon={ToggleLeft} />
  }
  if (item.type === 'uploadimage' && item.config) {
    return <GlyphChip Icon={ImagePlus} />
  }
  if (item.type === 'uploadfile' && item.config) {
    return <GlyphChip Icon={Upload} />
  }
  if (item.type === 'datatable') {
    return <GlyphChip Icon={Table} />
  }
  if (item.type === 'text' && item.config) {
    return <GlyphChip Icon={Type} />
  }
  if (item.type === 'typography' && item.config) {
    return <GlyphChip Icon={Pilcrow} />
  }
  if (item.type === 'avatar' && item.config) {
    return <GlyphChip Icon={User} />
  }
  if (item.type === 'divider' && item.config) {
    return <GlyphChip Icon={SeparatorHorizontal} />
  }
  if (item.type === 'button' && item.config) {
    return <GlyphChip Icon={MousePointerClick} />
  }
  if (item.type === 'hidden' && item.config) {
    return <GlyphChip Icon={EyeOff} />
  }
  if (item.type === 'container') {
    return <GlyphChip Icon={Box} />
  }
  if (item.type === 'paper' && item.config) {
    return <GlyphChip Icon={StickyNote} />
  }
  if (item.type === 'card' && item.config) {
    return <GlyphChip Icon={CreditCard} />
  }
  if (item.type === 'html' && item.config) {
    return <GlyphChip Icon={Code} />
  }
  if (item.type === 'tab' && item.config) {
    return <GlyphChip Icon={PanelTop} />
  }
  if (item.type === 'modal' && item.config) {
    return <GlyphChip Icon={AppWindow} />
  }
  if (item.type === 'drawer' && item.config) {
    return <GlyphChip Icon={PanelRight} />
  }
  if (item.type === 'popover' && item.config) {
    return <GlyphChip Icon={MessageSquare} />
  }
  if (isDesignOnly(item.type)) {
    return <GlyphChip Icon={COMPONENT_BY_TYPE[item.type].icon} />
  }
  return (
    <div
      data-grid-item-content
      className="flex h-full w-full items-center justify-center"
    >
      <span className="text-ui-sm font-medium text-ink-3">{item.label}</span>
    </div>
  )
}

/**
 * The active cell's body: the component glyph in the same position as the
 * non-active chip's icon (left, after the grip) so selecting doesn't shift it.
 * Uses the dataType icon for a textfield. The type pill is rendered separately on
 * the top border by `TypeLabel` (shown for active and hover alike); non-textfield
 * types render no body icon — the pill carries it.
 */
function ActiveBody({ item }: { item: GridItemData }) {
  const Icon =
    item.type === 'textfield' && item.config
      ? iconForDataType((item.config as TextFieldConfig).dataType)
      : item.type === 'textarea' && item.config
        ? TextWrap
        : item.type === 'select' && item.config
          ? ListFilter
          : item.type === 'autocomplete' && item.config
            ? Search
            : item.type === 'multiAutocomplete' && item.config
              ? ListChecks
              : item.type === 'checkbox' && item.config
                ? SquareCheck
                : item.type === 'switch' && item.config
                ? ToggleLeft
                : item.type === 'uploadimage' && item.config
                  ? ImagePlus
                  : item.type === 'uploadfile' && item.config
                    ? Upload
                    : item.type === 'datatable'
                      ? Table
                      : item.type === 'text' && item.config
                        ? Type
                        : item.type === 'typography' && item.config
                          ? Pilcrow
                          : item.type === 'avatar' && item.config
                            ? User
                            : item.type === 'divider' && item.config
                              ? SeparatorHorizontal
                              : item.type === 'button' && item.config
                                ? MousePointerClick
                                : item.type === 'hidden' && item.config
                                  ? EyeOff
                                  : item.type === 'container'
                                    ? Box
                                    : item.type === 'paper'
                                      ? StickyNote
                                    : item.type === 'card'
                                      ? CreditCard
                                    : item.type === 'html'
                                      ? Code
                                      : item.type === 'tab'
                                        ? PanelTop
                                        : item.type === 'modal'
                                          ? AppWindow
                                          : item.type === 'drawer'
                                            ? PanelRight
                                          : item.type === 'popover'
                                            ? MessageSquare
                                            : isDesignOnly(item.type)
                                              ? COMPONENT_BY_TYPE[item.type].icon
                                              : null
  if (!Icon) return null
  return (
    <div
      data-grid-item-content
      className="@container flex h-full w-full items-center justify-center gap-2 px-1 @min-[8rem]:justify-start @min-[8rem]:pl-6"
    >
      <Icon className="h-4 w-4 shrink-0 text-ink" aria-hidden="true" />
    </div>
  )
}

/**
 * The type-label pill straddling the cell's top border. Reads from `item.type`
 * (the palette type), not the user-editable `item.label`. Same neutral styling
 * in both states: revealed on hover, and kept visible while the cell is active.
 */
function TypeLabel({
  type,
  isSelected,
}: {
  type: GridItemData['type']
  isSelected: boolean
}) {
  const def = COMPONENT_BY_TYPE[type]
  if (!def) return null
  const Icon = def.icon
  return (
    <span
      data-grid-item-type
      className={cn(
        'pointer-events-none absolute left-1.5 top-0 z-20 inline-flex h-[17px] -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-[4px] bg-accent px-1.5 font-mono text-ui-xs text-accent-ink transition-opacity duration-150',
        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {def.label}
    </span>
  )
}

/**
 * Collapsed textfield representation for cells too narrow to host the live
 * component (below the `useIsLiveWidth` threshold): just the dataType glyph.
 * The label/dataType are carried by the `TypeLabel` pill and the inspector — at
 * this size a real field would be uselessly cramped, so we stay minimal.
 */
function TextFieldChip({ config }: { config: TextFieldConfig }) {
  return <GlyphChip Icon={iconForDataType(config.dataType)} />
}

/**
 * A centered glyph chip — the minimal representation for a field too narrow to
 * host its live component. The label/config are carried by the `TypeLabel` pill
 * and the inspector, so at this size we stay to a single icon.
 */
function GlyphChip({ Icon }: { Icon: LucideIcon }) {
  return (
    <div
      data-grid-item-content
      className="flex h-full w-full items-center justify-center"
    >
      <Icon className="h-4 w-4 shrink-0 text-ink" aria-hidden="true" />
    </div>
  )
}

/**
 * The live, real `<TextFieldBase>` from the library, rendered in-cell once the
 * cell is wide enough. Inert: `pointer-events-none` lets a click pass through
 * to the cell (select) and keeps drag on the grip — you preview the field, you
 * don't type into it. `isFullWidth` is forced and `isFixedHeight` dropped so
 * the field fills the cell width and the grid row owns the height. The required
 * marker is baked into the label (TextFieldBase has no `isRequired` prop).
 */
function LivePreview({ config }: { config: TextFieldConfig }) {
  const label = config.isRequired ? `${config.label} *` : config.label
  return (
    <div
      data-grid-item-content
      className="pointer-events-none flex h-full w-full items-center px-3"
    >
      <TextFieldBase
        dataType={config.dataType}
        label={label}
        placeholder={config.placeholder}
        helperText={config.helperText}
        errorMessage={config.errorMessage}
        variant={config.variant}
        size={config.size}
        radius={config.radius}
        regex={config.regex || undefined}
        regexErrorMessage={config.regexErrorMessage}
        isFullWidth
        isFixedHeight={false}
      />
    </div>
  )
}

/**
 * The live, real `<TextareaBase>` from the library, rendered in-cell once the
 * cell is wide enough. Inert (`pointer-events-none`) like the textfield preview.
 * `resize` is forced to `'none'` in-canvas — the drag handle would be a dead
 * affordance with pointer events off — but the configured `rows` is honored, so
 * the cell auto-grows (grid `minmax(56px, auto)`) to the real textarea height.
 * The required marker is baked into the label (TextareaBase has no `isRequired`).
 */
function TextareaLivePreview({ config }: { config: TextareaConfig }) {
  const label = config.isRequired ? `${config.label} *` : config.label
  return (
    <div
      data-grid-item-content
      className="pointer-events-none flex h-full w-full items-center px-3"
    >
      <TextareaBase
        label={label}
        placeholder={config.placeholder}
        helperText={config.helperText}
        errorMessage={config.errorMessage}
        rows={config.rows}
        resize="none"
        autoResize={config.autoResize}
        maxLength={config.maxLength === '' ? undefined : config.maxLength}
        showCharCount={config.showCharCount}
      />
    </div>
  )
}

/**
 * The live, real `<AutocompleteBase2>` from the library, rendered in-cell once the
 * cell is wide enough. Inert (`pointer-events-none`) like the other previews. In
 * `static` mode it shows the authored option records keyed by the configured
 * `idKey`/`displayKey`/`searchKey` (an invalid edit never reaches here — the panel
 * only commits valid arrays, so the preview holds the last-valid one). In `source`
 * mode the cell can't fetch, so it renders an empty trigger with the configured
 * placeholder. The required marker is baked into the label (Autocomplete2 has no
 * `isRequired` prop). Options/keys are cast through `any` — Autocomplete2's generic
 * is fixed to `{ id, label }` for typing, but it reads the keys off each record at
 * runtime, so arbitrary record shapes work. Needs the core providers from
 * `App.tsx` (useCore/useData/react-query).
 */
function SelectLivePreview({ config }: { config: SelectFieldConfig }) {
  const label = config.isRequired ? `${config.label} *` : config.label
  const isSource = config.mode === 'source'
  return (
    <div
      data-grid-item-content
      className="pointer-events-none flex h-full w-full items-center px-3"
    >
      <AutocompleteBase2
        name={config.name}
        label={label}
        placeholder={config.placeholder}
        helperText={config.helperText}
        error={!!config.errorMessage}
        errorMessage={config.errorMessage}
        options={(isSource ? [] : config.options) as never}
        idKey={config.idKey as never}
        displayKey={config.displayKey as never}
        searchKey={config.searchKey as never}
        inputIcon={(config.inputIcon || undefined) as never}
        itemIcon={(config.itemIcon || undefined) as never}
        itemSubtitle={(config.subtitleKey || undefined) as never}
        itemAvatar={(config.avatarKey || undefined) as never}
      />
    </div>
  )
}

/**
 * The live, real `<MultiAutocompleteBase>` from the library, rendered in-cell once
 * the cell is wide enough. Inert (`pointer-events-none`) like the other previews.
 * Unlike `SelectLivePreview`, the options are fed in *both* modes (the config always
 * carries the static starter records) and the first option is pre-selected via
 * `values`, so a freshly-dropped source-mode cell still shows a removable chip —
 * making the "multi" nature read on the canvas. Options/keys are cast
 * through `never`: the base's generic is fixed to `{ id, label }` for typing, but it
 * reads the keys off each record at runtime, so arbitrary record shapes work. Needs
 * the core providers from `App.tsx` (useCore).
 */
function MultiAutocompleteLivePreview({ config }: { config: MultiAutocompleteConfig }) {
  const label = config.isRequired ? `${config.label} *` : config.label
  const firstId = config.options[0]?.[config.idKey]
  const values = firstId == null ? [] : [String(firstId)]
  return (
    <div
      data-grid-item-content
      className="pointer-events-none flex h-full w-full items-center px-3"
    >
      <MultiAutocompleteBase
        name={config.name}
        label={label}
        placeholder={config.placeholder}
        helperText={config.helperText}
        error={!!config.errorMessage}
        errorMessage={config.errorMessage}
        options={config.options as never}
        values={values}
        idKey={config.idKey as never}
        displayKey={config.displayKey as never}
        searchKey={config.searchKey as never}
        inputIcon={(config.inputIcon || undefined) as never}
        itemIcon={(config.itemIcon || undefined) as never}
        itemSubtitle={(config.subtitleKey || undefined) as never}
        itemAvatar={(config.avatarKey || undefined) as never}
        maxSelections={config.maxSelections === '' ? undefined : config.maxSelections}
        showSelectedCount={config.showSelectedCount}
      />
    </div>
  )
}

/**
 * The live, real `<CheckboxBase>` from the library, rendered in-cell once the cell
 * is wide enough. Inert (`pointer-events-none`) like the other previews. `single`
 * mode renders one boolean checkbox (no `options`), reflecting the authored
 * `defaultChecked`; `group` mode feeds the authored `options`/`orientation` with no
 * pre-selection. The required marker is baked into the label (CheckboxBase has no
 * `isRequired` prop). Per-option `disabled` flows straight through.
 */
/**
 * The live, real `<SwitchBase>` from the library, inert in-cell. Shows the
 * authored default state, label side and disabled flag; a gated switch draws
 * disabled (the gate never publishes on the canvas), which is how it starts
 * at runtime too. The required marker is baked into the label.
 */
function SwitchLivePreview({ config }: { config: SwitchConfig }) {
  const label = config.isRequired ? `${config.label} *` : config.label
  return (
    <div
      data-grid-item-content
      className="pointer-events-none flex h-full w-full items-center px-3"
    >
      <SwitchBase
        label={label}
        labelPosition={config.labelPosition}
        helperText={config.helperText}
        variant={config.variant}
        size={config.size}
        checked={config.defaultChecked}
        disabled={config.disabled || !!config.enabledWhen}
      />
    </div>
  )
}

function CheckboxLivePreview({ config }: { config: CheckboxConfig }) {
  const label = config.isRequired ? `${config.label} *` : config.label
  const isGroup = config.mode === 'group'
  return (
    <div
      data-grid-item-content
      className="pointer-events-none flex h-full w-full items-center px-3"
    >
      <CheckboxBase
        label={label}
        helperText={config.helperText}
        error={!!config.errorMessage}
        errorMessage={config.errorMessage}
        variant={config.variant}
        size={config.size}
        checked={isGroup ? undefined : config.defaultChecked}
        options={isGroup ? config.options : undefined}
        orientation={config.orientation}
      />
    </div>
  )
}

/**
 * The live, real `<RadioButtonBase>` from the library, rendered in-cell once the
 * cell is wide enough. Inert (`pointer-events-none`) like the other previews. A
 * radio is always a single-select group, so the authored `options`/`orientation`
 * feed straight through; `defaultValue` (when set) preselects an option via the
 * controlled `value`. The required marker is baked into the label (RadioButtonBase
 * has no `isRequired` prop). Per-option `disabled` flows straight through. Static
 * options only (no API source), so the plain base — not the engine-aware variant —
 * is used, needing no Core provider.
 */
function RadioLivePreview({ config }: { config: RadioConfig }) {
  const label = config.isRequired ? `${config.label} *` : config.label
  return (
    <div
      data-grid-item-content
      className="pointer-events-none flex h-full w-full items-center px-3"
    >
      <RadioButtonBase
        label={label}
        helperText={config.helperText}
        error={!!config.errorMessage}
        errorMessage={config.errorMessage}
        variant={config.variant}
        size={config.size}
        orientation={config.orientation}
        options={config.options}
        value={config.defaultValue || undefined}
      />
    </div>
  )
}

/**
 * The live, real date picker from the library, rendered in-cell once the cell is
 * wide enough. Inert (`pointer-events-none`) like the other previews. One shared
 * `DateConfig` (discriminated by `kind`) maps onto whichever base component matches:
 * `DatePickerBase` / `DateTimePickerBase` / `DateRangePickerBase`. Empty bounds
 * (`min`/`max` = `''`) become `undefined`; `weekStartsOn` is date+datetime only and
 * `minuteStep` is datetime only (range uses neither). The required marker is baked
 * into the label for a uniform single asterisk (matching checkbox/radio); width is
 * forced full so the cell owns sizing. These are display-only static bases (no Core
 * provider needed). Pickers start with no value — the trigger shows its placeholder.
 */
function DateLivePreview({ config }: { config: DateConfig }) {
  const label = config.isRequired ? `${config.label} *` : config.label
  const common = {
    label,
    placeholder: config.placeholder || undefined,
    helperText: config.helperText,
    error: !!config.errorMessage,
    errorMessage: config.errorMessage,
    variant: config.variant,
    size: config.size,
    radius: config.radius,
    clearable: config.clearable,
    isFullWidth: true,
  } as const
  const min = config.min || undefined
  const max = config.max || undefined

  let picker
  if (config.kind === 'range') {
    picker = (
      <DateRangePickerBase
        {...common}
        displayFormat={config.displayFormat as 'yyyy-MM-dd' | 'MM/dd/yyyy' | 'dd/MM/yyyy'}
        minDate={min}
        maxDate={max}
      />
    )
  } else if (config.kind === 'datetime') {
    picker = (
      <DateTimePickerBase
        {...common}
        displayFormat={config.displayFormat}
        minDateTime={min}
        maxDateTime={max}
        weekStartsOn={config.weekStartsOn}
        minuteStep={config.minuteStep}
      />
    )
  } else {
    picker = (
      <DatePickerBase
        {...common}
        displayFormat={config.displayFormat}
        minDate={min}
        maxDate={max}
        weekStartsOn={config.weekStartsOn}
      />
    )
  }

  return (
    <div
      data-grid-item-content
      className="pointer-events-none flex h-full w-full items-center px-3"
    >
      {picker}
    </div>
  )
}

/**
 * The live, real `<UploadImageBase>` from the library, rendered in-cell once the
 * cell is wide enough. Inert (`pointer-events-none`) like the other previews — the
 * dropzone shows its empty "click or drag" state (no value flows in on the canvas).
 * Unlike the input components, UploadImage owns an `isRequired` prop that renders
 * the asterisk, so it's passed straight through rather than baked into the label.
 * `isFullWidth` is forced so the cell owns the width; `previewHeight` drives the
 * dropzone height and the grid row (`minmax(56px, auto)`) grows to fit. Empty
 * `accept`/`maxSizeMB` fall back to the component's defaults. Theme comes free from
 * the canvas `ThemeProvider`.
 */
function UploadImageLivePreview({ config }: { config: UploadImageConfig }) {
  return (
    <div
      data-grid-item-content
      className="pointer-events-none flex h-full w-full items-center px-3 py-2"
    >
      <UploadImageBase
        label={config.label}
        helperText={config.helperText}
        isRequired={config.isRequired}
        error={!!config.errorMessage}
        errorMessage={config.errorMessage}
        accept={config.accept || undefined}
        maxSizeMB={config.maxSizeMB === '' ? undefined : config.maxSizeMB}
        shape={config.shape}
        previewHeight={config.previewHeight}
        valueFormat={config.valueFormat}
        isFullWidth
      />
    </div>
  )
}

/**
 * The live, real `<UploadFileBase>` from the library, rendered in-cell once the
 * cell is wide enough. Inert (`pointer-events-none`) like the other previews — the
 * dropzone is fed `UPLOAD_SAMPLE_FILES` so the preview layout is visible: both in
 * multi mode, one in single mode (where the file card replaces the dropzone). UploadFile owns
 * its `isRequired` prop (asterisk), so it's passed through, not baked into the label.
 * `isFullWidth` is forced so the cell owns sizing. Empty `accept`/`maxFiles`/`maxSizeMB`
 * fall back to the component's defaults.
 */
/** Stand-in files so the cell shows the preview settings (list / grid, thumbnails,
 * the single-mode file card). Canvas-only — never part of the config or export. */
const UPLOAD_SAMPLE_FILES: UploadedFile[] = [
  {
    name: 'Photo.svg',
    size: 248_000,
    type: 'image/svg+xml',
    data: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4MCA4MCI+PHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjY2JkNWUxIi8+PGNpcmNsZSBjeD0iNTYiIGN5PSIyNCIgcj0iOSIgZmlsbD0iI2Y4ZmFmYyIvPjxwYXRoIGQ9Ik0wIDY0bDI0LTI2IDE4IDE4IDEyLTEyIDI2IDI2djEwSDB6IiBmaWxsPSIjNjQ3NDhiIi8+PC9zdmc+',
  },
  { name: 'Report.pdf', size: 1_340_000, type: 'application/pdf', data: '' },
]

function UploadFileLivePreview({ config }: { config: UploadFileConfig }) {
  return (
    <div
      data-grid-item-content
      className="pointer-events-none flex h-full w-full items-center px-3 py-2"
    >
      <UploadFileBase
        label={config.label}
        helperText={config.helperText}
        isRequired={config.isRequired}
        error={!!config.errorMessage}
        errorMessage={config.errorMessage}
        accept={uploadAccept(config)}
        multiple={config.multiple}
        maxFiles={config.maxFiles === '' ? undefined : config.maxFiles}
        maxSizeMB={config.maxSizeMB === '' ? undefined : config.maxSizeMB}
        preview={config.preview}
        previewLayout={config.previewLayout}
        value={config.multiple ? UPLOAD_SAMPLE_FILES : UPLOAD_SAMPLE_FILES.slice(0, 1)}
        valueFormat={config.valueFormat}
        isFullWidth
      />
    </div>
  )
}

/** Stand-in for the engine `filterContainer` on the canvas: the table only needs one to exist — its bins are drawn by `ChildCanvasPreview`. */
const CANVAS_FILTER_CONTAINER = { id: '__canvas_filter__', name: '__canvas_filter__', isArray: false, bins: [] } as never

/** A column's authored widths as the engine / TanStack keys (the canvas is inert, so the lock is moot). */
function previewColumnSizing(c: ColumnSizingConfig) {
  return {
    ...(c.size !== '' ? { size: c.size } : {}),
    ...(c.minSize !== '' ? { minSize: c.minSize } : {}),
    ...(c.maxSize !== '' ? { maxSize: c.maxSize } : {}),
  }
}

/**
 * The live, real `<DataTable2>` from the library, rendered in-cell once the cell
 * is wide enough (`TABLE_THRESHOLDS`). Inert (`pointer-events-none`) like the
 * other previews — search, sort, the edit/delete action column, and the
 * pagination footer all render but can't be operated; you preview the table, you
 * don't drive it. A mock `api` feeds rows generated from the authored columns so
 * the body is populated (with no `api` the table renders empty). DataTable2 caches
 * rows under a `name`+`title` react-query key that ignores the api function, so
 * `renderLive` remounts this component (React `key`) whenever a row-affecting
 * column field changes — a fresh mount refetches. Unlike the field previews this
 * wrapper doesn't force single-line centering — it lets the table grow so the grid
 * row (`minmax(56px, auto)`) takes the table's real height. All providers
 * DataTable2 needs (Data/Loading/Snackbar/Query) come from `CoreProvider` in
 * `App.tsx`.
 */
function DataTableLivePreview({ config, filterCanvas }: { config: DataTableConfig; filterCanvas?: ChildCanvas }) {
  // Server filters on the canvas: the real Filter button (or inline bar), whose
  // form body is the read-only preview of the table's filter canvas.
  const showFilters = config.filtersEnabled && !!filterCanvas && filterCanvas.items.length > 0
  const rows = useMemo(() => buildDataTablePreviewRows(config.columns), [config.columns])
  const api = useMemo(() => async () => rows, [rows])
  // Layout flags DataTable2 reads off `meta`, set like the engine's builder
  // does: the column's own clamp, row header, merged cells, HTML.
  const layoutMeta = (c: DataTableColumnConfig) => ({
    ...(c.lines !== '' ? { lines: c.lines } : {}),
    ...(c.rowHeader ? { rowHeader: true } : {}),
    ...(c.mergeRows ? { mergeRows: true } : {}),
    ...(c.mergeColumns ? { mergeColumns: true } : {}),
    ...(c.html.trim() ? { html: true } : {}),
  })
  const leafColumns = config.columns.map((c) => ({
    accessorKey: c.accessor,
    header: c.header,
    enableSorting: c.enableSorting,
    enableColumnFilter: c.enableColumnFilter,
    ...previewColumnSizing(c),
    ...(Object.keys(layoutMeta(c)).length ? { meta: layoutMeta(c) } : {}),
    // An HTML column renders through the engine's own cell (mock rows already
    // hold the formatted date, so `{{value}}` is the row value as is).
    ...(c.html.trim()
      ? {
          cell: (props: { row: { original: Record<string, unknown> } }) => (
            <HtmlCell template={c.html} row={props.row.original} value={props.row.original[c.accessor]} />
          ),
        }
      : {}),
  }))
  // Adjacent equal `group` labels become group headers, as in the engine.
  const columns = groupColumns(config.columns, leafColumns)
  const align = config.columns.reduce<Record<string, 'start' | 'center' | 'end'>>(
    (acc, c) => ({ ...acc, [c.accessor]: c.align }),
    {},
  )
  const pinnedColumns = {
    // The row header leads (after the action column), then the config pins.
    left: [
      ...config.columns.filter((c) => c.rowHeader).map((c) => c.accessor),
      ...config.columns.filter((c) => c.pin === 'left' && !c.rowHeader).map((c) => c.accessor),
    ],
    right: config.columns.filter((c) => c.pin === 'right').map((c) => c.accessor),
  }
  return (
    <div
      data-grid-item-content
      className="pointer-events-none w-full px-3 py-2"
    >
      <DataTable2
        pinnedColumns={pinnedColumns}
        // Namespaced so the canvas's mock-row cache never collides with the
        // Live Preview modal's real fetch (react-query keys by name+title, and
        // the query client is shared app-wide).
        name={`__canvas__${config.name}`}
        title={config.title}
        columns={columns}
        align={align}
        api={api}
        canSearchAllColumns={config.canSearchAllColumns}
        canEdit={config.canEdit}
        canDelete={config.canDelete}
        canAdd={config.canAdd}
        headerGap={config.headerGap || undefined}
        canResizeColumns={config.canResizeColumns}
        cellLines={config.cellLines}
        filterContainer={showFilters ? CANVAS_FILTER_CONTAINER : undefined}
        renderFilterBins={showFilters ? () => <ChildCanvasPreview canvas={filterCanvas} /> : undefined}
        filterDisplay={config.filterDisplay}
        filterButton={{
          label: config.filterButton.label,
          icon: (config.filterButton.icon || 'filter') as DataTableAddButton['icon'],
          variant: config.filterButton.variant,
        }}
        addButton={{
          label: config.addButton.label,
          icon: (config.addButton.icon || 'puls') as DataTableAddButton['icon'],
          variant: config.addButton.variant,
        }}
      />
    </div>
  )
}

/** The part of a datatable config that changes the *fetched* rows (not just the
 * column chrome) — used as the preview's remount key so edits refetch. */
function dataTableRowsKey(config: DataTableConfig): string {
  return JSON.stringify(config.columns.map((c) => [c.accessor, c.header, c.useDateFormat, c.html]))
}

/**
 * Editor-aware mock rows for the editable-table preview: an id-ish accessor
 * counts 1..N, a `number` editor gets round numerics, a `date` editor gets
 * consecutive ISO dates (what its date input expects), a `select` editor cycles
 * through its own options, a `checkbox` editor alternates, and `text` falls back
 * to "<Header> N". Fixed base date keeps re-renders deterministic.
 */
function buildEditableTablePreviewRows(
  columns: DataTableEditableColumnConfig[],
): Record<string, unknown>[] {
  return Array.from({ length: DATATABLE_PREVIEW_ROW_COUNT }, (_, i) => {
    const row: Record<string, unknown> = {}
    for (const column of columns) {
      const key = column.accessorKey
      if (!key) continue
      if (/^id$|Id$|_id$/.test(key)) {
        row[key] = i + 1
      } else if (column.editor === 'number') {
        row[key] = (i + 1) * 10
      } else if (column.editor === 'date') {
        row[key] = dayjs('2026-01-05').add(i, 'day').format('YYYY-MM-DD')
      } else if (column.editor === 'checkbox') {
        row[key] = i % 2 === 0
      } else if (column.editor === 'select' && column.options.length > 0) {
        row[key] = column.options[i % column.options.length].value
      } else {
        row[key] = `${column.header || key} ${i + 1}`
      }
    }
    return row
  })
}

/**
 * The live, real `<DataTableEditable>` from the library, rendered in-cell once
 * the cell is table-wide (`TABLE_THRESHOLDS`). Inert like the other previews. A
 * mock read API feeds editor-aware generated rows; the create/update/delete
 * toggles pass no-op mock APIs so the real Add/Edit/Delete chrome renders (or
 * disappears) per the config — the component shows an action only when its API
 * is set. Column `validation` is omitted: it only fires on inline editing, which
 * a pointer-events-none preview can't reach. Its query key is
 * `table-data-editable-${name}` (name-only), so `renderLive` remounts on
 * row-affecting column edits — same trick as the plain table.
 */
function EditableTableLivePreview({ config }: { config: DataTableEditableConfig }) {
  const rows = useMemo(() => buildEditableTablePreviewRows(config.columns), [config.columns])
  const readApi = useMemo(() => async () => rows, [rows])
  const noop = async () => ({})
  const apiCrud = {
    read: { api: readApi },
    ...(config.canCreate ? { create: { api: noop } } : {}),
    ...(config.canUpdate ? { update: { api: noop } } : {}),
    ...(config.canDelete ? { delete: { api: noop } } : {}),
  }
  const columns = config.columns.map((c) => ({
    accessorKey: c.accessorKey,
    header: c.header,
    editable: c.editable,
    editor: c.editor,
    ...(c.editor === 'select' ? { options: c.options } : {}),
    isRequired: c.isRequired,
    enableSorting: c.enableSorting,
    enableColumnFilter: c.enableColumnFilter,
    align: c.align,
    ...(c.rowHeader ? { rowHeader: true } : {}),
    ...(c.group.trim() ? { group: c.group.trim() } : {}),
    ...previewColumnSizing(c),
  }))
  return (
    <div
      data-grid-item-content
      className="pointer-events-none w-full px-3 py-2"
    >
      <DataTableEditable
        // Same cache-namespacing as the plain table (its key is name-only).
        name={`__canvas__${config.name}`}
        title={config.title}
        idKey={config.idKey}
        columns={columns}
        apiCrud={apiCrud}
        canResizeColumns={config.canResizeColumns}
      />
    </div>
  )
}

/** Row-affecting slice of an editable-table config — the preview's remount key
 * (its react-query key is name-only, so a remount is what refetches). */
function editableTableRowsKey(config: DataTableEditableConfig): string {
  return JSON.stringify(
    config.columns.map((c) => [c.accessorKey, c.header, c.editor, c.options.map((o) => o.value)]),
  )
}

/**
 * The live, real `<Text>` from the library. Always live (no width gate — plain
 * text is legible at any width) and inert like the other previews. `isLabel`
 * renders the form-label styling (block, small, medium weight).
 */
function TextLivePreview({ config }: { config: TextConfig }) {
  return (
    <div
      data-grid-item-content
      className="pointer-events-none flex h-full w-full items-center px-3"
    >
      {/* A bound text shows its `{field}` token — real values appear in the Live Preview. */}
      <Text text={config.binding ? bindingToken(config.binding) : config.text} isLabel={config.isLabel} />
    </div>
  )
}

/**
 * The live, real `<Typography>` from the library. Always live and inert. The
 * curated config maps 1:1 onto props; `''` overrides pass `undefined` so the
 * variant's own weight/color/align show through. `href` renders the link styling
 * (the anchor is inert on the canvas like everything else).
 */
function TypographyLivePreview({ config }: { config: TypographyConfig }) {
  return (
    <div
      data-grid-item-content
      className="pointer-events-none flex h-full w-full items-center px-3"
    >
      <Typography
        className="w-full"
        text={config.binding ? bindingToken(config.binding) : config.text}
        variant={config.variant}
        weight={config.weight || undefined}
        color={(config.color || undefined) as TypographyProps['color']}
        align={config.align || undefined}
        truncate={config.truncate}
        href={config.href || undefined}
      />
    </div>
  )
}

/**
 * The live, real `<Avatar>` from the library. Always live and inert. An empty
 * `src` shows the fallback (or the first letter of `alt`) — exactly the runtime
 * behavior, so no placeholder image is faked in.
 */
function AvatarLivePreview({ config }: { config: AvatarConfig }) {
  return (
    <div
      data-grid-item-content
      className="pointer-events-none flex h-full w-full items-center justify-center px-3"
    >
      <Avatar
        src={config.srcBinding ? undefined : config.src || undefined}
        alt={config.alt || undefined}
        size={config.size}
        fallback={config.srcBinding || config.fallbackBinding ? '{ }' : config.fallback || undefined}
      />
    </div>
  )
}

/**
 * The live, real `<Divider>` from the library. Always live — a rule is legible
 * at any width. The wrapper stretches it full-cell; `spacing` (vertical margin)
 * is honored, `''` falls back to the component's 8px default.
 */
function DividerLivePreview({ config }: { config: DividerConfig }) {
  return (
    <div
      data-grid-item-content
      className="pointer-events-none flex h-full w-full flex-col justify-center px-3"
    >
      <Divider
        variant={config.variant}
        spacing={config.spacing === '' ? undefined : config.spacing}
      />
    </div>
  )
}

/**
 * The live, real `<ButtonBase>` from the library — the engine `Button`'s visual
 * layer without its form/action plumbing (which a canvas preview can't host: the
 * full Button destructures `useFormContext()` and react-hook-form is bundled
 * inside the library, so no studio-side FormProvider can reach it). Always live
 * and inert. Color comes from the canvas ThemeProvider.
 */
function ButtonLivePreview({ config }: { config: ButtonConfig }) {
  return (
    <div
      data-grid-item-content
      className="pointer-events-none flex h-full w-full items-center justify-center px-3"
    >
      <ButtonBase
        label={config.label}
        icon={(config.icon || undefined) as keyof typeof IconData | undefined}
        variant={config.variant}
      />
    </div>
  )
}

/**
 * A nested canvas rendered read-only inside its host cell (see the grilled
 * design: real nested render, one `pointer-events-none` at the host preview's
 * top). Lays the children out with the canvas's own lg grid settings via inline
 * styles (the cell previews at one breakpoint — no responsive CSS needed), and
 * each child renders its real live preview (recursively for nested hosts) or
 * falls back to its chip. Editing happens by drilling in, not here.
 */
function ChildCanvasPreview({ canvas }: { canvas: ChildCanvas }) {
  if (canvas.items.length === 0) {
    return (
      <div className="flex min-h-12 w-full items-center justify-center rounded-md border border-dashed border-line-strong text-ui-sm text-ink-3">
        Empty — Edit contents to add components
      </div>
    )
  }
  const s = canvas.settings
  const cols = s.columns.lg
  // In a narrow host cell (a card a third of a narrow canvas wide) the fixed
  // column gaps alone can exceed the width, and a full-span child then
  // overflows and gets clipped. Cap the column gap so the gaps take at most a
  // quarter of the width and the content wraps instead.
  const columnGap = s.columnGap.lg || s.gap.lg
  const cappedColumnGap = columnGap
    ? `min(${columnGap}, ${(25 / Math.max(cols - 1, 1)).toFixed(2)}%)`
    : undefined
  return (
    <div
      className="w-full"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        ...(s.gap.lg ? { rowGap: s.gap.lg } : {}),
        ...(s.rowGap.lg ? { rowGap: s.rowGap.lg } : {}),
        ...(cappedColumnGap ? { columnGap: cappedColumnGap } : {}),
        ...(s.gridAutoRows.lg ? { gridAutoRows: s.gridAutoRows.lg } : {}),
      }}
    >
      {canvas.items.map((child) => (
        <div
          key={child.id}
          className="min-w-0"
          style={{ gridColumn: `span ${Math.min(child.settings.colSpan.lg, cols)}` }}
        >
          {renderLive(child, true) ?? <CellContent item={child} />}
        </div>
      ))}
    </div>
  )
}

/**
 * The live render of a `container` cell: its child canvas, read-only. The plain
 * container adds no chrome of its own — exactly like the engine, where a
 * container Bin is just a nested grid.
 */
function ContainerLivePreview({ canvas }: { canvas: ChildCanvas }) {
  return (
    <div
      data-grid-item-content
      className="pointer-events-none flex h-full w-full items-center px-3 py-2"
    >
      <ChildCanvasPreview canvas={canvas} />
    </div>
  )
}

/**
 * A form list on the canvas: the title, one row of the row template (the
 * child canvas, read-only) with the Remove control the real component draws
 * beside every row, and the Add button. The real `FormList` needs an
 * ApiMaster to fetch rows, so — like a modal's content — the rows are
 * exercised in the Live Preview; here the chrome is what's previewed.
 */
function FormListLivePreview({ config, canvas }: { config: FormListConfig; canvas: ChildCanvas }) {
  const glyph = (key: string, fallback: LucideIcon): LucideIcon =>
    (key && (IconData as Record<string, LucideIcon>)[key]) || fallback
  const AddGlyph = glyph(config.addIcon, Plus)
  const RemoveGlyph = glyph(config.removeIcon, Trash2)
  const below = config.removePosition === 'below'
  const add = config.canCreate && (
    <div
      className={
        config.addAlign === 'end'
          ? 'flex justify-end'
          : config.addAlign === 'center'
            ? 'flex justify-center'
            : 'flex justify-start'
      }
    >
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border border-[var(--accent-8)] py-1.5 text-sm font-medium text-[var(--accent-11)]',
          config.addDisplay === 'icon' ? 'px-2' : 'px-3',
        )}
        title={config.addLabel || 'Add'}
      >
        {config.addDisplay !== 'label' && <AddGlyph className="h-3.5 w-3.5" aria-hidden="true" />}
        {config.addDisplay !== 'icon' && (config.addLabel || 'Add')}
      </span>
    </div>
  )
  const remove = config.canDelete && (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 text-sm text-slate-500 dark:text-gray-400',
        below ? 'justify-end' : 'pt-7',
      )}
    >
      {config.removeDisplay !== 'label' && <RemoveGlyph className="h-3.5 w-3.5" aria-hidden="true" />}
      {config.removeDisplay !== 'icon' && (config.removeLabel || 'Remove')}
    </span>
  )
  return (
    <div data-grid-item-content className="pointer-events-none w-full px-3 py-2">
      <div className="flex w-full flex-col gap-3">
        {config.title && (
          <h3 className="text-sm font-semibold text-slate-800 dark:text-gray-100">{config.title}</h3>
        )}
        {config.addPosition === 'top' && add}
        <div className={below ? 'flex flex-col gap-2' : 'flex items-start gap-3'}>
          {config.removePosition === 'start' && remove}
          <div className="min-w-0 flex-1">
            <ChildCanvasPreview canvas={canvas} />
          </div>
          {config.removePosition !== 'start' && remove}
        </div>
        {config.addPosition === 'bottom' && add}
      </div>
    </div>
  )
}

/** A repeater gap / padding value as CSS: a Tailwind scale key (`4` → 1rem) or a raw length. */
function scaleToCss(value: string, fallback: string): string {
  const v = value.trim() || fallback
  return /^\d+(\.\d+)?$/.test(v) ? `${Number(v) * 0.25}rem` : v
}

// The library `Repeater`'s item surfaces (Radix theme vars — the canvas sits
// inside the library ThemeProvider, so they follow the project's appearance).
const REPEATER_SURFACE_CLASS: Record<RepeaterConfig['itemSurface'], string> = {
  none: '',
  outlined: 'rounded-lg border border-[var(--gray-a6)] bg-[var(--color-panel-solid)]',
  elevation: 'rounded-lg bg-[var(--color-panel-solid)] shadow-md',
}

/**
 * A repeater on the canvas: the item template (the child canvas, read-only)
 * once at full opacity, then faded ghost copies — enough for two rows at the
 * previewed breakpoint's item span, capped at 6 — inside the real 12-column
 * grid with the gap and item surface applied, so span / gap / surface edits
 * show immediately. Bound cells show their `{field}` tokens; the real
 * `Repeater` needs an ApiMaster to fetch items, so — like a form list's rows —
 * real data is exercised in the Live Preview.
 */
function RepeaterLivePreview({ config, canvas }: { config: RepeaterConfig; canvas: ChildCanvas }) {
  const bp = useGridStore((s) => s.previewBreakpoint)
  const span = Math.min(12, Math.max(1, config.itemSpan[bp] ?? 12))
  const perRow = Math.max(1, Math.floor(12 / span))
  const copies = Math.min(6, Math.max(2, perRow * 2))
  const padding = scaleToCss(config.itemPadding, config.itemSurface === 'none' ? '0' : '4')
  return (
    <div data-grid-item-content className="pointer-events-none w-full px-3 py-2">
      <div className="flex w-full flex-col gap-3">
        {config.title && (
          <h3 className="text-sm font-semibold text-[var(--gray-12)]">{config.title}</h3>
        )}
        <div
          className="w-full"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
            gap: scaleToCss(config.gap, '4'),
          }}
        >
          {Array.from({ length: copies }, (_, i) => (
            <div
              key={i}
              className={cn('min-w-0', i > 0 && 'opacity-40')}
              style={{ gridColumn: `span ${span}` }}
              aria-hidden={i > 0 || undefined}
            >
              <div className={cn('h-full', REPEATER_SURFACE_CLASS[config.itemSurface])} style={{ padding }}>
                <ChildCanvasPreview canvas={canvas} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * The live, real `HtmlCell` from the library (the `html` element's renderer)
 * over a mock value where every placeholder shows its `{path}` token, so a
 * bound block previews its shape; the sanitiser runs for real. Inert.
 */
function HtmlContentLivePreview({ config }: { config: HtmlContentConfig }) {
  const value = useMemo(() => buildHtmlPreviewValue(config.html), [config.html])
  return (
    <div data-grid-item-content className="pointer-events-none h-full w-full px-3 py-2">
      <div className="gummy-html-content">
        <HtmlCell template={config.html} row={value} value={value.value} className={config.prose ? 'gummy-html-prose' : ''} />
      </div>
    </div>
  )
}

/** One card button on the canvas: the library's visual layer, like `ButtonLivePreview`. */
function CardActionPreview({ action }: { action: CardActionConfig }) {
  return (
    <ButtonBase
      label={action.label}
      icon={(action.icon || undefined) as keyof typeof IconData | undefined}
      variant={action.variant}
    />
  )
}

/**
 * The live, real `CardView` from the library — the same component the engine
 * renders — with the slots filled from the config: a bound title / subheader /
 * image shows its `{field}` token (`bindingToken`) in place of the static
 * text, the avatar and buttons are the library visuals, `content` is child
 * canvas 0 and the expandable section child canvas 1, drawn open when
 * `defaultExpanded` (the toggle is inert on the canvas — exercise it in the
 * Live Preview). Inert like every preview.
 */
function CardLivePreview({ config, canvases }: { config: CardConfig; canvases: ChildCanvas[] }) {
  const h = config.header
  const title = h.titleBinding ? bindingToken(h.titleBinding) : h.title
  const subheader = h.subheaderBinding ? bindingToken(h.subheaderBinding) : h.subheader
  const avatar = h.avatarEnabled ? (
    <Avatar
      src={h.avatar.srcBinding ? undefined : h.avatar.src || undefined}
      alt={h.avatar.alt || undefined}
      size={h.avatar.size}
      fallback={h.avatar.srcBinding || h.avatar.fallbackBinding ? '{ }' : h.avatar.fallback || undefined}
    />
  ) : undefined
  const media = config.media.enabled
    ? {
        src: config.media.srcBinding ? undefined : config.media.src || undefined,
        alt: config.media.srcBinding ? bindingToken(config.media.srcBinding) : config.media.alt || undefined,
        height: config.media.height,
      }
    : undefined
  return (
    <div data-grid-item-content className="pointer-events-none flex h-full w-full items-start px-3 py-2">
      <div className="w-full">
        <CardView
          key={String(config.defaultExpanded)}
          title={title}
          subheader={subheader}
          avatar={avatar}
          headerAction={h.actionEnabled ? <CardActionPreview action={h.action} /> : undefined}
          media={media}
          content={canvases[0] ? <ChildCanvasPreview canvas={canvases[0]} /> : undefined}
          actions={config.actions.map((a) => <CardActionPreview key={a.id} action={a} />)}
          actionsAlign={config.actionsAlign}
          collapse={config.collapseEnabled && canvases[1] ? <ChildCanvasPreview canvas={canvases[1]} /> : undefined}
          collapseLabel={config.collapseLabel || undefined}
          defaultExpanded={config.defaultExpanded}
          variant={config.variant}
          elevation={config.elevation}
          square={config.square}
        />
      </div>
    </div>
  )
}

/**
 * The live, real `<Paper>` from the library wrapping the child canvas.
 * `elevation`/`variant`/`square` map straight through, so the shadow depth is
 * previewed for real.
 */
function PaperLivePreview({ config, canvas }: { config: PaperConfig; canvas: ChildCanvas }) {
  return (
    <div
      data-grid-item-content
      className="pointer-events-none flex h-full w-full items-center px-3 py-2"
    >
      <Paper
        elevation={config.elevation}
        variant={config.variant}
        square={config.square}
        className="w-full p-3"
      >
        <ChildCanvasPreview canvas={canvas} />
      </Paper>
    </div>
  )
}

/**
 * The live, real `<Tab>` from the library. Headers come from the authored tab
 * list; each panel is that tab's child canvas, read-only. Inert like the other
 * previews, so the initially active tab (`defaultValue`, else the first) is the
 * one shown — switch tabs by editing `defaultValue`, or drill into any tab from
 * the inspector. Keyed by the header list + defaultValue so header edits remount
 * the Tab (it derives its active state from `defaultValue` on mount).
 */
function TabLivePreview({
  config,
  canvases,
}: {
  config: TabConfig
  canvases: ChildCanvas[]
}) {
  const items = config.tabs.map((tab, i) => ({
    value: tab.value,
    label: tab.label || tab.value,
    content: canvases[i] ? <ChildCanvasPreview canvas={canvases[i]} /> : null,
  }))
  if (items.length === 0) {
    return (
      <div
        data-grid-item-content
        className="pointer-events-none flex h-full w-full items-center justify-center text-ui-sm text-ink-3"
      >
        No tabs — add one in the inspector
      </div>
    )
  }
  const key = `${config.tabs.map((t) => `${t.value}:${t.label}`).join('|')}@${config.defaultValue}`
  return (
    <div
      data-grid-item-content
      className="pointer-events-none flex h-full w-full items-center px-3 py-2"
    >
      <Tab
        key={key}
        items={items}
        defaultValue={config.defaultValue || undefined}
        className="w-full"
      />
    </div>
  )
}

/**
 * The live render of a `modal` cell: just its trigger button (see the grilled
 * design — an overlay isn't part of the page flow, so the canvas shows what the
 * page shows; the content is authored via drill-in and exercised in the Live
 * Preview modal, where the real engine can actually open it).
 */
function ModalLivePreview({ config }: { config: ModalConfig }) {
  return (
    <div
      data-grid-item-content
      className="pointer-events-none flex h-full w-full items-center justify-center px-3"
    >
      <ButtonBase
        label={config.trigger.label}
        icon={(config.trigger.icon || undefined) as keyof typeof IconData | undefined}
        variant={config.trigger.variant}
      />
    </div>
  )
}

/** The live render of a `drawer` cell: its trigger button, like the modal's. */
function DrawerLivePreview({ config }: { config: DrawerConfig }) {
  return (
    <div
      data-grid-item-content
      className="pointer-events-none flex h-full w-full items-center justify-center px-3"
    >
      <ButtonBase
        label={config.trigger.label}
        icon={(config.trigger.icon || undefined) as keyof typeof IconData | undefined}
        variant={config.trigger.variant}
      />
    </div>
  )
}

/**
 * The live render of a `popover` cell: its trigger (button or text — the studio
 * subset of the engine's mini-Bin trigger). Content is authored via drill-in
 * and exercised in the Live Preview modal, same rationale as the modal.
 */
function PopoverLivePreview({ config }: { config: PopoverConfig }) {
  return (
    <div
      data-grid-item-content
      className="pointer-events-none flex h-full w-full items-center justify-center px-3"
    >
      {config.triggerKind === 'button' ? (
        <ButtonBase
          label={config.triggerButton.label}
          icon={
            (config.triggerButton.icon || undefined) as keyof typeof IconData | undefined
          }
          variant={config.triggerButton.variant}
        />
      ) : (
        <Text text={config.triggerText.text} isLabel={config.triggerText.isLabel} />
      )}
    </div>
  )
}

/**
 * The cell's live render, or null when the cell can't (or isn't wide enough to)
 * show one — the generic seam for adding more component types later. `textfield`,
 * `textarea`, `select`, `autocomplete`, `multiAutocomplete`, `checkbox`, `radio`, and
 * the three date pickers (`datepicker`/`daterangepicker`/`datetimepicker`, with config)
 * go live; everything else falls through to its chip. `select`/`autocomplete` share
 * `SelectLivePreview` (both preview with the library's `Autocomplete2`);
 * `multiAutocomplete` previews with `MultiAutocompleteBase`; `checkbox` with `CheckboxBase`;
 * `radio` with `RadioButtonBase`; the date pickers with `Date*PickerBase`; `datatable`
 * with the real `DataTable2` and `datatableeditable` with the real `DataTableEditable`,
 * both fed by config-generated mock rows. The display types (`text`/`typography`/
 * `avatar`/`divider`/`button`) preview with `Text`/`Typography`/`Avatar`/`Divider`/
 * `ButtonBase` and are always live (`ALWAYS_LIVE` — no width gate); `hidden` never
 * goes live.
 */
function renderLive(item: GridItemData, isLive: boolean) {
  if (!isLive) return null
  if (item.type === 'textfield' && item.config) {
    return <LivePreview config={item.config as TextFieldConfig} />
  }
  if (item.type === 'textarea' && item.config) {
    return <TextareaLivePreview config={item.config as TextareaConfig} />
  }
  if (item.type === 'select' && item.config) {
    return <SelectLivePreview config={item.config as SelectFieldConfig} />
  }
  if (item.type === 'autocomplete' && item.config) {
    return <SelectLivePreview config={item.config as SelectFieldConfig} />
  }
  if (item.type === 'multiAutocomplete' && item.config) {
    return <MultiAutocompleteLivePreview config={item.config as MultiAutocompleteConfig} />
  }
  if (item.type === 'checkbox' && item.config) {
    return <CheckboxLivePreview config={item.config as CheckboxConfig} />
  }
  if (item.type === 'switch' && item.config) {
    return <SwitchLivePreview config={item.config as SwitchConfig} />
  }
  if (item.type === 'radio' && item.config) {
    return <RadioLivePreview config={item.config as RadioConfig} />
  }
  if (
    (item.type === 'datepicker' ||
      item.type === 'daterangepicker' ||
      item.type === 'datetimepicker') &&
    item.config
  ) {
    return <DateLivePreview config={item.config as DateConfig} />
  }
  if (item.type === 'uploadimage' && item.config) {
    return <UploadImageLivePreview config={item.config as UploadImageConfig} />
  }
  if (item.type === 'uploadfile' && item.config) {
    return <UploadFileLivePreview config={item.config as UploadFileConfig} />
  }
  if (item.type === 'datatable' && item.config) {
    const config = item.config as DataTableConfig
    // Keyed on the row-affecting column fields: DataTable2's react-query cache
    // ignores the api function, so a remount is what refetches the mock rows.
    return <DataTableLivePreview key={dataTableRowsKey(config)} config={config} filterCanvas={item.childCanvases?.[1]} />
  }
  if (item.type === 'datatableeditable' && item.config) {
    const config = item.config as DataTableEditableConfig
    return <EditableTableLivePreview key={editableTableRowsKey(config)} config={config} />
  }
  if (item.type === 'text' && item.config) {
    return <TextLivePreview config={item.config as TextConfig} />
  }
  if (item.type === 'typography' && item.config) {
    return <TypographyLivePreview config={item.config as TypographyConfig} />
  }
  if (item.type === 'avatar' && item.config) {
    return <AvatarLivePreview config={item.config as AvatarConfig} />
  }
  if (item.type === 'divider' && item.config) {
    return <DividerLivePreview config={item.config as DividerConfig} />
  }
  if (item.type === 'button' && item.config) {
    return <ButtonLivePreview config={item.config as ButtonConfig} />
  }
  if (item.type === 'formlist' && item.config && item.childCanvases?.[0]) {
    return (
      <FormListLivePreview
        config={item.config as FormListConfig}
        canvas={item.childCanvases[0]}
      />
    )
  }
  if (item.type === 'repeater' && item.config && item.childCanvases?.[0]) {
    return (
      <RepeaterLivePreview
        config={item.config as RepeaterConfig}
        canvas={item.childCanvases[0]}
      />
    )
  }
  if (item.type === 'container' && item.childCanvases?.[0]) {
    return <ContainerLivePreview canvas={item.childCanvases[0]} />
  }
  if (item.type === 'card' && item.config && item.childCanvases?.[0]) {
    return <CardLivePreview config={item.config as CardConfig} canvases={item.childCanvases} />
  }
  if (item.type === 'html' && item.config) {
    return <HtmlContentLivePreview config={item.config as HtmlContentConfig} />
  }
  if (item.type === 'paper' && item.config && item.childCanvases?.[0]) {
    return (
      <PaperLivePreview
        config={item.config as PaperConfig}
        canvas={item.childCanvases[0]}
      />
    )
  }
  if (item.type === 'tab' && item.config) {
    return (
      <TabLivePreview
        config={item.config as TabConfig}
        canvases={item.childCanvases ?? []}
      />
    )
  }
  if (item.type === 'modal' && item.config) {
    return <ModalLivePreview config={item.config as ModalConfig} />
  }
  if (item.type === 'drawer' && item.config) {
    return <DrawerLivePreview config={item.config as DrawerConfig} />
  }
  if (item.type === 'popover' && item.config) {
    return <PopoverLivePreview config={item.config as PopoverConfig} />
  }
  // Design-only kinds render their design (see `DesignPreviews.tsx` — the seam
  // a real component slots into once the library gains one).
  if (isDesignOnly(item.type)) {
    return <div className="pointer-events-none w-full">{renderDesignPreview(item)}</div>
  }
  // `hidden` intentionally has no live render — it renders nothing at runtime,
  // so its chip is the honest representation at any width.
  return null
}

export function GridItem({ item, isSelected }: GridItemProps) {
  const selectItem = useGridStore((s) => s.selectItem)
  const enterCanvas = useGridStore((s) => s.enterCanvas)
  const itemClassName = `gi-${escapeClassName(item.id)}`

  // Which child canvas the cell's "Edit contents" opens: a tab drills into its
  // initially-active tab (defaultValue, else the first); everything else has
  // exactly one canvas. -1 = not a container-hosting cell.
  const drillIndex = (() => {
    if (!item.childCanvases || item.childCanvases.length === 0) return -1
    if (item.type === 'tab' && item.config) {
      const config = item.config as TabConfig
      const i = config.tabs.findIndex((t) => t.value === config.defaultValue)
      return i === -1 ? 0 : i
    }
    return 0
  })()

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: item.id })

  // Measure the cell to decide chip ↔ live. The element is held in state so the
  // ResizeObserver re-attaches on mount; the callback ref feeds both dnd-kit's
  // sortable node and our measurement.
  const [cellEl, setCellEl] = useState<HTMLDivElement | null>(null)
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node)
      setCellEl(node)
    },
    [setNodeRef],
  )
  // Suppress the live preview until the entrance lands: a freshly appeared cell
  // shows only its cheap chip during the pop, so no library component mounts
  // mid-pop to reflow. When `isEntering` clears (timer in the store), the cell
  // upgrades to live — making the drop animation identical across every type.
  const isEntering = useIsEntering(item.id)
  const isLive = useIsLiveWidth(cellEl, thresholdsForType(item.type)) && !isEntering
  const live = renderLive(item, isLive)

  // Fade the cell's content: the chip fades in over the enter "pop", and the
  // live preview fades in the instant the cell finishes entering. Later
  // width-driven chip↔live flips (resize) stay instant — only the entrance and
  // its hand-off fade. WAAPI runs on the content wrapper (not the inner
  // `[data-grid-item-content]`) so it never collides with the config-edit fade.
  const contentRef = useRef<HTMLDivElement>(null)
  const wasEntering = useRef(isEntering)
  useLayoutEffect(() => {
    const el = contentRef.current
    const was = wasEntering.current
    wasEntering.current = isEntering
    if (!el || prefersReducedMotion()) return
    if (isEntering) {
      el.getAnimations().forEach((a) => a.cancel())
      el.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: ENTER_DURATION_MS,
        easing: 'ease-out',
        fill: 'both',
      })
    } else if (was) {
      // entering → landed: fade the just-mounted live preview (or chip) in.
      el.getAnimations().forEach((a) => a.cancel())
      el.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: UPGRADE_FADE_MS,
        easing: 'ease-out',
        fill: 'both',
      })
    }
  }, [isEntering])

  // Style-tab colours (design-only) ride along as CSS variables on the cell so
  // the chrome tokens and design renders inside re-tint; the values are
  // author-chosen hex colours, so inline is the only place they can live.
  const styleVars = hasElementStyle(item.style) ? elementStyleVars(item.style) : undefined
  const style = {
    ...styleVars,
    transform: CSS.Translate.toString(transform),
    transition,
  } as React.CSSProperties

  return (
    <div
      ref={setRefs}
      style={style}
      data-styled={styleVars ? '' : undefined}
      data-grid-item={item.id}
      onClick={(e) => {
        // Select this cell; stop the canvas click that would clear selection.
        e.stopPropagation()
        selectItem(item.id)
      }}
      className={cn(
        itemClassName,
        // Let the CSS grid (and `grid-row: span N`) control height. Keep a
        // sensible single-row minimum to match the default `grid-auto-rows`.
        'grid-item-cell group relative flex min-h-14 touch-none items-center justify-center rounded-md border p-2',
        'transition-[border-color,background-color,box-shadow,opacity] duration-200 ease-out',
        isDragging
          ? 'z-0 border-dashed border-line-strong bg-panel opacity-40'
          : isOver
            ? 'border-dashed border-focus bg-panel-2 ring-1 ring-focus/40'
            : isSelected
              ? 'border-focus bg-surface ring-1 ring-focus'
              : 'border-dashed border-line bg-surface hover:border-grid-edge hover:bg-panel',
      )}
    >
      <IconButton
        ref={setActivatorNodeRef}
        label={`Move ${item.label}`}
        className={cn(
          // Drag/drop indicator: hidden at rest, revealed on hover or while active.
          'absolute right-1 top-1 z-10 h-6! w-6! cursor-grab rounded-md shadow-sm transition-opacity group-hover:opacity-100 active:cursor-grabbing',
          isSelected ? 'opacity-100' : 'opacity-0',
        )}
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
      </IconButton>
      {drillIndex !== -1 && (
        <IconButton
          label={`Edit contents of ${item.label}`}
          className={cn(
            // Drill-in affordance, next to the grip; same reveal rules.
            'absolute right-8 top-1 z-10 h-6! w-6! rounded-md shadow-sm transition-opacity group-hover:opacity-100',
            isSelected ? 'opacity-100' : 'opacity-0',
          )}
          onClick={(e) => {
            e.stopPropagation()
            enterCanvas(item.id, drillIndex)
          }}
        >
          <Expand className="h-3.5 w-3.5" aria-hidden="true" />
        </IconButton>
      )}
      <TypeLabel type={item.type} isSelected={isSelected} />
      {/*
        Wide enough (and landed) → the live component (regardless of selection;
        the border + grip just overlay it). Otherwise a selected cell collapses
        to its glyph and an idle/entering cell shows its chip. The wrapper is the
        fade target for the entrance and chip→live hand-off.
      */}
      <div ref={contentRef} className="h-full w-full">
        {live ?? (isSelected ? <ActiveBody item={item} /> : <CellContent item={item} />)}
      </div>
    </div>
  )
}

/**
 * Memoized GridItem (fix #2). Props are referentially stable for unchanged
 * items (store mutations preserve item references), so editing one item no
 * longer re-renders the rest. Note: during a drag, `useSortable` still re-runs
 * via dnd-kit context — that's inherent and unaffected by this memo.
 */
export const GridItemMemo = memo(GridItem)

export function GridItemOverlay({ item }: { item: GridItemData }) {
  return (
    <div className="relative flex h-14 w-full cursor-grabbing items-center justify-center rounded-lg border-2 border-solid border-focus bg-surface p-2 shadow-2xl shadow-black/10 ring-2 ring-focus/50">
      <span className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-md border border-focus bg-panel-2 text-ink shadow-sm">
        <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <span className="text-ui-sm font-medium text-ink-3">{item.label}</span>
    </div>
  )
}
