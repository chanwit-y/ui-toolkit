import {
  createDefaultDrawerConfig,
  createDefaultHiddenConfig,
  createDefaultModalConfig,
  createDefaultPopoverConfig,
  createDefaultTabConfig,
  createDefaultUploadImageConfig,
  ITEM_CONDITION_SOURCE,
  type DataCondition,
  type GridItemData,
  defaultColumnFormat,
} from '../../Layout/types'
import { createDefaultBackdrop, type StudioThemeConfig } from '../../Theme/types'
import { defaultShell } from '../../Workspace/snapshots'
import { projectKey } from '../../Workspace/runtimeProject'
import type { MenuItemDef, PageDef, ProjectDef, ShellSettings } from '../../Workspace/types'
import type { EnvVarDef } from '../../Env/types'
import { E } from '../bookshop/library'
import {
  card,
  container,
  dateField,
  filterMap,
  page,
  paged,
  repeater,
  sortBy,
  sourceSelect,
  staticOptions,
  staticSelect,
  switchField,
  textarea,
  textField,
  UPLOAD_URL,
} from '../bookshop/pages'
import {
  AVATAR_CELL,
  BUTTON,
  button,
  canvas,
  column,
  COVER_CELL,
  FULL,
  HALF,
  heading,
  html,
  justify,
  literal,
  navButton,
  navigate,
  QUARTER,
  row,
  settings,
  table,
  THIRD,
  typo,
} from '../bookshop/ui'

/**
 * Glass showcase — the demo's third project (see the grilled design
 * `glass-surface`): the same engine components the Book shop uses, over the
 * same mock API, with `theme.surface: "glass"` and a configured gradient
 * backdrop, so every surface tier can be seen at once — panels (cards, the
 * table frame, dropdowns, dialogs, the app bar and sidebar), the Strong tier
 * (pinned table cells stay near-opaque) and the Input tier (fields). Four
 * pages: Overview (cards + a form), Tables, Cards (a repeater), Overlays
 * (drawer, modal, popover, tabs). No sign-in; needs `demo-api` on 9100:
 * `VITE_GUMMY_PROJECT=glass-showcase`.
 */

export const GLASS_PROJECT_ID = 'gs-project-glass'
const CREATED_AT = Date.UTC(2026, 9, 27)

const P = {
  overview: 'gs-page-overview',
  tables: 'gs-page-tables',
  cards: 'gs-page-cards',
  overlays: 'gs-page-overlays',
} as const

/** Static prose on the page (no `{{…}}` placeholders, so no binding). */
const note = (id: string, markup: string, colSpan = FULL) => html(id, id.replace(/^gs-item-/, '').replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()), markup, null, colSpan, true)

/* ----------------------------------------------------------------- overview */

