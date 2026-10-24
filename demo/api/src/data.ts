/**
 * The seeded generator: `generate(anchorDate)` builds the Book shop's raw records from a
 * mulberry32 PRNG with a fixed seed, so the same anchor date always yields the same rows.
 * Records here hold ids, not derived fields — `store.ts` derives names, totals and URLs on read.
 */
import {
  AUTHOR_FIRST, AUTHOR_LAST, BIO_FIRST, BIO_SECOND, COUNTRIES, CUSTOMER_INTL_FIRST, CUSTOMER_INTL_LAST,
  CUSTOMER_THAI_FIRST, CUSTOMER_THAI_LAST, GENRES, INTL_CITIES, PAYMENT_METHODS, PRAISE, PREMISES,
  REFUND_REASONS, REVIEW_BODIES, REVIEW_TITLES, REVIEWERS, THAI_CITIES, TITLE_PARTS,
  type GenreSeed,
} from './words.ts';

// ── Types ────────────────────────────────────────────────────────────────────

export type Genre = GenreSeed;

export interface AuthorRec {
  _id: string;
  name: string;
  country: string;
  born: number;
  bio: string;
}

export interface Link {
  _id: string;
  label: string;
  url: string;
}

export interface BookRec {
  _id: string;
  title: string;
  isbn: string;
  authorId: string;
  genreId: string;
  price: number;
  stock: number;
  publishedAt: string;
  pages: number;
  /** An uploaded image's URL, or `''` for the drawn cover. */
  cover: string;
  description: string;
  featured: boolean;
  updatedAt: string;
}

export interface Review {
  _id: string;
  reviewer: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
}

export interface Edition {
  _id: string;
  format: string;
  isbn: string;
  price: number;
}

export interface CustomerRec {
  _id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  joinedAt: string;
}

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'refund_requested' | 'refunded' | 'cancelled';

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
  refund_requested: 'Refund requested',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
};

export interface OrderItemRec {
  _id: string;
  bookId: string;
  title: string;
  authorName: string;
  qty: number;
  price: number;
}

export interface RefundStep {
  sequence: number;
  role: string;
  name: string;
  jobTitle: string;
  /** Approval-line codes: 0 pending, 2 approving, 3 rejected, 5 approved. */
  status: 0 | 2 | 3 | 5;
  actionDate: string | null;
  remark: string;
}

export interface Refund {
  reason: string;
  requestedAt: string;
  requestedBy: string;
  steps: RefundStep[];
}

export interface OrderRec {
  _id: string;
  number: string;
  customerId: string;
  status: OrderStatus;
  placedAt: string;
  items: OrderItemRec[];
  shipping: number;
  paymentMethod: string;
  handledBy: string;
  refund: Refund | null;
}

export interface StaffRec {
  _id: string;
  employeeId: string;
  email: string;
  firstNameEn: string;
  lastNameEN: string;
  name: string;
  jobTitle: string;
  role: 'manager' | 'clerk';
  active: boolean;
}

export interface Db {
  genres: Genre[];
  authors: AuthorRec[];
  links: Map<string, Link[]>;
  books: BookRec[];
  reviews: Map<string, Review[]>;
  editions: Map<string, Edition[]>;
  customers: CustomerRec[];
  orders: OrderRec[];
  staff: StaffRec[];
}

// ── PRNG + helpers ───────────────────────────────────────────────────────────

export const SEED = 20261024;

