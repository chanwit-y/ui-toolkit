import type { DataTableStyleRule } from "./@types"
import { ConditionExpression } from "./core/expression"

/**
 * Conditional styling for the data tables (`ColumnDef.cellStyles`,
 * `DataTableElement.rowStyles`): rules are `CondExpression`s evaluated over
 * `{ value, row, index }`, and what they paint is a Radix **tone** — the cell
 * gets `data-accent-color="<tone>"`, so `--accent-*` re-scope to that scale
 * and the `.datatable-tone` classes read step 11 (text) / step 3 (fill).
 */
export type ResolvedStyle = {
	tone?: string
	fill: boolean
	classes: string[]
}

const EMPTY: ResolvedStyle = { fill: false, classes: [] }

/** Whether `rule.when` holds for the context. A broken rule is false, never a throw mid-render. */
export function ruleMatches(rule: DataTableStyleRule, ctx: Record<string, unknown>): boolean {
	try {
		return !!new ConditionExpression(ctx).expression(rule.when)
	} catch {
		return false
	}
}

/**
 * The look of one cell or row: the first matching rule's tone (and its
 * fill), every matching rule's weight / italic / strike / class.
 */
export function resolveStyles(rules: DataTableStyleRule[] | undefined, ctx: Record<string, unknown>): ResolvedStyle {
	if (!rules?.length) return EMPTY
	let tone: string | undefined
	let fill = false
	const classes: string[] = []
	for (const rule of rules) {
		if (!ruleMatches(rule, ctx)) continue
		if (tone === undefined && rule.tone) {
			tone = rule.tone
			fill = !!rule.fill
		}
		if (rule.weight === "bold") classes.push("datatable-tone-bold")
		if (rule.italic) classes.push("datatable-tone-italic")
		if (rule.strike) classes.push("datatable-tone-strike")
		if (rule.class) classes.push(...rule.class.split(/\s+/).filter(Boolean))
	}
	return { tone, fill, classes }
}

/**
 * A cell's look over its row's: the cell's own tone wins, else the row's;
 * classes from both. `surface: false` (pinned, row-header, merged cells) keeps
 * the cell's own background, so only the text tone applies.
 */
export function cellLook(cell: ResolvedStyle, row: ResolvedStyle, surface: boolean): { className: string; tone?: string } {
	const tone = cell.tone ?? row.tone
	const fill = (cell.tone ? cell.fill : row.fill) && surface
	const classes = [...row.classes, ...cell.classes]
	if (tone) classes.push("datatable-tone")
	if (tone && fill) classes.push("datatable-tone-fill")
	return { className: classes.join(" "), tone }
}
