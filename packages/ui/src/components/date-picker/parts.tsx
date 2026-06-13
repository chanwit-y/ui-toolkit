import { Text } from "@radix-ui/themes"
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"
import type { Dayjs } from "dayjs"
import { cn } from "../../util/utils"
import { ISO_FORMAT } from "./constants"
import type {
	CalendarDropdownProps,
	CalendarFooterProps,
	CalendarGridProps,
	CalendarHeaderProps,
} from "./types"

export const CalendarHeader = ({
	cursor,
	onPreviousMonth,
	onNextMonth,
}: CalendarHeaderProps) => (
	<div className="flex items-center justify-between mb-2">
		<button
			type="button"
			aria-label="Previous month"
			onClick={onPreviousMonth}
			className="p-1 rounded-md hover:bg-gray-100 transition-colors text-gray-600"
		>
			<ChevronLeft className="h-4 w-4" />
		</button>
		<Text size="2" weight="medium" className="text-gray-800">
			{cursor.format("MMMM YYYY")}
		</Text>
		<button
			type="button"
			aria-label="Next month"
			onClick={onNextMonth}
			className="p-1 rounded-md hover:bg-gray-100 transition-colors text-gray-600"
		>
			<ChevronRight className="h-4 w-4" />
		</button>
	</div>
)

export const WeekdayHeader = ({ labels }: { labels: string[] }) => (
	<div className="grid grid-cols-7 gap-1 mb-1">
		{labels.map((day) => (
			<div
				key={day}
				className="h-7 flex items-center justify-center text-[11px] font-medium text-gray-500 uppercase"
			>
				{day}
			</div>
		))}
	</div>
)

export const CalendarGrid = ({
	calendar,
	cursor,
	selectedDate,
	today,
	isDisabledDate,
	onSelect,
}: CalendarGridProps) => (
	<div className="grid grid-cols-7 gap-1">
		{calendar.flat().map((date) => {
			const isCurrentMonth = date.month() === cursor.month()
			const isSelected = !!selectedDate && date.isSame(selectedDate, "day")
			const isToday = date.isSame(today, "day")
			const disabledDay = isDisabledDate(date)

			return (
				<button
					key={date.format(ISO_FORMAT)}
					type="button"
					disabled={disabledDay}
					onClick={() => onSelect(date)}
					aria-pressed={isSelected}
					className={cn(
						"h-8 w-full flex items-center justify-center text-xs rounded-md transition-colors",
						"focus:outline-none focus:ring-2 focus:ring-[var(--accent-8,#3b82f6)]",
						!isCurrentMonth && "text-gray-300",
						isCurrentMonth &&
							!isSelected &&
							!disabledDay &&
							"text-gray-700 hover:bg-[var(--accent-3,#eff6ff)] hover:text-[var(--accent-11,#1d4ed8)]",
						isSelected && "bg-[var(--accent-9,#2563eb)] text-white font-semibold hover:bg-[var(--accent-10,#1d4ed8)]",
						!isSelected && isToday && "border border-[var(--accent-8,#3b82f6)]",
						disabledDay &&
							"opacity-40 cursor-not-allowed hover:bg-transparent hover:text-gray-300"
					)}
				>
					{date.date()}
				</button>
			)
		})}
	</div>
)

export const CalendarFooter = ({
	canClear,
	onToday,
	onClear,
}: CalendarFooterProps) => (
	<div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
		<button
			type="button"
			onClick={onToday}
			className="text-xs font-medium text-[var(--accent-11,#2563eb)] hover:text-[var(--accent-11,#1d4ed8)] transition-colors"
		>
			Today
		</button>
		{canClear && (
			<button
				type="button"
				onClick={onClear}
				className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
			>
				Clear
			</button>
		)}
	</div>
)

export const CalendarDropdown = ({
	dropdownRef,
	dropdownStyles,
	cursor,
	calendar,
	weekdayLabels,
	selectedDate,
	today,
	clearable,
	isDisabledDate,
	onSelect,
	onToday,
	onClear,
	onPreviousMonth,
	onNextMonth,
}: CalendarDropdownProps) => (
	<div
		ref={dropdownRef}
		style={dropdownStyles}
		className="date-picker-dropdown bg-white border ring-2 ring-[var(--accent-8,#60a5fa)] border-transparent rounded-md shadow-lg p-3"
	>
		<CalendarHeader
			cursor={cursor}
			onPreviousMonth={onPreviousMonth}
			onNextMonth={onNextMonth}
		/>
		<WeekdayHeader labels={weekdayLabels} />
		<CalendarGrid
			calendar={calendar}
			cursor={cursor}
			selectedDate={selectedDate}
			today={today}
			isDisabledDate={isDisabledDate}
			onSelect={onSelect}
		/>
		<CalendarFooter
			canClear={clearable && !!selectedDate}
			onToday={onToday}
			onClear={onClear}
		/>
	</div>
)

export const HelperText = ({
	hasError,
	message,
}: {
	hasError: boolean
	message?: string
}) => {
	if (!message) return null

	return (
		<Text
			size="1"
			id="datepicker-helper"
			className={cn(
				"block mt-2 mr-1",
				hasError ? "text-red-500 flex items-center gap-0.5" : "text-gray-600"
			)}
		>
			{hasError && (
				<AlertCircle className="inline-block h-3 w-3 mr-[0.1rem]" />
			)}
			<span>{message}</span>
		</Text>
	)
}
