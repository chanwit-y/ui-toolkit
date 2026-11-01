import get from "lodash/get";

/**
 * The `{{path}}` placeholders of an HTML column template (see
 * `ColumnDef.html`). No logic, no helpers: a placeholder is a lodash `get`
 * path into the row (`{{name}}`, `{{region.name}}`, `{{tags.0}}`), or the
 * `{{value}}` alias — the column's own value after its date format.
 */
const PLACEHOLDER = /\{\{\s*([^{}]+?)\s*\}\}/g;

/** The alias for the column's own (formatted) value; wins over a row field of the same name. */
export const TEMPLATE_VALUE_KEY = "value";

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/** Nullish → empty, primitives → their string, primitive arrays → comma list, objects → empty. */
function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.filter((v) => typeof v !== "object").map(String).join(", ");
  if (typeof value === "object") return "";
  return String(value);
}

/**
 * Fill a template's placeholders from `row`. Every interpolated value is
 * HTML-escaped — row data never becomes markup; the result still has to pass
 * through `sanitizeHtml` before it reaches the DOM (URL attributes, and the
 * template itself, are the sanitiser's job).
 */
export function renderTemplate(template: string, row: unknown, value?: unknown): string {
  return template.replace(PLACEHOLDER, (_match, path: string) =>
    escapeHtml(toText(path === TEMPLATE_VALUE_KEY ? value : get(row, path))),
  );
}

/**
 * Fill a URL template from `row`. Each value is `encodeURIComponent`ed, so a
 * name with spaces or an id with a slash stays one path segment. A blank
 * placeholder means there is no URL yet (`/files//content` is not a file):
 * `undefined`. `{{value}}` reads `value` when given, else a row field.
 */
export function renderUrlTemplate(template: string, row: unknown, value?: unknown): string | undefined {
  let blank = false;
  const url = template.replace(PLACEHOLDER, (_match, path: string) => {
    const text = toText(path === TEMPLATE_VALUE_KEY && value !== undefined ? value : get(row, path));
    if (text === "") blank = true;
    return encodeURIComponent(text);
  });
  return blank ? undefined : url;
}

/** The distinct row paths a template reads (the `{{value}}` alias excluded), in order. */
export function templateFields(template: string): string[] {
  const fields: string[] = [];
  for (const match of template.matchAll(PLACEHOLDER)) {
    const path = match[1];
    if (path !== TEMPLATE_VALUE_KEY && !fields.includes(path)) fields.push(path);
  }
  return fields;
}
