import { AUTH_PROFILE_LOAD_ID } from '../../Workspace/auth'
import {
  createChildCanvas,
  createDefaultButtonItemConfig,
  createDefaultDataTableConfig,
  createDefaultHtmlContentConfig,
  createDefaultItemSettings,
  createDefaultTypographyConfig,
  DEFAULT_COLUMN_SIZING,
  defaultColumnFormat,
  type ButtonItemConfig,
  type ChildCanvas,
  type DataCondition,
  type DataTableColumnConfig,
  type DataTableConfig,
  type GridItemData,
  type GridItemSettings,
  type ItemBinding,
  type NavParamSource,
  type Responsive,
  type StudioNavigate,
  type TypographyConfig,
} from '../../Layout/types'

/**
 * Small builders for the Book shop pages (see `pages.ts`): every item is the
 * same `GridItemData` the studio's palette would create, only with fixed ids
 * and the config filled in, so the studio opens the generated workspace like
 * one an author built by hand.
 */

/* ----------------------------------------------------------------- spans */

const span = (xs: number, sm: number, md: number, lg: number): Responsive<number> => ({ xs, sm, md, lg })
/** The page grid is 4 / 6 / 8 / 12 columns wide at xs / sm / md / lg. */
export const FULL = span(4, 6, 8, 12)
export const HALF = span(4, 3, 4, 6)
export const THIRD = span(4, 6, 4, 4)
export const TWO_THIRDS = span(4, 6, 8, 8)
export const QUARTER = span(4, 3, 4, 3)
export const BUTTON = span(2, 2, 2, 2)

export function settings(colSpan: Responsive<number>, extra: Partial<GridItemSettings> = {}): GridItemSettings {
  return createDefaultItemSettings({ colSpan, ...extra })
}

const all = <T,>(v: T): Responsive<T> => ({ xs: v, sm: v, md: v, lg: v })
/** Keep a button at its own width, at the start or end of its cell. */
export const justify = (where: 'start' | 'end') => ({ justifySelf: all(where) })
/** Fill the cell (approval lines, workflow editors). */
export const stretch = { justifySelf: all('stretch') }

export function canvas(items: GridItemData[]): ChildCanvas {
  return { ...createChildCanvas(), items }
}

/* ------------------------------------------------------- bindings + data */

/** A page load's data (`path` under the load's own `paths`). */
export const state = (loadId: string, path = ''): ItemBinding => ({ key: loadId, path, source: 'state' })
/** A field of the enclosing repeater's item (`'none'` = the item itself). */
export const row = (key: string): ItemBinding => ({ key, path: '' })

export const urlParam = (key = 'id'): NavParamSource => ({ type: 'url', key, source: 'param' })
export const rowParam = (key = '_id'): NavParamSource => ({ type: 'row', key })
export const stateParam = (loadId: string, path: string): NavParamSource => ({ type: 'state', key: loadId, path })
export const literal = (value: string): NavParamSource => ({ type: 'value', value })

export function navigate(pageId: string, params: Record<string, NavParamSource> = {}): StudioNavigate {
  return { pageId, params, replace: false }
}

/** Show while the signed-in person's profile (`me`) has this `role`. */
export function whenRole(role: 'manager' | 'clerk'): DataCondition {
  return { loadId: AUTH_PROFILE_LOAD_ID, test: 'compare', path: 'role', op: 'eq', value: role }
}

/** Show while a page load's field compares to a value. */
export function whenField(loadId: string, path: string, op: DataCondition['op'], value = ''): DataCondition {
  return { loadId, test: 'compare', path, op, value }
}

/* ----------------------------------------------------------- display items */

export function typo(
  id: string,
  text: string,
  variant: TypographyConfig['variant'] = 'body2',
  extra: Partial<TypographyConfig> = {},
  colSpan = FULL,
): GridItemData {
  return {
    id,
    label: 'Typography',
    type: 'typography',
    settings: settings(colSpan),
    config: { ...createDefaultTypographyConfig(), text, variant, ...extra },
  }
}

/** A page heading and its one-line caption. */
export function heading(id: string, title: string, caption: string): GridItemData[] {
  return [
    typo(`${id}-title`, title, 'h3', { weight: 'bold' }),
    typo(`${id}-caption`, caption, 'body2', { color: 'gray' }),
  ]
}

export function html(id: string, name: string, template: string, binding: ItemBinding, colSpan = FULL, prose = true): GridItemData {
  return {
    id,
    label: 'HTML content',
    type: 'html',
    settings: settings(colSpan),
    config: { ...createDefaultHtmlContentConfig(name), html: template, binding, prose },
  }
}

export function button(id: string, config: Partial<ButtonItemConfig>, colSpan = BUTTON, extra: Partial<GridItemData> = {}): GridItemData {
  return {
    id,
    label: 'Button',
    type: 'button',
    settings: settings(colSpan, justify('start')),
    config: { ...createDefaultButtonItemConfig(), ...config },
    ...extra,
  }
}

export function navButton(id: string, label: string, icon: string, target: StudioNavigate, variant: ButtonItemConfig['variant'] = 'outlined'): GridItemData {
  return button(id, { label, icon, variant, actions: ['Navigate'], navigate: target })
}

/* ------------------------------------------------------------- data tables */

export function column(id: string, accessor: string, header: string, extra: Partial<DataTableColumnConfig> = {}): DataTableColumnConfig {
  return {
    ...DEFAULT_COLUMN_SIZING,
    id,
    accessor,
    header,
    enableSorting: false,
    enableColumnFilter: false,
    align: 'start',
    format: defaultColumnFormat(),
    pin: '',
    html: '',
    sortField: '',
    lines: '',
    rowHeader: false,
    mergeRows: false,
    mergeColumns: false,
    group: '',
    ...extra,
  }
}

/** A read-only table: no edit / delete / search unless the config turns them on. */
export function table(
  id: string,
  config: Partial<DataTableConfig> & { name: string },
  canvases: { modal?: GridItemData[]; filters?: GridItemData[] } = {},
  colSpan = FULL,
  extra: Partial<GridItemData> = {},
): GridItemData {
  return {
    id,
    label: 'Data Table',
    type: 'datatable',
    settings: settings(colSpan),
    config: {
      ...createDefaultDataTableConfig(config.name),
      canEdit: false,
      canDelete: false,
      canSearchAllColumns: false,
      columns: [],
      ...config,
    },
    // [0] the edit modal's form, [1] the filter form.
    childCanvases: [canvas(canvases.modal ?? []), canvas(canvases.filters ?? [])],
    ...extra,
  }
}

/** The `<img>` of a book cover in a table cell. */
export const COVER_CELL = '<img src="{{cover}}" alt="" style="width:36px;height:54px;object-fit:cover;border-radius:4px;display:block">'
/** A round avatar in a table cell. */
export const AVATAR_CELL = '<img src="{{avatar}}" alt="" style="width:28px;height:28px;border-radius:9999px;display:block">'