function overviewPage(): PageDef {
  const tier = (id: string, title: string, subheader: string, body: string) =>
    card(`gs-item-tier-${id}`, `tier${id[0].toUpperCase()}${id.slice(1)}`, { title, subheader, content: [typo(`gs-item-tier-${id}-body`, body, 'body2', { color: 'gray' })] }, THIRD)
  return page(P.overview, 'overview', 'Overview', '/', [
    ...heading(
      'gs-item-overview-h',
      'Glass surface',
      'One theme token — surface: "glass" — and every panel in the app becomes a translucent, blurred surface over the backdrop. Light and dark alike; flip the theme in the top bar.',
    ),
    tier('panel', 'Panel tier', 'cards, dialogs, dropdowns, the shell', 'The panel colour at 65% with a 16px blur and a hairline border. This card, the sidebar and the app bar are drawn with it.'),
    tier('strong', 'Strong tier', 'sticky and pinned table cells', 'Near-opaque and never blurred: a pinned cell hides what scrolls under it, and blur on many sticky cells is slow. See the Tables page.'),
    tier('input', 'Input tier', 'text fields, selects, pickers', 'Lighter than the panel it sits on — 40% with an 8px blur — so a field keeps its edge inside a glass card. The form below is on it.'),
    container(
      'gs-item-overview-form',
      [
        typo('gs-item-overview-form-title', 'A form on a glass container', 'subtitle1', { weight: 'medium' }),
        textField('gs-item-overview-name', 'name', 'Name', HALF, { placeholder: 'Your name', isRequired: true }),
        sourceSelect('gs-item-overview-author', 'autocomplete', 'authorId', 'Favourite author', E.listAuthors, { subtitleKey: 'country', avatarKey: 'avatar' }),
        sourceSelect('gs-item-overview-genre', 'select', 'genreId', 'Genre', E.listGenres),
        dateField('gs-item-overview-since', 'since', 'Reading since'),
        staticSelect('gs-item-overview-format', 'format', 'Format', staticOptions([['paper', 'Paperback'], ['hard', 'Hardcover'], ['ebook', 'E-book']]), QUARTER),
        switchField('gs-item-overview-newsletter', 'newsletter', 'Send me the newsletter'),
        textarea('gs-item-overview-notes', 'notes', 'Notes', 3),
      ],
      {},
      true,
    ),
    note(
      'gs-item-overview-note',
      '<p>Where the blur cannot run — the OS asks for <em>reduced transparency</em>, the browser has no <code>backdrop-filter</code>, or the page is printed — every tier falls back to the Strong look and the backdrop stays. Buttons keep their solid accent throughout.</p>',
    ),
    { ...navButton('gs-item-overview-to-tables', 'Tables', 'table', navigate(P.tables)), settings: settings(BUTTON, justify('start')) },
    { ...navButton('gs-item-overview-to-cards', 'Cards', 'creditCard', navigate(P.cards)), settings: settings(BUTTON, justify('start')) },
    { ...navButton('gs-item-overview-to-overlays', 'Overlays', 'panelRight', navigate(P.overlays)), settings: settings(BUTTON, justify('start')) },
  ])
}

/* ------------------------------------------------------------------- tables */

function bookFormItems(): GridItemData[] {
  const tableItem = 'gs-item-books-table'
  const submit = (id: string, label: string, showWhen: 'adding' | 'editing', endpointId: string, method: 'SubmitFormToPostAPI' | 'SubmitFormToPatchAPI', message: string) =>
    button(
      id,
      {
        label,
        icon: 'save',
        actions: ['StartLoading', method, 'StopLoading', 'CloseModal'],
        reloadTableItemId: tableItem,
        endpointId,
        snackbarSuccessEnabled: true,
        snackbarSuccessMessage: message,
        snackbarErrorException: true,
      },
      BUTTON,
      { showWhen },
    )
  return [
    { id: 'gs-item-book-id', label: 'Hidden', type: 'hidden', settings: settings(FULL), config: createDefaultHiddenConfig('_id') },
    textField('gs-item-book-title', 'title', 'Title', FULL, { placeholder: 'The book title', isRequired: true }),
    sourceSelect('gs-item-book-author', 'autocomplete', 'authorId', 'Author', E.listAuthors, { subtitleKey: 'country', avatarKey: 'avatar', isRequired: true }),
    sourceSelect('gs-item-book-genre', 'select', 'genreId', 'Genre', E.listGenres, { isRequired: true }),
    textField('gs-item-book-price', 'price', 'Price (THB)', QUARTER, { dataType: 'number', isRequired: true }),
    textField('gs-item-book-stock', 'stock', 'In stock', QUARTER, { dataType: 'number' }),
    dateField('gs-item-book-published', 'publishedAt', 'Published', QUARTER),
    switchField('gs-item-book-featured', 'featured', 'Featured'),
    {
      id: 'gs-item-book-cover',
      label: 'Upload Image',
      type: 'uploadimage',
      settings: settings(THIRD),
      config: {
        ...createDefaultUploadImageConfig('cover'),
        label: 'Cover',
        helperText: 'The dropzone is on the Input tier too.',
        maxSizeMB: 5,
        previewHeight: 160,
        valueFormat: 'api',
        api: { uploadUrl: UPLOAD_URL, deleteUrl: '', fieldName: 'file', responsePath: 'data.url' },
      },
    },
    { ...textarea('gs-item-book-description', 'description', 'Description', 6), settings: settings({ xs: 4, sm: 6, md: 8, lg: 8 }) },
    submit('gs-item-book-create', 'Create', 'adding', E.createBook, 'SubmitFormToPostAPI', 'Book added'),
    submit('gs-item-book-update', 'Save', 'editing', E.updateBook, 'SubmitFormToPatchAPI', 'Book saved'),
  ]
}