/** mulberry32: a tiny, fast, deterministic 32-bit PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Rng {
  private readonly next: () => number;
  constructor(seed: number) {
    this.next = mulberry32(seed);
  }
  float(): number {
    return this.next();
  }
  /** Inclusive on both ends. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
  pick<T>(list: readonly T[]): T {
    return list[Math.floor(this.next() * list.length)]!;
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  shuffle<T>(list: readonly T[]): T[] {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
  }
}

export const pad = (n: number, width: number): string => String(n).padStart(width, '0');
export const round2 = (n: number): number => Math.round(n * 100) / 100;

/** `YYYY-MM-DD` shifted by whole UTC days. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** An ISO timestamp on `date` at the given UTC time. */
export function stampAt(date: string, h: number, m: number, s: number): string {
  return `${date}T${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)}.000Z`;
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export const slug = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** A valid ISBN-13 with the 978 prefix. */
function isbn13(rng: Rng): string {
  let digits = '978';
  for (let i = 0; i < 9; i++) digits += String(rng.int(0, 9));
  const sum = [...digits].reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return digits + String((10 - (sum % 10)) % 10);
}

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'];

// ── Generator ────────────────────────────────────────────────────────────────

/** Builds every set from scratch; `anchorDate` is the last day of the order history. */
export function generate(anchorDate: string): Db {
  const rng = new Rng(SEED);
  const genres = GENRES.map((g) => ({ ...g }));
  const genreById = new Map(genres.map((g) => [g._id, g]));

  // Authors: 30 unique names, a primary + secondary genre each, 2–7 books (120 in all).
  const authorNames = new Set<string>();
  while (authorNames.size < 30) authorNames.add(`${rng.pick(AUTHOR_FIRST)} ${rng.pick(AUTHOR_LAST)}`);
  const genreOrder = rng.shuffle(genres.map((g) => g._id));
  const authors: AuthorRec[] = [];
  const authorGenres: [string, string][] = [];
  [...authorNames].forEach((name, i) => {
    const primary = genreOrder[i % genreOrder.length]!;
    const secondary = rng.pick(genreOrder.filter((g) => g !== primary));
    const first = name.split(' ')[0]!;
    const genreName = genreById.get(primary)!.name.toLowerCase();
    const born = rng.int(1942, 1994);
    const country = rng.pick(COUNTRIES);
    let bio = `${name}, born in ${born} in ${country}, ${rng.pick(BIO_FIRST).replace('{genre}', genreName)}.`;
    if (rng.chance(0.6)) bio += ` ${rng.pick(BIO_SECOND).replace('{first}', first)}`;
    authors.push({ _id: `a-${pad(i + 1, 2)}`, name, country, born, bio });
    authorGenres.push([primary, secondary]);
  });
  const counts = authors.map(() => 2);
  for (let remaining = 120 - counts.length * 2; remaining > 0; ) {
    const i = rng.int(0, counts.length - 1);
    if (counts[i]! < 7) {
      counts[i]!++;
      remaining--;
    }
  }

  // Author links: two per author.
  const links = new Map<string, Link[]>();
  let linkN = 0;
  for (const a of authors) {
    const s = slug(a.name);
    links.set(a._id, [
      { _id: `l-${pad(++linkN, 3)}`, label: 'Website', url: `https://example.com/authors/${s}` },
      { _id: `l-${pad(++linkN, 3)}`, label: 'Interview', url: `https://example.com/interviews/${s}` },
    ]);
  }

  // Books: one spec per (author, book), shuffled so ids don't cluster by author.
  const specs: { authorIdx: number; genreId: string }[] = [];
  counts.forEach((n, authorIdx) => {
    for (let k = 0; k < n; k++) {
      const [primary, secondary] = authorGenres[authorIdx]!;
      specs.push({ authorIdx, genreId: rng.chance(0.8) ? primary : secondary });
    }
  });
  const titles = new Set<string>();
  const titleFor = (genreId: string): string => {
    const parts = TITLE_PARTS[genreId]!;
    for (let attempt = 0; attempt < 60; attempt++) {
      const t = rng
        .pick(parts.patterns)
        .replace('{A}', () => rng.pick(parts.A))
        .replace('{N}', () => rng.pick(parts.N))
        .replace('{P}', () => (parts.P.length ? rng.pick(parts.P) : rng.pick(parts.N)));
      if (!titles.has(t)) {
        titles.add(t);
        return t;
      }
    }
    let n = 2;
    const base = rng.pick(parts.N);
    while (titles.has(`${base}, Volume ${n}`)) n++;
    titles.add(`${base}, Volume ${n}`);
    return `${base}, Volume ${n}`;
  };

  // Stock: about one in eight at 0, a dozen at 1–5, the rest 6–40. ~15 featured.
  const order = rng.shuffle(specs.map((_, i) => i));
  const stockOf = new Map<number, number>();
  order.forEach((idx, k) => stockOf.set(idx, k < 15 ? 0 : k < 27 ? rng.int(1, 5) : rng.int(6, 40)));
  const featured = new Set(rng.shuffle(specs.map((_, i) => i)).slice(0, 15));

  const books: BookRec[] = rng.shuffle(specs).map((spec, i) => {
    const raw = 189 + rng.int(0, 126) * 10 + (rng.chance(0.2) ? 0.5 : 0);
    return {
      _id: `b-${pad(i + 1, 3)}`,
      title: titleFor(spec.genreId),
      isbn: isbn13(rng),
      authorId: authors[spec.authorIdx]!._id,
      genreId: spec.genreId,
      price: round2(Math.min(1450, raw)),
      stock: stockOf.get(i)!,
      publishedAt: addDays(anchorDate, -rng.int(30, 365 * 27)),
      pages: rng.int(24, 780),
      cover: '',
      description: '',
      featured: featured.has(i),
      updatedAt: stampAt(addDays(anchorDate, -rng.int(0, 120)), rng.int(1, 14), rng.int(0, 59), rng.int(0, 59)),
    };
  });
  // Children's books are short.
  for (const b of books) if (b.genreId === 'g-children') b.pages = Math.min(b.pages, rng.int(24, 64));

  // Descriptions (plain text, three sentences): premise + "<title> is <author>'s nth book" + praise.
  for (const a of authors) {
    const own = books.filter((b) => b.authorId === a._id).sort((x, y) => x.publishedAt.localeCompare(y.publishedAt));
    own.forEach((b, k) => {
      const p1 = rng.pick(PREMISES[b.genreId]!);
      const p2 = `"${b.title}" is ${a.name}'s ${ORDINALS[k] ?? `${k + 1}th`} book. ${rng.pick(PRAISE)}`;
      b.description = `${p1} ${p2}`;
    });
  }

  // Reviews (2–6 per book, newest first) and editions (1–3 per book).
  const reviews = new Map<string, Review[]>();
  const editions = new Map<string, Edition[]>();
  let reviewN = 0;
  let editionN = 0;
  const formatPrice: Record<string, number> = { Hardcover: 1.4, Ebook: 0.6, Audiobook: 0.9 };
  for (const b of books) {
    const since = Math.max(1, daysBetween(b.publishedAt, anchorDate));
    const list: Review[] = [];
    for (let k = rng.int(2, 6); k > 0; k--) {
      const rating = rng.pick([1, 2, 3, 3, 4, 4, 4, 5, 5, 5]);
      list.push({
        _id: `rv-${pad(++reviewN, 3)}`,
        reviewer: rng.pick(REVIEWERS),
        rating,
        title: rng.pick(REVIEW_TITLES[rating]!),
        body: rng.pick(REVIEW_BODIES[rating]!),
        createdAt: stampAt(addDays(anchorDate, -rng.int(0, Math.min(600, since))), rng.int(0, 23), rng.int(0, 59), rng.int(0, 59)),
      });
    }
    list.sort((x, y) => y.createdAt.localeCompare(x.createdAt));
    reviews.set(b._id, list);

    const formats = ['Paperback', ...rng.shuffle(['Hardcover', 'Ebook', 'Audiobook']).slice(0, rng.int(0, 2))];
    editions.set(
      b._id,
      formats.map((format) => ({
        _id: `e-${pad(++editionN, 3)}`,
        format,
        isbn: format === 'Paperback' ? b.isbn : isbn13(rng),
        price: format === 'Paperback' ? b.price : round2(Math.round(b.price * formatPrice[format]!)),
      })),
    );
  }

  // Customers: 60, about 60% Thai names, joined before the order window.
  const customerNames = new Map<string, boolean>();
  while (customerNames.size < 60) {
    const thai = rng.chance(0.6);
    const name = thai
      ? `${rng.pick(CUSTOMER_THAI_FIRST)} ${rng.pick(CUSTOMER_THAI_LAST)}`
      : `${rng.pick(CUSTOMER_INTL_FIRST)} ${rng.pick(CUSTOMER_INTL_LAST)}`;
    if (!customerNames.has(name)) customerNames.set(name, thai);
  }
  const customers: CustomerRec[] = [...customerNames].map(([name, thai], i) => ({
    _id: `c-${pad(i + 1, 3)}`,
    name,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    phone: `0${rng.pick(['6', '8', '9'])}${rng.int(0, 9)}-${pad(rng.int(0, 999), 3)}-${pad(rng.int(0, 9999), 4)}`,
    city: rng.pick(thai ? THAI_CITIES : INTL_CITIES),
    joinedAt: addDays(anchorDate, -rng.int(100, 1100)),
  }));

  const staff = staffSeed();
  const handlers = staff.filter((s) => s.active).map((s) => s.name);
  const clerks = staff.filter((s) => s.active && s.role === 'clerk' && s.jobTitle === 'Sales Clerk').map((s) => s.name);
  const manager = staff.find((s) => s.jobTitle === 'Store Manager')!;

  // Orders: 300 over the 90 days ending the anchor, numbered in time order.
  const drafts = Array.from({ length: 300 }, () => {
    const back = rng.int(0, 89);
    return { back, placedAt: stampAt(addDays(anchorDate, -back), rng.int(1, 14), rng.int(0, 59), rng.int(0, 59)) };
  }).sort((x, y) => x.placedAt.localeCompare(y.placedAt));

  const orders: OrderRec[] = drafts.map((d, i) => {
    const n = 1001 + i;
    const lineCount = rng.pick([1, 1, 1, 1, 2, 2, 2, 3, 3, 4]);
    const picked = rng.shuffle(books).slice(0, lineCount);
    const items: OrderItemRec[] = picked.map((b, k) => ({
      _id: `oi-${n}-${k + 1}`,
      bookId: b._id,
      title: b.title,
      authorName: authors.find((a) => a._id === b.authorId)!.name,
      qty: rng.pick([1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 3]),
      price: b.price,
    }));
    const subtotal = items.reduce((s, it) => s + it.qty * it.price, 0);
    const status: OrderStatus =
      d.back <= 1 ? rng.pick(['pending', 'paid'] as const) : d.back <= 4 ? rng.pick(['paid', 'shipped'] as const) : 'delivered';
    return {
      _id: `o-${n}`,
      number: `SO-${n}`,
      customerId: rng.pick(customers)._id,
      status,
      placedAt: d.placedAt,
      items,
      shipping: subtotal >= 1000 ? 0 : 50,
      paymentMethod: rng.pick(PAYMENT_METHODS),
      handledBy: rng.pick(handlers),
      refund: null,
    };
  });

  // Exceptions: 8 refund requests (7–45 days old), 5 refunded (10+ days), 7 cancelled.
  const want = { refund_requested: 8, refunded: 5, cancelled: 7 };
  for (const idx of rng.shuffle(orders.map((_, i) => i))) {
    const o = orders[idx]!;
    const back = drafts[idx]!.back;
    const kind: keyof typeof want | null =
      want.refund_requested > 0 && back >= 7 && back <= 45
        ? 'refund_requested'
        : want.refunded > 0 && back >= 10
          ? 'refunded'
          : want.cancelled > 0 && back >= 1
            ? 'cancelled'
            : null;
    if (!kind) continue;
    want[kind]--;
    o.status = kind;
    if (kind === 'cancelled') continue;
    const placedDay = o.placedAt.slice(0, 10);
    const requestedAt = stampAt(addDays(placedDay, rng.int(2, 5)), rng.int(2, 10), rng.int(0, 59), 0);
    const requestedBy = rng.pick(clerks);
    const reason = rng.pick(REFUND_REASONS);
    const approved = kind === 'refunded';
    o.refund = {
      reason,
      requestedAt,
      requestedBy,
      steps: [
        { sequence: 1, role: 'Requester', name: requestedBy, jobTitle: 'Sales Clerk', status: 5, actionDate: requestedAt, remark: reason },
        {
          sequence: 2,
          role: 'Approver',
          name: manager.name,
          jobTitle: manager.jobTitle,
          status: approved ? 5 : 2,
          actionDate: approved ? stampAt(addDays(requestedAt.slice(0, 10), 1), 3, 15, 0) : null,
          remark: approved ? 'Approved, refund issued.' : '',
        },
      ],
    };
  }

  return { genres, authors, links, books, reviews, editions, customers, orders, staff };
}

/** The six fixed staff accounts (the sign-in profiles). */
function staffSeed(): StaffRec[] {
  const rows: [string, string, StaffRec['role'], string, boolean][] = [
    ['Chanwit', 'Yimneam', 'manager', 'Store Manager', true],
    ['Pimchanok', 'Saelim', 'clerk', 'Sales Clerk', true],
    ['Thanapat', 'Rattanakul', 'clerk', 'Inventory Clerk', true],
    ['Kanokwan', 'Srisuk', 'manager', 'Finance Manager', true],
    ['Arthit', 'Wongsa', 'clerk', 'Sales Clerk', true],
    ['Nadia', 'Samae', 'clerk', 'Former Sales Clerk', false],
  ];
  return rows.map(([first, last, role, jobTitle, active], i) => ({
    _id: `s-${i + 1}`,
    employeeId: `GB-${1001 + i}`,
    email: `${first.toLowerCase()}_${last[0]!.toLowerCase()}@banpu.co.th`,
    firstNameEn: first,
    lastNameEN: last,
    name: `${first} ${last}`,
    jobTitle,
    role,
    active,
  }));
}
