import type { EndpointDef } from '../Api/types'
import {
  createChildCanvas,
  createDefaultButtonItemConfig,
  createDefaultDataTableConfig,
  createDefaultSortConfig,
  DEFAULT_COLUMN_SIZING,
  createDefaultFormListConfig,
  createDefaultPaginationConfig,
  type ButtonConfig,
  type CellLines,
  type DataTableColumnConfig,
  type DataTableConfig,
  type DataTablePaginationConfig,
  createDefaultItemSettings,
  createDefaultRepeaterConfig,
  createDefaultTypographyConfig,
  createDefaultAvatarConfig,
  createDefaultCardConfig,
  createDefaultCardActionConfig,
  createDefaultHtmlContentConfig,
  createDefaultDrawerConfig,
  createDefaultDividerConfig,
  createDefaultMultiAutocompleteConfig,
  createDefaultAutocompleteConfig,
  createDefaultSelectFieldConfig,
  createDefaultTextConfig,
  createDefaultSwitchConfig,
  createDefaultUploadFileConfig,
  createDefaultTextFieldConfig,
  type DrawerAnchor,
  type GridItemData,
} from '../Layout/types'
import type { ModelDef, ModelField } from '../Model/types'
import type { EnvVarDef } from '../Env/types'
import type { StudioThemeConfig } from '../Theme/types'

/**
 * The mock "country" config studio boots with — the same feature the example
 * app ships (`apps/example/src/config/country/`) and the mock API serves
 * (`apps/api`, port 9000), so every page opens populated and the Live Preview
 * fetches real rows out of the box. One module seeds all four stores so the
 * cross-store refs (endpoint → model, grid item → endpoint) share ids.
 *
 * Ids are fixed strings (not UUIDs): the stores import these constants, and
 * deterministic ids make the seeded state debuggable. Runtime-created rows
 * keep using `crypto.randomUUID()`.
 */

/* ---------------------------------------------------------------- models */

let fieldSeq = 0
/** A seeded model field (ids unique via a module-local counter). */
function field(
  name: string,
  kind: ModelField['kind'] = 'string',
  children: ModelField[] = [],
  arrayOf: ModelField['arrayOf'] = children.length ? 'object' : 'string',
): ModelField {
  return { id: `seed-field-${++fieldSeq}`, name, kind, children, arrayOf }
}

/**
 * The mock API's custom filters (`name` contains, `code` equals, `updatedBy`
 * one-of, `codes` one-of — the Filter via API demo) and server sort (`sortBy` +
 * `sortDir`) on the page request — also appended to an existing library's page
 * models by `migrateV29` / `migrateV30` (only the fields they lack).
 */
export const PAGE_FILTER_FIELD_NAMES = ['name', 'code', 'updatedBy', 'codes', 'sortBy', 'sortDir'] as const
export function pageFilterFields(): ModelField[] {
  return PAGE_FILTER_FIELD_NAMES.map((name) => field(name, name === 'updatedBy' || name === 'codes' ? 'any' : 'string'))
}

/** The country row shape shared by every response model. */
function countryRowFields(): ModelField[] {
  return [
    field('_id'),
    field('name'),
    field('code'),
    field('avatar', 'any'),
    field('image'),
    field('updated_at'),
    field('updated_by_name'),
  ]
}

export const COUNTRY_RES_MODEL_ID = 'seed-model-country-res'
export const COUNTRY_PAGED_RES_MODEL_ID = 'seed-model-country-paged-res'
export const COUNTRY_DETAIL_RES_MODEL_ID = 'seed-model-country-detail-res'
export const COUNTRY_PAGE_BODY_MODEL_ID = 'seed-model-country-page-body'
export const COUNTRY_BODY_MODEL_ID = 'seed-model-country-body'
export const COUNTRY_PARAM_MODEL_ID = 'seed-model-country-param'
export const COUNTRY_SEARCH_QUERY_MODEL_ID = 'seed-model-country-search-query'
export const COUNTRY_PAGE_QUERY_MODEL_ID = 'seed-model-country-page-query'
export const LANGUAGE_RES_MODEL_ID = 'seed-model-language-res'
export const LANGUAGE_BODY_MODEL_ID = 'seed-model-language-body'
export const LANGUAGE_COUNTRY_PARAM_MODEL_ID = 'seed-model-language-country-param'
export const LANGUAGE_PARAM_MODEL_ID = 'seed-model-language-param'
export const CONTACT_RES_MODEL_ID = 'seed-model-contact-res'
export const CONTACT_BODY_MODEL_ID = 'seed-model-contact-body'
export const NOTE_RES_MODEL_ID = 'seed-model-note-res'
export const NOTE_BODY_MODEL_ID = 'seed-model-note-body'
export const ID_PARAM_MODEL_ID = 'seed-model-id-param'
export const REGION_RES_MODEL_ID = 'seed-model-region-res'

/** The example app's country models (`config/country/model.ts`), as editor trees. */
export function countrySeedModels(): ModelDef[] {
  return [
    {
      id: COUNTRY_RES_MODEL_ID,
      name: 'countryRes',
      fields: [
        field('data', 'array', countryRowFields(), 'object'),
        field('status', 'number'),
        field('success', 'boolean'),
        field('message'),
      ],
    },
    {
      id: COUNTRY_PAGED_RES_MODEL_ID,
      name: 'countryPagedRes',
      fields: [
        field('data', 'array', countryRowFields(), 'object'),
        field('total', 'number'),
        field('status', 'number'),
        field('success', 'boolean'),
        field('message'),
      ],
    },
    {
      id: COUNTRY_DETAIL_RES_MODEL_ID,
      name: 'countryDetailRes',
      fields: [
        field('data', 'object', countryRowFields()),
        field('status', 'number'),
        field('success', 'boolean'),
        field('message'),
      ],
    },
    {
      id: COUNTRY_PAGE_BODY_MODEL_ID,
      name: 'countryPageBody',
      fields: [field('offset', 'number'), field('limit', 'number'), field('search'), ...pageFilterFields()],
    },
    {
      id: COUNTRY_BODY_MODEL_ID,
      name: 'countryBody',
      fields: [
        field('name'),
        field('code'),
        field('flagImage'),
        field(
          'documents',
          'array',
          [field('name'), field('size', 'number'), field('type'), field('data')],
          'object',
        ),
      ],
    },
    {
      id: COUNTRY_PARAM_MODEL_ID,
      name: 'countryParam',
      fields: [field('id')],
    },
    {
      id: COUNTRY_SEARCH_QUERY_MODEL_ID,
      name: 'countrySearchQuery',
      fields: [field('search')],
    },
    ...pagedCountriesSeedModels(),
    ...languageSeedModels(),
    ...formListDemoSeedModels(),
    ...repeaterDemoSeedModels(),
    ...serverFilterSeedModels(),
    ...tableLayoutSeedModels(),
  ]
}

/**
 * The GET flavour of the countries page endpoint (`GET /collection/page?offset&limit&search`)
 * — the data table's query-string pagination placement, which the seeded
 * Countries table demos (the example app keeps the POST/body one).
 */
export function pagedCountriesSeedModels(): ModelDef[] {
  return [
    {
      id: COUNTRY_PAGE_QUERY_MODEL_ID,
      name: 'countryPageQuery',
      fields: [field('offset', 'number'), field('limit', 'number'), field('search'), ...pageFilterFields()],
    },
  ]
}

export function pagedCountriesSeedEndpoints(): EndpointDef[] {
  return [
    {
      id: COUNTRIES_PAGED_GET_ENDPOINT_ID,
      name: 'countriesPagedGet',
      description: 'Get a page of countries via the query string (server-side pagination + search)',
      url: '/collection/page',
      method: 'GET',
      withOptions: false,
      response: COUNTRY_PAGED_RES_MODEL_ID,
      query: COUNTRY_PAGE_QUERY_MODEL_ID,
      parameter: null,
      body: null,
    },
  ]
}

export const DATA_TABLE_PAGE_ID = 'seed-page-data-table'

/**
 * The "Data table" example page (the example app's `/data-table`): column
 * pinning on a table placed in a half-width cell so it overflows sideways on
 * every screen — Code pinned left, Updated By pinned right, the action column
 * pinned by the table itself. Select the table, expand a column → Pin. Below
 * it, the HTML-columns table (`dataTableHtmlSeedItems`) and the line-clamp
 * tables (`dataTableClampSeedItems`).
 */
export function dataTableDemoSeedItems(): GridItemData[] {
  const column = (
    accessor: string,
    header: string,
    extra: Partial<DataTableColumnConfig> = {},
  ): DataTableColumnConfig => ({
    id: `seed-col-pinned-${accessor}`,
    accessor,
    header,
    enableSorting: true,
    enableColumnFilter: false,
    align: 'start',
    useDateFormat: '',
    pin: '', html: '', sortField: '', lines: '', rowHeader: false, mergeRows: false, mergeColumns: false, group: '', ...DEFAULT_COLUMN_SIZING,
    ...extra,
  })
  return [
    {
      id: 'seed-item-data-table-heading',
      label: 'Text',
      type: 'text',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 12 } }),
      config: {
        ...createDefaultTextConfig(),
        text: 'Column pinning — Code is pinned left, Updated By right, the action column by the table. The cell is narrower than the columns so the table scrolls sideways; the pin icon in a header pins it for the session. Select the table, expand a column → Pin.',
      },
    },
    {
      id: 'seed-item-data-table-pinned',
      label: 'Data Table',
      type: 'datatable',
      // Wide enough for the canvas's live table tier (≥ 480px), narrower than
      // the table's ~830px of columns so it still scrolls sideways.
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 6, lg: 10 } }),
      config: {
        ...createDefaultDataTableConfig('dtPinned'),
        title: 'Countries — pinned columns',
        endpointId: COUNTRIES_ENDPOINT_ID,
        apiPaths: 'data',
        columns: [
          column('code', 'Code', { pin: 'left' }),
          column('name', 'Name'),
          column('_id', 'Id', { enableSorting: false, align: 'center' }),
          column('updated_at', 'Update Date', { useDateFormat: 'DD/MM/YYYY HH:mm' }),
          column('updated_by_name', 'Updated By', { enableSorting: false, enableColumnFilter: true, pin: 'right' }),
        ],
      },
    },
    ...dataTableHtmlSeedItems(),
    ...dataTableClampSeedItems(),
  ]
}

export const DATA_TABLE_HTML_ITEM_ID = 'seed-item-data-table-html'

/**
 * The HTML-columns half of the "Data table" page (also appended to an existing
 * seeded page by `migrateV24`): each column's cell is an `html` template —
 * a linked name over a muted id, a `dt-badge` code, and the formatted date
 * (`{{value}}`) beside another field. Select the table, expand a column →
 * Cell HTML.
 */
export function dataTableHtmlSeedItems(): GridItemData[] {
  const column = (
    accessor: string,
    header: string,
    html: string,
    extra: Partial<DataTableColumnConfig> = {},
  ): DataTableColumnConfig => ({
    id: `seed-col-html-${accessor}`,
    accessor,
    header,
    enableSorting: true,
    enableColumnFilter: false,
    align: 'start',
    useDateFormat: '',
    pin: '',
    html,
    sortField: '', lines: '', rowHeader: false, mergeRows: false, mergeColumns: false, group: '', ...DEFAULT_COLUMN_SIZING,
    ...extra,
  })
  return [
    {
      id: 'seed-item-data-table-html-heading',
      label: 'Text',
      type: 'text',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 12 } }),
      config: {
        ...createDefaultTextConfig(),
        text: 'HTML columns — each cell is a template on the column: {{field}} placeholders read the row (escaped, then sanitised). The name links to the country page in-app, the code is a dt-badge, Updated combines {{value}} (the formatted date) with another field. Select the table, expand a column → Cell HTML.',
      },
    },
    {
      id: DATA_TABLE_HTML_ITEM_ID,
      label: 'Data Table',
      type: 'datatable',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 12 } }),
      config: {
        ...createDefaultDataTableConfig('dtHtml'),
        title: 'Countries — HTML columns',
        canEdit: false,
        canDelete: false,
        endpointId: COUNTRIES_ENDPOINT_ID,
        apiPaths: 'data',
        columns: [
          column(
            'name',
            'Country',
            '<div class="dt-strong"><a href="/countries/{{code}}">{{name}}</a></div>\n<div class="dt-muted">id {{_id}}</div>',
          ),
          column('code', 'Code', '<span class="dt-badge">{{code}}</span>', { align: 'center' }),
          column('updated_at', 'Updated', '{{value}} <span class="dt-muted">by {{updated_by_name}}</span>', {
            useDateFormat: 'DD/MM/YYYY HH:mm',
          }),
        ],
      },
    },
  ]
}

export const HTML_COLUMNS_PAGE_ID = 'seed-page-html-columns'
/** The rich-cells table and its caption (inserted into an existing seeded page by `migrateV26`). */
export const HTML_COLUMNS_RICH_ITEM_IDS = ['seed-item-html-columns-rich-caption', 'seed-item-html-columns-rich']

/**
 * The "HTML columns" example page (the example app's `/html-columns`): one
 * table per aspect of a column's `html` template — the `dt-*` helpers and
 * links, rich cells (profile block, `<dl>`, prose, `<details>`, link pills),
 * `<img>` + inline `style` with Radix vars, nested lodash paths over
 * the regions endpoint, and templates the sanitiser strips. Select a table,
 * expand a column → More → Cell HTML.
 */
