import type { EndpointDef, HttpMethod } from '../../Api/types'
import type { ModelDef, ModelField } from '../../Model/types'

/**
 * The Book shop demo's shared library (see the grilled design
 * `bookshop-demo`): one model per shape and one endpoint per route of the
 * demo's own mock API (`demo/api/README.md` is the contract). Ids are fixed
 * strings so the generated workspace is the same on every run.
 */

let fieldSeq = 0
function field(
  name: string,
  kind: ModelField['kind'] = 'string',
  children: ModelField[] = [],
  arrayOf: ModelField['arrayOf'] = children.length ? 'object' : 'string',
): ModelField {
  return { id: `bs-field-${++fieldSeq}`, name, kind, children, arrayOf }
}
const num = (name: string) => field(name, 'number')
const bool = (name: string) => field(name, 'boolean')
const list = (name: string, children: ModelField[]) => field(name, 'array', children, 'object')
const object = (name: string, children: ModelField[]) => field(name, 'object', children)

/* ------------------------------------------------------------------ rows */

const genreRow = () => [field('_id'), field('name'), field('color')]
const authorRow = () => [field('_id'), field('name'), field('country'), num('born'), field('bio'), field('avatar'), num('bookCount')]
const bookRow = () => [
  field('_id'),
  field('title'),
  field('isbn'),
  field('authorId'),
  field('authorName'),
  field('genreId'),
  field('genreName'),
  field('genreColor'),
  num('price'),
  field('priceText'),
  num('stock'),
  field('publishedAt'),
  num('pages'),
  field('cover'),
  field('description'),
  bool('featured'),
  num('rating'),
  num('reviewCount'),
  field('updatedAt'),
  field('publishedAtText'),
]
const editionRow = () => [field('_id'), field('format'), field('isbn'), num('price'), field('priceText')]
const reviewRow = () => [field('_id'), field('reviewer'), num('rating'), field('title'), field('body'), field('createdAt'), field('createdAtText')]
const linkRow = () => [field('_id'), field('label'), field('url')]
const customerRow = () => [
  field('_id'),
  field('name'),
  field('email'),
  field('phone'),
  field('city'),
  field('joinedAt'),
  field('joinedAtText'),
  num('orderCount'),
  num('totalSpent'),
  field('totalSpentText'),
  field('avatar'),
]
const orderRow = () => [
  field('_id'),
  field('number'),
  field('customerId'),
  field('customerName'),
  field('customerCity'),
  field('status'),
  field('statusLabel'),
  field('placedAt'),
  field('placedAtText'),
  num('itemCount'),
  num('subtotal'),
  field('subtotalText'),
  num('shipping'),
  field('shippingText'),
  num('total'),
  field('totalText'),
  field('paymentMethod'),
  field('handledBy'),
]
const orderItemRow = () => [
  field('_id'),
  field('bookId'),
  field('title'),
  field('authorName'),
  field('cover'),
  num('qty'),
  num('price'),
  field('priceText'),
  num('lineTotal'),
  field('lineTotalText'),
]
const refundStepRow = () => [num('sequence'), field('role'), field('name'), field('jobTitle'), num('status'), field('actionDate'), field('remark')]
const staffRow = () => [
  field('_id'),
  field('employeeId'),
  field('email'),
  field('firstNameEn'),
  field('lastNameEN'),
  field('name'),
  field('jobTitle'),
  field('role'),
  field('avatar'),
  object('companyModel', [field('name')]),
  bool('active'),
]
const settingsFields = () => [
  field('currency'),
  bool('notifyOrders'),
  bool('notifyLowStock'),
  bool('lowStockDaily'),
  num('lowStockThreshold'),
  list('refundLine', [num('sequence'), field('actionType'), field('inchargeUsers', 'any'), field('ccUsers', 'any')]),
]

/* ---------------------------------------------------------------- models */

