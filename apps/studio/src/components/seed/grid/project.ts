import {
  createDefaultExportOptions,
  createDefaultGrouping,
  createDefaultSelection,
  defaultColumnFormat,
  type ColumnFormatConfig,
  type StyleRuleConfig,
} from '../../Layout/types'
import { createDefaultBackdrop, type StudioThemeConfig } from '../../Theme/types'
import { defaultShell } from '../../Workspace/snapshots'
import { projectKey } from '../../Workspace/runtimeProject'
import type { MenuItemDef, PageDef, ProjectDef, ShellSettings } from '../../Workspace/types'
import type { EnvVarDef } from '../../Env/types'
import { E } from '../bookshop/library'
import { page } from '../bookshop/pages'
import { AVATAR_CELL, button, column, COVER_CELL, heading, html, navigate, state, table, typo } from '../bookshop/ui'

/**
 * Data grid showcase — the demo's fourth project (see the grilled design
 * `datatable-ag-grid-features`): the AG Grid-style features of the
 * config-driven `datatable`, one page each, over the Book shop API (120
 * books, 60 customers, 300 orders, every list read whole and paged in the
 * browser). Formats & styles, Columns, Selection, Grouping, Export, Scroll.
 * No sign-in; needs `demo-api` on 9100: `VITE_GUMMY_PROJECT=data-grid-showcase`.
 */

export const GRID_PROJECT_ID = 'dg-project-data-grid'
const CREATED_AT = Date.UTC(2026, 9, 27)

const P = {
  formats: 'dg-page-formats',
  columns: 'dg-page-columns',
  selection: 'dg-page-selection',
  grouping: 'dg-page-grouping',
  export: 'dg-page-export',
  scroll: 'dg-page-scroll',
} as const

const fmt = (patch: Partial<ColumnFormatConfig>): ColumnFormatConfig => ({ ...defaultColumnFormat(), ...patch })
const THB = fmt({ type: 'currency', currency: 'THB' })
const COUNT = fmt({ type: 'number' })
const DATE = fmt({ type: 'date' })
const DATETIME = fmt({ type: 'datetime', timeZone: 'Asia/Bangkok' })

let ruleSeq = 0
const rule = (patch: Partial<StyleRuleConfig>): StyleRuleConfig => ({
  id: `dg-rule-${++ruleSeq}`,
  field: 'value',
  path: '',
  op: 'eq',
  value: '',
  tone: '',
  fill: false,
  bold: false,
  italic: false,
  strike: false,
  ...patch,
})

/** The order statuses as tones, shared by the Selection / Grouping / Scroll pages. */
const statusRules = (): StyleRuleConfig[] => [
  rule({ field: 'row', path: 'status', op: 'eq', value: 'refund_requested', tone: 'amber', fill: true, bold: true }),
  rule({ field: 'row', path: 'status', op: 'eq', value: 'delivered', tone: 'grass' }),
  rule({ field: 'row', path: 'status', op: 'eq', value: 'cancelled', tone: 'gray', strike: true }),
  rule({ field: 'row', path: 'status', op: 'eq', value: 'refunded', tone: 'gray', italic: true }),
]

/** Every order column, by id prefix (the pages pick and arrange them). */
const orderColumns = (p: string) => ({
  number: column(`${p}-number`, 'number', 'Order', { enableSorting: true, size: 120, lockVisible: true }),
  placed: column(`${p}-placed`, 'placedAt', 'Placed', { enableSorting: true, format: DATETIME, size: 190 }),
  customer: column(`${p}-customer`, 'customerName', 'Customer', { enableSorting: true, size: 200 }),
  city: column(`${p}-city`, 'customerCity', 'City', { enableSorting: true, size: 140 }),
  status: column(`${p}-status`, 'statusLabel', 'Status', { enableSorting: true, size: 160, cellStyles: statusRules() }),
  items: column(`${p}-items`, 'itemCount', 'Items', { enableSorting: true, format: COUNT, size: 90 }),
  total: column(`${p}-total`, 'total', 'Total', { enableSorting: true, format: THB, size: 150 }),
  payment: column(`${p}-payment`, 'paymentMethod', 'Payment', { enableSorting: true, size: 140 }),
  handled: column(`${p}-handled`, 'handledBy', 'Handled by', { enableSorting: true, size: 160 }),
})