export function htmlColumnDemoSeedItems(): GridItemData[] {
  const full = () => createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 12 } })
  const column = (
    prefix: string,
    accessor: string,
    header: string,
    html: string,
    extra: Partial<DataTableColumnConfig> = {},
  ): DataTableColumnConfig => ({
    id: `seed-col-${prefix}-${accessor}`,
    accessor,
    header,
    enableSorting: true,
    enableColumnFilter: false,
    align: 'start',
    useDateFormat: '',
    pin: '',
    html,
    sortField: '', lines: '', rowHeader: false, mergeRows: false, mergeColumns: false, group: '', ...DEFAULT_COLUMN_SIZING,
    ...extra,
  })
  const caption = (id: string, text: string): GridItemData => ({
    id,
    label: 'Text',
    type: 'text',
    settings: full(),
    config: { ...createDefaultTextConfig(), text },
  })
  const table = (id: string, config: Partial<DataTableConfig>): GridItemData => ({
    id,
    label: 'Data Table',
    type: 'datatable',
    settings: full(),
    config: {
      ...createDefaultDataTableConfig(config.name ?? 'dtHtml'),
      canEdit: false,
      canDelete: false,
      endpointId: COUNTRIES_ENDPOINT_ID,
      apiPaths: 'data',
      ...config,
    },
  })
  return [
    caption(
      'seed-item-html-columns-heading',
      'HTML columns — a column\'s Cell HTML draws the cell from a template: {{field}} placeholders read the row (always escaped), and the result is sanitised. Sorting and search still use the column\'s plain value. Select a table, expand a column → More → Cell HTML.',
    ),
    caption(
      'seed-item-html-columns-helpers-caption',
      'Theme-aware helpers and links: dt-strong, dt-muted, dt-badge and dt-badge-gray ship with the library. The name links to the country page in-app, Updated combines {{value}} (the formatted date) with another field, Look up opens a new tab.',
    ),
    table('seed-item-html-columns-helpers', {
      name: 'dtHtmlHelpers',
      title: 'Countries — helpers',
      columns: [
        column(
          'html-helpers',
          'name',
          'Country',
          '<div class="dt-strong"><a href="/countries/{{code}}">{{name}}</a></div>\n<div class="dt-muted">id {{_id}}</div>',
        ),
        column('html-helpers', 'code', 'Code', '<span class="dt-badge">{{code}}</span>', { align: 'center' }),
        column(
          'html-helpers',
          'updated_by_name',
          'Updated By',
          '<span class="dt-badge dt-badge-gray">{{updated_by_name}}</span>',
          { align: 'center', enableSorting: false, enableColumnFilter: true },
        ),
        column('html-helpers', 'updated_at', 'Updated', '{{value}} <span class="dt-muted">by {{updated_by_name}}</span>', {
          useDateFormat: 'DD/MM/YYYY HH:mm',
        }),
        column(
          'html-helpers',
          '_id',
          'Look up',
          '<a href="https://en.wikipedia.org/wiki/{{name}}" target="_blank">Wikipedia ↗</a>',
          { enableSorting: false },
        ),
      ],
    }),
    caption('seed-item-html-columns-rich-caption', 'Rich cells: a template can hold as much markup as the cell needs — a flag-and-title profile block, a dl of facts, a paragraph with strong / em / mark / u, a native details disclosure that opens in place, and a row of link pills (one in-app, two in a new tab). Rows grow to fit.'),
    table('seed-item-html-columns-rich', {
      name: 'dtHtmlRich',
      title: 'Countries — rich cells',
      columns: [
        column('html-rich', 'name', 'Profile', '<div style="display:flex;align-items:center;gap:10px"><span style="flex:none;width:32px;height:22px;border-radius:3px;background:var(--gray-3) url({{avatar}}) center/cover;box-shadow:0 0 0 1px var(--gray-a5)"></span><div><div class="dt-strong"><a href="/countries/{{code}}">{{name}}</a></div><div class="dt-muted">{{code}} · record #{{_id}}</div></div></div>'),
        column('html-rich', 'code', 'Facts', '<dl style="display:grid;grid-template-columns:auto 1fr;gap:2px 10px;margin:0;font-size:0.85em"><dt style="color:var(--gray-10)">Code</dt><dd style="margin:0"><span class="dt-badge">{{code}}</span></dd><dt style="color:var(--gray-10)">Id</dt><dd style="margin:0"><code>{{_id}}</code></dd><dt style="color:var(--gray-10)">Editor</dt><dd style="margin:0">{{updated_by_name}}</dd></dl>'),
        column('html-rich', 'updated_at', 'Summary', '<p style="margin:0;max-width:300px;white-space:normal"><strong>{{name}}</strong> <em>({{code}})</em> was last edited by <mark style="padding:0 4px;border-radius:3px;background:var(--accent-4);color:var(--accent-12)">{{updated_by_name}}</mark> on <u>{{value}}</u>.</p>', { useDateFormat: 'DD MMM YYYY' }),
        column('html-rich', 'updated_by_name', 'More', '<details><summary class="dt-link">Show record</summary><ul style="margin:4px 0 0;padding-left:16px;list-style:disc;font-size:0.85em"><li>Name: <strong>{{name}}</strong></li><li>Code: {{code}}</li><li>Updated: {{updated_at}}</li></ul></details>', { enableSorting: false }),
        column('html-rich', '_id', 'Actions', '<div style="display:flex;flex-wrap:wrap;gap:6px"><a href="/countries/{{code}}" style="display:inline-block;padding:2px 10px;border-radius:9999px;text-decoration:none;font-size:0.85em;background:var(--accent-9);color:var(--accent-contrast)">Details</a><a href="https://en.wikipedia.org/wiki/{{name}}" target="_blank" style="display:inline-block;padding:2px 10px;border-radius:9999px;text-decoration:none;font-size:0.85em;border:1px solid var(--gray-7);color:var(--gray-12)">Wikipedia ↗</a><a href="https://www.openstreetmap.org/search?query={{name}}" target="_blank" style="display:inline-block;padding:2px 10px;border-radius:9999px;text-decoration:none;font-size:0.85em;border:1px solid var(--gray-7);color:var(--gray-12)">Map ↗</a></div>', { enableSorting: false }),
      ],
    }),
    caption(
      'seed-item-html-columns-styled-caption',
      'Images and inline style: img and the style attribute pass the sanitiser. Radix vars (--gray-*, --green-*, --accent-*) keep hand-styled cells right in both appearances and under any accent colour.',
    ),
    table('seed-item-html-columns-styled', {
      name: 'dtHtmlStyled',
      title: 'Countries — styled cells',
      canSearchAllColumns: false,
      columns: [
        column(
          'html-styled',
          'name',
          'Country',
          '<img src="{{avatar}}" alt="" style="height:16px;border-radius:2px;margin-right:8px" /><span class="dt-strong">{{name}}</span>',
        ),
        column(
          'html-styled',
          'code',
          'Code',
          '<code style="padding:2px 6px;border-radius:4px;font-size:0.85em;background:var(--gray-3);color:var(--gray-12)">{{code}}</code>',
          { align: 'center' },
        ),
        column(
          'html-styled',
          'updated_by_name',
          'Status',
          '<span style="display:inline-flex;align-items:center;gap:6px;color:var(--green-11)"><span style="width:8px;height:8px;border-radius:9999px;background:var(--green-9)"></span>Synced by {{updated_by_name}}</span>',
          { align: 'center', enableSorting: false },
        ),
        column(
          'html-styled',
          '_id',
          'Open',
          '<a href="/countries/{{code}}" style="display:inline-block;padding:2px 10px;border-radius:9999px;text-decoration:none;border:1px solid var(--accent-7);color:var(--accent-11)">Details →</a>',
          { align: 'end', enableSorting: false },
        ),
      ],
    }),
    caption(
      'seed-item-html-columns-nested-caption',
      'Nested paths: placeholders are lodash get paths — {{countries.length}}, {{countries.0.name}}, {{countries.1.code}}. Antarctica has no countries, so those paths resolve empty and the cell stays blank.',
    ),
    table('seed-item-html-columns-nested', {
      name: 'dtHtmlNested',
      title: 'Regions — nested fields',
      endpointId: REGIONS_ENDPOINT_ID,
      canSearchAllColumns: false,
      columns: [
        column(
          'html-nested',
          'name',
          'Region',
          '<div class="dt-strong">{{name}}</div>\n<div class="dt-muted">{{description}}</div>',
        ),
        column('html-nested', 'countries', 'Countries', '<span class="dt-badge">{{countries.length}} countries</span>', {
          align: 'center',
          enableSorting: false,
        }),
        column(
          'html-nested',
          '_id',
          'First two',
          '<a href="/countries/{{countries.0.code}}">{{countries.0.name}}</a> <span class="dt-muted">{{countries.0.code}}</span> &nbsp; <a href="/countries/{{countries.1.code}}">{{countries.1.name}}</a> <span class="dt-muted">{{countries.1.code}}</span>',
          { enableSorting: false },
        ),
        column('html-nested', 'featured', 'Featured', '<span class="dt-badge dt-badge-gray">featured: {{featured}}</span>', {
          align: 'center',
        }),
      ],
    }),
    caption(
      'seed-item-html-columns-sanitised-caption',
      'What the sanitiser removes: these templates try a script tag, an onclick handler, a style tag, a form control and a javascript: URL. All of them are dropped (the Cell HTML editor warns about it); the presentational rest of each cell still renders.',
    ),
    table('seed-item-html-columns-sanitised', {
      name: 'dtHtmlSanitised',
      title: 'Countries — sanitised',
      canSearchAllColumns: false,
      columns: [
        column(
          'html-sanitised',
          'name',
          'Script + handler',
          '<script>alert("{{name}}")</script><span class="dt-strong" onclick="alert(1)">{{name}}</span> <span class="dt-muted">script and onclick removed</span>',
          { enableSorting: false },
        ),
        column(
          'html-sanitised',
          'code',
          'Style tag + form control',
          '<style>body{display:none}</style><input value="{{code}}" /><span class="dt-badge">{{code}}</span> <span class="dt-muted">only the badge is left</span>',
          { enableSorting: false },
        ),
        column(
          'html-sanitised',
          '_id',
          'Unsafe link',
          '<a href="javascript:alert(1)">javascript: link</a> <span class="dt-muted">href removed</span>',
          { enableSorting: false },
        ),
      ],
    }),
  ]
}

export const COLUMN_RESIZE_PAGE_ID = 'seed-page-column-resize'

/**
 * The "Column resize" example page (the example app's `/column-resize`): a
 * table with no sizing config (columns share the container until the first
 * drag), one with Width / Min / Max, a locked column and pins on a narrow
 * cell, and one with resizing switched off. The canvas is inert — drag the
 * header edges in the Live Preview (Run). Select a table, expand a column →
 * More for the widths; the table's "Resizable columns" toggle is below.
 */
export function columnResizeDemoSeedItems(): GridItemData[] {
  const full = () => createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 12 } })
  const column = (
    prefix: string,
    accessor: string,
    header: string,
    extra: Partial<DataTableColumnConfig> = {},
  ): DataTableColumnConfig => ({
    sortField: '', lines: '', rowHeader: false, mergeRows: false, mergeColumns: false, group: '', ...DEFAULT_COLUMN_SIZING,
    id: `seed-col-${prefix}-${accessor}`,
    accessor,
    header,
    enableSorting: true,
    enableColumnFilter: false,
    align: 'start',
    useDateFormat: '',
    pin: '',
    html: '',
    ...extra,
  })
  const plain = (prefix: string) => [
    column(prefix, 'code', 'Code'),
    column(prefix, 'name', 'Name'),
    column(prefix, 'updated_at', 'Update Date', { useDateFormat: 'DD/MM/YYYY HH:mm' }),
    column(prefix, 'updated_by_name', 'Updated By', { enableSorting: false, enableColumnFilter: true }),
  ]
  const caption = (id: string, text: string): GridItemData => ({
    id,
    label: 'Text',
    type: 'text',
    settings: full(),
    config: { ...createDefaultTextConfig(), text },
  })
  const table = (id: string, settings: GridItemData['settings'], config: Partial<DataTableConfig>): GridItemData => ({
    id,
    label: 'Data Table',
    type: 'datatable',
    settings,
    config: {
      ...createDefaultDataTableConfig(config.name ?? 'dtResize'),
      canEdit: false,
      canDelete: false,
      canSearchAllColumns: false,
      endpointId: COUNTRIES_ENDPOINT_ID,
      apiPaths: 'data',
      ...config,
    },
  })
  return [
    caption(
      'seed-item-column-resize-heading',
      'Column resize — drag the right edge of a column header (double-click resets; the grip is keyboard-focusable: ← → resize, Enter resets). Widths last for the session. The canvas is inert: press Run and drag in the Live Preview.',
    ),
    caption(
      'seed-item-column-resize-default-caption',
      'Default: no sizing config. The columns share the container until the first drag, which freezes the widths on screen; from then on each column is its exact pixel size and a filler cell takes the spare width.',
    ),
    table('seed-item-column-resize-default', full(), {
      name: 'dtResizeDefault',
      title: 'Countries — default',
      columns: plain('resize-default'),
    }),
    caption(
      'seed-item-column-resize-configured-caption',
      'Configured: Width / Min / Max per column (expand a column → More) and a locked Id column. Code is pinned left (60–160px), Updated By right — the sticky offsets follow a resize. The cell is narrower than the columns, so the table scrolls sideways.',
    ),
    table(
      'seed-item-column-resize-configured',
      createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 7, lg: 9 } }),
      {
        name: 'dtResizeConfigured',
        title: 'Countries — configured',
        columns: [
          column('resize-cfg', 'code', 'Code', { pin: 'left', size: 90, minSize: 60, maxSize: 160 }),
          column('resize-cfg', 'name', 'Name (min 120)', { size: 260, minSize: 120 }),
          column('resize-cfg', '_id', 'Id (locked)', { size: 100, align: 'center', enableSorting: false, resizable: false }),
          column('resize-cfg', 'updated_at', 'Update Date', { size: 220, useDateFormat: 'DD/MM/YYYY HH:mm' }),
          column('resize-cfg', 'updated_by_name', 'Updated By', { pin: 'right', size: 160, enableSorting: false }),
        ],
      },
    ),
    caption(
      'seed-item-column-resize-off-caption',
      'Off: the table\'s "Resizable columns" toggle is unchecked, so no header has a handle.',
    ),
    table('seed-item-column-resize-off', full(), {
      name: 'dtResizeOff',
      title: 'Countries — fixed columns',
      canResizeColumns: false,
      columns: plain('resize-off'),
    }),
  ]
}

export const REGION_PAGE_PARAMS_MODEL_ID = 'seed-model-region-page-params'
export const REGION_COUNTRIES_PAGED_ENDPOINT_ID = 'seed-endpoint-region-countries-paged'

/** `GET /collection/region/:region/page` — a filter mapped to a URL `:param`. */
export function serverFilterSeedModels(): ModelDef[] {
  return [{ id: REGION_PAGE_PARAMS_MODEL_ID, name: 'regionPageParams', fields: [field('region')] }]
}

export function serverFilterSeedEndpoints(): EndpointDef[] {
  return [
    {
      id: REGION_COUNTRIES_PAGED_ENDPOINT_ID,
      name: 'regionCountriesPaged',
      description: 'Get a page of one region\'s countries (:region = region id or "all")',
      url: '/collection/region/:region/page',
      method: 'GET',
      withOptions: false,
      response: COUNTRY_PAGED_RES_MODEL_ID,
      query: COUNTRY_PAGE_QUERY_MODEL_ID,
      parameter: REGION_PAGE_PARAMS_MODEL_ID,
      body: null,
    },
  ]
}

export const SERVER_FILTER_PAGE_ID = 'seed-page-server-filter'

/**
 * The "Server filter" example page (the example app's `/server-filter`): data
 * tables that filter and sort through their API. Each table's filter form is
 * its second child canvas (select the table → Server filters → Edit filter
 * form); Request mapping sends the fields in the query string, the request
 * body or a URL :param; Server sort sends the clicked column.
 */
