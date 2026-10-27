import type { DataTableActionSize } from "./@types"

/** The engine default for {@link DataTableElement.actionSize}. */
export const DEFAULT_ACTION_SIZE: DataTableActionSize = "2"

type ActionSizeSpec = {
	/** Radix `IconButton` size (24 / 32 / 40 px square). */
	button: DataTableActionSize
	/** The glyph inside, in px. */
	icon: number
	/** The ACTION column's fixed width, room for two buttons + the gap. */
	columnWidth: number
}

const ACTION_SIZES: Record<DataTableActionSize, ActionSizeSpec> = {
	"1": { button: "1", icon: 12, columnWidth: 68 },
	"2": { button: "2", icon: 14, columnWidth: 80 },
	"3": { button: "3", icon: 18, columnWidth: 100 },
}

/** Button / glyph / column sizes for a row-action size (unknown → the default). */
export function actionSizeSpec(size: DataTableActionSize | undefined): ActionSizeSpec {
	return ACTION_SIZES[size ?? DEFAULT_ACTION_SIZE] ?? ACTION_SIZES[DEFAULT_ACTION_SIZE]
}