export const M = {
  genreList: 'bs-model-genre-list',
  authorList: 'bs-model-author-list',
  authorDetail: 'bs-model-author-detail',
  authorQuery: 'bs-model-author-query',
  bookList: 'bs-model-book-list',
  book: 'bs-model-book',
  bookQuery: 'bs-model-book-query',
  bookBody: 'bs-model-book-body',
  editionList: 'bs-model-edition-list',
  edition: 'bs-model-edition',
  editionBody: 'bs-model-edition-body',
  reviewList: 'bs-model-review-list',
  linkList: 'bs-model-link-list',
  link: 'bs-model-link',
  linkBody: 'bs-model-link-body',
  customerList: 'bs-model-customer-list',
  customer: 'bs-model-customer',
  customerDetail: 'bs-model-customer-detail',
  customerQuery: 'bs-model-customer-query',
  customerBody: 'bs-model-customer-body',
  orderList: 'bs-model-order-list',
  orderDetail: 'bs-model-order-detail',
  orderQuery: 'bs-model-order-query',
  refundBody: 'bs-model-refund-body',
  staffList: 'bs-model-staff-list',
  staff: 'bs-model-staff',
  emailQuery: 'bs-model-email-query',
  settings: 'bs-model-settings',
  settingsBody: 'bs-model-settings-body',
  summary: 'bs-model-summary',
  deleted: 'bs-model-deleted',
  idParam: 'bs-model-id-param',
  genreParam: 'bs-model-genre-param',
  bookIdParam: 'bs-model-book-id-param',
  bookItemParam: 'bs-model-book-item-param',
  authorIdParam: 'bs-model-author-id-param',
  authorItemParam: 'bs-model-author-item-param',
} as const

const listOf = (rows: () => ModelField[]) => [list('data', rows()), num('total')]
const one = (rows: () => ModelField[]) => [object('data', rows())]
const paging = () => [num('offset'), num('limit'), field('search'), field('sortBy'), field('sortDir')]

export function bookshopModels(): ModelDef[] {
  fieldSeq = 0
  const model = (id: string, name: string, fields: ModelField[]): ModelDef => ({ id, name, fields })
  return [
    model(M.genreList, 'genreListRes', listOf(genreRow)),
    model(M.authorList, 'authorListRes', listOf(authorRow)),
    model(M.authorDetail, 'authorDetailRes', [object('data', [...authorRow(), list('books', bookRow())])]),
    model(M.authorQuery, 'authorQuery', [field('genre'), field('search')]),
    model(M.bookList, 'bookListRes', listOf(bookRow)),
    model(M.book, 'bookRes', one(bookRow)),
    model(M.bookQuery, 'bookPageQuery', [...paging(), field('genre'), field('author'), field('inStock'), field('featured')]),
    model(M.bookBody, 'bookBody', [
      field('title'),
      field('isbn'),
      field('authorId'),
      field('genreId'),
      num('price'),
      num('stock'),
      field('publishedAt'),
      num('pages'),
      field('cover'),
      field('description'),
      bool('featured'),
    ]),
    model(M.editionList, 'editionListRes', listOf(editionRow)),
    model(M.edition, 'editionRes', one(editionRow)),
    model(M.editionBody, 'editionBody', [field('format'), field('isbn'), num('price')]),
    model(M.reviewList, 'reviewListRes', listOf(reviewRow)),
    model(M.linkList, 'linkListRes', listOf(linkRow)),
    model(M.link, 'linkRes', one(linkRow)),
    model(M.linkBody, 'linkBody', [field('label'), field('url')]),
    model(M.customerList, 'customerListRes', listOf(customerRow)),
    model(M.customer, 'customerRes', one(customerRow)),
    model(M.customerDetail, 'customerDetailRes', [object('data', [...customerRow(), list('orders', orderRow())])]),
    model(M.customerQuery, 'customerPageQuery', [...paging(), field('city')]),
    model(M.customerBody, 'customerBody', [field('name'), field('email'), field('phone'), field('city')]),
    model(M.orderList, 'orderListRes', listOf(orderRow)),
    model(M.orderDetail, 'orderDetailRes', [
      object('data', [
        ...orderRow(),
        list('items', orderItemRow()),
        object('refund', [field('reason'), field('requestedAt'), field('requestedAtText'), field('requestedBy'), list('steps', refundStepRow())]),
      ]),
    ]),
    model(M.orderQuery, 'orderPageQuery', [...paging(), field('status'), field('from'), field('to'), field('customer')]),
    model(M.refundBody, 'refundBody', [field('remark')]),
    model(M.staffList, 'staffListRes', listOf(staffRow)),
    model(M.staff, 'staffRes', one(staffRow)),
    model(M.emailQuery, 'emailQuery', [field('email')]),
    model(M.settings, 'settingsRes', [object('data', settingsFields())]),
    model(M.settingsBody, 'settingsBody', settingsFields()),
    model(M.summary, 'summaryRes', [
      object('data', [
        num('bookCount'),
        num('customerCount'),
        num('ordersThisMonth'),
        num('revenueThisMonth'),
        field('revenueThisMonthText'),
        num('lowStockCount'),
        num('refundRequests'),
        list('salesByDay', [field('date'), num('total'), num('orders')]),
        list('lowStock', bookRow()),
        list('recentOrders', orderRow()),
      ]),
    ]),
    model(M.deleted, 'deletedRes', [object('data', [field('_id')])]),
    model(M.idParam, 'idParam', [field('id')]),
    model(M.genreParam, 'genreParam', [field('genre')]),
    model(M.bookIdParam, 'bookIdParam', [field('bookId')]),
    model(M.bookItemParam, 'bookItemParam', [field('bookId'), field('id')]),
    model(M.authorIdParam, 'authorIdParam', [field('authorId')]),
    model(M.authorItemParam, 'authorItemParam', [field('authorId'), field('id')]),
  ]
}