export function serverFilterDemoSeedItems(): GridItemData[] {
  const full = () => createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 12 } })
  const half = () => createDefaultItemSettings({ colSpan: { xs: 4, sm: 3, md: 4, lg: 6 } })
  const columns = (prefix: string): DataTableColumnConfig[] =>
    [
      ['code', 'Code', ''],
      ['name', 'Name', ''],
      ['updated_at', 'Update Date', 'DD/MM/YYYY HH:mm'],
      ['updated_by_name', 'Updated By', ''],
    ].map(([accessor, header, useDateFormat]) => ({
      id: `${prefix}-${accessor}`,
      accessor,
      header,
      enableSorting: true,
      enableColumnFilter: false,
      align: 'start',
      useDateFormat,
      pin: '',
      html: '',
      sortField: '', lines: '', rowHeader: false, mergeRows: false, mergeColumns: false, group: '', ...DEFAULT_COLUMN_SIZING,
    }))
  const caption = (id: string, text: string): GridItemData => ({
    id,
    label: 'Text',
    type: 'text',
    settings: full(),
    config: { ...createDefaultTextConfig(), text },
  })
  const textFilter = (id: string, name: string, label: string, settings = full()): GridItemData => ({
    id,
    label: 'Text Field',
    type: 'textfield',
    settings,
    config: { ...createDefaultTextFieldConfig(name), label },
  })
  const selectFilter = (
    id: string,
    name: string,
    label: string,
    options: Record<string, unknown>[],
    settings = full(),
  ): GridItemData => ({
    id,
    label: 'Select',
    type: 'select',
    settings,
    config: { ...createDefaultSelectFieldConfig(name), label, options, idKey: 'value', displayKey: 'label', searchKey: 'label' },
  })
  const editors = ['Admin', 'Somchai', 'Yuki', 'Maria'].map((v) => ({ value: v, label: v }))
  const regions = [
    { value: 'r-sea', label: 'Southeast Asia' },
    { value: 'r-ea', label: 'East & South Asia' },
    { value: 'r-eu', label: 'Europe' },
    { value: 'r-an', label: 'Antarctica (no countries)' },
  ]
  const filter = (id: string, key: string, field: string, slot: 'query' | 'body' | 'params', fallback = '') => ({
    id,
    slot,
    key,
    source: { type: 'filter' as const, key: field, fallback },
  })
  const paged = (placement: 'auto' | 'body' = 'auto'): DataTablePaginationConfig => ({
    ...createDefaultPaginationConfig(),
    enabled: true,
    placement,
    defaultPageSize: 5,
    pageSizeOptions: [5, 10, 20],
  })
  const table = (id: string, config: Partial<DataTableConfig>, filterItems: GridItemData[]): GridItemData => ({
    id,
    label: 'Data Table',
    type: 'datatable',
    settings: full(),
    config: {
      ...createDefaultDataTableConfig(config.name ?? 'dtFilter'),
      canEdit: false,
      canDelete: false,
      canSearchAllColumns: false,
      apiPaths: 'data',
      filtersEnabled: true,
      ...config,
    },
    // [0] the (unused) edit modal, [1] the filter form.
    childCanvases: [createChildCanvas(), { ...createChildCanvas(), items: filterItems }],
  })
  const sort = (extra: Partial<DataTableConfig['sort']> = {}): DataTableConfig['sort'] => ({
    ...createDefaultSortConfig(),
    enabled: true,
    sortKey: 'sortBy',
    orderKey: 'sortDir',
    ...extra,
  })
  return [
    caption(
      'seed-item-server-filter-heading',
      'Server filter & sort — the table owns a filter form and maps its fields into the API call; Apply calls the API. Select a table: Server filters → Edit filter form, Request mapping, Server sort. Press Run to try it.',
    ),
    caption(
      'seed-item-server-filter-query-caption',
      'Query string: GET /collection/page?name&code&sortBy&sortDir — the Filter popover\'s fields are mapped to query keys, the header sort icons send sortBy / sortDir (opening sort: name asc). Blank filters are left out of the URL.',
    ),
    table(
      'seed-item-server-filter-query',
      {
        name: 'dtFilterQuery',
        title: 'Countries — query filters',
        endpointId: COUNTRIES_PAGED_GET_ENDPOINT_ID,
        columns: columns('seed-col-sf-query'),
        pagination: paged(),
        sort: sort({ defaultField: 'name' }),
        requestMapping: [
          filter('seed-map-sf-query-name', 'name', 'filterName', 'query'),
          filter('seed-map-sf-query-code', 'code', 'filterCode', 'query'),
        ],
      },
      [
        textFilter('seed-item-sf-query-name', 'filterName', 'Name contains'),
        textFilter('seed-item-sf-query-code', 'filterCode', 'Code is'),
      ],
    ),
    caption(
      'seed-item-server-filter-body-caption',
      'Request body, inline: POST /collection/page — the same idea mapped into the body beside a fixed collectionId. Display = Inline bar; the opening value filters to Admin (Clear returns to it); the sort sends 1 / -1.',
    ),
    table(
      'seed-item-server-filter-body',
      {
        name: 'dtFilterBody',
        title: 'Countries — body filters',
        endpointId: COUNTRIES_PAGED_ENDPOINT_ID,
        columns: columns('seed-col-sf-body'),
        pagination: paged('body'),
        sort: sort({ placement: 'body', ascValue: '1', descValue: '-1' }),
        filterDisplay: 'inline',
        filterDefaults: [{ id: 'seed-default-sf-body-editor', field: 'filterEditor', value: 'Admin' }],
        requestMapping: [
          { id: 'seed-map-sf-body-collection', slot: 'body', key: 'collectionId', source: { type: 'value', value: '691e9963992636eb1560eadb' } },
          filter('seed-map-sf-body-name', 'name', 'filterName', 'body'),
          filter('seed-map-sf-body-editor', 'updatedBy', 'filterEditor', 'body'),
        ],
      },
      [
        textFilter('seed-item-sf-body-name', 'filterName', 'Name contains', half()),
        selectFilter('seed-item-sf-body-editor', 'filterEditor', 'Updated by', editors, half()),
      ],
    ),
    caption(
      'seed-item-server-filter-param-caption',
      'URL :param: GET /collection/region/:region/page — the Region filter feeds the :region param. A URL param can\'t be blank, so its mapping row carries the fallback "all". Antarctica shows the "no rows match" state.',
    ),
    table(
      'seed-item-server-filter-param',
      {
        name: 'dtFilterParam',
        title: 'Countries — region in the URL',
        endpointId: REGION_COUNTRIES_PAGED_ENDPOINT_ID,
        columns: columns('seed-col-sf-param'),
        pagination: paged(),
        sort: sort(),
        filterButton: { label: 'Region', icon: 'map', variant: 'outlined' },
        requestMapping: [filter('seed-map-sf-param-region', 'region', 'filterRegion', 'params', 'all')],
      },
      [selectFilter('seed-item-sf-param-region', 'filterRegion', 'Region', regions)],
    ),
  ]
}

export const FILTER_API_PAGE_ID = 'seed-page-filter-api'

/**
 * The "Filter via API" example page (the example app's `/filter-api`): filter
 * fields whose **options** come from the API. A filter form is an ordinary
 * canvas, so an autocomplete inside it is authored like any other — Props →
 * Options: Source, an endpoint + paths — and the picked value is mapped into
 * the request like a text filter. Two of the example's three tables are
 * seedable: options loaded once, and a region → country cascade (Observes in
 * the country's Options section; the region field is named `region` because
 * the observe param key is the observed field's name, and the endpoint's URL
 * param is `:region`). The example's search-as-you-type table isn't: the studio
 * can't author the typed-text query DataValue.
 */
export function filterApiDemoSeedItems(): GridItemData[] {
  const full = () => createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 12 } })
  const half = () => createDefaultItemSettings({ colSpan: { xs: 4, sm: 3, md: 4, lg: 6 } })
  const columns = (prefix: string): DataTableColumnConfig[] =>
    [
      ['code', 'Code', ''],
      ['name', 'Name', ''],
      ['updated_at', 'Update Date', 'DD/MM/YYYY HH:mm'],
      ['updated_by_name', 'Updated By', ''],
    ].map(([accessor, header, useDateFormat]) => ({
      id: `${prefix}-${accessor}`,
      accessor,
      header,
      enableSorting: true,
      enableColumnFilter: false,
      align: 'start',
      useDateFormat,
      pin: '',
      html: '',
      sortField: '',
      lines: '',
      rowHeader: false,
      mergeRows: false,
      mergeColumns: false,
      group: '',
      ...DEFAULT_COLUMN_SIZING,
    }))
  const caption = (id: string, text: string): GridItemData => ({
    id,
    label: 'Text',
    type: 'text',
    settings: full(),
    config: { ...createDefaultTextConfig(), text },
  })
  // A starter record mirroring the row shape so the canvas cell can draw a
  // chip — source mode exports `options: []`.
  const regionRow = { _id: 'r-sea', name: 'Southeast Asia' }
  const countryRow = { _id: '1', name: 'Thailand', code: 'TH', avatar: 'https://flagcdn.com/w40/th.png' }
  const regionSelect = (id: string, name: string, extra: Record<string, unknown> = {}, settings = full()): GridItemData => ({
    id,
    label: 'Autocomplete',
    type: 'autocomplete',
    settings,
    config: {
      ...createDefaultAutocompleteConfig(name),
      label: 'Region',
      placeholder: 'Pick a region',
      inputIcon: 'map',
      mode: 'source',
      options: [regionRow],
      dataSource: { endpointId: REGIONS_ENDPOINT_ID, paths: 'data' },
      idKey: '_id',
      displayKey: 'name',
      searchKey: 'name',
      ...extra,
    },
  })
  const filter = (id: string, key: string, field: string, slot: 'query' | 'body' | 'params', fallback = '') => ({
    id,
    slot,
    key,
    source: { type: 'filter' as const, key: field, fallback },
  })
  const paged = (): DataTablePaginationConfig => ({
    ...createDefaultPaginationConfig(),
    enabled: true,
    defaultPageSize: 5,
    pageSizeOptions: [5, 10, 20],
  })
  const sort = (): DataTableConfig['sort'] => ({
    ...createDefaultSortConfig(),
    enabled: true,
    sortKey: 'sortBy',
    orderKey: 'sortDir',
    defaultField: 'name',
  })
  const table = (id: string, config: Partial<DataTableConfig>, filterItems: GridItemData[]): GridItemData => ({
    id,
    label: 'Data Table',
    type: 'datatable',
    settings: full(),
    config: {
      ...createDefaultDataTableConfig(config.name ?? 'dtOptions'),
      canEdit: false,
      canDelete: false,
      canSearchAllColumns: false,
      apiPaths: 'data',
      filtersEnabled: true,
      endpointId: REGION_COUNTRIES_PAGED_ENDPOINT_ID,
      pagination: paged(),
      sort: sort(),
      ...config,
    },
    // [0] the (unused) edit modal, [1] the filter form.
    childCanvases: [createChildCanvas(), { ...createChildCanvas(), items: filterItems }],
  })
  return [
    caption(
      'seed-item-filter-api-heading',
      'Filter via API — the filter form is an ordinary canvas, so an autocomplete in it loads its options from an endpoint like any form field (Props → Options: Source). Select a table → Server filters → Edit filter form, then a field → Options. Press Run to try it.',
    ),
    caption(
      'seed-item-filter-api-once-caption',
      'Options loaded once: Region reads GET /collection/regions (source = the regions endpoint, paths "data", id _id / display name) when the form mounts. Its value feeds the :region URL param of GET /collection/region/:region/page, fallback "all".',
    ),
    table(
      'seed-item-filter-api-once',
      {
        name: 'dtOptionsOnce',
        title: 'Countries — region options loaded once',
        columns: columns('seed-col-fa-once'),
        filterButton: { label: 'Region', icon: 'map', variant: 'outlined' },
        requestMapping: [filter('seed-map-fa-once-region', 'region', 'apiRegion', 'params', 'all')],
      },
      [regionSelect('seed-item-fa-once-region', 'apiRegion')],
    ),
    caption(
      'seed-item-filter-api-dependent-caption',
      'Dependent options: Country observes Region (Options → Observes), so every region change refetches GET /collection/region/:region/page with the region as the :region param and clears the country; until a region is picked the country list is empty. Region → :region param (fallback "all"), country code → query code.',
    ),
    table(
      'seed-item-filter-api-dependent',
      {
        name: 'dtOptionsDependent',
        title: 'Countries — region then country',
        columns: columns('seed-col-fa-dependent'),
        requestMapping: [
          filter('seed-map-fa-dependent-region', 'region', 'region', 'params', 'all'),
          filter('seed-map-fa-dependent-code', 'code', 'country', 'query'),
        ],
      },
      [
        regionSelect('seed-item-fa-dependent-region', 'region', { placeholder: 'Pick a region first' }, half()),
        {
          id: 'seed-item-fa-dependent-country',
          label: 'Autocomplete',
          type: 'autocomplete',
          settings: half(),
          config: {
            ...createDefaultAutocompleteConfig('country'),
            label: 'Country',
            placeholder: 'Then a country of that region',
            inputIcon: 'flag',
            mode: 'source',
            options: [countryRow],
            dataSource: { endpointId: REGION_COUNTRIES_PAGED_ENDPOINT_ID, paths: 'data' },
            idKey: 'code',
            displayKey: 'name',
            searchKey: 'name',
            subtitleKey: 'code',
            avatarKey: 'avatar',
            observeToItemId: 'seed-item-fa-dependent-region',
          },
        },
      ],
    ),
  ]
}

export const DATA_TABLE_CLAMP_ITEM_ID = 'seed-item-data-table-clamped'

/**
 * The line-clamp third of the "Data table" page (appended to an existing
 * seeded page by `migrateV31`): two regions tables over the `regions`
 * endpoint, whose `about` is a paragraph. The first keeps the engine default
 * (2 lines; a cut cell shows its whole text in a tooltip — try it in the Live
 * Preview) and cuts Description to one line via the column's Lines; the
 * second sets Cell lines to "no clamp" so its rows grow with the text.
 */
export function dataTableClampSeedItems(): GridItemData[] {
  const full = () => createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 12 } })
  const columns = (prefix: string): DataTableColumnConfig[] =>
    [
      ['name', 'Region', '', '160'],
      ['description', 'Description', '1', '220'],
      ['about', 'About', '', '480'],
    ].map(([accessor, header, lines, size]) => ({
      id: `${prefix}-${accessor}`,
      accessor,
      header,
      enableSorting: accessor === 'name',
      enableColumnFilter: false,
      align: 'start' as const,
      useDateFormat: '',
      pin: '' as const,
      html: '',
      sortField: '',
      lines: lines === '' ? ('' as const) : (Number(lines) as DataTableColumnConfig['lines']),
      rowHeader: false,
      mergeRows: false,
      mergeColumns: false,
      group: '',
      ...DEFAULT_COLUMN_SIZING,
      size: size === '' ? '' : Number(size),
    }))
  const table = (id: string, config: Partial<DataTableConfig>): GridItemData => ({
    id,
    label: 'Data Table',
    type: 'datatable',
    settings: full(),
    config: {
      ...createDefaultDataTableConfig(config.name ?? 'dtClamped'),
      canEdit: false,
      canDelete: false,
      canSearchAllColumns: false,
      apiPaths: 'data',
      endpointId: REGIONS_ENDPOINT_ID,
      ...config,
    },
    childCanvases: [createChildCanvas(), createChildCanvas()],
  })
  return [
    {
      id: 'seed-item-data-table-clamp-heading',
      label: 'Text',
      type: 'text',
      settings: full(),
      config: {
        ...createDefaultTextConfig(),
        text: 'Line clamp — a plain cell shows at most Cell lines lines (2 by default) and a cut cell shows its whole text in a tooltip on hover (Live Preview). The first table is the default, with Description cut to one line by the column\'s Lines; the second sets Cell lines = no clamp, so its rows grow with the About paragraph. Select a table → Props → Cell lines.',
      },
    },
    table(DATA_TABLE_CLAMP_ITEM_ID, {
      name: 'dtClamped',
      title: 'Regions — 2 lines (default)',
      columns: columns('seed-col-clamped'),
    }),
    table('seed-item-data-table-unclamped', {
      name: 'dtUnclamped',
      title: 'Regions — no clamp',
      columns: columns('seed-col-unclamped'),
      cellLines: 0,
    }),
  ]
}

export const CELL_TOOLTIP_PAGE_ID = 'seed-page-cell-tooltip'

/**
 * The "Cell tooltip" example page (the example app's `/cell-tooltip`): the
 * line clamp's tooltip on its own — a cut cell shows its whole text on hover
 * (in the Live Preview). Four regions tables: the default clamp, Cell lines
 * = 1, Lines per column (1 / 4), and no clamp beside an HTML column, which
 * never shows one.
 */
export function cellTooltipDemoSeedItems(): GridItemData[] {
  const full = () => createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 12 } })
  const column = (
    prefix: string,
    accessor: string,
    header: string,
    extra: Partial<DataTableColumnConfig> = {},
  ): DataTableColumnConfig => ({
    id: `${prefix}-${accessor}`,
    accessor,
    header,
    enableSorting: accessor === 'name',
    enableColumnFilter: false,
    align: 'start',
    useDateFormat: '',
    pin: '',
    html: '',
    sortField: '',
    lines: '',
    rowHeader: false,
    mergeRows: false,
    mergeColumns: false,
    group: '',
    ...DEFAULT_COLUMN_SIZING,
    ...extra,
  })
  const regionColumns = (prefix: string, lines: { description?: CellLines; about?: CellLines } = {}): DataTableColumnConfig[] => [
    column(prefix, 'name', 'Region', { size: 170 }),
    column(prefix, 'description', 'Description', { size: 240, ...(lines.description !== undefined ? { lines: lines.description } : {}) }),
    column(prefix, 'about', 'About', { size: 460, ...(lines.about !== undefined ? { lines: lines.about } : {}) }),
  ]
  const caption = (id: string, text: string): GridItemData => ({
    id,
    label: 'Text',
    type: 'text',
    settings: full(),
    config: { ...createDefaultTextConfig(), text },
  })
  const table = (id: string, config: Partial<DataTableConfig>): GridItemData => ({
    id,
    label: 'Data Table',
    type: 'datatable',
    settings: full(),
    config: {
      ...createDefaultDataTableConfig(config.name ?? 'dtTooltip'),
      canEdit: false,
      canDelete: false,
      canSearchAllColumns: false,
      apiPaths: 'data',
      endpointId: REGIONS_ENDPOINT_ID,
      ...config,
    },
    childCanvases: [createChildCanvas(), createChildCanvas()],
  })
  return [
    caption(
      'seed-item-cell-tooltip-heading',
      'Cell tooltip — point at a cell whose text is cut (Live Preview) to see the whole text. The tooltip follows the line clamp (Cell lines on the table, Lines per column): only a cut cell gets one, so short values never do, and a table without a clamp has none.',
    ),
    caption(
      'seed-item-cell-tooltip-default-caption',
      'Default: two lines, then a tooltip — no clamp settings at all. Region fits, so hovering it does nothing; Description and About run past two lines and show their whole text on hover.',
    ),
    table('seed-item-cell-tooltip-default', {
      name: 'dtTooltipDefault',
      title: 'Regions — default clamp',
      columns: regionColumns('seed-col-tt-default'),
    }),
    caption(
      'seed-item-cell-tooltip-one-caption',
      'One line per cell — Cell lines = 1 line on the table: every column is cut to a single line, so Description gets a tooltip too. Antarctica\'s short About still fits and stays tooltip-free.',
    ),
    table('seed-item-cell-tooltip-one', {
      name: 'dtTooltipOneLine',
      title: 'Regions — Cell lines: 1',
      columns: regionColumns('seed-col-tt-one'),
      cellLines: 1,
    }),
    caption(
      'seed-item-cell-tooltip-column-caption',
      'Per column — Lines = 1 on Description and 4 on About (expand the column → More), the table left at its default: the cut, and so the tooltip, happens at a different line in each column.',
    ),
    table('seed-item-cell-tooltip-column', {
      name: 'dtTooltipPerColumn',
      title: 'Regions — Lines per column',
      columns: regionColumns('seed-col-tt-column', { description: 1, about: 4 }),
    }),
    caption(
      'seed-item-cell-tooltip-none-caption',
      'Where there is no tooltip — Cell lines = no clamp: the rows grow with the text and nothing is cut. The last column is an HTML template; HTML cells always render whole and never show one.',
    ),
    table('seed-item-cell-tooltip-none', {
      name: 'dtTooltipNone',
      title: 'Regions — no clamp, HTML column',
      cellLines: 0,
      columns: [
        column('seed-col-tt-none', 'name', 'Region', { size: 170 }),
        column('seed-col-tt-none', 'about', 'About', { size: 460 }),
        column('seed-col-tt-none', 'description', 'Summary (HTML)', {
          html: '<span class="dt-badge">{{name}}</span> <span class="dt-muted">{{value}}</span>',
        }),
      ],
    }),
  ]
}

