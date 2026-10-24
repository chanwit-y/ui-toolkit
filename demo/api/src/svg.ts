/**
 * Drawn images: book covers (300×450, the title and author on the genre's colour) and
 * avatars (128×128, initials on a colour picked from the seed). Every text node is XML-escaped.
 */

export const escapeXml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Helvetica Neue', Arial, sans-serif";

/** Word-wraps `text` to lines of at most `width` characters, at most `maxLines` (the last one ellipsised). */
export function wrapText(text: string, width: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (let word of words) {
    while ([...word].length > width) {
      if (current) {
        lines.push(current);
        current = '';
      }
      lines.push([...word].slice(0, width).join(''));
      word = [...word].slice(width).join('');
    }
    const next = current ? `${current} ${word}` : word;
    if ([...next].length <= width) current = next;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  const last = [...kept[maxLines - 1]!];
  kept[maxLines - 1] = `${last.slice(0, Math.max(1, width - 1)).join('').replace(/\s+$/, '')}…`;
  return kept;
}

/** A 300×450 cover: genre label, wrapped title, author. */
export function coverSvg(book: { title: string; authorName: string; genreName: string; genreColor: string }): string {
  const color = /^#[0-9a-f]{3,8}$/i.test(book.genreColor) ? book.genreColor : '#475569';
  const lines = wrapText(book.title || 'Untitled', 15, 3);
  const lineHeight = 38;
  const top = 215 - ((lines.length - 1) * lineHeight) / 2;
  const titleText = lines
    .map(
      (line, i) =>
        `<text x="150" y="${top + i * lineHeight}" text-anchor="middle" font-family="${SERIF}" font-size="30" font-weight="700" fill="#ffffff">${escapeXml(line)}</text>`,
    )
    .join('');
  const author = wrapText(book.authorName || '', 26, 1)[0] ?? '';
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450" role="img" aria-label="${escapeXml(`${book.title} by ${book.authorName}`)}">`,
    '<defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/><stop offset="1" stop-color="#000000" stop-opacity="0.28"/></linearGradient></defs>',
    `<rect width="300" height="450" fill="${color}"/>`,
    '<rect width="300" height="450" fill="url(#shade)"/>',
    '<rect x="14" y="14" width="272" height="422" fill="none" stroke="#ffffff" stroke-opacity="0.45" stroke-width="2"/>',
    `<text x="150" y="62" text-anchor="middle" font-family="${SANS}" font-size="13" letter-spacing="3" fill="#ffffff" fill-opacity="0.85">${escapeXml(book.genreName.toUpperCase())}</text>`,
    '<line x1="110" y1="80" x2="190" y2="80" stroke="#ffffff" stroke-opacity="0.6" stroke-width="1.5"/>',
    titleText,
    '<line x1="110" y1="360" x2="190" y2="360" stroke="#ffffff" stroke-opacity="0.6" stroke-width="1.5"/>',
    `<text x="150" y="395" text-anchor="middle" font-family="${SERIF}" font-size="18" font-style="italic" fill="#ffffff">${escapeXml(author)}</text>`,
    '</svg>',
  ].join('');
}

const AVATAR_COLORS = ['#7c3aed', '#0369a1', '#0f766e', '#15803d', '#b45309', '#be185d', '#4338ca', '#334155', '#c2410c', '#0e7490'];

/** FNV-1a, for picking a stable colour per seed. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Up to two initials: the first letters of the first and last words (`chanwit-yimneam` → `CY`). */
export function initialsOf(seed: string): string {
  const words = seed.split(/[\s\-_.+]+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = [...words[0]!];
  const letters = words.length > 1 ? first[0]! + [...words[words.length - 1]!][0]! : first.slice(0, 2).join('');
  return letters.toUpperCase();
}

/** A 128×128 avatar: initials on a colour picked from the seed. */
export function avatarSvg(seed: string): string {
  const color = AVATAR_COLORS[hash(seed) % AVATAR_COLORS.length]!;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" role="img" aria-label="${escapeXml(seed)}">`,
    `<rect width="128" height="128" fill="${color}"/>`,
    `<text x="64" y="64" dy="0.35em" text-anchor="middle" font-family="${SANS}" font-size="48" font-weight="600" fill="#ffffff">${escapeXml(initialsOf(seed))}</text>`,
    '</svg>',
  ].join('');
}