/* ------------------------------------------------------- formats & styles */

function formatsPage(): PageDef {
  return page(P.formats, 'formats', 'Formats & styles', '/', [
    ...heading(
      'dg-item-formats-h',
      'Formats & styles',
      'Every one of the 120 books, read whole from the API and paged in the browser. Price, stock, rating and dates are raw numbers and dates formatted by the table; the tones come from style rules — out of stock is a red fill, five or fewer amber, a rating of 4.5 or more green, and featured titles bold.',
    ),
    table('dg-item-formats-books', {
      name: 'books',
      title: 'Books',
      endpointId: E.listBooks,
      apiPaths: 'data',
      canSearchAllColumns: true,
      cellLines: 1,
      rowStyles: [rule({ field: 'row', path: 'featured', op: 'eq', value: 'true', bold: true })],
      columns: [
        column('dg-col-fmt-cover', 'cover', '', { html: COVER_CELL, size: 64, resizable: false }),
        column('dg-col-fmt-title', 'title', 'Title', { enableSorting: true, size: 260 }),
        column('dg-col-fmt-author', 'authorName', 'Author', { enableSorting: true, size: 190 }),
        column('dg-col-fmt-genre', 'genreName', 'Genre', { enableSorting: true, size: 150 }),
        column('dg-col-fmt-price', 'price', 'Price', { enableSorting: true, format: THB, size: 140 }),
        column('dg-col-fmt-stock', 'stock', 'Stock', {
          enableSorting: true,
          format: COUNT,
          size: 100,
          cellStyles: [
            rule({ op: 'eq', value: '0', tone: 'red', fill: true, bold: true }),
            rule({ op: 'lte', value: '5', tone: 'amber', fill: true }),
          ],
        }),
        column('dg-col-fmt-rating', 'rating', 'Rating', {
          enableSorting: true,
          format: fmt({ type: 'number', decimals: 1 }),
          size: 100,
          cellStyles: [rule({ op: 'gte', value: '4.5', tone: 'grass', bold: true })],
        }),
        column('dg-col-fmt-published', 'publishedAt', 'Published', { enableSorting: true, format: DATE, size: 140 }),
        column('dg-col-fmt-featured', 'featured', 'Featured', { enableSorting: true, format: fmt({ type: 'boolean', trueLabel: '★ Featured', falseLabel: '—' }), size: 130 }),
      ],
    }),
  ])
}

/* ---------------------------------------------------------------- columns */

function columnsPage(): PageDef {
  return page(P.columns, 'columns', 'Columns', '/columns', [
    ...heading(
      'dg-item-columns-h',
      'Columns',
      'Open Columns to show or hide a column (Email and Phone start hidden, the name is locked), drag a grip to reorder, or Reset. Drag a header edge to resize, pin with the header pin. The layout — order, visibility, widths, pins — is remembered in this browser.',
    ),
    table('dg-item-columns-customers', {
      name: 'customers',
      title: 'Customers',
      endpointId: E.listCustomers,
      apiPaths: 'data',
      canSearchAllColumns: true,
      cellLines: 1,
      columns: [
        column('dg-col-cols-avatar', 'avatar', '', { html: AVATAR_CELL, size: 56, resizable: false, pin: 'left' }),
        column('dg-col-cols-name', 'name', 'Name', { enableSorting: true, size: 220, lockVisible: true, pin: 'left' }),
        column('dg-col-cols-email', 'email', 'Email', { enableSorting: true, size: 260, hide: true }),
        column('dg-col-cols-phone', 'phone', 'Phone', { size: 150, hide: true }),
        column('dg-col-cols-city', 'city', 'City', { enableSorting: true, size: 150 }),
        column('dg-col-cols-joined', 'joinedAt', 'Joined', { enableSorting: true, format: DATE, size: 140 }),
        column('dg-col-cols-orders', 'orderCount', 'Orders', { enableSorting: true, format: COUNT, size: 100 }),
        column('dg-col-cols-spent', 'totalSpent', 'Spent', { enableSorting: true, format: THB, size: 160 }),
      ],
    }),
  ])
}