export const PAGINATION_PAGE_ID = 'seed-page-pagination'

/**
 * The "Pagination" example page (the example app's `/pagination`): the same
 * countries data paged three ways — offset/limit in the query string (the GET
 * endpoint, placement inferred), in the request body (the POST endpoint,
 * `placement: 'body'` written out) and the in-memory default with server
 * pagination off. Select a table, then Props → Server pagination.
 */
export function paginationDemoSeedItems(): GridItemData[] {
  const full = () => createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 12 } })
  const columns = (prefix: string): DataTableColumnConfig[] => [
    { id: `${prefix}-code`, accessor: 'code', header: 'Code', enableSorting: false, enableColumnFilter: false, align: 'start', useDateFormat: '', pin: '', html: '', sortField: '', lines: '', rowHeader: false, mergeRows: false, mergeColumns: false, group: '', ...DEFAULT_COLUMN_SIZING },
    { id: `${prefix}-name`, accessor: 'name', header: 'Name', enableSorting: false, enableColumnFilter: false, align: 'start', useDateFormat: '', pin: '', html: '', sortField: '', lines: '', rowHeader: false, mergeRows: false, mergeColumns: false, group: '', ...DEFAULT_COLUMN_SIZING },
    { id: `${prefix}-updated-at`, accessor: 'updated_at', header: 'Update Date', enableSorting: false, enableColumnFilter: false, align: 'start', useDateFormat: 'DD/MM/YYYY HH:mm', pin: '', html: '', sortField: '', lines: '', rowHeader: false, mergeRows: false, mergeColumns: false, group: '', ...DEFAULT_COLUMN_SIZING },
    { id: `${prefix}-updated-by`, accessor: 'updated_by_name', header: 'Updated By', enableSorting: false, enableColumnFilter: false, align: 'start', useDateFormat: '', pin: '', html: '', sortField: '', lines: '', rowHeader: false, mergeRows: false, mergeColumns: false, group: '', ...DEFAULT_COLUMN_SIZING },
  ]
  const caption = (id: string, text: string): GridItemData => ({
    id,
    label: 'Text',
    type: 'text',
    settings: full(),
    config: { ...createDefaultTextConfig(), text },
  })
  const table = (id: string, config: Partial<DataTableConfig>): GridItemData => ({
    id,
    label: 'Data Table',
    type: 'datatable',
    settings: full(),
    config: {
      ...createDefaultDataTableConfig(config.name ?? 'dtPaged'),
      canEdit: false,
      canDelete: false,
      apiPaths: 'data',
      ...config,
    },
  })
  const paged = (extra: Partial<DataTablePaginationConfig>): DataTablePaginationConfig => ({
    ...createDefaultPaginationConfig(),
    enabled: true,
    searchKey: 'search',
    defaultPageSize: 5,
    pageSizeOptions: [5, 10, 20],
    ...extra,
  })
  return [
    caption(
      'seed-item-pagination-heading',
      'Pagination — where offset/limit go. Select a table, then Props → Server pagination.',
    ),
    caption(
      'seed-item-pagination-query-caption',
      'Query string: the GET endpoint declares a query model and no body, so placement "auto" resolves to the query string — GET /collection/page?offset=0&limit=5&search=',
    ),
    table('seed-item-pagination-query', {
      name: 'dtPagedQuery',
      title: 'Countries — query placement',
      endpointId: COUNTRIES_PAGED_GET_ENDPOINT_ID,
      columns: columns('seed-col-pg-query'),
      pagination: paged({}),
    }),
    caption(
      'seed-item-pagination-body-caption',
      'Request body: the POST endpoint declares a body model, so the same keys land in the body — placement "body" is picked explicitly here to show the override.',
    ),
    table('seed-item-pagination-body', {
      name: 'dtPagedBody',
      title: 'Countries — body placement',
      endpointId: COUNTRIES_PAGED_ENDPOINT_ID,
      columns: columns('seed-col-pg-body'),
      pagination: paged({ placement: 'body' }),
    }),
    caption(
      'seed-item-pagination-client-caption',
      'Client side: server pagination off — the rows are fetched once and paged, sorted and filtered in memory.',
    ),
    table('seed-item-pagination-client', {
      name: 'dtPagedClient',
      title: 'Countries — in-memory paging',
      endpointId: COUNTRIES_ENDPOINT_ID,
      columns: columns('seed-col-pg-client').map((c) => ({ ...c, enableSorting: true })),
    }),
  ]
}

/** The seeded Countries table's server pagination over `countriesPagedGet`. */
export function countryTablePagination(): DataTablePaginationConfig {
  return {
    ...createDefaultPaginationConfig(),
    enabled: true,
    searchKey: 'search',
    pageSizeOptions: [5, 10, 20],
  }
}

/** The languages sub-resource models (the FormList demo on the detail page). */
export function languageSeedModels(): ModelDef[] {
  return [
    {
      id: LANGUAGE_RES_MODEL_ID,
      name: 'languageRes',
      fields: [
        field('data', 'array', [field('_id'), field('countryId'), field('country'), field('name')], 'object'),
        field('status', 'number'),
        field('success', 'boolean'),
        field('message'),
      ],
    },
    {
      id: LANGUAGE_BODY_MODEL_ID,
      name: 'languageBody',
      fields: [field('country'), field('name')],
    },
    {
      id: LANGUAGE_COUNTRY_PARAM_MODEL_ID,
      name: 'languageCountryParam',
      fields: [field('country')],
    },
    {
      id: LANGUAGE_PARAM_MODEL_ID,
      name: 'languageParam',
      fields: [field('country'), field('id')],
    },
  ]
}

/** The Form list demo page's models: contacts (full CRUD) and notes. */
export function formListDemoSeedModels(): ModelDef[] {
  const envelope = () => [field('status', 'number'), field('success', 'boolean'), field('message')]
  return [
    {
      id: CONTACT_RES_MODEL_ID,
      name: 'contactRes',
      fields: [
        field('data', 'array', [field('_id'), field('name'), field('email'), field('role')], 'object'),
        ...envelope(),
      ],
    },
    {
      id: CONTACT_BODY_MODEL_ID,
      name: 'contactBody',
      fields: [field('name'), field('email'), field('role')],
    },
    {
      id: NOTE_RES_MODEL_ID,
      name: 'noteRes',
      fields: [
        field('data', 'array', [field('_id'), field('text'), field('createdAt')], 'object'),
        ...envelope(),
      ],
    },
    {
      id: NOTE_BODY_MODEL_ID,
      name: 'noteBody',
      fields: [field('text')],
    },
    {
      id: ID_PARAM_MODEL_ID,
      name: 'idParam',
      fields: [field('id')],
    },
  ]
}

/** The Repeater demo's model: regions, each carrying its `countries[]`. */
export function repeaterDemoSeedModels(): ModelDef[] {
  return [
    {
      id: REGION_RES_MODEL_ID,
      name: 'regionRes',
      fields: [
        field(
          'data',
          'array',
          [
            field('_id'),
            field('name'),
            field('description'),
            field('about'),
            field('featured', 'boolean'),
            field(
              'countries',
              'array',
              [field('_id'), field('name'), field('code'), field('avatar', 'any')],
              'object',
            ),
          ],
          'object',
        ),
        field('status', 'number'),
        field('success', 'boolean'),
        field('message'),
      ],
    },
  ]
}

/* ------------------------------------------------------------- endpoints */

export const SEARCH_COUNTRIES_ENDPOINT_ID = 'seed-endpoint-search-countries'
export const COUNTRIES_ENDPOINT_ID = 'seed-endpoint-countries'
export const COUNTRIES_PAGED_ENDPOINT_ID = 'seed-endpoint-countries-paged'
export const COUNTRIES_PAGED_GET_ENDPOINT_ID = 'seed-endpoint-countries-paged-get'
/** The seeded Countries table item (the v20 migration re-points it). */
export const COUNTRY_TABLE_ITEM_ID = 'seed-item-table'
export const COUNTRY_DETAIL_ENDPOINT_ID = 'seed-endpoint-country-detail'
export const CREATE_COUNTRY_ENDPOINT_ID = 'seed-endpoint-create-country'
export const UPDATE_COUNTRY_ENDPOINT_ID = 'seed-endpoint-update-country'
export const DELETE_COUNTRY_ENDPOINT_ID = 'seed-endpoint-delete-country'
export const COUNTRY_LANGUAGES_ENDPOINT_ID = 'seed-endpoint-country-languages'
export const CREATE_LANGUAGE_ENDPOINT_ID = 'seed-endpoint-create-language'
export const UPDATE_LANGUAGE_ENDPOINT_ID = 'seed-endpoint-update-language'
export const DELETE_LANGUAGE_ENDPOINT_ID = 'seed-endpoint-delete-language'
export const CONTACTS_ENDPOINT_ID = 'seed-endpoint-contacts'
export const CREATE_CONTACT_ENDPOINT_ID = 'seed-endpoint-create-contact'
export const UPDATE_CONTACT_ENDPOINT_ID = 'seed-endpoint-update-contact'
export const DELETE_CONTACT_ENDPOINT_ID = 'seed-endpoint-delete-contact'
export const NOTES_ENDPOINT_ID = 'seed-endpoint-notes'
export const CREATE_NOTE_ENDPOINT_ID = 'seed-endpoint-create-note'
export const DELETE_NOTE_ENDPOINT_ID = 'seed-endpoint-delete-note'
export const REGIONS_ENDPOINT_ID = 'seed-endpoint-regions'

/** The example app's country endpoints (`config/country/api.ts`). */
export function countrySeedEndpoints(): EndpointDef[] {
  return [
    {
      id: SEARCH_COUNTRIES_ENDPOINT_ID,
      name: 'searchCountries',
      description: 'Search countries by name or code',
      url: '/collection/search',
      method: 'GET',
      withOptions: false,
      response: COUNTRY_RES_MODEL_ID,
      query: COUNTRY_SEARCH_QUERY_MODEL_ID,
      parameter: null,
      body: null,
    },
    {
      id: COUNTRIES_ENDPOINT_ID,
      name: 'countries',
      description: 'Get all countries',
      url: '/collection/get-all',
      method: 'POST',
      withOptions: false,
      response: COUNTRY_RES_MODEL_ID,
      query: null,
      parameter: null,
      body: COUNTRY_PAGE_BODY_MODEL_ID,
    },
    {
      id: COUNTRIES_PAGED_ENDPOINT_ID,
      name: 'countriesPaged',
      description: 'Get a page of countries (server-side pagination + search)',
      url: '/collection/page',
      method: 'POST',
      withOptions: false,
      response: COUNTRY_PAGED_RES_MODEL_ID,
      query: null,
      parameter: null,
      body: COUNTRY_PAGE_BODY_MODEL_ID,
    },
    {
      id: COUNTRY_DETAIL_ENDPOINT_ID,
      name: 'countryDetail',
      description: 'Get a single country by id',
      url: '/collection/detail/:id',
      method: 'GET',
      withOptions: false,
      response: COUNTRY_DETAIL_RES_MODEL_ID,
      query: null,
      parameter: COUNTRY_PARAM_MODEL_ID,
      body: null,
    },
    {
      id: CREATE_COUNTRY_ENDPOINT_ID,
      name: 'createCountry',
      description: 'Create country',
      url: '/collection/create/691e9963992636eb1560eadb',
      method: 'POST',
      withOptions: false,
      response: COUNTRY_RES_MODEL_ID,
      query: null,
      parameter: null,
      body: COUNTRY_BODY_MODEL_ID,
    },
    {
      id: UPDATE_COUNTRY_ENDPOINT_ID,
      name: 'updateCountry',
      description: 'Update country',
      url: '/collection/update/691e9963992636eb1560eadb/:id',
      method: 'PATCH',
      withOptions: false,
      response: COUNTRY_RES_MODEL_ID,
      query: null,
      parameter: COUNTRY_PARAM_MODEL_ID,
      body: COUNTRY_BODY_MODEL_ID,
    },
    {
      id: DELETE_COUNTRY_ENDPOINT_ID,
      name: 'deleteCountry',
      description: 'Delete country',
      url: '/collection/delete/691e9963992636eb1560eadb/:id',
      method: 'DELETE',
      withOptions: false,
      response: COUNTRY_RES_MODEL_ID,
      query: null,
      parameter: COUNTRY_PARAM_MODEL_ID,
      body: null,
    },
    ...pagedCountriesSeedEndpoints(),
    ...languageSeedEndpoints(),
    ...formListDemoSeedEndpoints(),
    ...repeaterDemoSeedEndpoints(),
    ...serverFilterSeedEndpoints(),
    ...tableLayoutSeedEndpoints(),
  ]
}

/** The languages sub-resource endpoints (`/collection/languages/:country[/:id]`,
 * `:country` = id or code). */
export function languageSeedEndpoints(): EndpointDef[] {
  return [
    {
      id: COUNTRY_LANGUAGES_ENDPOINT_ID,
      name: 'countryLanguages',
      description: 'Languages of a country',
      url: '/collection/languages/:country',
      method: 'GET',
      withOptions: false,
      response: LANGUAGE_RES_MODEL_ID,
      query: null,
      parameter: LANGUAGE_COUNTRY_PARAM_MODEL_ID,
      body: null,
    },
    {
      id: CREATE_LANGUAGE_ENDPOINT_ID,
      name: 'createLanguage',
      description: 'Add a language to a country',
      url: '/collection/languages/:country',
      method: 'POST',
      withOptions: false,
      response: LANGUAGE_RES_MODEL_ID,
      query: null,
      parameter: LANGUAGE_COUNTRY_PARAM_MODEL_ID,
      body: LANGUAGE_BODY_MODEL_ID,
    },
    {
      id: UPDATE_LANGUAGE_ENDPOINT_ID,
      name: 'updateLanguage',
      description: 'Update a language',
      url: '/collection/languages/:country/:id',
      method: 'PATCH',
      withOptions: false,
      response: LANGUAGE_RES_MODEL_ID,
      query: null,
      parameter: LANGUAGE_PARAM_MODEL_ID,
      body: LANGUAGE_BODY_MODEL_ID,
    },
    {
      id: DELETE_LANGUAGE_ENDPOINT_ID,
      name: 'deleteLanguage',
      description: 'Delete a language',
      url: '/collection/languages/:country/:id',
      method: 'DELETE',
      withOptions: false,
      response: LANGUAGE_RES_MODEL_ID,
      query: null,
      parameter: LANGUAGE_PARAM_MODEL_ID,
      body: null,
    },
  ]
}

