/**
 * The in-memory store behind one app instance: the generated records, the settings, the
 * uploads, id counters, and the read views that derive every computed field (names, colours,
 * ratings, totals, money strings, asset URLs) from the current records — so edits show up
 * everywhere at once.
 */
import { generate, round2, slug, STATUS_LABELS, type AuthorRec, type BookRec, type CustomerRec, type Db, type OrderRec, type StaffRec } from './data.ts';
import { dateText, dateTimeText, money } from './http.ts';

export interface StoreOptions {
  anchorDate: string;
  publicUrl: string;
}

export interface Settings {
  currency: string;
  notifyOrders: boolean;
  notifyLowStock: boolean;
  lowStockDaily: boolean;
  lowStockThreshold: number;
  refundLine: RefundLineStep[];
}

export interface RefundLineStep {
  sequence: number;
  actionType: string;
  inchargeUsers: unknown[];
  ccUsers: unknown[];
  [extra: string]: unknown;
}

export interface Upload {
  name: string;
  type: string;
  bytes: Uint8Array<ArrayBuffer>;
}

/** Orders that count as sales (revenue, a customer's total spent, the daily chart). */
export const isSale = (o: OrderRec): boolean => o.status !== 'cancelled' && o.status !== 'refunded';

export class Store {
  readonly db: Db;
  readonly anchorDate: string;
  readonly publicUrl: string;
  settings: Settings;
  readonly uploads = new Map<string, Upload>();
  private counters: Record<'book' | 'customer' | 'link' | 'edition' | 'upload', number>;

  constructor(opts: StoreOptions) {
    this.anchorDate = opts.anchorDate;
    this.publicUrl = opts.publicUrl;
    this.db = generate(opts.anchorDate);
    const maxOf = (ids: string[]) => Math.max(0, ...ids.map((id) => Number(id.replace(/^\D+/, '')) || 0));
    this.counters = {
      book: maxOf(this.db.books.map((b) => b._id)),
      customer: maxOf(this.db.customers.map((c) => c._id)),
      link: maxOf([...this.db.links.values()].flat().map((l) => l._id)),
      edition: maxOf([...this.db.editions.values()].flat().map((e) => e._id)),
      upload: 0,
    };
    const staff = (id: string) => this.staffView(this.db.staff.find((s) => s._id === id)!);
    this.settings = {
      currency: 'THB',
      notifyOrders: true,
      notifyLowStock: true,
      lowStockDaily: false,
      lowStockThreshold: 5,
      refundLine: [
        { sequence: 1, actionType: 'Reviewer', inchargeUsers: [staff('s-4')], ccUsers: [] },
        { sequence: 2, actionType: 'Approver', inchargeUsers: [staff('s-1')], ccUsers: [staff('s-2')] },
      ],
    };
  }

  /** The next id of a kind: `b-121`, `c-061`, `l-061`, `e-241`, `u-1`. */
  nextId(kind: keyof Store['counters']): string {
    const n = ++this.counters[kind];
    switch (kind) {
      case 'book':
        return `b-${String(n).padStart(3, '0')}`;
      case 'customer':
        return `c-${String(n).padStart(3, '0')}`;
      case 'link':
        return `l-${String(n).padStart(3, '0')}`;
      case 'edition':
        return `e-${String(n).padStart(3, '0')}`;
      case 'upload':
        return `u-${n}`;
    }
  }

  // ── URLs ───────────────────────────────────────────────────────────────────

  avatarUrl(name: string): string {
    return `${this.publicUrl}/api/avatars/${encodeURIComponent(slug(name) || 'unknown')}.svg`;
  }
  coverUrl(bookId: string): string {
    return `${this.publicUrl}/api/covers/${encodeURIComponent(bookId)}.svg`;
  }
  uploadUrl(name: string): string {
    return `${this.publicUrl}/api/uploads/${encodeURIComponent(name)}`;
  }

  // ── Lookups ────────────────────────────────────────────────────────────────

  genre(id: string) {
    return this.db.genres.find((g) => g._id === id);
  }
  author(id: string) {
    return this.db.authors.find((a) => a._id === id);
  }
  book(id: string) {
    return this.db.books.find((b) => b._id === id);
  }
  customer(id: string) {
    return this.db.customers.find((c) => c._id === id);
  }
  order(id: string) {
    return this.db.orders.find((o) => o._id === id);
  }