function bookFilterItems(): GridItemData[] {
  return [
    sourceSelect('gs-item-books-filter-genre', 'select', 'genre', 'Genre', E.listGenres, {}, FULL),
    sourceSelect('gs-item-books-filter-author', 'autocomplete', 'author', 'Author', E.genreAuthors, {
      observeToItemId: 'gs-item-books-filter-genre',
      placeholder: 'Pick a genre first',
      avatarKey: 'avatar',
    }, FULL),
    staticSelect('gs-item-books-filter-stock', 'inStock', 'Stock', staticOptions([['true', 'In stock'], ['false', 'Out of stock']]), FULL),
  ]
}

function tablesPage(): PageDef {
  return page(P.tables, 'tables', 'Tables', '/tables', [
    ...heading(
      'gs-item-tables-h',
      'Tables',
      'The frame is one glass panel; the pinned Title column and the sticky header are the Strong tier, so nothing shows through them when you scroll sideways. Filter opens a glass popover with dropdowns; Add book / Edit open a glass modal full of fields.',
    ),
    table(
      'gs-item-books-table',
      {
        name: 'books',
        title: 'Books',
        endpointId: E.listBooks,
        apiPaths: 'data',
        canEdit: true,
        canAdd: true,
        addButton: { label: 'Add book', icon: 'puls', variant: 'contained' },
        canSearchAllColumns: true,
        pagination: paged(10),
        sort: sortBy('title'),
        filtersEnabled: true,
        requestMapping: [filterMap('gs-map-books-genre', 'genre'), filterMap('gs-map-books-author', 'author'), filterMap('gs-map-books-stock', 'inStock')],
        modalMaxWidth: '880px',
        modalMinWidth: '720px',
        cellLines: 2,
        columns: [
          column('gs-col-books-cover', 'cover', '', { html: COVER_CELL, size: 64, resizable: false, pin: 'left' }),
          column('gs-col-books-title', 'title', 'Title', { enableSorting: true, pin: 'left', size: 240 }),
          column('gs-col-books-author', 'authorName', 'Author', { enableSorting: true, size: 200 }),
          column('gs-col-books-genre', 'genreName', 'Genre', { enableSorting: true, size: 160 }),
          column('gs-col-books-price', 'priceText', 'Price', { enableSorting: true, sortField: 'price', align: 'end', size: 120 }),
          column('gs-col-books-stock', 'stock', 'Stock', { enableSorting: true, align: 'end', size: 100 }),
          column('gs-col-books-published', 'publishedAt', 'Published', { enableSorting: true, format: { ...defaultColumnFormat(), type: 'date', pattern: 'DD/MM/YYYY' }, size: 140 }),
          column('gs-col-books-isbn', 'isbn', 'ISBN', { size: 180 }),
          column('gs-col-books-rating', 'rating', 'Rating', { enableSorting: true, align: 'end', size: 100, pin: 'right' }),
        ],
      },
      { modal: bookFormItems(), filters: bookFilterItems() },
    ),
    typo('gs-item-customers-title', 'Customers — a plain paged table, searched by the API', 'subtitle1', { weight: 'medium' }),
    table('gs-item-customers-table', {
      name: 'customers',
      title: 'Customers',
      endpointId: E.listCustomers,
      apiPaths: 'data',
      canSearchAllColumns: true,
      pagination: paged(5),
      sort: sortBy('name'),
      cellLines: 1,
      columns: [
        column('gs-col-customers-avatar', 'avatar', '', { html: AVATAR_CELL, size: 56, resizable: false }),
        column('gs-col-customers-name', 'name', 'Name', { enableSorting: true }),
        column('gs-col-customers-email', 'email', 'Email', { enableSorting: true }),
        column('gs-col-customers-city', 'city', 'City', { enableSorting: true }),
        column('gs-col-customers-spent', 'totalSpentText', 'Spent', { enableSorting: true, sortField: 'totalSpent', align: 'end' }),
      ],
    }),
  ])
}

