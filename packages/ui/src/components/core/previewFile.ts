import { isBlurhashValid } from "blurhash";
import type { FilePreviewKeys, PreviewFile } from "../@types";
import { isUrlContent } from "../../util/file";
import { renderUrlTemplate } from "../../util/template";
import { readKey } from "./approvalSteps";

/** Where a file record usually keeps each field; `FilePreviewElement.keys` overrides per key. */
export const DEFAULT_PREVIEW_KEYS: Required<FilePreviewKeys> = {
  name: ["name", "fileName", "filename"],
  type: ["type", "mimeType", "contentType"],
  size: ["size"],
  url: ["url", "src"],
  data: ["data"],
  blurhash: ["blurhash", "blurHash"],
};

export type PreviewFileOptions = {
  keys?: FilePreviewKeys;
  urlTemplate?: string;
  /** The API base a root-relative URL is joined to (`""` = same origin). */
  baseUrl?: string;
  /** The blurhash when the record has none. */
  blurhash?: string;
  /** `false` drops the blurhash, wherever it came from. */
  showBlurhash?: boolean;
};

const isDataUrl = (value: string): boolean => /^data:/i.test(value);

/**
 * Whether the browser may load `url`. It ends up in an `<iframe src>` and an
 * `<a href>` and it comes from data, so only web schemes pass: a
 * `javascript:` URL would run in the page. Parsed rather than matched, since
 * the browser strips the tabs and newlines that would hide the scheme.
 */
export function isSafeFileUrl(url: string): boolean {
  try {
    return ["http:", "https:", "blob:"].includes(new URL(url, "http://localhost/").protocol);
  } catch {
    return false;
  }
}

/** A root-relative URL names a path on the API, so it is joined to the base. */
function resolveUrl(url: string, baseUrl = ""): string {
  if (!url.startsWith("/") || url.startsWith("//")) return url;
  return `${baseUrl.replace(/\/$/, "")}${url}`;
}

/** The last path segment of a URL, decoded: a record with no name still has one. */
export function fileNameFromUrl(url: string): string | undefined {
  try {
    const segment = new URL(url, "http://localhost/").pathname.split("/").filter(Boolean).pop();
    return segment ? decodeURIComponent(segment) : undefined;
  } catch {
    return undefined;
  }
}

const text = (v: unknown): string | undefined =>
  v === undefined || v === null || v === "" || typeof v === "object" ? undefined : String(v);

const toSize = (v: unknown): number | undefined => {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
};

const isContent = (v: unknown): v is string | number[] =>
  (typeof v === "string" && v !== "") || (Array.isArray(v) && v.length > 0);

/**
 * Whatever the element was bound to → the file to draw, or `undefined` for
 * nothing to show: a blank value, a folder node, a record with neither a URL
 * nor content, a URL with an unsafe scheme. A bare string is a URL (a data URL
 * is content); a list is its first file. Precedence: `data` > `urlTemplate` >
 * `keys.url`.
 */
export function normalizePreviewFile(raw: unknown, options: PreviewFileOptions = {}): PreviewFile | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined || value === null || value === "") return undefined;

  const keys = { ...DEFAULT_PREVIEW_KEYS, ...options.keys };
  const bare = typeof value === "string";
  const record = bare ? undefined : value;
  if (!bare && typeof value !== "object") return undefined;

  const rawType = readKey(record, keys.type);
  // A file collection's selection can be a folder: nothing to preview, not a broken file.
  if (rawType === "folder") return undefined;
  const type = typeof rawType === "string" && rawType.includes("/") ? rawType : "";

  const content = readKey(record, keys.data);
  let data = isContent(content) ? content : undefined;
  // An upload's `data` may itself be a remote URL: that is a URL, joined to the base like any other.
  const dataUrl = typeof data === "string" && !isDataUrl(data) && isUrlContent(data) ? data : undefined;
  if (dataUrl) data = undefined;

  let url: string | undefined;
  if (!data) {
    const templated = options.urlTemplate ? renderUrlTemplate(options.urlTemplate, record, bare ? value : undefined) : undefined;
    const candidate = dataUrl ?? templated ?? text(readKey(record, keys.url)) ?? (bare ? value : undefined);
    if (candidate !== undefined && isDataUrl(candidate)) data = candidate;
    else if (candidate !== undefined && isSafeFileUrl(candidate)) url = resolveUrl(candidate, options.baseUrl);
  }
  if (!data && !url) return undefined;

  const name = text(readKey(record, keys.name)) ?? (url ? fileNameFromUrl(url) : undefined) ?? "file";
  const size = toSize(readKey(record, keys.size));
  const hash = options.showBlurhash === false ? undefined : text(readKey(record, keys.blurhash)) ?? options.blurhash;
  // An invalid hash is no hash: the image then loads as it would without one.
  const blurhash = hash && isBlurhashValid(hash).result ? hash : undefined;
  return {
    name,
    type,
    ...(size !== undefined ? { size } : {}),
    ...(url ? { url } : {}),
    ...(data ? { data } : {}),
    ...(blurhash ? { blurhash } : {}),
  };
}
