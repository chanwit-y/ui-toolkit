import * as Tooltip from "@radix-ui/react-tooltip"
import { useRef, useState, type CSSProperties, type ReactNode } from "react"

/** The engine default for {@link DataTableElement.cellLines}. */
export const DEFAULT_CELL_LINES = 2

/**
 * A data table cell cut to `lines` lines (CSS line clamp). When the text is
 * actually cut — measured on hover, so thousands of cells cost nothing until
 * pointed at — a tooltip shows the whole text (the rendered text, so a
 * formatted date reads the same as in the cell). `lines` ≤ 0 renders the
 * children as is.
 */
export function ClampedCell({ lines, children }: { lines: number; children: ReactNode }) {
	const ref = useRef<HTMLDivElement>(null)
	const [open, setOpen] = useState(false)
	const [text, setText] = useState("")

	if (!(lines > 0)) return <>{children}</>

	// `-webkit-line-clamp` is the one genuinely dynamic value here (a config
	// number); the rest of the clamp is the `.datatable-clamp` rule.
	const style = { WebkitLineClamp: lines } as CSSProperties

	return (
		<Tooltip.Root
			open={open}
			onOpenChange={(next) => {
				const el = ref.current
				// Only a cut cell gets the tooltip (a 1px tolerance for rounding).
				if (next && el && el.scrollHeight > el.clientHeight + 1) {
					setText(el.textContent ?? "")
					setOpen(true)
				} else {
					setOpen(false)
				}
			}}
		>
			<Tooltip.Trigger asChild>
				{/* The outer div is the cell wrapper's flex item: a flex item's
				    `display: -webkit-box` is blockified to `flow-root`, which
				    would drop the clamp — so the clamp box is its plain child. */}
				<div className="min-w-0">
					<div ref={ref} className="datatable-clamp" style={style}>
						{children}
					</div>
				</div>
			</Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Content side="bottom" align="start" sideOffset={4} collisionPadding={8} className="datatable-cell-tooltip">
					{text}
					<Tooltip.Arrow className="datatable-cell-tooltip-arrow" />
				</Tooltip.Content>
			</Tooltip.Portal>
		</Tooltip.Root>
	)
}