/* -------------------------------------------------------------------- cards */

function cardsPage(): PageDef {
  const featured: DataCondition = { loadId: ITEM_CONDITION_SOURCE, test: 'compare', path: 'featured', op: 'eq', value: 'true' }
  return page(P.cards, 'cards', 'Cards', '/cards', [
    ...heading('gs-item-cards-h', 'Cards', 'A card per book from a repeater — each one its own glass panel over the backdrop, with the cover as its media band. Every card is on the Panel tier, so a grid of them reads as one sheet of frosted glass.'),
    repeater(
      'gs-item-cards-books',
      {
        name: 'bookCards',
        source: 'endpoint',
        read: { endpointId: E.listBooks, params: {}, extra: { limit: literal('12'), sortBy: literal('rating'), sortDir: literal('desc') } },
        itemSpan: { xs: 12, sm: 6, md: 4, lg: 3 },
        gap: '4',
        itemPadding: '0',
        emptyText: 'No books to show.',
      },
      [
        card('gs-item-cards-book', 'bookCard', {
          titleBinding: row('title'),
          subheaderBinding: row('authorName'),
          media: { src: row('cover'), height: 240 },
          content: [
            { ...typo('gs-item-cards-featured', 'Featured', 'caption', { weight: 'bold', color: 'amber' }, FULL), dataWhen: featured },
            html('gs-item-cards-price', 'cardPrice', '<strong>{{priceText}}</strong> · ★ {{rating}} <span class="dt-muted">({{reviewCount}})</span>', row('none'), FULL, false),
          ],
        }),
      ],
    ),
    typo('gs-item-authors-title', 'Authors — avatars in the card header', 'subtitle1', { weight: 'medium' }),
    repeater(
      'gs-item-cards-authors',
      {
        name: 'authorCards',
        source: 'endpoint',
        read: { endpointId: E.listAuthors, params: {}, extra: {} },
        itemSpan: { xs: 12, sm: 6, md: 4, lg: 4 },
        gap: '4',
        itemPadding: '0',
        emptyText: 'No authors to show.',
      },
      [
        card('gs-item-cards-author', 'authorCard', {
          titleBinding: row('name'),
          subheaderBinding: row('country'),
          avatar: { src: row('avatar'), fallback: row('name') },
          content: [html('gs-item-cards-author-books', 'authorBooks', '<span class="dt-muted">{{bookCount}} books in the catalogue</span>', row('none'), FULL, false)],
        }),
      ],
    ),
  ])
}

/* ----------------------------------------------------------------- overlays */