/** The Form list demo page's endpoints (`/collection/contacts`, `/collection/notes`). */
export function formListDemoSeedEndpoints(): EndpointDef[] {
  const base = { withOptions: false, query: null } as const
  return [
    { ...base, id: CONTACTS_ENDPOINT_ID, name: 'contacts', description: 'List contacts', url: '/collection/contacts', method: 'GET', response: CONTACT_RES_MODEL_ID, parameter: null, body: null },
    { ...base, id: CREATE_CONTACT_ENDPOINT_ID, name: 'createContact', description: 'Create a contact', url: '/collection/contacts', method: 'POST', response: CONTACT_RES_MODEL_ID, parameter: null, body: CONTACT_BODY_MODEL_ID },
    { ...base, id: UPDATE_CONTACT_ENDPOINT_ID, name: 'updateContact', description: 'Update a contact', url: '/collection/contacts/:id', method: 'PATCH', response: CONTACT_RES_MODEL_ID, parameter: ID_PARAM_MODEL_ID, body: CONTACT_BODY_MODEL_ID },
    { ...base, id: DELETE_CONTACT_ENDPOINT_ID, name: 'deleteContact', description: 'Delete a contact', url: '/collection/contacts/:id', method: 'DELETE', response: CONTACT_RES_MODEL_ID, parameter: ID_PARAM_MODEL_ID, body: null },
    { ...base, id: NOTES_ENDPOINT_ID, name: 'notes', description: 'List notes', url: '/collection/notes', method: 'GET', response: NOTE_RES_MODEL_ID, parameter: null, body: null },
    { ...base, id: CREATE_NOTE_ENDPOINT_ID, name: 'createNote', description: 'Create a note', url: '/collection/notes', method: 'POST', response: NOTE_RES_MODEL_ID, parameter: null, body: NOTE_BODY_MODEL_ID },
    { ...base, id: DELETE_NOTE_ENDPOINT_ID, name: 'deleteNote', description: 'Delete a note', url: '/collection/notes/:id', method: 'DELETE', response: NOTE_RES_MODEL_ID, parameter: ID_PARAM_MODEL_ID, body: null },
  ]
}

/** The Repeater demo's endpoint (the mock API's `/collection/regions`). */
export function repeaterDemoSeedEndpoints(): EndpointDef[] {
  return [
    {
      withOptions: false,
      query: null,
      id: REGIONS_ENDPOINT_ID,
      name: 'regions',
      description: 'List regions with their countries',
      url: '/collection/regions',
      method: 'GET',
      response: REGION_RES_MODEL_ID,
      parameter: null,
      body: null,
    },
  ]
}

/* ----------------------------------------------------------- form list */

export const LANGUAGES_ITEM_ID = 'seed-item-detail-languages'

/**
 * The Languages form list on the seeded detail page: two text fields per row
 * (country, name), every CRUD call scoped by `:country` ← the route's `:code`,
 * update/delete keyed by the row's `_id`. Also appended to an existing seeded
 * project by the workspace migration (`migrateV11`).
 */
export function countryLanguagesSeedItem(): GridItemData {
  const country = { type: 'url', key: 'code', source: 'param' } as const
  const id = { type: 'row', key: '_id' } as const
  return {
    id: LANGUAGES_ITEM_ID,
    label: 'Form List',
    type: 'formlist',
    settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 12 } }),
    config: {
      ...createDefaultFormListConfig('countryLanguages'),
      title: 'Languages',
      idKey: '_id',
      addLabel: 'Add new language',
      emptyText: 'No languages yet — add the first one.',
      read: { endpointId: COUNTRY_LANGUAGES_ENDPOINT_ID, params: { country }, extra: {} },
      create: { endpointId: CREATE_LANGUAGE_ENDPOINT_ID, params: { country }, extra: {} },
      update: { endpointId: UPDATE_LANGUAGE_ENDPOINT_ID, params: { country, id }, extra: {} },
      delete: { endpointId: DELETE_LANGUAGE_ENDPOINT_ID, params: { country, id }, extra: {} },
      deleteConfirmTitle: 'Remove language',
      deleteConfirmDescription: 'Remove this language from the country?',
    },
    childCanvases: [
      {
        ...createChildCanvas(),
        items: [
          {
            id: 'seed-item-language-country',
            label: 'Text Field',
            type: 'textfield',
            settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 3, md: 4, lg: 5 } }),
            config: { ...createDefaultTextFieldConfig('country'), label: 'Country' },
          },
          {
            id: 'seed-item-language-name',
            label: 'Text Field',
            type: 'textfield',
            settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 3, md: 4, lg: 7 } }),
            config: {
              ...createDefaultTextFieldConfig('name'),
              label: 'Name',
              isRequired: true,
              errorMessage: 'Name is required',
            },
          },
        ],
      },
    ],
  }
}

/* ------------------------------------------------------------------- env */

/** API_URL preset to the mock API (`apps/api`), so the Live Preview fetches
 * real countries with zero setup when it's running (`bun run api`). */
export function countrySeedEnvVars(): EnvVarDef[] {
  return [
    {
      id: 'seed-env-api-url',
      name: 'API_URL',
      value: 'http://localhost:9000',
      locked: true,
    },
  ]
}

/* ----------------------------------------------------------------- theme */

/**
 * The example app's theme (`config/theme.ts`): teal accent + button, dataTable
 * header font tweaks, teal edit / red delete. The header/hover/pagination/
 * row-hover roles stay unset so they follow the accent and dark-flip (pinning
 * them routes into the legacy light-only map — the Theme page warns).
 */
export function countrySeedTheme(): StudioThemeConfig {
  return {
    appearance: 'light',
    accentColor: 'teal',
    radius: 'small',
    panelBackground: 'translucent',
    buttonColor: 'teal',
    dataTable: {
      headerColor: '',
      headerTextColor: '',
      headerFontSize: 'sm',
      headerFontWeight: 'semibold',
      headerHoverColor: '',
      paginationButtonColor: '',
      paginationButtonHoverColor: '',
      rowHoverColor: '',
      editButtonColor: 'teal',
      deleteButtonColor: 'red',
    },
  }
}

/* ------------------------------------------------------------------ grid */

/**
 * The starter canvas: an "Add Country" modal whose child canvas carries the
 * bound country form (name + code — the same binding keys `countryBody`
 * expects), above a data table wired to `searchCountries` — enough to demo the
 * whole pipeline, including drill-in (Edit contents on the modal cell) and the
 * engine actually opening the modal in the Live Preview.
 */
export function countrySeedGridItems(): GridItemData[] {
  // `errorMessage` stays empty in the seeds: the canvas preview renders a
  // non-empty message as an active error (red field), which would make the
  // form look broken before anyone typed. Authors fill it in the inspector.
  const nameField: GridItemData = {
    id: 'seed-item-name',
    label: 'Text Field',
    type: 'textfield',
    settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 12 } }),
    config: {
      ...createDefaultTextFieldConfig('name'),
      label: 'Name',
      placeholder: 'Country name',
      isRequired: true,
    },
  }
  const codeField: GridItemData = {
    id: 'seed-item-code',
    label: 'Text Field',
    type: 'textfield',
    settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 4, lg: 6 } }),
    config: {
      ...createDefaultTextFieldConfig('code'),
      label: 'Code',
      placeholder: 'TH',
      isRequired: true,
    },
  }

  // The wired Save button (see the grilled button design): confirm-first, the
  // canonical submit sequence, createCountry as the endpoint, reload the
  // countries table, success + $exception snackbars — the same shape as the
  // example app's Create button, so the Live Preview exercises the whole
  // create → reload → snackbar path against the mock API.
  // The table's modal contents (its child canvas → engine `modalContainer`),
  // opened by a row's Edit over that row and by the table's Add button over
  // an empty row: the bound country form plus a confirm-first Create button
  // (`showWhen: 'adding'`, POST) and Update button (`showWhen: 'editing'`,
  // PATCH) — the example app's shared form with its `_id` conditions.
  const editNameField: GridItemData = {
    ...nameField,
    id: 'seed-item-edit-name',
  }
  const editCodeField: GridItemData = {
    ...codeField,
    id: 'seed-item-edit-code',
  }
  const createButton = countryCreateButtonSeedItem()
  const updateButton: GridItemData = {
    id: COUNTRY_UPDATE_BUTTON_ITEM_ID,
    label: 'Button',
    type: 'button',
    showWhen: 'editing',
    settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 3, md: 3, lg: 4 } }),
    config: {
      ...createDefaultButtonItemConfig(),
      label: 'Update',
      icon: 'save',
      mode: 'confirm',
      confirmTitle: 'Update Country',
      confirmDescription: 'Are you sure you want to update this country?',
      confirmTrue: ['StartLoading', 'SubmitFormToPatchAPI', 'StopLoading', 'CloseModal'],
      // No modal target: the engine's CloseModal always closes the table's own
      // edit modal (the hardcoded "modalEdit" fn ctx).
      reloadTableItemId: 'seed-item-table',
      endpointId: UPDATE_COUNTRY_ENDPOINT_ID,
      snackbarSuccessEnabled: true,
      snackbarSuccessMessage: 'Country updated successfully',
      snackbarErrorException: true,
    },
  }

  return [
    {
      id: COUNTRY_TABLE_ITEM_ID,
      label: 'Data Table',
      type: 'datatable',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 12 } }),
      config: {
        ...createDefaultDataTableConfig('dtCountry'),
        title: 'Countries',
        // The table's own Add button (was a standalone "Add Country" modal).
        canAdd: true,
        addButton: { ...COUNTRY_ADD_BUTTON },
        // Server-paged over the GET page endpoint (query-string placement).
        endpointId: COUNTRIES_PAGED_GET_ENDPOINT_ID,
        apiPaths: 'data',
        pagination: countryTablePagination(),
        modalMaxWidth: '800px',
        modalMinWidth: '700px',
        // The example app's apiDeleteInfo (config/country/container.ts), authored
        // through the panel's delete section instead of hand-wired.
        deleteEndpointId: DELETE_COUNTRY_ENDPOINT_ID,
        deleteParams: { id: '_id' },
        // Row click → the detail page, `:code` read off the clicked row (the
        // engine's rowNavigate; see the grilled page-router design).
        rowNavigate: {
          pageId: 'seed-page-country-detail',
          params: { code: { type: 'row', key: 'code' } },
          replace: false,
        },
        deleteConfirmTitle: 'Delete Country',
        deleteConfirmDescription: 'Are you sure you want to delete this country?',
        deleteSnackbarSuccessEnabled: true,
        deleteSnackbarSuccessMessage: 'Country deleted successfully',
        deleteSnackbarErrorException: true,
        columns: [
          {
            id: 'seed-col-code',
            accessor: 'code',
            header: 'Code',
            enableSorting: true,
            enableColumnFilter: false,
            align: 'center',
            useDateFormat: '', pin: '', html: '', sortField: '', lines: '', rowHeader: false, mergeRows: false, mergeColumns: false, group: '', ...DEFAULT_COLUMN_SIZING,
          },
          {
            id: 'seed-col-name',
            accessor: 'name',
            header: 'Name',
            enableSorting: true,
            enableColumnFilter: false,
            align: 'start',
            useDateFormat: '', pin: '', html: '', sortField: '', lines: '', rowHeader: false, mergeRows: false, mergeColumns: false, group: '', ...DEFAULT_COLUMN_SIZING,
          },
          {
            id: 'seed-col-updated-at',
            accessor: 'updated_at',
            header: 'Updated',
            enableSorting: true,
            enableColumnFilter: false,
            align: 'center',
            useDateFormat: 'DD/MM/YYYY', pin: '', html: '', sortField: '', lines: '', rowHeader: false, mergeRows: false, mergeColumns: false, group: '', ...DEFAULT_COLUMN_SIZING,
          },
          {
            id: 'seed-col-updated-by',
            accessor: 'updated_by_name',
            header: 'Updated by',
            enableSorting: false,
            enableColumnFilter: false,
            align: 'center',
            useDateFormat: '', pin: '', html: '', sortField: '', lines: '', rowHeader: false, mergeRows: false, mergeColumns: false, group: '', ...DEFAULT_COLUMN_SIZING,
          },
        ],
      },
      childCanvases: [
        { ...createChildCanvas(), items: [editNameField, editCodeField, createButton, updateButton] },
      ],
    },
  ]
}

/** The seeded Countries table's Add button (the v23 migration sets it too). */
export const COUNTRY_ADD_BUTTON: ButtonConfig = { label: 'Add Country', icon: 'puls', variant: 'contained' }
export const COUNTRY_CREATE_BUTTON_ITEM_ID = 'seed-item-create-country'
export const COUNTRY_UPDATE_BUTTON_ITEM_ID = 'seed-item-update-country'
/** The standalone Add modal the table's own Add button replaced (removed by the v23 migration). */
export const COUNTRY_MODAL_ITEM_ID = 'seed-item-country-modal'

/**
 * The Create button of the seeded Countries table's modal: shown only while
 * adding, posts the form to `createCountry` then reloads the table. Also what
 * the v23 migration adds to an existing seeded project's modal canvas.
 */
export function countryCreateButtonSeedItem(): GridItemData {
  return {
    id: COUNTRY_CREATE_BUTTON_ITEM_ID,
    label: 'Button',
    type: 'button',
    showWhen: 'adding',
    settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 3, md: 3, lg: 4 } }),
    config: {
      ...createDefaultButtonItemConfig(),
      label: 'Create',
      icon: 'save',
      mode: 'confirm',
      confirmTitle: 'Create Country',
      confirmDescription: 'Are you sure you want to create this country?',
      confirmTrue: ['StartLoading', 'SubmitFormToPostAPI', 'StopLoading', 'CloseModal'],
      reloadTableItemId: 'seed-item-table',
      endpointId: CREATE_COUNTRY_ENDPOINT_ID,
      snackbarSuccessEnabled: true,
      snackbarSuccessMessage: 'Country created successfully',
      snackbarErrorException: true,
    },
  }
}

/**
 * The "Option display" example page (see the grilled option-display design): the
 * three select-family fields with their icon / title / subtitle / image already
 * configured, so the Props panel's "Option display" section and the Live Preview
 * dropdowns have something to show.
 *
 * - `status` is static: title `name`, subtitle `note`, one option icon.
 * - `countryId` / `neighbourIds` read `searchCountries` rows: title `name`,
 *   subtitle `code`, image `avatar` (the flag). Their static starter record
 *   mirrors the row shape only so the canvas cell can draw a chip — source mode
 *   exports `options: []`.
 */
export function optionDisplaySeedItems(): GridItemData[] {
  const countryRow = {
    _id: '1',
    name: 'Thailand',
    code: 'TH',
    avatar: 'https://flagcdn.com/w40/th.png',
  }
  const countrySource = {
    mode: 'source' as const,
    options: [countryRow],
    dataSource: { endpointId: SEARCH_COUNTRIES_ENDPOINT_ID, paths: 'data' },
    idKey: '_id',
    displayKey: 'name',
    searchKey: 'name',
    subtitleKey: 'code',
    avatarKey: 'avatar',
  }
  return [
    {
      id: 'seed-item-options-heading',
      label: 'Text',
      type: 'text',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 12 } }),
      config: {
        ...createDefaultTextConfig(),
        text: 'Option display — select a field, then Props → Option display. Preview shows the real dropdowns.',
      },
    },
    {
      id: 'seed-item-options-status',
      label: 'Select',
      type: 'select',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 4, lg: 4 } }),
      config: {
        ...createDefaultSelectFieldConfig('status'),
        label: 'Status',
        placeholder: 'Choose a status',
        options: [
          { id: 'draft', name: 'Draft', note: 'Only you can see it' },
          { id: 'review', name: 'In review', note: 'Waiting for an approver' },
          { id: 'published', name: 'Published', note: 'Live for everyone' },
        ],
        subtitleKey: 'note',
        inputIcon: 'flag',
        itemIcon: 'checkCircle',
      },
    },
    {
      id: 'seed-item-options-country',
      label: 'Autocomplete',
      type: 'autocomplete',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 4, lg: 4 } }),
      config: {
        ...createDefaultAutocompleteConfig('countryId'),
        ...countrySource,
        label: 'Country',
        placeholder: 'Search a country…',
        inputIcon: 'globe',
        // Shown only on rows without a flag — the image wins.
        itemIcon: 'mapPin',
      },
    },
    {
      id: 'seed-item-options-neighbours',
      label: 'Multi Autocomplete',
      type: 'multiAutocomplete',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 4 } }),
      config: {
        ...createDefaultMultiAutocompleteConfig('neighbourIds'),
        ...countrySource,
        label: 'Neighbouring countries',
        placeholder: 'Choose countries…',
        helperText: 'Pick up to five',
        inputIcon: 'compass',
        maxSelections: 5,
      },
    },
  ]
}

