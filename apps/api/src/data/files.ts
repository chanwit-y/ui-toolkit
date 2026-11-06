import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
/**
 * In-memory files behind the example's File preview page. Ids match the file
 * nodes of the File collection demo (`data/fileCollections.ts`), so a tree
 * selection previews real bytes. Deterministic: everything is built here.
 */
export interface StoredFile {
  _id: string;
  name: string;
  type: string;
  bytes: Uint8Array<ArrayBuffer>;
  /** An image's placeholder, encoded from its pixels. */
  blurhash?: string;
  /** An image's pixel size, so the placeholder can take its exact box. */
  width?: number;
  height?: number;
}

const encoder = new TextEncoder();
/** A real photo (1200 × 1600, metadata stripped) kept beside this module; its blurhash was computed from these pixels. */
const PHOTO_JPG = new Uint8Array(readFileSync(new URL('./assets/IMG_5844.jpg', import.meta.url)));
const text = (body: string) => encoder.encode(body);

/** A one-page PDF with a text line per entry: the xref offsets are computed, so viewers don't repair it. */
function pdf(title: string, lines: string[]) {
  const escape = (s: string) => s.replace(/[\\()]/g, '\\$&');
  const content = [
    'BT /F1 22 Tf 72 720 Td',
    `(${escape(title)}) Tj`,
    '/F1 12 Tf 0 -32 Td 18 TL',
    ...lines.map((line) => `(${escape(line)}) Tj T*`),
    'ET',
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets = objects.map((body, i) => {
    const offset = out.length;
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return text(out);
}

const coverSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4f46e5"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs>
  <rect width="640" height="360" fill="url(#g)"/>
  <circle cx="500" cy="110" r="70" fill="#ffffff" opacity="0.2"/>
  <text x="48" y="200" font-family="sans-serif" font-size="56" font-weight="700" fill="#ffffff">Q1 catalog</text>
  <text x="48" y="244" font-family="sans-serif" font-size="24" fill="#ffffff" opacity="0.85">Prices and new arrivals</text>
</svg>
`;

/** A 64 × 36 gradient: a real PNG, so `<img>` decodes a raster the way it would an upload. */
const BANNER_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAEAAAAAkCAIAAAC2bqvFAAACGUlEQVR42u3PaUoqYAAF0FZ37/33CCECCSSIQAIRRIgghAgiiCCEMKdMMkNtsMSywQaTTDHHEssGLSJwEW8dj/edHZyRP/gexcCC/hg+x/FhxdsEeja8TuJlCt1pdOx4nsGTA20nWi403KjPojaHx3lUPagsoLyIhyWUlnG/guIq7tZQ8OJ2HTc+XAWQD+EygosozmLIxXGawEkK2QNk0jjO4CiLdA6H59jPY+8aqQKSRSRK2C0jXsVODbEmttuIdrDVRaSHzXeE+wh+IfAD/y82hvCNmIAJmIAJmIAJmIAJmIAJmIAJ/LsBfo9yYGF/jJ/j/LDybYI9G18n+TLF7jQ7dj7P8MnBtpMtFxtu1mdZm+PjPKseVhZYXuTDEkvLvF9hcZV3ayx4ebvOGx+vAsyHeBnhRZRnMebiPE3wJMXsATNpHmd4lGU6x8Nz7ue5d81UgckiEyXulhmvcqfGWJPbbUY73Ooy0uPmO8N9Br8Y+KH/lxtDmoAJmIAJmIAJmIAJmIAJmMB/HdD3qAYW9cf0Oa4Pq94m1LPpdVIvU+pOq2PX84yeHGo71XKp4VZ9VrU5Pc6r6lFlQeVFPSyptKz7FRVXdbemgle367rx6SqgfEiXEV1EdRZTLq7ThE5Syh4ok9ZxRkdZpXM6PNd+XnvXShWULCpR0m5Z8ap2aoo1td1WtKOtriI9bb4r3FfwS4Ef+X+1MZTvL+u4s1tzgMcgAAAAAElFTkSuQmCC';

/**
 * A real workbook, built here so it is deterministic: a Summary sheet with a
 * merged title and number formats, 600 order rows (more than a preview shows)
 * and a short Regions sheet.
 */
function salesWorkbook() {
  const products = ['Notebook', 'Pencil set', 'Desk lamp', 'Stapler', 'Planner', 'Marker pack'];
  const prices = [120, 45.5, 890, 210, 350, 99];
  const regions = ['Bangkok', 'Chiang Mai', 'Phuket', 'Khon Kaen'];
  const orders: unknown[][] = [['Order', 'Date', 'Region', 'Product', 'Qty', 'Unit price', 'Total']];
  for (let i = 0; i < 600; i++) {
    const p = (i * 7) % products.length;
    const qty = 1 + ((i * 13) % 9);
    const day = new Date(Date.UTC(2026, Math.floor(i / 200), 1 + (i % 28)));
    orders.push([`SO-${String(1001 + i)}`, day, regions[(i * 5) % regions.length], products[p], qty, prices[p], qty * prices[p]]);
  }
  const months = ['January', 'February', 'March'];
  const summary: unknown[][] = [
    ['Q1 sales summary', '', ''],
    ['Month', 'Orders', 'Revenue (THB)'],
    ...months.map((m, i) => {
      const rows = orders.slice(1 + i * 200, 1 + (i + 1) * 200);
      return [m, rows.length, rows.reduce((sum, r) => sum + (r[6] as number), 0)];
    }),
  ];
  summary.push(['Total', 600, summary.slice(2).reduce((sum, r) => sum + (r[2] as number), 0)]);

  const wb = XLSX.utils.book_new();
  const sum = XLSX.utils.aoa_to_sheet(summary);
  sum['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
  for (let r = 2; r < summary.length; r++) {
    const cell = sum[XLSX.utils.encode_cell({ r, c: 2 })];
    if (cell) cell.z = '#,##0.00';
  }
  XLSX.utils.book_append_sheet(wb, sum, 'Summary');
  const ord = XLSX.utils.aoa_to_sheet(orders, { cellDates: true, dateNF: 'yyyy-mm-dd' });
  for (let r = 1; r < orders.length; r++) {
    for (const c of [5, 6]) {
      const cell = ord[XLSX.utils.encode_cell({ r, c })];
      if (cell) cell.z = '#,##0.00';
    }
  }
  XLSX.utils.book_append_sheet(wb, ord, 'Orders');
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([['Region', 'Manager', 'Stores'], ['Bangkok', 'Somchai P.', 12], ['Chiang Mai', 'Nadia S.', 4], ['Phuket', 'Pimchanok S.', 3], ['Khon Kaen', 'Arthit K.', 2]]),
    'Regions',
  );
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);
}

const FILES: StoredFile[] = [
  {
    _id: 'n3',
    name: 'Q1 price list.csv',
    type: 'text/csv',
    bytes: text('sku,name,price\nA-100,Notebook,120.00\nA-101,Pencil set,45.50\nA-102,Desk lamp,890.00\n'),
  },
  { _id: 'n4', name: 'Q1 cover.svg', type: 'image/svg+xml', bytes: text(coverSvg), blurhash: 'LKJOf{3GaORq2znlj[ofICM|oytQ', width: 640, height: 360 },
  {
    _id: 'n5',
    name: 'Q2 supplier terms.docx',
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    bytes: text('Not a real Word file: the preview never opens it, it offers the download.\n'),
  },
  { _id: 'n7', name: 'Archive notes.md', type: 'text/markdown', bytes: text('# Archive notes\n\nEverything from 2025 moved to cold storage in January.\n') },
  { _id: 'n8', name: 'README.md', type: 'text/markdown', bytes: text('# Catalog\n\nPrice lists and cover art, one folder per year.\n') },
  { _id: 'n10', name: 'Spring launch.md', type: 'text/markdown', bytes: text('# Spring launch\n\n- Teaser on 1 March\n- Launch on 15 March\n') },
  {
    _id: 'n11',
    name: 'Hero banner.png',
    type: 'image/png',
    bytes: Uint8Array.from(Buffer.from(BANNER_PNG, 'base64')),
    blurhash: 'LXI_Rx2gw#SjsqWrjtfRfQfQfQfQ',
    width: 64,
    height: 36,
  },
  { _id: 'n14', name: 'Mountain meadow.jpg', type: 'image/jpeg', bytes: PHOTO_JPG, blurhash: 'LvHx.@ofj[of.AWCoea#-;f5j[fP', width: 1200, height: 1600 },
  {
    _id: 'n12',
    name: 'Brand guide.pdf',
    type: 'application/pdf',
    bytes: pdf('Brand guide', ['Logo: keep clear space on every side.', 'Colour: indigo first, pink as the accent.', 'Type: one family, two weights.']),
  },
  {
    _id: 'n15',
    name: 'Q1 sales.xlsx',
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    bytes: salesWorkbook(),
  },
];

const contentUrl = (id: string) => `/collection/files/${id}/content`;

export const fileService = {
  /** The list: a URL per record, no bytes. */
  list: () =>
    FILES.map(({ _id, name, type, bytes, blurhash, width, height }) => ({ _id, id: _id, name, type, size: bytes.length, url: contentUrl(_id), blurhash, width, height })),
  /** One record with its bytes inline, the JSON envelope shape. */
  detail(id: string) {
    const file = FILES.find((f) => f._id === id);
    if (!file) return undefined;
    const data = `data:${file.type};base64,${Buffer.from(file.bytes).toString('base64')}`;
    return { _id: file._id, id: file._id, name: file.name, type: file.type, size: file.bytes.length, data, blurhash: file.blurhash, width: file.width, height: file.height };
  },
  content: (id: string) => FILES.find((f) => f._id === id),
};