function overlaysPage(): PageDef {
  const drawerItem = 'gs-item-drawer'
  const modalItem = 'gs-item-modal'
  return page(P.overlays, 'overlays', 'Overlays', '/overlays', [
    ...heading('gs-item-overlays-h', 'Overlays', 'Everything that portals out of the page — a drawer, a modal, a popover — carries the glass with it: the nested theme root inside each portal has the same surface, and its fields are on the Input tier.'),
    {
      id: drawerItem,
      label: 'Drawer',
      type: 'drawer',
      settings: settings(QUARTER, justify('start')),
      config: {
        ...createDefaultDrawerConfig('newCustomer'),
        title: 'New customer',
        description: 'A form in a glass drawer; Save posts to the API.',
        size: '420px',
        trigger: { label: 'Open drawer', icon: 'panelRight', variant: 'contained' },
      },
      childCanvases: [
        canvas([
          textField('gs-item-customer-name', 'name', 'Name', FULL, { isRequired: true }),
          textField('gs-item-customer-email', 'email', 'Email', FULL, { dataType: 'email', isRequired: true }),
          textField('gs-item-customer-phone', 'phone', 'Phone', FULL, { dataType: 'tel' }),
          staticSelect('gs-item-customer-city', 'city', 'City', staticOptions([['Bangkok', 'Bangkok'], ['Chiang Mai', 'Chiang Mai'], ['Phuket', 'Phuket'], ['Khon Kaen', 'Khon Kaen']]), FULL),
          button('gs-item-customer-cancel', { label: 'Cancel', variant: 'outlined', color: 'gray', actions: ['CloseModal'], modalItemId: drawerItem }, HALF),
          button(
            'gs-item-customer-save',
            {
              label: 'Save',
              icon: 'save',
              actions: ['StartLoading', 'SubmitFormToPostAPI', 'StopLoading', 'CloseModal'],
              endpointId: E.createCustomer,
              modalItemId: drawerItem,
              snackbarSuccessEnabled: true,
              snackbarSuccessMessage: 'Customer added',
              snackbarErrorException: true,
            },
            HALF,
          ),
        ]),
      ],
    },
    {
      id: modalItem,
      label: 'Modal',
      type: 'modal',
      settings: settings(QUARTER, justify('start')),
      config: {
        ...createDefaultModalConfig('quickNote'),
        title: 'Quick note',
        description: 'A glass dialog over the blurred page.',
        maxWidth: '560px',
        trigger: { label: 'Open modal', icon: 'puls', variant: 'outlined' },
      },
      childCanvases: [
        canvas([
          textField('gs-item-note-title', 'title', 'Title', FULL, { isRequired: true }),
          sourceSelect('gs-item-note-genre', 'select', 'genreId', 'Genre', E.listGenres, {}, FULL),
          textarea('gs-item-note-body', 'body', 'Note', 4),
          button('gs-item-note-close', { label: 'Close', variant: 'text', color: 'gray', actions: ['CloseModal'], modalItemId: modalItem }, HALF),
        ]),
      ],
    },
    {
      id: 'gs-item-popover',
      label: 'Popover',
      type: 'popover',
      settings: settings(QUARTER, justify('start')),
      config: { ...createDefaultPopoverConfig(), placement: 'bottom-start', triggerButton: { label: 'Open popover', icon: 'filter', variant: 'text' } },
      childCanvases: [
        canvas([
          typo('gs-item-popover-title', 'A popover is a glass panel too', 'subtitle2', { weight: 'medium' }),
          sourceSelect('gs-item-popover-genre', 'select', 'genreId', 'Genre', E.listGenres, {}, FULL),
          switchField('gs-item-popover-stock', 'inStock', 'In stock only'),
        ]),
      ],
    },
    {
      id: 'gs-item-tabs',
      label: 'Tab',
      type: 'tab',
      settings: settings(FULL),
      config: { ...createDefaultTabConfig(), tabs: [{ label: 'Panel', value: 'panel' }, { label: 'Inputs', value: 'inputs' }], defaultValue: 'panel' },
      childCanvases: [
        canvas([
          container(
            'gs-item-tabs-panel',
            [
              typo('gs-item-tabs-panel-title', 'A container with a surface, inside a tab', 'subtitle1', { weight: 'medium' }),
              typo('gs-item-tabs-panel-body', 'Containers that turn their surface on are Panel-tier glass, like cards. Nest one in another and the blur layers up — keep it to one level.', 'body2', { color: 'gray' }),
            ],
            {},
            true,
          ),
        ]),
        canvas([
          container(
            'gs-item-tabs-inputs',
            [
              textField('gs-item-tabs-search', 'search', 'Search', HALF, { placeholder: 'Type to search' }),
              sourceSelect('gs-item-tabs-author', 'autocomplete', 'authorId', 'Author', E.listAuthors, { avatarKey: 'avatar' }),
              dateField('gs-item-tabs-from', 'from', 'From'),
              dateField('gs-item-tabs-to', 'to', 'To'),
            ],
            {},
            true,
          ),
        ]),
      ],
    },
  ])
}