/**
 * The "Icons" example page: the two icon slots on their own, without an image
 * field, so what each one does is easy to see in the Props panel and the Live
 * Preview — `itemIcon` is one glyph on every row, `inputIcon` sits in the
 * trigger. All static so the page works without the API.
 */
export function iconDemoSeedItems(): GridItemData[] {
  return [
    {
      id: 'seed-item-icons-heading',
      label: 'Text',
      type: 'text',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 12 } }),
      config: {
        ...createDefaultTextConfig(),
        text: 'Icons — Option icon draws one glyph on every row, Input icon sits in the trigger. Select a field, then Props → Option display.',
      },
    },
    {
      // Option icon only: the trigger keeps the default search glyph.
      id: 'seed-item-icons-priority',
      label: 'Select',
      type: 'select',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 4, lg: 4 } }),
      config: {
        ...createDefaultSelectFieldConfig('priority'),
        label: 'Priority',
        placeholder: 'Option icon only',
        options: [
          { id: 'low', name: 'Low' },
          { id: 'medium', name: 'Medium' },
          { id: 'high', name: 'High' },
          { id: 'urgent', name: 'Urgent' },
        ],
        itemIcon: 'alertTriangle',
      },
    },
    {
      // Input icon only: plain rows, a glyph in the trigger.
      id: 'seed-item-icons-category',
      label: 'Autocomplete',
      type: 'autocomplete',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 4, lg: 4 } }),
      config: {
        ...createDefaultAutocompleteConfig('category'),
        mode: 'static',
        label: 'Category',
        placeholder: 'Input icon only',
        options: [
          { id: 'bug', name: 'Bug' },
          { id: 'feature', name: 'Feature' },
          { id: 'chore', name: 'Chore' },
          { id: 'docs', name: 'Documentation' },
        ],
        inputIcon: 'tag',
      },
    },
    {
      // Both icons plus a subtitle, on a multi.
      id: 'seed-item-icons-tags',
      label: 'Multi Autocomplete',
      type: 'multiAutocomplete',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 4 } }),
      config: {
        ...createDefaultMultiAutocompleteConfig('tags'),
        mode: 'static',
        label: 'Tags',
        placeholder: 'Both icons + subtitle',
        options: [
          { id: 'frontend', name: 'Frontend', note: 'React, CSS' },
          { id: 'backend', name: 'Backend', note: 'API, database' },
          { id: 'design', name: 'Design', note: 'Figma, tokens' },
          { id: 'infra', name: 'Infra', note: 'CI, hosting' },
        ],
        subtitleKey: 'note',
        itemIcon: 'hash',
        inputIcon: 'bookmark',
        maxSelections: 3,
      },
    },
  ]
}

export const FORM_LIST_PAGE_ID = 'seed-page-form-list'

/**
 * The "Form list" demo page's items (the example app's `/form-list`): a
 * full-CRUD contacts list — name, email and a static-options role select per
 * row — and a create-and-delete-only notes list that starts empty. Used by
 * the fresh seed and appended to an existing seeded project by `migrateV12`.
 */
export function formListDemoSeedItems(): GridItemData[] {
  const rowId = { type: 'row', key: '_id' } as const
  const ref = (endpointId: string, params: Record<string, typeof rowId> = {}) => ({
    endpointId,
    params,
    extra: {},
  })
  const full = { xs: 4, sm: 6, md: 8, lg: 12 }
  return [
    {
      id: 'seed-item-form-list-heading',
      label: 'Text',
      type: 'text',
      settings: createDefaultItemSettings({ colSpan: full }),
      config: {
        ...createDefaultTextConfig(),
        text: 'Form list — each row is its own form. Contacts is full CRUD; Notes has no update API (saved rows are read-only) and starts empty.',
      },
    },
    {
      id: 'seed-item-form-list-contacts',
      label: 'Form List',
      type: 'formlist',
      settings: createDefaultItemSettings({ colSpan: full }),
      config: {
        ...createDefaultFormListConfig('contacts'),
        title: 'Contacts',
        idKey: '_id',
        addLabel: 'Add contact',
        emptyText: 'No contacts yet.',
        read: ref(CONTACTS_ENDPOINT_ID),
        create: ref(CREATE_CONTACT_ENDPOINT_ID),
        update: ref(UPDATE_CONTACT_ENDPOINT_ID, { id: rowId }),
        delete: ref(DELETE_CONTACT_ENDPOINT_ID, { id: rowId }),
        deleteConfirmTitle: 'Delete contact',
        deleteConfirmDescription: 'Remove this contact from the list?',
      },
      childCanvases: [
        {
          ...createChildCanvas(),
          items: [
            {
              id: 'seed-item-contact-name',
              label: 'Text Field',
              type: 'textfield',
              settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 3, md: 4, lg: 4 } }),
              config: {
                ...createDefaultTextFieldConfig('name'),
                label: 'Name',
                isRequired: true,
                errorMessage: 'Name is required',
              },
            },
            {
              id: 'seed-item-contact-email',
              label: 'Text Field',
              type: 'textfield',
              settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 3, md: 4, lg: 4 } }),
              config: {
                ...createDefaultTextFieldConfig('email'),
                label: 'Email',
                dataType: 'email',
                placeholder: 'name@example.com',
              },
            },
            {
              id: 'seed-item-contact-role',
              label: 'Select',
              type: 'select',
              settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 4, lg: 4 } }),
              config: {
                ...createDefaultSelectFieldConfig('role'),
                label: 'Role',
                placeholder: 'Pick a role',
                isRequired: true,
                errorMessage: 'Pick a role',
                options: [
                  { id: 'admin', name: 'Admin' },
                  { id: 'editor', name: 'Editor' },
                  { id: 'viewer', name: 'Viewer' },
                ],
                inputIcon: 'user',
              },
            },
          ],
        },
      ],
    },
    {
      id: 'seed-item-form-list-notes',
      label: 'Form List',
      type: 'formlist',
      settings: createDefaultItemSettings({ colSpan: full }),
      config: {
        ...createDefaultFormListConfig('notes'),
        title: 'Notes',
        idKey: '_id',
        canUpdate: false,
        // Chrome placement: Add above the rows on the right, Delete below each row.
        addLabel: 'Add note',
        addPosition: 'top',
        addAlign: 'end',
        removeLabel: 'Delete',
        removeIcon: 'xCircle',
        removePosition: 'below',
        removeDisplay: 'icon',
        emptyText: 'Nothing here yet — add the first note.',
        read: ref(NOTES_ENDPOINT_ID),
        create: ref(CREATE_NOTE_ENDPOINT_ID),
        delete: ref(DELETE_NOTE_ENDPOINT_ID, { id: rowId }),
        deleteConfirmTitle: 'Delete note',
        deleteConfirmDescription: 'Delete this note?',
      },
      childCanvases: [
        {
          ...createChildCanvas(),
          items: [
            {
              id: 'seed-item-note-text',
              label: 'Text Field',
              type: 'textfield',
              settings: createDefaultItemSettings({ colSpan: full }),
              config: {
                ...createDefaultTextFieldConfig('text'),
                label: 'Note',
                isRequired: true,
                errorMessage: 'Write something first',
                placeholder: 'What should the team remember?',
              },
            },
          ],
        },
      ],
    },
  ]
}

/* ------------------------------------------------------------ repeater */

export const REPEATER_PAGE_ID = 'seed-page-repeater'

/**
 * The "Repeater" demo page's items (the example app's `/repeater`): a country
 * card grid over the `countries` endpoint — avatar / name / code bound to the
 * item, the whole card linking to the detail page — and a regions list whose
 * items host a nested repeater over the parent item's `countries` field, each
 * inner row with its own Navigate button. Used by the fresh seed and appended
 * to an existing seeded project by `migrateV15`.
 */
export function repeaterDemoSeedItems(): GridItemData[] {
  const full = { xs: 4, sm: 6, md: 8, lg: 12 }
  const span = (lg: number) => ({
    xs: Math.max(1, Math.round((lg / 12) * 4)),
    sm: Math.max(1, Math.round((lg / 12) * 6)),
    md: Math.max(1, Math.round((lg / 12) * 8)),
    lg,
  })
  const bind = (key: string) => ({ key, path: '' })
  const toDetail = {
    pageId: 'seed-page-country-detail',
    params: { code: { type: 'row', key: 'code' } as const },
    replace: false,
  }
  const flag = (id: string, lg: number, size: 'sm' | 'lg'): GridItemData => ({
    id,
    label: 'Avatar',
    type: 'avatar',
    settings: createDefaultItemSettings({ colSpan: span(lg) }),
    config: {
      ...createDefaultAvatarConfig('flag'),
      size,
      fallback: '?',
      srcBinding: bind('avatar'),
      fallbackBinding: bind('code'),
    },
  })
  return [
    {
      id: 'seed-item-repeater-heading',
      label: 'Text',
      type: 'text',
      settings: createDefaultItemSettings({ colSpan: full }),
      config: {
        ...createDefaultTextConfig(),
        text: 'Repeater — one item template rendered per API row; the components inside bind to the current item.',
      },
    },
    {
      id: 'seed-item-repeater-countries',
      label: 'Repeater',
      type: 'repeater',
      settings: createDefaultItemSettings({ colSpan: full }),
      config: {
        ...createDefaultRepeaterConfig('countryCards'),
        title: 'Country cards',
        idKey: '_id',
        read: { endpointId: COUNTRIES_ENDPOINT_ID, params: {}, extra: {} },
        itemSpan: { xs: 12, sm: 6, md: 4, lg: 3 },
        itemSurface: 'outlined',
        itemPadding: '3',
        emptyText: 'No countries yet',
        itemNavigate: toDetail,
      },
      childCanvases: [
        {
          ...createChildCanvas(),
          items: [
            flag('seed-item-repeater-country-flag', 3, 'lg'),
            {
              id: 'seed-item-repeater-country-name',
              label: 'Typography',
              type: 'typography',
              settings: createDefaultItemSettings({ colSpan: span(6) }),
              config: {
                ...createDefaultTypographyConfig(),
                text: 'Unnamed country',
                variant: 'subtitle1',
                weight: 'medium',
                truncate: true,
                binding: bind('name'),
              },
            },
            {
              id: 'seed-item-repeater-country-code',
              label: 'Typography',
              type: 'typography',
              settings: createDefaultItemSettings({ colSpan: span(3) }),
              config: {
                ...createDefaultTypographyConfig(),
                text: '—',
                variant: 'caption',
                color: 'gray',
                align: 'right',
                binding: bind('code'),
              },
            },
          ],
        },
      ],
    },
    {
      id: 'seed-item-repeater-regions',
      label: 'Repeater',
      type: 'repeater',
      settings: createDefaultItemSettings({ colSpan: full }),
      config: {
        ...createDefaultRepeaterConfig('regions'),
        title: 'Regions (nested repeater)',
        idKey: '_id',
        read: { endpointId: REGIONS_ENDPOINT_ID, params: {}, extra: {} },
        itemSpan: { xs: 12, sm: 12, md: 6, lg: 6 },
        itemSurface: 'elevation',
        emptyText: 'No regions',
      },
      childCanvases: [
        {
          ...createChildCanvas(),
          items: [
            {
              id: 'seed-item-repeater-region-name',
              label: 'Typography',
              type: 'typography',
              settings: createDefaultItemSettings({ colSpan: full }),
              config: { ...createDefaultTypographyConfig(), text: 'Region', variant: 'h6', binding: bind('name') },
            },
            {
              id: 'seed-item-repeater-region-description',
              label: 'Typography',
              type: 'typography',
              settings: createDefaultItemSettings({ colSpan: full }),
              config: {
                ...createDefaultTypographyConfig(),
                text: '',
                variant: 'body2',
                color: 'gray',
                binding: bind('description'),
              },
            },
            {
              id: 'seed-item-repeater-region-countries',
              label: 'Repeater',
              type: 'repeater',
              settings: createDefaultItemSettings({ colSpan: full }),
              config: {
                ...createDefaultRepeaterConfig('regionCountries'),
                idKey: '_id',
                // The array is already in scope: a field of the region item.
                source: 'parent',
                parentField: 'countries',
                gap: '2',
                emptyText: 'No countries in this region',
              },
              childCanvases: [
                {
                  ...createChildCanvas(),
                  items: [
                    flag('seed-item-repeater-region-country-flag', 2, 'sm'),
                    {
                      id: 'seed-item-repeater-region-country-name',
                      label: 'Typography',
                      type: 'typography',
                      settings: createDefaultItemSettings({ colSpan: span(6) }),
                      config: {
                        ...createDefaultTypographyConfig(),
                        text: '',
                        variant: 'body2',
                        truncate: true,
                        binding: bind('name'),
                      },
                    },
                    {
                      id: 'seed-item-repeater-region-country-open',
                      label: 'Button',
                      type: 'button',
                      settings: createDefaultItemSettings({ colSpan: span(4) }),
                      config: {
                        ...createDefaultButtonItemConfig(),
                        label: 'Open',
                        icon: 'chevronRight',
                        actions: ['Navigate'],
                        navigate: toDetail,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ]
}

export const UPLOAD_PAGE_ID = 'seed-page-upload'

/**
 * The "Upload" example page (the example app's `/file-upload`): the file upload's
 * mode, accepted types and preview, one config per field so each is easy to
 * find in the Props panel. The canvas cells show stand-in files; picking real
 * ones — and the viewer — is exercised in the Live Preview. "Media via API"
 * posts to the mock API's `/upload/single`.
 */
export function uploadDemoSeedItems(): GridItemData[] {
  const half = createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 4, lg: 6 } })
  return [
    {
      id: 'seed-item-upload-heading',
      label: 'Text',
      type: 'text',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 12 } }),
      config: {
        ...createDefaultTextConfig(),
        text: 'Upload — mode, accepted types and preview. Select a field, then Props → Mode / Accepted types / Preview.',
      },
    },
    {
      // Single mode: the file replaces the dropzone and carries Replace / Remove.
      id: 'seed-item-upload-single',
      label: 'Upload File',
      type: 'uploadfile',
      settings: half,
      config: {
        ...createDefaultUploadFileConfig('contract'),
        label: 'Signed contract',
        helperText: 'Single file, PDF only, max 5 MB',
        acceptPresets: ['pdf'],
        maxSizeMB: 5,
      },
    },
    {
      // Presets + extra raw extensions; a mixed batch is accepted partially.
      id: 'seed-item-upload-project',
      label: 'Upload File',
      type: 'uploadfile',
      settings: half,
      config: {
        ...createDefaultUploadFileConfig('projectFiles'),
        label: 'Project files',
        helperText: 'Presets mixed with extra types — files that do not fit are skipped and named',
        multiple: true,
        maxFiles: 4,
        maxSizeMB: 10,
        acceptPresets: ['document', 'spreadsheet', 'presentation', 'archive'],
        accept: '.dwg,.psd',
      },
    },
    {
      // Grid preview: square cards, click for the viewer.
      id: 'seed-item-upload-gallery',
      label: 'Upload File',
      type: 'uploadfile',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 12 } }),
      config: {
        ...createDefaultUploadFileConfig('gallery'),
        label: 'Photo gallery',
        helperText: 'Grid preview — click a card for the viewer, ← / → to step through',
        multiple: true,
        maxFiles: 8,
        acceptPresets: ['image'],
        previewLayout: 'grid',
      },
    },
    {
      // API mode: the value holds URLs, which the viewer opens directly.
      id: 'seed-item-upload-media',
      label: 'Upload File',
      type: 'uploadfile',
      settings: half,
      config: {
        ...createDefaultUploadFileConfig('media'),
        label: 'Media via API',
        helperText: 'Uploaded to the API — PDF, audio, video and text open in the viewer',
        multiple: true,
        maxFiles: 3,
        acceptPresets: ['image', 'pdf', 'text', 'audio', 'video'],
        valueFormat: 'api',
        api: {
          uploadUrl: '/upload/single',
          deleteUrl: '/upload/:filename',
          fieldName: 'file',
          responsePath: 'data.url',
        },
      },
    },
    {
      // Preview off: plain rows, no thumbnails, no viewer.
      id: 'seed-item-upload-plain',
      label: 'Upload File',
      type: 'uploadfile',
      settings: half,
      config: {
        ...createDefaultUploadFileConfig('plainFiles'),
        label: 'Preview off',
        helperText: 'Plain rows — no thumbnails, no viewer',
        multiple: true,
        preview: false,
      },
    },
  ]
}

export const REGION_COUNTRY_RES_MODEL_ID = 'seed-model-region-country-res'
export const REGION_COUNTRIES_ENDPOINT_ID = 'seed-endpoint-region-countries'
export const TABLE_LAYOUT_PAGE_ID = 'seed-page-table-layout'

/** The Table layout demo's model: one flat row per country with its region. */
export function tableLayoutSeedModels(): ModelDef[] {
  return [
    {
      id: REGION_COUNTRY_RES_MODEL_ID,
      name: 'regionCountryRes',
      fields: [
        field(
          'data',
          'array',
          [
            field('_id'),
            field('region'),
            field('regionId'),
            field('name'),
            field('code'),
            field('created_by_name'),
            field('updated_by_name'),
            field('created_at'),
            field('updated_at'),
          ],
          'object',
        ),
        field('status', 'number'),
        field('success', 'boolean'),
        field('message'),
      ],
    },
  ]
}

/** The Table layout demo's endpoint (the mock API's `/collection/region-countries`). */
export function tableLayoutSeedEndpoints(): EndpointDef[] {
  return [
    {
      withOptions: false,
      query: null,
      id: REGION_COUNTRIES_ENDPOINT_ID,
      name: 'regionCountries',
      description: 'List countries with their region, one row each',
      url: '/collection/region-countries',
      method: 'GET',
      response: REGION_COUNTRY_RES_MODEL_ID,
      parameter: null,
      body: null,
    },
  ]
}

/**
 * The "Table layout" example page (the example app's `/table-layout`): the
 * header / cell layout keys on a column — Row header, Merge equal rows /
 * columns and Group header, all in the column card's "More". Two data tables
 * over `regionCountries` (the region repeats down the rows; creator and last
 * editor are equal on most rows). The example's editable table is not seeded:
 * the studio can't author its read paths.
 */
export function tableLayoutDemoSeedItems(): GridItemData[] {
  const full = () => createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 12 } })
  const column = (
    prefix: string,
    accessor: string,
    header: string,
    extra: Partial<DataTableColumnConfig> = {},
  ): DataTableColumnConfig => ({
    id: `${prefix}-${accessor}`,
    accessor,
    header,
    enableSorting: false,
    enableColumnFilter: false,
    align: 'start',
    useDateFormat: '',
    pin: '',
    html: '',
    sortField: '',
    lines: '',
    rowHeader: false,
    mergeRows: false,
    mergeColumns: false,
    group: '',
    ...DEFAULT_COLUMN_SIZING,
    ...extra,
  })
  const caption = (id: string, text: string): GridItemData => ({
    id,
    label: 'Text',
    type: 'text',
    settings: full(),
    config: { ...createDefaultTextConfig(), text },
  })
  const table = (id: string, config: Partial<DataTableConfig>): GridItemData => ({
    id,
    label: 'Data Table',
    type: 'datatable',
    settings: full(),
    config: {
      ...createDefaultDataTableConfig(config.name ?? 'dtLayout'),
      canEdit: false,
      canDelete: false,
      canSearchAllColumns: false,
      apiPaths: 'data',
      endpointId: REGION_COUNTRIES_ENDPOINT_ID,
      ...config,
    },
    childCanvases: [createChildCanvas(), createChildCanvas()],
  })
  const people = { group: 'People', mergeColumns: true, size: 150 }
  const dates = { group: 'Dates', useDateFormat: 'DD/MM/YYYY', size: 140 }
  return [
    caption(
      'seed-item-table-layout-heading',
      'Table layout — row header, group headers and merged cells are settings on a column (expand it → More): Row header, Merge equal rows / columns, Group header. One country per row with its region; the region repeats down the rows and the creator usually equals the last editor, which is what the merges pick up.',
    ),
    caption(
      'seed-item-table-layout-all-caption',
      'All of it together: Region is the row header and merges down equal rows; Created by / Updated by sit under a People group header and merge sideways when equal; the two dates sit under Dates. Country and Code have no group, so their headers span both header rows. Edit / delete keep the action column first.',
    ),
    table('seed-item-table-layout-all', {
      name: 'dtLayoutAll',
      title: 'Countries by region',
      canEdit: true,
      canDelete: true,
      columns: [
        column('seed-col-tl-all', 'region', 'Region', { rowHeader: true, mergeRows: true, size: 170 }),
        column('seed-col-tl-all', 'name', 'Country', { enableSorting: true, size: 180 }),
        column('seed-col-tl-all', 'code', 'Code', { size: 90 }),
        column('seed-col-tl-all', 'created_by_name', 'Created by', people),
        column('seed-col-tl-all', 'updated_by_name', 'Updated by', people),
        column('seed-col-tl-all', 'created_at', 'Created', dates),
        column('seed-col-tl-all', 'updated_at', 'Updated', { ...dates, enableSorting: true }),
      ],
    }),
    caption(
      'seed-item-table-layout-sorted-caption',
      'Merging follows the rows on screen: Updated by merges too here. Merge equal rows joins whatever consecutive rows share a value on the current page, so in the Live Preview click the Updated by header — the editor runs form and the Region runs split.',
    ),
    table('seed-item-table-layout-sorted', {
      name: 'dtLayoutSorted',
      title: 'Countries — sorted by editor',
      columns: [
        column('seed-col-tl-sorted', 'region', 'Region', { rowHeader: true, mergeRows: true, size: 170 }),
        column('seed-col-tl-sorted', 'name', 'Country', { enableSorting: true, size: 180 }),
        column('seed-col-tl-sorted', 'updated_by_name', 'Updated by', { enableSorting: true, mergeRows: true, size: 150 }),
        column('seed-col-tl-sorted', 'updated_at', 'Updated', { useDateFormat: 'DD/MM/YYYY HH:mm', size: 170 }),
      ],
    }),
  ]
}

