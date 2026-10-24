import type { PageLoadDef } from '../../Workspace/pageLoads'
import type { PageDef } from '../../Workspace/types'
import {
  createDefaultApprovalLineConfig,
  createDefaultAutocompleteConfig,
  createDefaultAvatarConfig,
  createDefaultCardActionConfig,
  createDefaultCardConfig,
  createDefaultContainerConfig,
  createDefaultCustomComponentConfig,
  createDefaultDateConfig,
  createDefaultDrawerConfig,
  createDefaultFormListConfig,
  createDefaultHiddenConfig,
  createDefaultMultiAutocompleteConfig,
  createDefaultPaginationConfig,
  createDefaultRepeaterConfig,
  createDefaultSelectFieldConfig,
  createDefaultSortConfig,
  createDefaultSwitchConfig,
  createDefaultTextareaConfig,
  createDefaultTextFieldConfig,
  createDefaultUploadImageConfig,
  createDefaultWorkflowEditorConfig,
  defaultContainerSettings,
  ITEM_CONDITION_SOURCE,
  type CardConfig,
  type DataCondition,
  type DataTablePaginationConfig,
  type GridItemData,
  type ItemBinding,
  type RepeaterConfig,
  type Responsive,
  type SelectOption,
  type StudioNavigate,
} from '../../Layout/types'
import { E } from './library'
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
  literal,
  navButton,
  navigate,
  QUARTER,
  row,
  rowParam,
  settings,
  state,
  stateParam,
  stretch,
  table,
  THIRD,
  TWO_THIRDS,
  typo,
  urlParam,
  whenField,
  whenRole,
} from './ui'

/**
 * The Book shop's pages (see the grilled design `bookshop-demo`): a staff
 * back office over the demo's mock API, every screen pure config. Page,
 * item and load ids are fixed so the generated workspace is stable.
 */

export const P = {
  dashboard: 'bs-page-dashboard',
  books: 'bs-page-books',
  bookDetail: 'bs-page-book-detail',
  authors: 'bs-page-authors',
  authorDetail: 'bs-page-author-detail',
  orders: 'bs-page-orders',
  orderDetail: 'bs-page-order-detail',
  customers: 'bs-page-customers',
  customerDetail: 'bs-page-customer-detail',
  catalogue: 'bs-page-catalogue',
  settings: 'bs-page-settings',
} as const

export const L = {
  summary: 'load-bs-summary',
  book: 'load-bs-book',
  author: 'load-bs-author',
  order: 'load-bs-order',
  customer: 'load-bs-customer',
  settings: 'load-bs-settings',
} as const

/** The custom code the project names (declared in `project.ts`). */
export const SALES_CHART_COMPONENT_ID = 'component-bs-sales-chart'
export const PRINT_ORDER_ACTION_ID = 'action-bs-print-order'

/** Where uploads go. Absolute: the engine posts with a plain `fetch`, and the studio's Live Preview runs on another origin. */
export const UPLOAD_URL = 'http://localhost:9100/api/upload'

const byId = (pageId: string) => navigate(pageId, { id: rowParam() })

function load(id: string, key: string, endpointId: string, params: PageLoadDef['read']['params'], loading: PageLoadDef['loading'], errorMessage = ''): PageLoadDef {
  return { id, key, read: { endpointId, params, extra: {} }, paths: 'data', loading, errorMessage }
}

const paged = (pageSize = 10): DataTablePaginationConfig => ({
  ...createDefaultPaginationConfig(),
  enabled: true,
  searchKey: 'search',
  defaultPageSize: pageSize,
  pageSizeOptions: [10, 20, 50],
})

const sortBy = (defaultField: string, defaultOrder: 'asc' | 'desc' = 'asc') => ({
  ...createDefaultSortConfig(),
  enabled: true,
  sortKey: 'sortBy',
  orderKey: 'sortDir',
  defaultField,
  defaultOrder,
})

const filterMap = (id: string, key: string) => ({ id, slot: 'query' as const, key, source: { type: 'filter' as const, key, fallback: '' } })

const staticOptions = (pairs: [string, string][]): SelectOption[] => pairs.map(([value, label]) => ({ value, label }))

function staticSelect(id: string, name: string, label: string, options: SelectOption[], colSpan = HALF, extra: Partial<GridItemData> = {}): GridItemData {
  return {
    id,
    label: 'Select',
    type: 'select',
    settings: settings(colSpan),
    config: { ...createDefaultSelectFieldConfig(name), label, placeholder: `Any ${label.toLowerCase()}`, options, idKey: 'value', displayKey: 'label', searchKey: 'label' },
    ...extra,
  }
}

function sourceSelect(
  id: string,
  type: 'select' | 'autocomplete',
  name: string,
  label: string,
  endpointId: string,
  extra: Record<string, unknown> = {},
  colSpan = HALF,
): GridItemData {
  const base = type === 'select' ? createDefaultSelectFieldConfig(name) : createDefaultAutocompleteConfig(name)
  return {
    id,
    label: type === 'select' ? 'Select' : 'Autocomplete',
    type,
    settings: settings(colSpan),
    config: {
      ...base,
      label,
      placeholder: `Choose ${label.toLowerCase()}`,
      mode: 'source',
      options: [],
      dataSource: { endpointId, paths: 'data' },
      idKey: '_id',
      displayKey: 'name',
      searchKey: 'name',
      ...extra,
    },
  }
}

function textField(id: string, name: string, label: string, colSpan = HALF, extra: Record<string, unknown> = {}, item: Partial<GridItemData> = {}): GridItemData {
  return { id, label: 'Text Field', type: 'textfield', settings: settings(colSpan), config: { ...createDefaultTextFieldConfig(name), label, ...extra }, ...item }
}

function textarea(id: string, name: string, label: string, rows = 4, item: Partial<GridItemData> = {}): GridItemData {
  return { id, label: 'Textarea', type: 'textarea', settings: settings(FULL), config: { ...createDefaultTextareaConfig(name), label, rows }, ...item }
}

