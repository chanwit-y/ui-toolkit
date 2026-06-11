import type { Dayjs } from "dayjs"
import type { CSSProperties, RefObject } from "react"
import type { DateTimePickerProps } from "../@types"

export type DropdownPlacement = "bottom" | "top"
export type DateTimePickerBaseProps = DateTimePickerProps & {
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
	onNow: () => void
	onClear: () => void
}

export type TimePickerProps = {
	hour: number
	minute: number
	minuteStep: number
	onHourChange: (hour: number) => void
	onMinuteChange: (minute: number) => void
}

export type DateTimeDropdownProps = {
	dropdownRef: RefObject<HTMLDivElement>
	dropdownStyles: CSSProperties
	cursor: Dayjs
	calendar: Dayjs[][]
	weekdayLabels: string[]
	selectedDateTime?: Dayjs
	today: Dayjs
	clearable: boolean
	hour: number
	minute: number
	minuteStep: number
	isDisabledDate: (date: Dayjs) => boolean
	onSelectDate: (date: Dayjs) => void
	onNow: () => void
	onClear: () => void
	onPreviousMonth: () => void
	onNextMonth: () => void
	onHourChange: (hour: number) => void
	onMinuteChange: (minute: number) => void
}