export const CARD_PAGE_ID = 'seed-page-card'

/**
 * The Card demo page: the `card` element after MUI's Card — a basic card, a
 * media card, the "complex interaction" card (avatar, ⋮ action, media, expand
 * section) and, the case the element is for, cards inside a repeater over
 * `countries` with the header / media bound to the item.
 */
export function cardDemoSeedItems(): GridItemData[] {
  const full = { xs: 4, sm: 6, md: 8, lg: 12 }
  const third = { xs: 4, sm: 6, md: 4, lg: 4 }
  const bind = (key: string) => ({ key, path: '' })
  const text = (id: string, text: string, extra: Record<string, unknown> = {}): GridItemData => ({
    id,
    label: 'Typography',
    type: 'typography',
    settings: createDefaultItemSettings({ colSpan: full }),
    config: { ...createDefaultTypographyConfig(), text, variant: 'body2', ...extra },
  })
  const canvas = (items: GridItemData[]) => ({ ...createChildCanvas(), items })
  const learnMore = {
    ...createDefaultCardActionConfig('Learn more'),
    id: 'seed-card-action-learn-more',
    actions: ['Navigate' as const],
    navigate: { pageId: REPEATER_PAGE_ID, params: {}, replace: false },
  }
  return [
    text('seed-item-card-heading', 'Card — a Paper with slots: header (avatar, title, subheader, action), media, content, actions and an expandable section. Every slot is optional; inside a repeater the header and media bind to the item.', { color: 'gray' }),
    {
      id: 'seed-item-card-basic',
      label: 'Card',
      type: 'card',
      settings: createDefaultItemSettings({ colSpan: third }),
      config: {
        ...createDefaultCardConfig('cardBasic'),
        header: { ...createDefaultCardConfig('').header, title: '' },
        variant: 'outlined',
        actions: [learnMore],
      },
      childCanvases: [
        canvas([
          text('seed-item-card-basic-overline', 'Word of the Day', { variant: 'caption', color: 'gray' }),
          text('seed-item-card-basic-word', 'be•nev•o•lent', { variant: 'h5' }),
          text('seed-item-card-basic-pos', 'adjective', { color: 'gray' }),
          text('seed-item-card-basic-body', 'well meaning and kindly. "a benevolent smile"'),
        ]),
        canvas([]),
      ],
    },
    {
      id: 'seed-item-card-media',
      label: 'Card',
      type: 'card',
      settings: createDefaultItemSettings({ colSpan: third }),
      config: {
        ...createDefaultCardConfig('cardMedia'),
        header: { ...createDefaultCardConfig('').header, title: '' },
        media: { enabled: true, src: 'https://flagcdn.com/w640/au.png', srcBinding: null, alt: 'Australia', height: 140 },
        actions: [
          { ...createDefaultCardActionConfig('Share', 'share'), id: 'seed-card-action-share' },
          { ...learnMore, id: 'seed-card-action-learn-more-2' },
        ],
      },
      childCanvases: [
        canvas([
          text('seed-item-card-media-title', 'Lizard', { variant: 'h5' }),
          text('seed-item-card-media-body', 'Lizards are a widespread group of squamate reptiles, with over 6,000 species, ranging across all continents except Antarctica.', { color: 'gray' }),
        ]),
        canvas([]),
      ],
    },
    {
      id: 'seed-item-card-complex',
      label: 'Card',
      type: 'card',
      settings: createDefaultItemSettings({ colSpan: third }),
      config: {
        ...createDefaultCardConfig('cardComplex'),
        header: {
          ...createDefaultCardConfig('').header,
          title: 'Shrimp and Chorizo Paella',
          subheader: 'September 14, 2016',
          avatarEnabled: true,
          avatar: { ...createDefaultAvatarConfig(''), fallback: 'R' },
          actionEnabled: true,
        },
        media: { enabled: true, src: 'https://flagcdn.com/w640/es.png', srcBinding: null, alt: 'Paella', height: 160 },
        actions: [
          { ...createDefaultCardActionConfig('', 'heart'), id: 'seed-card-action-heart' },
          { ...createDefaultCardActionConfig('', 'share'), id: 'seed-card-action-share-2' },
        ],
        collapseEnabled: true,
        collapseLabel: 'Show method',
      },
      childCanvases: [
        canvas([
          text('seed-item-card-complex-body', 'This impressive paella is a perfect party dish and a fun meal to cook together with your guests.', { color: 'gray' }),
        ]),
        canvas([
          text('seed-item-card-complex-method', 'Method:', { variant: 'subtitle2' }),
          text('seed-item-card-complex-step', 'Heat 1/2 cup of the broth in a pot until simmering, add saffron and set aside for 10 minutes.'),
        ]),
      ],
    },
    text('seed-item-card-repeater-caption', 'Cards in a repeater — one card per country: title, subheader, avatar and image bind to the item; the button navigates with the item\'s code.', { color: 'gray' }),
    {
      id: 'seed-item-card-repeater',
      label: 'Repeater',
      type: 'repeater',
      settings: createDefaultItemSettings({ colSpan: full }),
      config: {
        ...createDefaultRepeaterConfig('countryCards'),
        idKey: '_id',
        read: { endpointId: COUNTRIES_ENDPOINT_ID, params: {}, extra: {} },
        itemSpan: { xs: 12, sm: 6, md: 4, lg: 3 },
        itemSurface: 'none',
        itemPadding: '0',
        emptyText: 'No countries yet',
      },
      childCanvases: [
        canvas([
          {
            id: 'seed-item-card-country',
            label: 'Card',
            type: 'card',
            settings: createDefaultItemSettings({ colSpan: full }),
            config: {
              ...createDefaultCardConfig('countryCard'),
              variant: 'outlined',
              header: {
                ...createDefaultCardConfig('').header,
                title: 'Unnamed country',
                titleBinding: bind('name'),
                subheader: '—',
                subheaderBinding: bind('code'),
                avatarEnabled: true,
                avatar: { ...createDefaultAvatarConfig(''), fallback: '?', srcBinding: bind('avatar'), fallbackBinding: bind('code') },
              },
              media: { enabled: true, src: '', srcBinding: bind('image'), alt: 'Flag', height: 120 },
              actions: [
                {
                  ...createDefaultCardActionConfig('Open', 'chevronRight'),
                  id: 'seed-card-action-open',
                  actions: ['Navigate' as const],
                  navigate: { pageId: 'seed-page-country-detail', params: { code: { type: 'row', key: 'code' } as const }, replace: false },
                },
              ],
              actionsAlign: 'end',
            },
            childCanvases: [
              canvas([
                {
                  id: 'seed-item-card-country-editor',
                  label: 'Typography',
                  type: 'typography',
                  settings: createDefaultItemSettings({ colSpan: full }),
                  config: { ...createDefaultTypographyConfig(), text: '—', variant: 'body2', color: 'gray', binding: bind('updated_by_name') },
                },
              ]),
              canvas([]),
            ],
          },
        ]),
      ],
    },
  ]
}

export const HTML_CONTENT_PAGE_ID = 'seed-page-html-content'

/**
 * The HTML content demo page: the `html` element — a static CMS-style block
 * beside a `prose: false` one, one block per region in a repeater with the
 * placeholders reading the item, and an `html` bin as a card's content.
 */
export function htmlContentDemoSeedItems(): GridItemData[] {
  const full = { xs: 4, sm: 6, md: 8, lg: 12 }
  const block = (id: string, name: string, html: string, extra: Record<string, unknown> = {}, colSpan = full): GridItemData => ({
    id,
    label: 'HTML',
    type: 'html',
    settings: createDefaultItemSettings({ colSpan }),
    config: { ...createDefaultHtmlContentConfig(name), html, ...extra },
  })
  return [
    {
      id: 'seed-item-html-heading',
      label: 'Typography',
      type: 'typography',
      settings: createDefaultItemSettings({ colSpan: full }),
      config: {
        ...createDefaultTypographyConfig(),
        text: 'HTML content — a block of markup: a {{path}} template over a bound value, escaped and sanitised like a data table HTML column, with in-app links and the dt-* helpers.',
        variant: 'body2',
        color: 'gray',
      },
    },
    block(
      'seed-item-html-static',
      'staticHtml',
      `<h2>Getting started</h2>
<p>Gummy UI screens are <strong>three plain-object configs</strong> — <code>model</code>, <code>api</code> and <code>container</code> — handed to <code>Core</code>.</p>
<ul>
  <li>Placeholders (a path in double curly braces) are filled with <em>escaped</em> text.</li>
  <li>Scripts, <code>&lt;style&gt;</code> and form controls are stripped by the sanitiser.</li>
  <li>Same-origin links are routed: <a href="/repeater">open the Repeater page</a>.</li>
</ul>
<blockquote>Describe the screen, don't write it.</blockquote>
<p>Helpers: <span class="dt-badge">accent badge</span> <span class="dt-badge dt-badge-gray">gray badge</span> <span class="dt-muted">muted</span> <span class="dt-strong">strong</span>.</p>`,
      {},
      { xs: 4, sm: 6, md: 8, lg: 8 },
    ),
    block(
      'seed-item-html-no-prose',
      'staticHtmlNoProse',
      `<div style="padding:16px;border-radius:12px;background:var(--accent-3);color:var(--accent-11)">
  <div style="font-weight:600;margin-bottom:4px">prose: false</div>
  <div style="font-size:13px">Markup that brings its own layout — inline styles and Radix vars, no typographic defaults.</div>
</div>`,
      { prose: false },
      { xs: 4, sm: 6, md: 8, lg: 4 },
    ),
    {
      id: 'seed-item-html-regions',
      label: 'Repeater',
      type: 'repeater',
      settings: createDefaultItemSettings({ colSpan: full }),
      config: {
        ...createDefaultRepeaterConfig('regionHtmlBlocks'),
        idKey: '_id',
        read: { endpointId: REGIONS_ENDPOINT_ID, params: {}, extra: {} },
        itemSpan: { xs: 12, sm: 12, md: 6, lg: 6 },
        itemSurface: 'outlined',
        itemPadding: '4',
        emptyText: 'No regions',
      },
      childCanvases: [
        {
          ...createChildCanvas(),
          items: [
            block(
              'seed-item-html-region',
              'regionHtml',
              `<h3>{{name}} <span class="dt-badge dt-badge-gray">{{countries.length}} countries</span></h3>
<p class="dt-muted">{{description}}</p>
<p>{{about}}</p>
<p>First on the list: <a href="/countries/{{countries.0.code}}">{{countries.0.name}}</a></p>`,
              { binding: { key: 'none', path: '' } },
            ),
          ],
        },
      ],
    },
    {
      id: 'seed-item-html-card',
      label: 'Card',
      type: 'card',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 4, lg: 4 } }),
      config: {
        ...createDefaultCardConfig('htmlCard'),
        variant: 'outlined',
        header: { ...createDefaultCardConfig('').header, title: 'Release notes', subheader: 'v1.4 — rendered from HTML' },
      },
      childCanvases: [
        {
          ...createChildCanvas(),
          items: [
            block(
              'seed-item-html-card-body',
              'cardHtml',
              `<ul>
  <li><span class="dt-badge">new</span> <code>card</code> and <code>html</code> elements</li>
  <li><span class="dt-badge dt-badge-gray">fix</span> repeater item spans</li>
</ul>`,
            ),
          ],
        },
        createChildCanvas(),
      ],
    },
  ]
}