  // ── Views ──────────────────────────────────────────────────────────────────

  authorView(a: AuthorRec) {
    return {
      _id: a._id,
      name: a.name,
      country: a.country,
      born: a.born,
      bio: a.bio,
      avatar: this.avatarUrl(a.name),
      bookCount: this.db.books.filter((b) => b.authorId === a._id).length,
    };
  }

  bookView(b: BookRec) {
    const author = this.author(b.authorId);
    const genre = this.genre(b.genreId);
    const reviews = this.db.reviews.get(b._id) ?? [];
    const rating = reviews.length ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : 0;
    return {
      _id: b._id,
      title: b.title,
      isbn: b.isbn,
      authorId: b.authorId,
      authorName: author?.name ?? '',
      genreId: b.genreId,
      genreName: genre?.name ?? '',
      genreColor: genre?.color ?? '',
      price: b.price,
      priceText: money(b.price),
      stock: b.stock,
      publishedAt: b.publishedAt,
      publishedAtText: dateText(b.publishedAt),
      pages: b.pages,
      cover: b.cover || this.coverUrl(b._id),
      description: b.description,
      featured: b.featured,
      rating,
      reviewCount: reviews.length,
      updatedAt: b.updatedAt,
    };
  }

  customerView(c: CustomerRec) {
    const own = this.db.orders.filter((o) => o.customerId === c._id);
    const totalSpent = round2(own.filter(isSale).reduce((s, o) => s + this.totals(o).total, 0));
    return {
      _id: c._id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      city: c.city,
      joinedAt: c.joinedAt,
      joinedAtText: dateText(c.joinedAt),
      orderCount: own.length,
      totalSpent,
      totalSpentText: money(totalSpent),
      avatar: this.avatarUrl(c.name),
    };
  }

  totals(o: OrderRec) {
    const subtotal = round2(o.items.reduce((s, it) => s + it.qty * it.price, 0));
    return {
      itemCount: o.items.reduce((s, it) => s + it.qty, 0),
      subtotal,
      total: round2(subtotal + o.shipping),
    };
  }

  orderView(o: OrderRec) {
    const customer = this.customer(o.customerId);
    const { itemCount, subtotal, total } = this.totals(o);
    return {
      _id: o._id,
      number: o.number,
      customerId: o.customerId,
      customerName: customer?.name ?? '',
      customerCity: customer?.city ?? '',
      status: o.status,
      statusLabel: STATUS_LABELS[o.status],
      placedAt: o.placedAt,
      placedAtText: dateTimeText(o.placedAt),
      itemCount,
      subtotal,
      subtotalText: money(subtotal),
      shipping: o.shipping,
      shippingText: money(o.shipping),
      total,
      totalText: money(total),
      paymentMethod: o.paymentMethod,
      handledBy: o.handledBy,
    };
  }

  orderDetail(o: OrderRec) {
    return {
      ...this.orderView(o),
      items: o.items.map((it) => {
        const book = this.book(it.bookId);
        const lineTotal = round2(it.qty * it.price);
        return {
          _id: it._id,
          bookId: it.bookId,
          title: it.title,
          authorName: it.authorName,
          cover: book?.cover || this.coverUrl(it.bookId),
          qty: it.qty,
          price: it.price,
          priceText: money(it.price),
          lineTotal,
          lineTotalText: money(lineTotal),
        };
      }),
      refund: o.refund
        ? { ...o.refund, requestedAtText: dateTimeText(o.refund.requestedAt), steps: o.refund.steps.map((s) => ({ ...s })) }
        : null,
    };
  }

  staffView(s: StaffRec) {
    return {
      _id: s._id,
      employeeId: s.employeeId,
      email: s.email,
      firstNameEn: s.firstNameEn,
      lastNameEN: s.lastNameEN,
      name: s.name,
      jobTitle: s.jobTitle,
      role: s.role,
      avatar: this.avatarUrl(s.name),
      companyModel: { name: 'Gummy Books' },
      active: s.active,
    };
  }
}
