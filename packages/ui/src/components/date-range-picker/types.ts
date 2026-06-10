import type { DateRangePickerProps } from "../@types"

export type DateRange = {
	start: string | null
	end: string | null
}

export type DateRangePickerBaseProps = DateRangePickerProps & {
	onChange?: (value: DateRange | null) => void
}
