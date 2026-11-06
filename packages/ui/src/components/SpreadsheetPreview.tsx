import { useMemo, useState, type ReactNode } from "react"
import { Sheet } from "lucide-react"
import { columnLabel, sheetSpans, type SheetPreview } from "../util/spreadsheet"

export type SpreadsheetPreviewProps = {
	/** `undefined` while the file is read and parsed. */
	sheets?: SheetPreview[]
	tooLarge?: boolean
	fileName: string
	/** Drawn under the "too large" line (the frame's download action when it has no header). */
	noPreview?: ReactNode
}

/** A cell whose text reads as a number is right-aligned, like a spreadsheet does. */
const NUMERIC = /^[-+(]?[\p{Sc}]?\s?[\d,]*\.?\d+(?:[eE][-+]?\d+)?\)?\s?%?$/u

const count = (n: number) => n.toLocaleString()

/**
 * One workbook as a read-only grid: column letters and row numbers that stick
 * while it scrolls, merged cells, and a tab per sheet along the bottom like a
 * spreadsheet app. Every value is the cell's formatted text.
 */
export const SpreadsheetPreview = ({ sheets, tooLarge, fileName, noPreview }: SpreadsheetPreviewProps) => {
	const [active, setActive] = useState(0)
	const sheet = sheets?.[Math.min(active, sheets.length - 1)]
	const spans = useMemo(() => sheetSpans(sheet?.merges ?? []), [sheet])

	if (tooLarge) {
		return (
			<div className="flex flex-col items-center gap-2 text-center text-[var(--gray-11)]">
				<Sheet className="h-12 w-12" />
				<span className="text-sm">This spreadsheet is too large to preview</span>
				{noPreview}
			</div>
		)
	}
	if (!sheets || !sheet) return <div className="gummy-fp-sheet-status">Loading…</div>

	const shownColumns = sheet.rows[0]?.length ?? 0
	const cutRows = sheet.totalRows > sheet.rows.length
	const cutColumns = sheet.totalColumns > shownColumns
	const note = [
		cutRows && `first ${count(sheet.rows.length)} of ${count(sheet.totalRows)} rows`,
		cutColumns && `first ${count(shownColumns)} of ${count(sheet.totalColumns)} columns`,
	].filter(Boolean).join(" · ")

	return (
		<div className="gummy-fp-sheet">
			<div className="gummy-fp-sheet-scroll" tabIndex={0} role="region" aria-label={`${fileName}, sheet ${sheet.name}`}>
				{sheet.rows.length === 0 ? (
					<div className="gummy-fp-sheet-status">This sheet is empty</div>
				) : (
					<table className="gummy-fp-sheet-table">
						<thead>
							<tr>
								<th className="gummy-fp-sheet-corner" aria-hidden />
								{sheet.rows[0].map((_, c) => (
									<th key={c} scope="col" className="gummy-fp-sheet-col">{columnLabel(sheet.startColumn + c)}</th>
								))}
							</tr>
						</thead>
						<tbody>
							{sheet.rows.map((row, r) => (
								<tr key={r}>
									<th scope="row" className="gummy-fp-sheet-row">{sheet.startRow + r + 1}</th>
									{row.map((value, c) => {
										const span = spans.get(`${r}:${c}`)
										if (span === null) return null
										return (
											<td
												key={c}
												rowSpan={span?.rowSpan}
												colSpan={span?.colSpan}
												title={value.length > 24 ? value : undefined}
												className={`gummy-fp-sheet-cell${NUMERIC.test(value) ? " is-number" : ""}${span ? " is-merged" : ""}`}
											>
												{value}
											</td>
										)
									})}
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
			{(sheets.length > 1 || note) && (
				<div className="gummy-fp-sheet-footer">
					{sheets.length > 1 && (
						<div className="gummy-fp-sheet-tabs" role="tablist" aria-label="Sheets">
							{sheets.map((s, i) => (
								<button
									key={`${i}-${s.name}`}
									type="button"
									role="tab"
									aria-selected={s === sheet}
									className="gummy-fp-sheet-tab"
									onClick={() => setActive(i)}
								>
									{s.name}
								</button>
							))}
						</div>
					)}
					{note && <span className="gummy-fp-sheet-note">Showing {note}</span>}
				</div>
			)}
		</div>
	)
}