/* -------------------------------------------------------------- selection */

function selectionPage(): PageDef {
  const c = orderColumns('dg-col-sel')
  return page(P.selection, 'selection', 'Selection', '/selection', [
    ...heading(
      'dg-item-selection-h',
      'Selection',
      'Tick orders — the header box ticks every order that matches the search. The picks are page data (ordersSelected = { ids, rows, count }): the line below reads its count, and Clear selection reloads the table, which starts the picks afresh.',
    ),
    html(
      'dg-item-selection-summary',
      'selectionSummary',
      '<p style="margin:0">Orders picked: <strong>{{count}}</strong> <span class="dt-muted">· page data <code>ordersSelected</code></span></p>',
      state('ordersSelected'),
      { xs: 4, sm: 4, md: 6, lg: 10 },
      false,
    ),
    button('dg-item-selection-clear', { label: 'Clear selection', icon: 'refresh', variant: 'outlined', actions: ['ReloadDataTable'], reloadTableItemId: 'dg-item-selection-orders' }, { xs: 4, sm: 2, md: 2, lg: 2 }),
    table('dg-item-selection-orders', {
      name: 'orders',
      title: 'Orders',
      endpointId: E.listOrders,
      apiPaths: 'data',
      canSearchAllColumns: true,
      cellLines: 1,
      selection: { ...createDefaultSelection(), enabled: true, headerCheckbox: 'all' },
      columns: [c.number, c.placed, c.customer, c.status, c.items, c.total],
    }),
  ])
}

/* --------------------------------------------------------------- grouping */

function groupingPage(): PageDef {
  const c = orderColumns('dg-col-grp')
  return page(P.grouping, 'grouping', 'Grouping', '/grouping', [
    ...heading(
      'dg-item-grouping-h',
      'Grouping',
      'The 300 orders grouped by status, then city. Group rows count the orders and sum their items and totals; the total row at the bottom sums them all. Regroup from Columns → Group by.',
    ),
    table('dg-item-grouping-orders', {
      name: 'ordersByStatus',
      title: 'Orders by status',
      endpointId: E.listOrders,
      apiPaths: 'data',
      canSearchAllColumns: true,
      cellLines: 1,
      grouping: { ...createDefaultGrouping(), enabled: true, by: ['statusLabel', 'customerCity'], expanded: '0', totalRow: 'bottom' },
      columns: [
        { ...c.status, cellStyles: [], size: 250 },
        { ...c.number, aggregate: 'count' },
        c.city,
        c.customer,
        { ...c.items, aggregate: 'sum' },
        { ...c.total, aggregate: 'sum' },
        c.handled,
      ],
    }),
  ])
}

/* ----------------------------------------------------------------- export */

function exportPage(): PageDef {
  const c = orderColumns('dg-col-exp')
  return page(P.export, 'export', 'Export', '/export', [
    ...heading(
      'dg-item-export-h',
      'Export',
      'Export writes the table as you see it — rows after search and sort, the visible columns in their order, values as shown — to a CSV with a UTF-8 BOM, so Excel opens it right. The button beside this text does the same from outside the table (the ExportTable action).',
    ),
    typo('dg-item-export-note', 'Search the table, hide a column or sort, then export.', 'body1', { weight: 'medium' }, { xs: 4, sm: 4, md: 6, lg: 10 }),
    button('dg-item-export-button', { label: 'Download CSV', icon: 'download', variant: 'contained', actions: ['ExportTable'], exportTableItemId: 'dg-item-export-orders' }, { xs: 4, sm: 2, md: 2, lg: 2 }),
    table('dg-item-export-orders', {
      name: 'ordersExport',
      title: 'Orders',
      endpointId: E.listOrders,
      apiPaths: 'data',
      canSearchAllColumns: true,
      cellLines: 1,
      canExport: true,
      exportOptions: { ...createDefaultExportOptions(), fileName: 'orders-{{date}}' },
      columns: [c.number, c.placed, c.customer, c.city, c.status, c.items, c.total, c.payment],
    }),
  ])
}