function dateField(id: string, name: string, label: string, colSpan = HALF): GridItemData {
  return { id, label: 'Date', type: 'datepicker', settings: settings(colSpan), config: { ...createDefaultDateConfig('date', name), label } }
}

function switchField(id: string, name: string, label: string, extra: Record<string, unknown> = {}, item: Partial<GridItemData> = {}): GridItemData {
  return { id, label: 'Switch', type: 'switch', settings: settings(HALF), config: { ...createDefaultSwitchConfig(name), label, ...extra }, ...item }
}

function container(id: string, items: GridItemData[], extra: Partial<GridItemData> = {}, border = false): GridItemData {
  return {
    id,
    label: 'Container',
    type: 'container',
    settings: settings(FULL),
    config: { ...createDefaultContainerConfig(), border, background: border },
    childCanvases: [canvas(items)],
    ...extra,
  }
}

type CardParts = {
  title?: string
  titleBinding?: ItemBinding
  subheader?: string
  subheaderBinding?: ItemBinding
  avatar?: { src: ItemBinding; fallback: ItemBinding }
  media?: { src: ItemBinding; height: number }
  content?: GridItemData[]
  navigate?: StudioNavigate | null
  actions?: CardConfig['actions']
}

function card(id: string, name: string, parts: CardParts, colSpan: Responsive<number> = FULL): GridItemData {
  const base = createDefaultCardConfig(name)
  return {
    id,
    label: 'Card',
    type: 'card',
    settings: settings(colSpan),
    config: {
      ...base,
      variant: 'outlined',
      header: {
        ...base.header,
        title: parts.title ?? '',
        titleBinding: parts.titleBinding ?? null,
        subheader: parts.subheader ?? '',
        subheaderBinding: parts.subheaderBinding ?? null,
        avatarEnabled: !!parts.avatar,
        avatar: parts.avatar
          ? { ...createDefaultAvatarConfig(''), fallback: '?', srcBinding: parts.avatar.src, fallbackBinding: parts.avatar.fallback }
          : base.header.avatar,
        action: { ...base.header.action, id: `${id}-header-action` },
      },
      media: parts.media
        ? { enabled: true, src: '', srcBinding: parts.media.src, alt: 'Cover', height: parts.media.height }
        : base.media,
      actions: parts.actions ?? [],
      actionsAlign: 'end',
      navigate: parts.navigate ?? null,
    },
    childCanvases: [canvas(parts.content ?? []), canvas([])],
  }
}

function repeater(id: string, config: Partial<RepeaterConfig> & { name: string }, template: GridItemData[], colSpan = FULL): GridItemData {
  return {
    id,
    label: 'Repeater',
    type: 'repeater',
    settings: settings(colSpan),
    config: { ...createDefaultRepeaterConfig(config.name), idKey: '_id', ...config },
    childCanvases: [canvas(template)],
  }
}

function page(id: string, key: string, name: string, path: string, items: GridItemData[], extra: Partial<PageDef> = {}): PageDef {
  return { id, key, name, path, grid: { items, containerSettings: defaultContainerSettings, fieldSeq: 0 }, ...extra }
}

/** The first item of a detail page: back to its list. */
function back(id: string, label: string, pageId: string): GridItemData {
  return { ...navButton(id, label, 'chevronLeft', navigate(pageId), 'text'), settings: settings(FULL) }
}

const MANAGER = whenRole('manager')
const CLERK = whenRole('clerk')

/* ---------------------------------------------------------------- dashboard */

function dashboardPage(): PageDef {
  const kpi = (id: string, title: string, subheader: string, path: string): GridItemData =>
    card(
      `bs-item-dash-${id}`,
      `kpi${id[0].toUpperCase()}${id.slice(1)}`,
      { title, subheader, content: [typo(`bs-item-dash-${id}-value`, '—', 'h4', { weight: 'bold', binding: state(L.summary, path) })] },
      QUARTER,
    )
  return page(P.dashboard, 'dashboard', 'Dashboard', '/', [
    ...heading('bs-item-dash-h', 'Dashboard', 'This month at a glance. Everything below is one page load (summary) in skeleton mode: each block draws its own placeholder until the numbers land.'),
    kpi('books', 'Books', 'in the catalogue', 'bookCount'),
    kpi('orders', 'Orders', 'this month', 'ordersThisMonth'),
    kpi('revenue', 'Revenue', 'this month', 'revenueThisMonthText'),
    kpi('lowstock', 'Low stock', 'at or under the threshold', 'lowStockCount'),
    typo('bs-item-dash-sales-title', 'Sales, last 30 days', 'subtitle1', { weight: 'medium' }, TWO_THIRDS),
    typo('bs-item-dash-low-title', 'Low stock', 'subtitle1', { weight: 'medium' }, THIRD),
    {
      id: 'bs-item-dash-sales',
      label: 'SalesChart',
      type: 'custom',
      settings: settings(TWO_THIRDS),
      config: {
        ...createDefaultCustomComponentConfig('salesChart'),
        componentId: SALES_CHART_COMPONENT_ID,
        props: { labelField: 'date', valueField: 'total', color: 'accent', height: '200' },
        binding: state(L.summary, 'salesByDay'),
      },
    },
    repeater(
      'bs-item-dash-low',
      {
        name: 'lowStock',
        source: 'state',
        stateBinding: state(L.summary, 'lowStock'),
        itemSpan: { xs: 12, sm: 12, md: 12, lg: 12 },
        gap: '2',
        itemSurface: 'outlined',
        itemPadding: '3',
        emptyText: 'Nothing is running low.',
        itemNavigate: byId(P.bookDetail),
      },
      [
        typo('bs-item-dash-low-name', '', 'subtitle2', { truncate: true, binding: row('title') }),
        html('bs-item-dash-low-meta', 'lowStockMeta', '<span class="dt-muted">{{authorName}}</span> · <strong>{{stock}}</strong> left', row('none'), FULL, false),
      ],
      THIRD,
    ),
    table('bs-item-dash-recent', {
      name: 'recentOrders',
      title: 'Recent orders',
      rowsBinding: state(L.summary, 'recentOrders'),
      rowNavigate: byId(P.orderDetail),
      cellLines: 1,
      columns: [
        column('bs-col-dash-number', 'number', 'Order'),
        column('bs-col-dash-customer', 'customerName', 'Customer'),
        column('bs-col-dash-placed', 'placedAt', 'Placed', { useDateFormat: 'DD/MM/YYYY HH:mm' }),
        column('bs-col-dash-status', 'statusLabel', 'Status', { html: '<span class="dt-badge">{{statusLabel}}</span>' }),
        column('bs-col-dash-total', 'totalText', 'Total', { align: 'end' }),
      ],
    }),
  ], { loads: [load(L.summary, 'summary', E.getSummary, {}, 'skeleton', 'Could not load the dashboard')] })
}

