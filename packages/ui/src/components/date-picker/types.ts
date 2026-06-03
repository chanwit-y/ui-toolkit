import type { Dayjs } from "dayjs"
import type { RefObject } from "react"
import type { DatePickerProps } from "../@types"

export type DropdownPlacement = "bottom" | "top"
export type DatePickerBaseProps = DatePickerProps & {
	onChange?: (value: string) => void
}

export type CalendarHeaderProps = {
	cursor: Dayjs
	onPreviousMonth: () => void
	onNextMonth: () => void
}

export type CalendarGridProps = {
	calendar: Dayjs[][]
	cursor: Dayjs
	selectedDate?: Dayjs
	today: Dayjs
	isDisabledDate: (date: Dayjs) => boolean
	onSelect: (date: Dayjs) => void
}

export type CalendarFooterProps = {
	canClear: boolean
	onToday: () => void
	onClear: () => void
}

export type CalendarDropdownProps = {
	dropdownRef: RefObject<HTMLDivElement>
	placement: DropdownPlacement
	cursor: Dayjs
	calendar: Dayjs[][]
	weekdayLabels: string[]
	selectedDate?: Dayjs
	today: Dayjs
	clearable: boolean
	isDisabledDate: (date: Dayjs) => boolean
	onSelect: (date: Dayjs) => void
	onToday: () => void
	onClear: () => void
	onPreviousMonth: () => void
	onNextMonth: () => void
}
