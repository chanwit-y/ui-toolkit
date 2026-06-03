import { Text } from "@radix-ui/themes"
import { AlertCircle, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react"
import type { Dayjs } from "dayjs"
import { cn } from "../../util/utils"
import { DEFAULT_DROPDOWN_WIDTH, HOURS } from "./constants"
import { padZero, getFilteredMinutes } from "./utils"
import type {
	CalendarFooterProps,
	CalendarGridProps,
	CalendarHeaderProps,
	DateTimeDropdownProps,
	TimePickerProps,
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
					key={date.format("YYYY-MM-DD")}
					type="button"
					disabled={disabledDay}
					onClick={() => onSelect(date)}
					aria-pressed={isSelected}
					className={cn(
						"h-8 w-full flex items-center justify-center text-xs rounded-md transition-colors",
						"focus:outline-none focus:ring-2 focus:ring-blue-500",
						!isCurrentMonth && "text-gray-300",
						isCurrentMonth &&
							!isSelected &&
							!disabledDay &&
							"text-gray-700 hover:bg-blue-50 hover:text-blue-700",
						isSelected && "bg-blue-600 text-white font-semibold hover:bg-blue-700",
						!isSelected && isToday && "border border-blue-500",
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

export const TimePicker = ({
	hour,
	minute,
	minuteStep,
	onHourChange,
	onMinuteChange,
}: TimePickerProps) => {
	const filteredMinutes = getFilteredMinutes(minuteStep)

	const incrementHour = () => onHourChange((hour + 1) % 24)
	const decrementHour = () => onHourChange((hour - 1 + 24) % 24)
	const incrementMinute = () => {
		const currentIndex = filteredMinutes.indexOf(minute)
		const nextIndex = (currentIndex + 1) % filteredMinutes.length
		onMinuteChange(filteredMinutes[nextIndex])
	}
	const decrementMinute = () => {
		const currentIndex = filteredMinutes.indexOf(minute)
		const prevIndex = (currentIndex - 1 + filteredMinutes.length) % filteredMinutes.length
		onMinuteChange(filteredMinutes[prevIndex])
	}

	return (
		<div className="flex items-center justify-center gap-1 mt-3 pt-3 border-t border-gray-100">
			<Text size="2" weight="medium" className="text-gray-600 mr-2">
				Time:
			</Text>
			<div className="flex items-center gap-1">
				<div className="flex flex-col items-center">
					<button
						type="button"
						onClick={incrementHour}
						className="p-0.5 rounded hover:bg-gray-100 transition-colors text-gray-500"
						aria-label="Increment hour"
					>
						<ChevronUp className="h-3 w-3" />
					</button>
					<select
						value={hour}
						onChange={(e) => onHourChange(Number(e.target.value))}
						className="w-12 text-center text-sm border border-gray-200 rounded px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
						aria-label="Hour"
					>
						{HOURS.map((h) => (
							<option key={h} value={h}>
								{padZero(h)}
							</option>
						))}
					</select>
					<button
						type="button"
						onClick={decrementHour}
						className="p-0.5 rounded hover:bg-gray-100 transition-colors text-gray-500"
						aria-label="Decrement hour"
					>
						<ChevronDown className="h-3 w-3" />
					</button>
				</div>
				<span className="text-gray-600 font-medium">:</span>
				<div className="flex flex-col items-center">
					<button
						type="button"
						onClick={incrementMinute}
						className="p-0.5 rounded hover:bg-gray-100 transition-colors text-gray-500"
						aria-label="Increment minute"
					>
						<ChevronUp className="h-3 w-3" />
					</button>
					<select
						value={minute}
						onChange={(e) => onMinuteChange(Number(e.target.value))}
						className="w-12 text-center text-sm border border-gray-200 rounded px-1 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
						aria-label="Minute"
					>
						{filteredMinutes.map((m) => (
							<option key={m} value={m}>
								{padZero(m)}
							</option>
						))}
					</select>
					<button
						type="button"
						onClick={decrementMinute}
						className="p-0.5 rounded hover:bg-gray-100 transition-colors text-gray-500"
						aria-label="Decrement minute"
					>
						<ChevronDown className="h-3 w-3" />
					</button>
				</div>
			</div>
		</div>
	)
}

export const CalendarFooter = ({
	canClear,
	onNow,
	onClear,
}: CalendarFooterProps) => (
	<div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
		<button
			type="button"
			onClick={onNow}
			className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
		>
			Now
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

export const DateTimeDropdown = ({
	dropdownRef,
	placement,
	cursor,
	calendar,
	weekdayLabels,
	selectedDateTime,
	today,
	clearable,
	hour,
	minute,
	minuteStep,
	isDisabledDate,
	onSelectDate,
	onNow,
	onClear,
	onPreviousMonth,
	onNextMonth,
	onHourChange,
	onMinuteChange,
}: DateTimeDropdownProps) => (
	<div
		ref={dropdownRef}
		style={{ minWidth: DEFAULT_DROPDOWN_WIDTH }}
		data-placement={placement}
		className={cn(
			"datetime-picker-dropdown bg-white border border-gray-200 rounded-md shadow-lg p-3 z-[100000]",
			"absolute left-0 w-full",
			placement === "top" ? "bottom-full mb-1" : "top-full mt-1"
		)}
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
			selectedDate={selectedDateTime}
			today={today}
			isDisabledDate={isDisabledDate}
			onSelect={onSelectDate}
		/>
		<TimePicker
			hour={hour}
			minute={minute}
			minuteStep={minuteStep}
			onHourChange={onHourChange}
			onMinuteChange={onMinuteChange}
		/>
		<CalendarFooter
			canClear={clearable && !!selectedDateTime}
			onNow={onNow}
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
			id="datetimepicker-helper"
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