/* -------------------------------------------------------------------- books */

function bookFormItems(): GridItemData[] {
  const tableItem = 'bs-item-books-table'
  const submit = (id: string, label: string, showWhen: 'adding' | 'editing', endpointId: string, method: 'SubmitFormToPostAPI' | 'SubmitFormToPatchAPI', message: string) =>
    button(
      id,
      {
        label,
        icon: 'save',
        mode: 'confirm',
        confirmTitle: label,
        confirmDescription: `${label} this book?`,
        confirmTrue: ['StartLoading', method, 'StopLoading', 'CloseModal'],
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
    // The row's id rides along in the form: Save / Delete fill the URL `:id` from it (blank while adding ⇒ Create posts without one).
    { id: 'bs-item-book-id', label: 'Hidden', type: 'hidden', settings: settings(FULL), config: createDefaultHiddenConfig('_id') },
    textField('bs-item-book-title', 'title', 'Title', FULL, { placeholder: 'The book title', isRequired: true }),
    sourceSelect('bs-item-book-author', 'autocomplete', 'authorId', 'Author', E.listAuthors, { subtitleKey: 'country', avatarKey: 'avatar', isRequired: true }),
    sourceSelect('bs-item-book-genre', 'select', 'genreId', 'Genre', E.listGenres, { isRequired: true }),
    textField('bs-item-book-price', 'price', 'Price (THB)', QUARTER, { dataType: 'number', isRequired: true }),
    textField('bs-item-book-stock', 'stock', 'In stock', QUARTER, { dataType: 'number' }),
    textField('bs-item-book-pages', 'pages', 'Pages', QUARTER, { dataType: 'number' }),
    dateField('bs-item-book-published', 'publishedAt', 'Published', QUARTER),
    textField('bs-item-book-isbn', 'isbn', 'ISBN', HALF, { placeholder: '978-…' }),
    switchField('bs-item-book-featured', 'featured', 'Featured in the catalogue'),
    {
      id: 'bs-item-book-cover',
      label: 'Upload Image',
      type: 'uploadimage',
      settings: settings(THIRD),
      config: {
        ...createDefaultUploadImageConfig('cover'),
        label: 'Cover',
        helperText: 'PNG, JPEG, GIF or WebP up to 5 MB. Leave empty for a drawn cover.',
        maxSizeMB: 5,
        previewHeight: 180,
        valueFormat: 'api',
        api: { uploadUrl: UPLOAD_URL, deleteUrl: '', fieldName: 'file', responsePath: 'data.url' },
      },
    },
    {
      ...textarea('bs-item-book-description', 'description', 'Description', 7),
      settings: settings(TWO_THIRDS),
    },
    submit('bs-item-book-create', 'Create', 'adding', E.createBook, 'SubmitFormToPostAPI', 'Book added'),
    submit('bs-item-book-update', 'Save', 'editing', E.updateBook, 'SubmitFormToPatchAPI', 'Book saved'),
    button(
      'bs-item-book-delete',
      {
        label: 'Delete',
        icon: 'trash',
        variant: 'outlined',
        color: 'red',
        mode: 'confirm',
        confirmTitle: 'Delete book',
        confirmDescription: 'Delete this book from the catalogue? This cannot be undone.',
        confirmTrue: ['StartLoading', 'SubmitFormToPostAPI', 'StopLoading', 'CloseModal'],
        reloadTableItemId: tableItem,
        endpointId: E.deleteBook,
        snackbarSuccessEnabled: true,
        snackbarSuccessMessage: 'Book deleted',
        snackbarErrorException: true,
      },
      BUTTON,
      // Editing only, and only for a manager: the two conditions are combined.
      { showWhen: 'editing', dataWhen: MANAGER },
    ),
  ]
}

function bookFilterItems(): GridItemData[] {
  return [
    sourceSelect('bs-item-books-filter-genre', 'select', 'genre', 'Genre', E.listGenres, {}, FULL),
    // Observes Genre: its list is the chosen genre's authors (GET /api/genres/:genre/authors).
    sourceSelect('bs-item-books-filter-author', 'autocomplete', 'author', 'Author', E.genreAuthors, {
      observeToItemId: 'bs-item-books-filter-genre',
      placeholder: 'Pick a genre first',
      avatarKey: 'avatar',
    }, FULL),
    staticSelect('bs-item-books-filter-stock', 'inStock', 'Stock', staticOptions([['true', 'In stock'], ['false', 'Out of stock']]), FULL),
  ]
}

function booksPage(): PageDef {
  return page(P.books, 'books', 'Books', '/books', [
    ...heading('bs-item-books-h', 'Books', 'The catalogue, paged and sorted by the API. Filter by genre, then by one of that genre’s authors. Edit opens the book form; only a manager sees Delete in it. Click a row for the book page.'),
    table(
      'bs-item-books-table',
      {
        name: 'books',
        title: 'Catalogue',
        endpointId: E.listBooks,
        apiPaths: 'data',
        canEdit: true,
        canAdd: true,
        addButton: { label: 'Add book', icon: 'puls', variant: 'contained' },
        canSearchAllColumns: true,
        pagination: paged(10),
        sort: sortBy('title'),
        filtersEnabled: true,
        requestMapping: [filterMap('bs-map-books-genre', 'genre'), filterMap('bs-map-books-author', 'author'), filterMap('bs-map-books-stock', 'inStock')],
        rowNavigate: byId(P.bookDetail),
        modalMaxWidth: '880px',
        modalMinWidth: '720px',
        cellLines: 2,
        columns: [
          column('bs-col-books-cover', 'cover', '', { html: COVER_CELL, size: 64, resizable: false }),
          column('bs-col-books-title', 'title', 'Title', { enableSorting: true, pin: 'left', size: 240 }),
          column('bs-col-books-author', 'authorName', 'Author', { enableSorting: true }),
          column('bs-col-books-genre', 'genreName', 'Genre', { enableSorting: true }),
          column('bs-col-books-price', 'priceText', 'Price', { enableSorting: true, sortField: 'price', align: 'end' }),
          column('bs-col-books-stock', 'stock', 'Stock', { enableSorting: true, align: 'end' }),
          column('bs-col-books-published', 'publishedAt', 'Published', { enableSorting: true, useDateFormat: 'DD/MM/YYYY' }),
          column('bs-col-books-rating', 'rating', 'Rating', { enableSorting: true, align: 'end' }),
        ],
      },
      { modal: bookFormItems(), filters: bookFilterItems() },
    ),
  ])
}

/* -------------------------------------------------------------- book detail */

function bookDetailPage(): PageDef {
  const book = (path = '') => state(L.book, path)
  const id = { bookId: urlParam() }
  const item = { bookId: urlParam(), id: rowParam() }
  return page(
    P.bookDetail,
    'bookDetail',
    'Book',
    '/books/:id',
    [
      back('bs-item-book-back', 'Back to books', P.books),
      card('bs-item-book-cover-card', 'bookCover', { media: { src: book('cover'), height: 380 } }, THIRD),
      container('bs-item-book-info', [
        typo('bs-item-book-info-title', 'Untitled', 'h3', { weight: 'bold', binding: book('title') }),
        typo('bs-item-book-info-author', '', 'subtitle1', { color: 'gray', binding: book('authorName') }),
        html(
          'bs-item-book-info-facts',
          'bookFacts',
          '<p><span class="dt-badge">{{genreName}}</span> <strong>{{priceText}}</strong> · {{stock}} in stock · ★ {{rating}} ({{reviewCount}} reviews)</p><dl><dt>ISBN</dt><dd>{{isbn}}</dd><dt>Pages</dt><dd>{{pages}}</dd><dt>Published</dt><dd>{{publishedAtText}}</dd></dl><p>{{description}}</p>',
          book(),
        ),
        navButton('bs-item-book-info-author-link', 'Author', 'user', navigate(P.authorDetail, { id: stateParam(L.book, 'authorId') })),
      ], { settings: settings(TWO_THIRDS) }),
      {
        id: 'bs-item-book-editions',
        label: 'Form List',
        type: 'formlist',
        settings: settings(FULL),
        config: {
          ...createDefaultFormListConfig('editions'),
          title: 'Editions',
          idKey: '_id',
          addLabel: 'Add edition',
          emptyText: 'No editions yet.',
          read: { endpointId: E.listEditions, params: id, extra: {} },
          create: { endpointId: E.createEdition, params: id, extra: {} },
          update: { endpointId: E.updateEdition, params: item, extra: {} },
          delete: { endpointId: E.deleteEdition, params: item, extra: {} },
          deleteConfirmTitle: 'Remove edition',
          deleteConfirmDescription: 'Remove this edition of the book?',
        },
        childCanvases: [
          canvas([
            staticSelect('bs-item-edition-format', 'format', 'Format', staticOptions([['Hardcover', 'Hardcover'], ['Paperback', 'Paperback'], ['Ebook', 'Ebook'], ['Audiobook', 'Audiobook']]), { xs: 4, sm: 2, md: 3, lg: 4 }),
            textField('bs-item-edition-isbn', 'isbn', 'ISBN', { xs: 4, sm: 2, md: 3, lg: 5 }),
            textField('bs-item-edition-price', 'price', 'Price (THB)', { xs: 4, sm: 2, md: 2, lg: 3 }, { dataType: 'number', isRequired: true }),
          ]),
        ],
      },
      typo('bs-item-book-reviews-title', 'Reviews', 'h5', { weight: 'bold' }),
      repeater(
        'bs-item-book-reviews',
        {
          name: 'reviews',
          source: 'endpoint',
          read: { endpointId: E.listReviews, params: id, extra: {} },
          itemSpan: { xs: 12, sm: 12, md: 6, lg: 6 },
          gap: '3',
          emptyText: 'No reviews yet.',
        },
        [
          card('bs-item-review-card', 'reviewCard', {
            title: 'Review',
            titleBinding: row('title'),
            subheaderBinding: row('reviewer'),
            content: [html('bs-item-review-body', 'reviewBody', '<p><strong>★ {{rating}}</strong> · <span class="dt-muted">{{createdAtText}}</span></p><p>{{body}}</p>', row('none'))],
          }),
        ],
      ),
    ],
    {
      parentId: P.books,
      crumb: stateParam(L.book, 'title'),
      loads: [load(L.book, 'book', E.getBook, { id: urlParam() }, 'cycle', 'Could not load the book')],
    },
  )
}

/* ------------------------------------------------------------------ authors */

function authorsPage(): PageDef {
  return page(P.authors, 'authors', 'Authors', '/authors', [
    ...heading('bs-item-authors-h', 'Authors', 'Every author, filtered and sorted in the browser. The name stays pinned while the table scrolls sideways; drag a header edge to resize a column.'),
    table('bs-item-authors-table', {
      name: 'authors',
      title: 'Authors',
      endpointId: E.listAuthors,
      apiPaths: 'data',
      canSearchAllColumns: true,
      rowNavigate: byId(P.authorDetail),
      cellLines: 1,
      columns: [
        column('bs-col-authors-avatar', 'avatar', '', { html: AVATAR_CELL, size: 56, resizable: false }),
        column('bs-col-authors-name', 'name', 'Name', { enableSorting: true, pin: 'left', size: 220 }),
        column('bs-col-authors-country', 'country', 'Country', { enableSorting: true, size: 160 }),
        column('bs-col-authors-born', 'born', 'Born', { enableSorting: true, align: 'end', size: 100 }),
        column('bs-col-authors-books', 'bookCount', 'Books', { enableSorting: true, align: 'end', size: 100 }),
        column('bs-col-authors-bio', 'bio', 'About', { minSize: 240 }),
      ],
    }),
  ])
}

function authorDetailPage(): PageDef {
  const author = (path = '') => state(L.author, path)
  const id = { authorId: urlParam() }
  const item = { authorId: urlParam(), id: rowParam() }
  return page(
    P.authorDetail,
    'authorDetail',
    'Author',
    '/authors/:id',
    [
      back('bs-item-author-back', 'Back to authors', P.authors),
      card('bs-item-author-card', 'authorCard', {
        title: 'Author',
        titleBinding: author('name'),
        subheaderBinding: author('country'),
        avatar: { src: author('avatar'), fallback: author('name') },
        content: [html('bs-item-author-bio', 'authorBio', '<p>Born {{born}} · {{bookCount}} books in the shop</p><p>{{bio}}</p>', author())],
      }),
      typo('bs-item-author-books-title', 'Books', 'h5', { weight: 'bold' }),
      repeater(
        'bs-item-author-books',
        {
          name: 'authorBooks',
          source: 'state',
          stateBinding: author('books'),
          itemSpan: { xs: 6, sm: 4, md: 3, lg: 2 },
          gap: '3',
          itemPadding: '0',
          emptyText: 'No books yet.',
          itemNavigate: byId(P.bookDetail),
        },
        [card('bs-item-author-book', 'authorBookCard', { titleBinding: row('title'), subheaderBinding: row('genreName'), media: { src: row('cover'), height: 200 } })],
      ),
      {
        id: 'bs-item-author-links',
        label: 'Form List',
        type: 'formlist',
        settings: settings(FULL),
        config: {
          ...createDefaultFormListConfig('authorLinks'),
          title: 'Links',
          idKey: '_id',
          addLabel: 'Add link',
          emptyText: 'No links yet.',
          read: { endpointId: E.listAuthorLinks, params: id, extra: {} },
          create: { endpointId: E.createAuthorLink, params: id, extra: {} },
          update: { endpointId: E.updateAuthorLink, params: item, extra: {} },
          delete: { endpointId: E.deleteAuthorLink, params: item, extra: {} },
          deleteConfirmTitle: 'Remove link',
          deleteConfirmDescription: 'Remove this link?',
        },
        childCanvases: [
          canvas([
            textField('bs-item-link-label', 'label', 'Label', { xs: 4, sm: 2, md: 3, lg: 4 }, { isRequired: true }),
            textField('bs-item-link-url', 'url', 'URL', { xs: 4, sm: 4, md: 5, lg: 8 }, { dataType: 'url', placeholder: 'https://…' }),
          ]),
        ],
      },
    ],
    {
      parentId: P.authors,
      crumb: stateParam(L.author, 'name'),
      loads: [load(L.author, 'author', E.getAuthor, { id: urlParam() }, 'cycle', 'Could not load the author')],
    },
  )
}

/* ------------------------------------------------------------------- orders */

const ORDER_STATUSES: [string, string][] = [
  ['pending', 'Pending'],
  ['paid', 'Paid'],
  ['shipped', 'Shipped'],
  ['delivered', 'Delivered'],
  ['refund_requested', 'Refund requested'],
  ['refunded', 'Refunded'],
  ['cancelled', 'Cancelled'],
]

function ordersPage(): PageDef {
  return page(P.orders, 'orders', 'Orders', '/orders', [
    ...heading('bs-item-orders-h', 'Orders', 'Newest first, paged by the API. Filter by status and dates; the order number is the row header, Customer and Amount are header groups, and when there is no shipping the subtotal and total share one cell.'),
    table(
      'bs-item-orders-table',
      {
        name: 'orders',
        title: 'Orders',
        endpointId: E.listOrders,
        apiPaths: 'data',
        canSearchAllColumns: true,
        pagination: paged(10),
        sort: sortBy('placedAt', 'desc'),
        filtersEnabled: true,
        filterDisplay: 'inline',
        requestMapping: [filterMap('bs-map-orders-status', 'status'), filterMap('bs-map-orders-from', 'from'), filterMap('bs-map-orders-to', 'to')],
        rowNavigate: byId(P.orderDetail),
        cellLines: 1,
        columns: [
          column('bs-col-orders-number', 'number', 'Order', { rowHeader: true, enableSorting: true, size: 120 }),
          column('bs-col-orders-placed', 'placedAt', 'Placed', { enableSorting: true, useDateFormat: 'DD/MM/YYYY HH:mm' }),
          column('bs-col-orders-customer', 'customerName', 'Name', { enableSorting: true, group: 'Customer' }),
          column('bs-col-orders-city', 'customerCity', 'City', { group: 'Customer' }),
          column('bs-col-orders-status', 'statusLabel', 'Status', { html: '<span class="dt-badge">{{statusLabel}}</span>', sortField: 'status', enableSorting: true }),
          column('bs-col-orders-items', 'itemCount', 'Items', { align: 'end' }),
          column('bs-col-orders-subtotal', 'subtotalText', 'Subtotal', { align: 'end', group: 'Amount', mergeColumns: true }),
          column('bs-col-orders-total', 'totalText', 'Total', { align: 'end', group: 'Amount', mergeColumns: true, enableSorting: true, sortField: 'total' }),
        ],
      },
      {
        filters: [
          {
            id: 'bs-item-orders-filter-status',
            label: 'Multi Autocomplete',
            type: 'multiAutocomplete',
            settings: settings(HALF),
            config: {
              ...createDefaultMultiAutocompleteConfig('status'),
              label: 'Status',
              placeholder: 'Any status',
              mode: 'static',
              options: staticOptions(ORDER_STATUSES),
              idKey: 'value',
              displayKey: 'label',
              searchKey: 'label',
            },
          },
          dateField('bs-item-orders-filter-from', 'from', 'From', QUARTER),
          dateField('bs-item-orders-filter-to', 'to', 'To', QUARTER),
        ],
      },
    ),
  ])
}

function orderDetailPage(): PageDef {
  const order = (path: string) => state(L.order, path)
  return page(
    P.orderDetail,
    'orderDetail',
    'Order',
    '/orders/:id',
    [
      back('bs-item-order-back', 'Back to orders', P.orders),
      html('bs-item-order-head', 'orderHead', '<h2>{{number}}</h2><p><span class="dt-badge">{{statusLabel}}</span> · placed {{placedAtText}} · paid by {{paymentMethod}} · handled by {{handledBy}}</p>', order(''), TWO_THIRDS),
      button('bs-item-order-print', { label: 'Print', icon: 'printer', variant: 'outlined', actions: [`fn:${PRINT_ORDER_ACTION_ID}`] }, BUTTON),
      card(
        'bs-item-order-customer',
        'orderCustomer',
        {
          title: 'Customer',
          titleBinding: order('customerName'),
          subheaderBinding: order('customerCity'),
          actions: [
            {
              ...createDefaultCardActionConfig('Customer page', 'chevronRight'),
              id: 'bs-item-order-customer-open',
              actions: ['Navigate'],
              navigate: navigate(P.customerDetail, { id: stateParam(L.order, 'customerId') }),
            },
          ],
        },
        THIRD,
      ),
      html(
        'bs-item-order-totals',
        'orderTotals',
        '<dl><dt>Items</dt><dd>{{itemCount}}</dd><dt>Subtotal</dt><dd>{{subtotalText}}</dd><dt>Shipping</dt><dd>{{shippingText}}</dd><dt>Total</dt><dd><strong>{{totalText}}</strong></dd></dl>',
        order(''),
        TWO_THIRDS,
      ),
      table('bs-item-order-items', {
        name: 'orderItems',
        title: 'Lines',
        rowsBinding: order('items'),
        rowNavigate: navigate(P.bookDetail, { id: rowParam('bookId') }),
        cellLines: 1,
        columns: [
          column('bs-col-items-cover', 'cover', '', { html: COVER_CELL, size: 64, resizable: false }),
          column('bs-col-items-title', 'title', 'Book'),
          column('bs-col-items-author', 'authorName', 'Author'),
          column('bs-col-items-qty', 'qty', 'Qty', { align: 'end' }),
          column('bs-col-items-price', 'priceText', 'Price', { align: 'end' }),
          column('bs-col-items-total', 'lineTotalText', 'Line total', { align: 'end' }),
        ],
      }),
      container(
        'bs-item-order-refund',
        [
          typo('bs-item-order-refund-title', 'Refund', 'h5', { weight: 'bold' }),
          html('bs-item-order-refund-reason', 'refundReason', '<p>{{refund.reason}}</p><p class="dt-muted">Requested by {{refund.requestedBy}} on {{refund.requestedAtText}}</p>', order('')),
          {
            id: 'bs-item-order-refund-line',
            label: 'Approval line',
            type: 'approvalline',
            settings: settings(FULL, stretch),
            config: {
              ...createDefaultApprovalLineConfig('refundLine'),
              items: order('refund.steps'),
              keys: {
                name: ['name'],
                status: ['status'],
                jobTitle: ['jobTitle'],
                personId: [],
                avatar: [],
                role: ['role'],
                remark: ['remark'],
                date: ['actionDate'],
                sequence: ['sequence'],
              },
              roleRules: [],
              requesterEnabled: false,
              showJobTitle: true,
            },
          },
          // Waiting for a manager: the clerk sees a note, the manager the approve form.
          { ...typo('bs-item-order-refund-wait', 'Waiting for a manager to approve this refund.', 'body2', { color: 'gray' }, FULL), dataWhen: CLERK },
          container(
            'bs-item-order-refund-form',
            [
              { id: 'bs-item-order-refund-id', label: 'Hidden', type: 'hidden', settings: settings(FULL), config: createDefaultHiddenConfig('_id'), initialValue: order('_id') },
              textarea('bs-item-order-refund-remark', 'remark', 'Remark (optional)', 2),
              button(
                'bs-item-order-refund-approve',
                {
                  label: 'Approve refund',
                  icon: 'checkCircle',
                  color: 'grass',
                  mode: 'confirm',
                  confirmTitle: 'Approve refund',
                  confirmDescription: 'Refund this order to the customer?',
                  confirmTrue: ['StartLoading', 'SubmitFormToPostAPI', 'StopLoading'],
                  endpointId: E.refundOrder,
                  reloadTableItemId: L.order,
                  snackbarSuccessEnabled: true,
                  snackbarSuccessMessage: 'Refund approved',
                  snackbarErrorException: true,
                },
                { xs: 4, sm: 3, md: 3, lg: 3 },
              ),
            ],
            { dataWhen: MANAGER },
          ),
        ],
        // The whole block only while a refund is waiting; a refunded order shows its line below.
        { dataWhen: whenField(L.order, 'status', 'eq', 'refund_requested') },
        true,
      ),
      container(
        'bs-item-order-refunded',
        [
          typo('bs-item-order-refunded-title', 'Refunded', 'h5', { weight: 'bold' }),
          {
            id: 'bs-item-order-refunded-line',
            label: 'Approval line',
            type: 'approvalline',
            settings: settings(FULL, stretch),
            config: {
              ...createDefaultApprovalLineConfig('refundedLine'),
              items: order('refund.steps'),
              keys: { name: ['name'], status: ['status'], jobTitle: ['jobTitle'], personId: [], avatar: [], role: ['role'], remark: ['remark'], date: ['actionDate'], sequence: ['sequence'] },
              roleRules: [],
              requesterEnabled: false,
              showJobTitle: true,
            },
          },
        ],
        { dataWhen: whenField(L.order, 'status', 'eq', 'refunded') },
        true,
      ),
    ],
    {
      parentId: P.orders,
      crumb: stateParam(L.order, 'number'),
      loads: [load(L.order, 'order', E.getOrder, { id: urlParam() }, 'cycle', 'Could not load the order')],
    },
  )
}

/* ---------------------------------------------------------------- customers */

const CITIES: [string, string][] = ['Bangkok', 'Chiang Mai', 'Phuket', 'Khon Kaen', 'Hat Yai', 'Singapore', 'Tokyo', 'London'].map((c) => [c, c])

function customersPage(): PageDef {
  const drawerItem = 'bs-item-customers-new'
  return page(P.customers, 'customers', 'Customers', '/customers', [
    ...heading('bs-item-customers-h', 'Customers', 'Paged and searched by the API. New customer opens a form in a drawer that posts to the API and refreshes the table.'),
    {
      id: drawerItem,
      label: 'Drawer',
      type: 'drawer',
      settings: settings(QUARTER, { justifySelf: { xs: 'start', sm: 'start', md: 'start', lg: 'start' } }),
      config: {
        ...createDefaultDrawerConfig('newCustomer'),
        title: 'New customer',
        description: 'Name and email are required; the email must be new.',
        size: '420px',
        trigger: { label: 'New customer', icon: 'puls', variant: 'contained' },
      },
      childCanvases: [
        canvas([
          textField('bs-item-customer-name', 'name', 'Name', FULL, { isRequired: true }),
          textField('bs-item-customer-email', 'email', 'Email', FULL, { dataType: 'email', isRequired: true }),
          textField('bs-item-customer-phone', 'phone', 'Phone', FULL, { dataType: 'tel' }),
          staticSelect('bs-item-customer-city', 'city', 'City', staticOptions(CITIES), FULL),
          button('bs-item-customer-cancel', { label: 'Cancel', variant: 'outlined', color: 'gray', actions: ['CloseModal'], modalItemId: drawerItem }, HALF),
          button(
            'bs-item-customer-save',
            {
              label: 'Save',
              icon: 'save',
              actions: ['StartLoading', 'SubmitFormToPostAPI', 'StopLoading', 'CloseModal'],
              endpointId: E.createCustomer,
              modalItemId: drawerItem,
              reloadTableItemId: 'bs-item-customers-table',
              snackbarSuccessEnabled: true,
              snackbarSuccessMessage: 'Customer added',
              snackbarErrorException: true,
            },
            HALF,
          ),
        ]),
      ],
    },
    table('bs-item-customers-table', {
      name: 'customers',
      title: 'Customers',
      endpointId: E.listCustomers,
      apiPaths: 'data',
      canSearchAllColumns: true,
      pagination: paged(10),
      sort: sortBy('name'),
      rowNavigate: byId(P.customerDetail),
      cellLines: 1,
      columns: [
        column('bs-col-customers-avatar', 'avatar', '', { html: AVATAR_CELL, size: 56, resizable: false }),
        column('bs-col-customers-name', 'name', 'Name', { enableSorting: true }),
        column('bs-col-customers-email', 'email', 'Email', { enableSorting: true }),
        column('bs-col-customers-city', 'city', 'City', { enableSorting: true }),
        column('bs-col-customers-orders', 'orderCount', 'Orders', { enableSorting: true, align: 'end' }),
        column('bs-col-customers-spent', 'totalSpentText', 'Spent', { enableSorting: true, sortField: 'totalSpent', align: 'end' }),
        column('bs-col-customers-joined', 'joinedAt', 'Joined', { enableSorting: true, useDateFormat: 'DD/MM/YYYY' }),
      ],
    }),
  ])
}

function customerDetailPage(): PageDef {
  const customer = (path: string) => state(L.customer, path)
  return page(
    P.customerDetail,
    'customerDetail',
    'Customer',
    '/customers/:id',
    [
      back('bs-item-customer-back', 'Back to customers', P.customers),
      card(
        'bs-item-customer-card',
        'customerCard',
        {
          title: 'Customer',
          titleBinding: customer('name'),
          subheaderBinding: customer('email'),
          avatar: { src: customer('avatar'), fallback: customer('name') },
          content: [html('bs-item-customer-facts', 'customerFacts', '<dl><dt>City</dt><dd>{{city}}</dd><dt>Phone</dt><dd>{{phone}}</dd><dt>Customer since</dt><dd>{{joinedAtText}}</dd><dt>Orders</dt><dd>{{orderCount}}</dd><dt>Spent</dt><dd><strong>{{totalSpentText}}</strong></dd></dl>', customer(''))],
        },
        THIRD,
      ),
      table(
        'bs-item-customer-orders',
        {
          name: 'customerOrders',
          title: 'Orders',
          rowsBinding: customer('orders'),
          rowNavigate: byId(P.orderDetail),
          cellLines: 1,
          columns: [
            column('bs-col-cust-orders-number', 'number', 'Order'),
            column('bs-col-cust-orders-placed', 'placedAt', 'Placed', { useDateFormat: 'DD/MM/YYYY' }),
            column('bs-col-cust-orders-status', 'statusLabel', 'Status', { html: '<span class="dt-badge">{{statusLabel}}</span>' }),
            column('bs-col-cust-orders-total', 'totalText', 'Total', { align: 'end' }),
          ],
        },
        {},
        TWO_THIRDS,
      ),
    ],
    {
      parentId: P.customers,
      crumb: stateParam(L.customer, 'name'),
      loads: [load(L.customer, 'customer', E.getCustomer, { id: urlParam() }, 'cycle', 'Could not load the customer')],
    },
  )
}

/* ---------------------------------------------------------------- catalogue */

function cataloguePage(): PageDef {
  const featured: DataCondition = { loadId: ITEM_CONDITION_SOURCE, test: 'compare', path: 'featured', op: 'eq', value: 'true' }
  return page(P.catalogue, 'catalogue', 'Catalogue', '/catalogue', [
    ...heading('bs-item-catalogue-h', 'Catalogue', 'The 24 best-rated books as customers see them: a card per book from a repeater, the whole card a link, and a Featured line on the items whose own field says so.'),
    repeater(
      'bs-item-catalogue',
      {
        name: 'catalogue',
        source: 'endpoint',
        read: { endpointId: E.listBooks, params: {}, extra: { limit: literal('24'), sortBy: literal('rating'), sortDir: literal('desc') } },
        itemSpan: { xs: 12, sm: 6, md: 4, lg: 3 },
        gap: '4',
        itemPadding: '0',
        emptyText: 'The catalogue is empty.',
        itemNavigate: byId(P.bookDetail),
      },
      [
        card('bs-item-catalogue-card', 'catalogueCard', {
          titleBinding: row('title'),
          subheaderBinding: row('authorName'),
          media: { src: row('cover'), height: 280 },
          content: [
            // A condition on the item's own field (the studio's "When this item's field…").
            { ...typo('bs-item-catalogue-featured', 'Featured', 'caption', { weight: 'bold', color: 'amber' }, FULL), dataWhen: featured },
            html('bs-item-catalogue-price', 'cataloguePrice', '<strong>{{priceText}}</strong> · ★ {{rating}} <span class="dt-muted">({{reviewCount}})</span>', row('none'), FULL, false),
          ],
        }),
      ],
    ),
  ])
}

/* ----------------------------------------------------------------- settings */

function settingsPage(): PageDef {
  const s = (path: string) => state(L.settings, path)
  return page(
    P.settings,
    'settings',
    'Settings',
    '/settings',
    [
      ...heading('bs-item-settings-h', 'Settings', 'One form over the settings load, saved with a single PATCH. The daily summary switch only works while low-stock alerts are on. Who approves a refund is the line at the bottom.'),
      { ...typo('bs-item-settings-readonly', 'You can look, but only a manager can save changes here.', 'body2', { color: 'amber', weight: 'medium' }, FULL), dataWhen: CLERK },
      staticSelect('bs-item-settings-currency', 'currency', 'Currency', staticOptions([['THB', 'Thai baht (THB)'], ['USD', 'US dollar (USD)'], ['EUR', 'Euro (EUR)']]), HALF, { initialValue: s('currency') }),
      textField('bs-item-settings-threshold', 'lowStockThreshold', 'Low-stock threshold', HALF, { dataType: 'number', helperText: 'A book at or below this stock is low.' }, { initialValue: s('lowStockThreshold') }),
      switchField('bs-item-settings-notify-orders', 'notifyOrders', 'Email me about new orders', {}, { initialValue: s('notifyOrders') }),
      switchField('bs-item-settings-notify-low', 'notifyLowStock', 'Low-stock alerts', {}, { initialValue: s('notifyLowStock') }),
      switchField(
        'bs-item-settings-daily',
        'lowStockDaily',
        'Send them as one daily summary',
        { enabledWhen: { itemId: 'bs-item-settings-notify-low', when: 'on' }, helperText: 'Needs low-stock alerts on.' },
        { initialValue: s('lowStockDaily') },
      ),
      {
        id: 'bs-item-settings-refund-line',
        label: 'Workflow editor',
        type: 'workfloweditor',
        settings: settings(FULL, stretch),
        config: {
          ...createDefaultWorkflowEditorConfig('refundLine'),
          label: 'Refund approval line',
          helperText: 'Who reviews and who approves a refund request. The approver is always last.',
          isRequired: true,
          errorMessage: 'Add at least one step',
          roles: [
            { id: 'bs-role-reviewer', value: 'Reviewer', label: 'Reviewer', max: '', position: '' },
            { id: 'bs-role-approver', value: 'Approver', label: 'Approver', max: 1, position: 'last' },
          ],
          users: { endpointId: E.listStaff, paths: 'data', idKey: '_id', displayKey: 'name', subtitleKey: 'jobTitle', avatarKey: 'avatar', searchKey: 'name' },
          labels: { ...createDefaultWorkflowEditorConfig('').labels, add: 'Add step', dialogTitle: 'Add step', editTitle: 'Edit step', roleField: 'Role', incharge: 'Who', cc: 'Copy to' },
        },
        initialValue: s('refundLine'),
      },
      button(
        'bs-item-settings-save',
        {
          label: 'Save settings',
          icon: 'save',
          actions: ['StartLoading', 'SubmitFormToPatchAPI', 'StopLoading'],
          endpointId: E.updateSettings,
          reloadTableItemId: L.settings,
          snackbarSuccessEnabled: true,
          snackbarSuccessMessage: 'Settings saved',
          snackbarErrorException: true,
        },
        { xs: 4, sm: 2, md: 2, lg: 2 },
        { dataWhen: MANAGER },
      ),
    ],
    { loads: [load(L.settings, 'settings', E.getSettings, {}, 'skeleton', 'Could not load the settings')] },
  )
}

/** Every page, in menu order. */
export function bookshopPages(): PageDef[] {
  return [
    dashboardPage(),
    cataloguePage(),
    booksPage(),
    bookDetailPage(),
    authorsPage(),
    authorDetailPage(),
    ordersPage(),
    orderDetailPage(),
    customersPage(),
    customerDetailPage(),
    settingsPage(),
  ]
}