export function glassPages(): PageDef[] {
  return [overviewPage(), tablesPage(), cardsPage(), overlaysPage()]
}

/* -------------------------------------------------------------------- shell */

function glassMenu(): MenuItemDef[] {
  const link = (id: string, label: string, icon: string, pageId: string): MenuItemDef => ({ id, kind: 'page', label, icon, navigate: navigate(pageId) })
  return [
    link('gs-menu-overview', 'Overview', 'home', P.overview),
    link('gs-menu-tables', 'Tables', 'table', P.tables),
    link('gs-menu-cards', 'Cards', 'creditCard', P.cards),
    link('gs-menu-overlays', 'Overlays', 'panelRight', P.overlays),
  ]
}

/** The pill sidebar (its idle pills are `--accent-2`, which flips with the appearance) under a neutral (panel) app bar, so both are glass; no breadcrumb strip, a hamburger as the collapse toggle. */
function glassShell(): ShellSettings {
  const base = defaultShell('Glass showcase')
  return {
    ...base,
    breadcrumbs: false,
    appBar: { ...base.appBar, icon: 'layoutDashboard', sidebarToggle: { hide: 'menu', show: 'menu' } },
    sidebar: { ...base.sidebar, variant: 'pill' },
    pageTransition: { type: 'fade-up', duration: '', easing: 'ease-out' },
  }
}

/**
 * Glass over a configured gradient (the Portal keeps the engine's default
 * accent backdrop): lavender → pink in light, and its own deep indigo → plum
 * stops in dark — a pale gradient under the dark panels would wash them out
 * and leave the page text (`--gray-12`, near white) unreadable over it.
 */
function glassTheme(): StudioThemeConfig {
  return {
    appearance: 'light',
    accentColor: 'violet',
    radius: 'large',
    panelBackground: 'solid',
    surface: 'glass',
    background: {
      ...createDefaultBackdrop(),
      kind: 'gradient',
      gradient: { from: '#c7d2fe', to: '#fbcfe8', angle: 160, darkFrom: '#312e81', darkTo: '#831843' },
    },
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

/** The Book shop mock API, absolute like the Book shop's own `API_URL` (the studio Live Preview runs on another origin). */
const glassEnv = (): EnvVarDef[] => [{ id: 'gs-env-api-url', name: 'API_URL', value: 'http://localhost:9100', locked: true }]

/** The library endpoints the pages use (shared with the Book shop). */
const GLASS_ENDPOINTS = [E.listBooks, E.createBook, E.updateBook, E.listGenres, E.listAuthors, E.genreAuthors, E.listCustomers, E.createCustomer]

export function glassProject(): ProjectDef {
  return {
    id: GLASS_PROJECT_ID,
    name: 'Glass showcase',
    description: 'The Glass surface on every component: cards, tables with pinned columns, forms, a repeater, drawer / modal / popover — over the Book shop API.',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    snapshot: {
      pages: glassPages(),
      menu: glassMenu(),
      shell: glassShell(),
      env: glassEnv(),
      theme: glassTheme(),
      endpointIds: [...GLASS_ENDPOINTS],
      globalLoads: [],
      customActions: [],
      customComponents: [],
      authId: null,
    },
  }
}

export const GLASS_KEY = projectKey('Glass showcase')