/* ----------------------------------------------------------------- scroll */

function scrollPage(): PageDef {
  const c = orderColumns('dg-col-scr')
  return page(P.scroll, 'scroll', 'Scroll', '/scroll', [
    ...heading(
      'dg-item-scroll-h',
      'Scroll',
      'All 300 orders in one scroller, no pager. Past 60 rows only the rows in view are drawn, so scrolling stays smooth; the header stays put and the order number stays pinned.',
    ),
    table('dg-item-scroll-orders', {
      name: 'ordersScroll',
      title: 'All orders',
      endpointId: E.listOrders,
      apiPaths: 'data',
      canSearchAllColumns: true,
      cellLines: 1,
      paging: 'scroll',
      selection: { ...createDefaultSelection(), enabled: true, headerCheckbox: 'all', stateKey: 'scrollSelected' },
      columns: [{ ...c.number, pin: 'left' }, c.placed, c.customer, c.city, c.status, c.items, c.total, c.payment, c.handled],
    }),
  ])
}

export function gridPages(): PageDef[] {
  // Rule ids count from 1 on every build, so the generator stays deterministic.
  ruleSeq = 0
  return [formatsPage(), columnsPage(), selectionPage(), groupingPage(), exportPage(), scrollPage()]
}

/* ------------------------------------------------------------------ shell */

function gridMenu(): MenuItemDef[] {
  const link = (id: string, label: string, icon: string, pageId: string): MenuItemDef => ({ id, kind: 'page', label, icon, navigate: navigate(pageId) })
  return [
    link('dg-menu-formats', 'Formats & styles', 'hash', P.formats),
    link('dg-menu-columns', 'Columns', 'columns', P.columns),
    link('dg-menu-selection', 'Selection', 'checkSquare', P.selection),
    link('dg-menu-grouping', 'Grouping', 'layers', P.grouping),
    link('dg-menu-export', 'Export', 'download', P.export),
    link('dg-menu-scroll', 'Scroll', 'list', P.scroll),
  ]
}

function gridShell(): ShellSettings {
  const base = defaultShell('Data grid')
  return {
    ...base,
    breadcrumbs: false,
    appBar: { ...base.appBar, title: 'Data grid', icon: 'table', variant: 'accent' },
    pageTransition: { type: 'fade', duration: '', easing: 'ease-out' },
    locale: 'en-US',
  }
}

function gridTheme(): StudioThemeConfig {
  return {
    appearance: 'light',
    accentColor: 'teal',
    radius: 'medium',
    panelBackground: 'solid',
    surface: 'flat',
    background: createDefaultBackdrop(),
    buttonColor: '',
    dataTable: {
      headerColor: '',
      headerTextColor: '',
      headerFontSize: 'sm',
      headerFontWeight: 'semibold',
      headerHoverColor: '',
      paginationButtonColor: '',
      paginationButtonHoverColor: '',
      rowHoverColor: '',
      editButtonColor: '',
      deleteButtonColor: '',
    },
  }
}

const gridEnv = (): EnvVarDef[] => [{ id: 'dg-env-api-url', name: 'API_URL', value: 'http://localhost:9100', locked: true }]

/** The library endpoints the pages use (shared with the Book shop). */
const GRID_ENDPOINTS = [E.listBooks, E.listCustomers, E.listOrders]

export function gridProject(): ProjectDef {
  return {
    id: GRID_PROJECT_ID,
    name: 'Data grid showcase',
    description: 'The data table’s AG Grid-style features over the Book shop API: formats and style rules, a Columns menu, selection, grouping with totals, CSV export, and a virtualised scroll.',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    snapshot: {
      pages: gridPages(),
      menu: gridMenu(),
      shell: gridShell(),
      env: gridEnv(),
      theme: gridTheme(),
      endpointIds: [...GRID_ENDPOINTS],
      globalLoads: [],
      customActions: [],
      customComponents: [],
      authId: null,
    },
  }
}

export const GRID_KEY = projectKey('Data grid showcase')

