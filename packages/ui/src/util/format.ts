import dayjs from "dayjs";

/**
 * How a data-table cell shows its raw value (`ColumnDef.format`). Resolved by
 * `formatCell` with the app's locale (`<LocaleProvider>`, default the
 * browser's), so a config stops needing display strings from the API.
 *
 * - `number` — grouped digits (`1,250`), `decimals` fixed (default: as is).
 * - `currency` — `currency` is an ISO code (`"THB"`), `decimals` default the
 *   currency's.
 * - `percent` — `of: 1` (default) formats `0.25` as `25%`, `of: 100` formats
 *   `25` as `25%`.
 * - `date` / `datetime` — `pattern` in dayjs tokens (`"DD/MM/YYYY"`), else the
 *   locale's medium date (and short time); `timeZone` an IANA zone the Intl
 *   path renders in (the dayjs path renders in the browser's zone).
 * - `boolean` — `trueLabel` / `falseLabel` (default "Yes" / "No").
 * - `text` — the value as a string.
 *
 * `null`, `undefined` and `""` render empty; a non-number under a numeric
 * format and an invalid date render the raw text, never `NaN`.
 */
export type CellFormat =
  | { type: "number"; decimals?: number; grouping?: boolean }
  | { type: "currency"; currency: string; decimals?: number }
  | { type: "percent"; decimals?: number; of?: 1 | 100 }
  | { type: "date"; pattern?: string; timeZone?: string }
  | { type: "datetime"; pattern?: string; timeZone?: string }
  | { type: "boolean"; trueLabel?: string; falseLabel?: string }
  | { type: "text" };

export type CellFormatType = CellFormat["type"];

/** The formats that align their cells to the end by default. */
export const NUMERIC_FORMATS: ReadonlySet<CellFormatType> = new Set(["number", "currency", "percent"]);

const isBlank = (value: unknown): boolean => value === null || value === undefined || value === "";

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

const numberFormat = (locale: string | undefined, options: Intl.NumberFormatOptions): Intl.NumberFormat => {
  try {
    return new Intl.NumberFormat(locale, options);
  } catch {
    // An unknown locale or currency: fall back to the runtime default rather than throw mid-render.
    return new Intl.NumberFormat(undefined, { ...options, ...(options.style === "currency" ? { style: "decimal", currency: undefined } : {}) });
  }
};

const dateFormat = (locale: string | undefined, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat => {
  try {
    return new Intl.DateTimeFormat(locale, options);
  } catch {
    return new Intl.DateTimeFormat(undefined, { ...options, timeZone: undefined });
  }
};

const toDate = (value: unknown): Date | undefined => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  if (typeof value === "number" || typeof value === "string") {
    const d = dayjs(value);
    return d.isValid() ? d.toDate() : undefined;
  }
  return undefined;
};

/**
 * The display text of a cell value under `format`. Pure: the same inputs give
 * the same string, so it serves the table cell, `{{value}}` in HTML templates,
 * the CSV export and the studio's previews alike.
 */
export function formatCell(value: unknown, format: CellFormat | undefined, locale?: string): string {
  if (isBlank(value)) return "";
  if (!format) return String(value);
  switch (format.type) {
    case "number": {
      const n = toNumber(value);
      if (n === undefined) return String(value);
      return numberFormat(locale, {
        useGrouping: format.grouping ?? true,
        ...(format.decimals !== undefined ? { minimumFractionDigits: format.decimals, maximumFractionDigits: format.decimals } : {}),
      }).format(n);
    }
    case "currency": {
      const n = toNumber(value);
      if (n === undefined) return String(value);
      return numberFormat(locale, {
        style: "currency",
        currency: format.currency,
        ...(format.decimals !== undefined ? { minimumFractionDigits: format.decimals, maximumFractionDigits: format.decimals } : {}),
      }).format(n);
    }
    case "percent": {
      const n = toNumber(value);
      if (n === undefined) return String(value);
      const ratio = format.of === 100 ? n / 100 : n;
      return numberFormat(locale, {
        style: "percent",
        ...(format.decimals !== undefined ? { minimumFractionDigits: format.decimals, maximumFractionDigits: format.decimals } : {}),
      }).format(ratio);
    }
    case "date":
    case "datetime": {
      const d = toDate(value);
      if (!d) return String(value);
      if (format.pattern) return dayjs(d).format(format.pattern);
      return dateFormat(locale, {
        dateStyle: "medium",
        ...(format.type === "datetime" ? { timeStyle: "short" } : {}),
        ...(format.timeZone ? { timeZone: format.timeZone } : {}),
      }).format(d);
    }
    case "boolean": {
      const truthy = value === true || value === 1 || value === "1" || value === "true" || value === "Y" || value === "yes";
      const falsy = value === false || value === 0 || value === "0" || value === "false" || value === "N" || value === "no";
      if (!truthy && !falsy) return String(value);
      return truthy ? (format.trueLabel ?? "Yes") : (format.falseLabel ?? "No");
    }
    case "text":
    default:
      return String(value);
  }
}

/** `useDateFormat` (the pre-`format` way to show a date) as a `CellFormat`, or the column's own `format` when set. */
export function columnFormat(column: { format?: CellFormat; useDateFormat?: string }): CellFormat | undefined {
  if (column.format) return column.format;
  if (column.useDateFormat) return { type: "date", pattern: column.useDateFormat };
  return undefined;
}