/* ------------------------------------------------------------- endpoints */

export const E = {
  listGenres: 'bs-endpoint-list-genres',
  listAuthors: 'bs-endpoint-list-authors',
  genreAuthors: 'bs-endpoint-genre-authors',
  getAuthor: 'bs-endpoint-get-author',
  listAuthorLinks: 'bs-endpoint-list-author-links',
  createAuthorLink: 'bs-endpoint-create-author-link',
  updateAuthorLink: 'bs-endpoint-update-author-link',
  deleteAuthorLink: 'bs-endpoint-delete-author-link',
  listBooks: 'bs-endpoint-list-books',
  getBook: 'bs-endpoint-get-book',
  createBook: 'bs-endpoint-create-book',
  updateBook: 'bs-endpoint-update-book',
  deleteBook: 'bs-endpoint-delete-book',
  listEditions: 'bs-endpoint-list-editions',
  createEdition: 'bs-endpoint-create-edition',
  updateEdition: 'bs-endpoint-update-edition',
  deleteEdition: 'bs-endpoint-delete-edition',
  listReviews: 'bs-endpoint-list-reviews',
  listCustomers: 'bs-endpoint-list-customers',
  getCustomer: 'bs-endpoint-get-customer',
  createCustomer: 'bs-endpoint-create-customer',
  listOrders: 'bs-endpoint-list-orders',
  getOrder: 'bs-endpoint-get-order',
  refundOrder: 'bs-endpoint-refund-order',
  listStaff: 'bs-endpoint-list-staff',
  staffByEmail: 'bs-endpoint-staff-by-email',
  getSettings: 'bs-endpoint-get-settings',
  updateSettings: 'bs-endpoint-update-settings',
  getSummary: 'bs-endpoint-get-summary',
} as const

type Refs = Partial<Pick<EndpointDef, 'response' | 'query' | 'parameter' | 'body'>>

function endpoint(id: string, name: string, method: HttpMethod, url: string, description: string, refs: Refs): EndpointDef {
  return { id, name, description, url, method, withOptions: false, response: null, query: null, parameter: null, body: null, ...refs }
}