export const DRAWER_PAGE_ID = 'seed-page-drawer'

/**
 * The Drawer demo page: the `drawer` element after MUI's temporary Drawer —
 * one drawer per anchor with a mail-list content, a form drawer whose Save
 * posts to `createContact` and whose Cancel closes it, and a header-less
 * 240px navigation drawer (the example app's `/drawer` minus the card trigger
 * and the OpenModal-by-id demo, which the studio can't author).
 */
export function drawerDemoSeedItems(): GridItemData[] {
  const full = { xs: 4, sm: 6, md: 8, lg: 12 }
  const typography = (id: string, text: string, extra: Record<string, unknown> = {}, colSpan = full): GridItemData => ({
    id,
    label: 'Typography',
    type: 'typography',
    settings: createDefaultItemSettings({ colSpan }),
    config: { ...createDefaultTypographyConfig(), text, variant: 'body2', ...extra },
  })
  const heading = (id: string, text: string, caption: string): GridItemData[] => [
    typography(`${id}-title`, text, { variant: 'subtitle1', weight: 'medium' }),
    typography(`${id}-caption`, caption, { color: 'gray' }),
  ]
  const divider = (id: string): GridItemData => ({
    id,
    label: 'Divider',
    type: 'divider',
    settings: createDefaultItemSettings({ colSpan: full }),
    config: { ...createDefaultDividerConfig(), spacing: 4 },
  })
  const mailList = (prefix: string): GridItemData[] => [
    ...['Inbox', 'Starred', 'Send email', 'Drafts'].map((t, i) => typography(`${prefix}-a${i}`, t, { variant: 'body1' })),
    divider(`${prefix}-divider`),
    ...['All mail', 'Trash', 'Spam'].map((t, i) => typography(`${prefix}-b${i}`, t, { variant: 'body1' })),
  ]
  const anchorDrawer = (anchor: DrawerAnchor, icon: string): GridItemData => {
    const label = anchor[0].toUpperCase() + anchor.slice(1)
    return {
      id: `seed-item-drawer-${anchor}`,
      label: 'Drawer',
      type: 'drawer',
      settings: createDefaultItemSettings({ colSpan: { xs: 2, sm: 3, md: 2, lg: 3 } }),
      config: {
        ...createDefaultDrawerConfig(`drawer-${anchor}`),
        title: label,
        description: `anchor: "${anchor}"`,
        anchor,
        trigger: { label, icon, variant: 'outlined' },
      },
      childCanvases: [{ ...createChildCanvas(), items: mailList(`seed-item-drawer-${anchor}`) }],
    }
  }
  return [
    typography(
      'seed-item-drawer-heading',
      'Drawer — MUI\'s temporary drawer: a panel sliding in over the page from one edge behind a scrim. It holds its own container (its own form, like a modal), opens from its trigger and closes on the scrim, Esc, its close button or a CloseModal button inside it. Open the Live Preview to try them.',
      { color: 'gray' },
    ),
    ...heading('seed-item-drawer-anchors', 'Anchor', 'One drawer per edge — left / right / top / bottom. Left / right drawers are 360px wide, top / bottom ones 50vh tall unless the size says otherwise.'),
    anchorDrawer('left', 'panelLeft'),
    anchorDrawer('right', 'panelRight'),
    anchorDrawer('top', 'panelTop'),
    anchorDrawer('bottom', 'panelBottom'),
    ...heading('seed-item-drawer-form-h', 'A form in a drawer', 'The content is its own form: validation, a Cancel button closing it (CloseModal targeting the drawer) and a Save button posting to createContact with a snackbar.'),
    {
      id: 'seed-item-drawer-form',
      label: 'Drawer',
      type: 'drawer',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 3, md: 3, lg: 3 } }),
      config: {
        ...createDefaultDrawerConfig('drawer-form'),
        title: 'New contact',
        description: "Saved to the Form list page's contacts",
        size: '420px',
        trigger: { label: 'New contact', icon: 'puls', variant: 'contained' },
      },
      childCanvases: [
        {
          ...createChildCanvas(),
          items: [
            {
              id: 'seed-item-drawer-form-name',
              label: 'Text Field',
              type: 'textfield',
              settings: createDefaultItemSettings({ colSpan: full }),
              config: { ...createDefaultTextFieldConfig('name'), label: 'Name', isRequired: true, errorMessage: 'Name is required', size: '2' },
            },
            {
              id: 'seed-item-drawer-form-email',
              label: 'Text Field',
              type: 'textfield',
              settings: createDefaultItemSettings({ colSpan: full }),
              config: { ...createDefaultTextFieldConfig('email'), label: 'Email', dataType: 'email', placeholder: 'name@example.com', size: '2' },
            },
            {
              id: 'seed-item-drawer-form-role',
              label: 'Select',
              type: 'select',
              settings: createDefaultItemSettings({ colSpan: full }),
              config: {
                ...createDefaultSelectFieldConfig('role'),
                label: 'Role',
                placeholder: 'Pick a role',
                options: [
                  { id: 'Engineering', name: 'Engineering' },
                  { id: 'Design', name: 'Design' },
                  { id: 'Sales', name: 'Sales' },
                ],
              },
            },
            {
              id: 'seed-item-drawer-form-cancel',
              label: 'Button',
              type: 'button',
              settings: createDefaultItemSettings({ colSpan: { xs: 2, sm: 3, md: 4, lg: 6 }, justifySelf: { xs: 'start', sm: 'start', md: 'start', lg: 'start' } }),
              config: {
                ...createDefaultButtonItemConfig(),
                label: 'Cancel',
                variant: 'text',
                actions: ['CloseModal'],
                modalItemId: 'seed-item-drawer-form',
              },
            },
            {
              id: 'seed-item-drawer-form-save',
              label: 'Button',
              type: 'button',
              settings: createDefaultItemSettings({ colSpan: { xs: 2, sm: 3, md: 4, lg: 6 }, justifySelf: { xs: 'end', sm: 'end', md: 'end', lg: 'end' } }),
              config: {
                ...createDefaultButtonItemConfig(),
                label: 'Save',
                icon: 'save',
                actions: ['StartLoading', 'SubmitFormToPostAPI', 'StopLoading', 'CloseModal'],
                modalItemId: 'seed-item-drawer-form',
                endpointId: CREATE_CONTACT_ENDPOINT_ID,
                snackbarSuccessEnabled: true,
                snackbarSuccessMessage: 'Contact saved',
                snackbarErrorException: true,
              },
            },
          ],
        },
      ],
    },
    ...heading('seed-item-drawer-nav-h', 'Header-less, custom size', 'Hide header drops the title row (the content brings its own heading; Esc and the scrim still close it) and the width is 240px — a navigation drawer.'),
    {
      id: 'seed-item-drawer-nav',
      label: 'Drawer',
      type: 'drawer',
      settings: createDefaultItemSettings({ colSpan: { xs: 2, sm: 3, md: 2, lg: 2 } }),
      config: {
        ...createDefaultDrawerConfig('drawer-nav'),
        title: 'Mail',
        anchor: 'left',
        size: '240px',
        hideHeader: true,
        trigger: { label: '', icon: 'menu', variant: 'outlined' },
      },
      childCanvases: [
        {
          ...createChildCanvas(),
          items: [
            typography('seed-item-drawer-nav-title', 'Mail', { variant: 'h6' }),
            typography('seed-item-drawer-nav-caption', 'Hide header · width 240px', { variant: 'caption', color: 'gray' }),
            divider('seed-item-drawer-nav-divider0'),
            ...mailList('seed-item-drawer-nav'),
          ],
        },
      ],
    },
  ]
}

export const CHIPS_PAGE_ID = 'seed-page-chips'

/**
 * The "Chips" demo page: what a multi autocomplete's selected chips carry. A
 * chip takes the option row's leading visual on its own — the Image field
 * over the Option icon — so the three multis differ only in Props → Option
 * display: flag chips (source mode over `searchCountries` with an Image
 * field), icon chips (a static list with an Option icon) and plain title
 * chips (neither). Pick a few in the Live Preview to compare them.
 */
export function chipsDemoSeedItems(): GridItemData[] {
  const third = { xs: 4, sm: 6, md: 4, lg: 4 }
  return [
    {
      id: 'seed-item-chips-heading',
      label: 'Text',
      type: 'text',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 8, lg: 12 } }),
      config: {
        ...createDefaultTextConfig(),
        text: 'Chips — a selected option keeps the visual of its row: the Image field wins over the Option icon, and the subtitle stays on the row. Nothing to switch on; pick a few in the Preview.',
      },
    },
    {
      // Image field → each chip leads with the country's flag.
      id: 'seed-item-chips-flags',
      label: 'Multi Autocomplete',
      type: 'multiAutocomplete',
      settings: createDefaultItemSettings({ colSpan: third }),
      config: {
        ...createDefaultMultiAutocompleteConfig('flagCountryIds'),
        mode: 'source',
        options: [{ _id: '1', name: 'Thailand', code: 'TH', avatar: 'https://flagcdn.com/w40/th.png' }],
        dataSource: { endpointId: SEARCH_COUNTRIES_ENDPOINT_ID, paths: 'data' },
        idKey: '_id',
        displayKey: 'name',
        searchKey: 'name',
        subtitleKey: 'code',
        avatarKey: 'avatar',
        label: 'Flag chips',
        placeholder: 'Image field',
        helperText: 'Chips lead with the row image',
        inputIcon: 'globe',
      },
    },
    {
      // Option icon, no image → the same glyph on every chip.
      id: 'seed-item-chips-icons',
      label: 'Multi Autocomplete',
      type: 'multiAutocomplete',
      settings: createDefaultItemSettings({ colSpan: third }),
      config: {
        ...createDefaultMultiAutocompleteConfig('labels'),
        mode: 'static',
        label: 'Icon chips',
        placeholder: 'Option icon',
        helperText: 'Chips lead with the option icon',
        options: [
          { id: 'bug', name: 'Bug', note: 'Something is broken' },
          { id: 'feature', name: 'Feature', note: 'Something new' },
          { id: 'chore', name: 'Chore', note: 'Housekeeping' },
          { id: 'docs', name: 'Documentation', note: 'Words, not code' },
        ],
        subtitleKey: 'note',
        itemIcon: 'tag',
        inputIcon: 'bookmark',
      },
    },
    {
      // Neither → title-only chips, the look before this page existed.
      id: 'seed-item-chips-plain',
      label: 'Multi Autocomplete',
      type: 'multiAutocomplete',
      settings: createDefaultItemSettings({ colSpan: third }),
      config: {
        ...createDefaultMultiAutocompleteConfig('weekdays'),
        mode: 'static',
        label: 'Plain chips',
        placeholder: 'No image, no icon',
        helperText: 'Title only',
        options: [
          { id: 'mon', name: 'Monday' },
          { id: 'tue', name: 'Tuesday' },
          { id: 'wed', name: 'Wednesday' },
          { id: 'thu', name: 'Thursday' },
          { id: 'fri', name: 'Friday' },
        ],
      },
    },
  ]
}

export const SWITCH_PAGE_ID = 'seed-page-switch'

/**
 * The "Switch" demo page (the example app's `/switch`): the `switch` element —
 * basics, the label on either side, sizes / variants, a disabled one, a pair
 * where one switch gates the other (Enabled when), and a required "accept the
 * terms" switch in front of a Save that validates (no endpoint: the action
 * only validates and reports).
 */
export function switchDemoSeedItems(): GridItemData[] {
  const full = { xs: 4, sm: 6, md: 8, lg: 12 }
  const quarter = { xs: 2, sm: 3, md: 2, lg: 3 }
  const typography = (id: string, text: string, extra: Record<string, unknown> = {}, colSpan = full): GridItemData => ({
    id,
    label: 'Typography',
    type: 'typography',
    settings: createDefaultItemSettings({ colSpan }),
    config: { ...createDefaultTypographyConfig(), text, variant: 'body2', ...extra },
  })
  const heading = (id: string, text: string, caption: string): GridItemData[] => [
    typography(`${id}-title`, text, { variant: 'subtitle1', weight: 'medium' }),
    typography(`${id}-caption`, caption, { color: 'gray' }),
  ]
  const sw = (id: string, name: string, label: string, extra: Record<string, unknown> = {}, colSpan = quarter): GridItemData => ({
    id,
    label: 'Switch',
    type: 'switch',
    settings: createDefaultItemSettings({ colSpan }),
    config: { ...createDefaultSwitchConfig(name), label, ...extra },
  })
  return [
    typography('seed-item-switch-h', 'Switch', { variant: 'h3' }),
    typography(
      'seed-item-switch-intro',
      'One boolean field drawn as an on / off toggle. Select a switch, then Props: label side, default, required (must be on), disabled, and Enabled when — another switch on this canvas that unlocks it.',
      { color: 'gray' },
    ),
    ...heading('seed-item-switch-basic-h', 'Basic', 'Label, Default on and helper text.'),
    sw('seed-item-switch-notifications', 'notifications', 'Email notifications'),
    sw('seed-item-switch-darkmode', 'darkMode', 'Dark mode', { defaultChecked: true }),
    sw('seed-item-switch-digest', 'newsletter', 'Weekly digest', { helperText: 'Sent every Monday' }),
    sw('seed-item-switch-before', 'labelStart', 'Label before', { labelPosition: 'start' }),
    ...heading('seed-item-switch-look-h', 'Sizes and variants', 'Radix sizes 1 · 2 · 3 and the surface · classic · soft variants.'),
    sw('seed-item-switch-size1', 'size1', 'Size 1', { size: '1', defaultChecked: true }),
    sw('seed-item-switch-size3', 'size3', 'Size 3', { size: '3', defaultChecked: true }),
    sw('seed-item-switch-classic', 'variantClassic', 'classic', { variant: 'classic', defaultChecked: true }),
    sw('seed-item-switch-soft', 'variantSoft', 'soft', { variant: 'soft', defaultChecked: true }),
    ...heading('seed-item-switch-gate-h', 'Disabled and gated', 'Disabled locks a switch. "Send telemetry" is enabled only while "Advanced settings" is on — its Enabled when points at it (Preview to try).'),
    sw('seed-item-switch-locked', 'locked', 'Locked on', { disabled: true, defaultChecked: true }),
    sw('seed-item-switch-advanced', 'advanced', 'Advanced settings'),
    sw('seed-item-switch-telemetry', 'telemetry', 'Send telemetry', {
      helperText: 'Needs Advanced settings',
      enabledWhen: { itemId: 'seed-item-switch-advanced', when: 'on' },
    }),
    sw('seed-item-switch-beta', 'beta', 'Beta features', {
      helperText: 'Needs Advanced settings',
      enabledWhen: { itemId: 'seed-item-switch-advanced', when: 'on' },
    }),
    ...heading('seed-item-switch-required-h', 'Required', 'Required means the switch must be on: Save validates and shows the error message until "Accept the terms" is on.'),
    sw('seed-item-switch-terms', 'terms', 'Accept the terms', {
      isRequired: true,
      errorMessage: 'You must accept the terms to continue',
      helperText: 'Required',
    }, { xs: 4, sm: 6, md: 4, lg: 6 }),
    {
      id: 'seed-item-switch-save',
      label: 'Button',
      type: 'button',
      settings: createDefaultItemSettings({ colSpan: { xs: 4, sm: 6, md: 4, lg: 6 }, justifySelf: { xs: 'start', sm: 'start', md: 'start', lg: 'start' } }),
      config: {
        ...createDefaultButtonItemConfig(),
        label: 'Save',
        icon: 'save',
        actions: ['SubmitFormToPostAPI'],
        snackbarSuccessEnabled: true,
        snackbarSuccessMessage: 'Saved — the terms are accepted',
      },
    },
  ]
}
