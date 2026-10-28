import { useLocale } from "./core/locale";
import { HtmlCell } from "./HtmlCell";
import { formatCell, type CellFormat } from "../util/format";

/**
 * A table cell's display text under `ColumnDef.format`, resolved with the
 * app's locale (`<LocaleProvider>`). The editable table draws its read-mode
 * cells with it; the datatable formats inline (it also highlights the search).
 */
export function FormattedCell({ value, format }: { value: unknown; format: CellFormat | undefined }) {
  const locale = useLocale();
  return <div>{formatCell(value, format, locale)}</div>;
}

/** An `html` column's cell: `{{value}}` reads the column's **formatted** value. */
export function FormattedHtmlCell({ template, row, value, format }: { template: string; row: unknown; value: unknown; format: CellFormat | undefined }) {
  const locale = useLocale();
  return <HtmlCell template={template} row={row} value={format ? formatCell(value, format, locale) : value} />;
}