export function bookshopEndpoints(): EndpointDef[] {
  return [
    endpoint(E.listGenres, 'listGenres', 'GET', '/api/genres', 'Every genre, by name', { response: M.genreList }),
    endpoint(E.listAuthors, 'listAuthors', 'GET', '/api/authors', 'Authors (optionally of one genre, or matching a name)', {
      response: M.authorList,
      query: M.authorQuery,
    }),
    endpoint(E.genreAuthors, 'genreAuthors', 'GET', '/api/genres/:genre/authors', 'Authors with a book in one genre (the dependent filter)', {
      response: M.authorList,
      parameter: M.genreParam,
    }),
    endpoint(E.getAuthor, 'getAuthor', 'GET', '/api/authors/:id', 'One author with their books', { response: M.authorDetail, parameter: M.idParam }),
    endpoint(E.listAuthorLinks, 'listAuthorLinks', 'GET', '/api/authors/:authorId/links', "An author's links", {
      response: M.linkList,
      parameter: M.authorIdParam,
    }),
    endpoint(E.createAuthorLink, 'createAuthorLink', 'POST', '/api/authors/:authorId/links', 'Add a link to an author', {
      response: M.link,
      parameter: M.authorIdParam,
      body: M.linkBody,
    }),
    endpoint(E.updateAuthorLink, 'updateAuthorLink', 'PATCH', '/api/authors/:authorId/links/:id', 'Change one link', {
      response: M.link,
      parameter: M.authorItemParam,
      body: M.linkBody,
    }),
    endpoint(E.deleteAuthorLink, 'deleteAuthorLink', 'DELETE', '/api/authors/:authorId/links/:id', 'Remove one link', {
      response: M.deleted,
      parameter: M.authorItemParam,
    }),
    endpoint(E.listBooks, 'listBooks', 'GET', '/api/books', 'A page of books (search, genre, author, stock, sort)', {
      response: M.bookList,
      query: M.bookQuery,
    }),
    endpoint(E.getBook, 'getBook', 'GET', '/api/books/:id', 'One book', { response: M.book, parameter: M.idParam }),
    endpoint(E.createBook, 'createBook', 'POST', '/api/books', 'Add a book', { response: M.book, body: M.bookBody }),
    endpoint(E.updateBook, 'updateBook', 'PATCH', '/api/books/:id', 'Change a book', { response: M.book, parameter: M.idParam, body: M.bookBody }),
    endpoint(E.deleteBook, 'deleteBook', 'POST', '/api/books/:id/delete', 'Delete a book (a form button can only POST / PATCH)', {
      response: M.deleted,
      parameter: M.idParam,
      body: M.bookBody,
    }),
    endpoint(E.listEditions, 'listEditions', 'GET', '/api/books/:bookId/editions', "A book's editions", {
      response: M.editionList,
      parameter: M.bookIdParam,
    }),
    endpoint(E.createEdition, 'createEdition', 'POST', '/api/books/:bookId/editions', 'Add an edition', {
      response: M.edition,
      parameter: M.bookIdParam,
      body: M.editionBody,
    }),
    endpoint(E.updateEdition, 'updateEdition', 'PATCH', '/api/books/:bookId/editions/:id', 'Change an edition', {
      response: M.edition,
      parameter: M.bookItemParam,
      body: M.editionBody,
    }),
    endpoint(E.deleteEdition, 'deleteEdition', 'DELETE', '/api/books/:bookId/editions/:id', 'Remove an edition', {
      response: M.deleted,
      parameter: M.bookItemParam,
    }),
    endpoint(E.listReviews, 'listReviews', 'GET', '/api/books/:bookId/reviews', "A book's reviews, newest first", {
      response: M.reviewList,
      parameter: M.bookIdParam,
    }),
    endpoint(E.listCustomers, 'listCustomers', 'GET', '/api/customers', 'A page of customers', { response: M.customerList, query: M.customerQuery }),
    endpoint(E.getCustomer, 'getCustomer', 'GET', '/api/customers/:id', 'One customer with their orders', {
      response: M.customerDetail,
      parameter: M.idParam,
    }),
    endpoint(E.createCustomer, 'createCustomer', 'POST', '/api/customers', 'Add a customer', { response: M.customer, body: M.customerBody }),
    endpoint(E.listOrders, 'listOrders', 'GET', '/api/orders', 'A page of orders (status, dates, sort)', { response: M.orderList, query: M.orderQuery }),
    endpoint(E.getOrder, 'getOrder', 'GET', '/api/orders/:id', 'One order with its lines and refund request', {
      response: M.orderDetail,
      parameter: M.idParam,
    }),
    endpoint(E.refundOrder, 'refundOrder', 'POST', '/api/orders/:id/refund', 'Approve the refund request of an order', {
      response: M.orderDetail,
      parameter: M.idParam,
      body: M.refundBody,
    }),
    endpoint(E.listStaff, 'listStaff', 'GET', '/api/staff', 'Active staff (the refund approval line picker)', { response: M.staffList }),
    endpoint(E.staffByEmail, 'staffByEmail', 'GET', '/api/staff/by-email', 'The signed-in person (the sign-in profile lookup)', {
      response: M.staff,
      query: M.emailQuery,
    }),
    endpoint(E.getSettings, 'getSettings', 'GET', '/api/settings', 'The shop settings', { response: M.settings }),
    endpoint(E.updateSettings, 'updateSettings', 'PATCH', '/api/settings', 'Change the shop settings', { response: M.settings, body: M.settingsBody }),
    endpoint(E.getSummary, 'getSummary', 'GET', '/api/summary', 'The dashboard numbers', { response: M.summary }),
  ]
}
