import {
	forwardRef,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ElementRef,
	type KeyboardEvent,
	type MouseEvent,
} from "react"
import { Box, Text } from "@radix-ui/themes"
import { Calendar as CalendarIcon, X } from "lucide-react"
import dayjs, { type Dayjs } from "dayjs"
import { cn } from "../../util/utils"
import {
	DEFAULT_DATETIME_DISPLAY_FORMAT,
	ISO_DATETIME_FORMAT,
} from "./constants"
import {
	useDropdownPlacement,
	useForwardedButtonRef,
	useOutsideClick,
	useValidationMessage,
} from "./hooks"
import { DateTimeDropdown, HelperText } from "./parts"
import type { DateTimePickerBaseProps } from "./types"
import {
	buildCalendarMatrix,
	getRadiusClass,
	getSizeClass,
	getWeekdayLabels,
	parseDateTime,
	parseDateTimeBoundary,
} from "./utils"

const DateTimePickerBase = forwardRef<
	ElementRef<"button">,
	DateTimePickerBaseProps
>(({
	className,
	label,
	placeholder = "Select date and time",
	helperText,
	error = false,
	errorMessage,
	size = "3",
	radius = "medium",
	isFullWidth = false,
	isFixedHeight = true,
	width,
	value,
	displayFormat = DEFAULT_DATETIME_DISPLAY_FORMAT,
	minDateTime,
	maxDateTime,
	weekStartsOn = 0,
	clearable = true,
	disabled = false,
	minuteStep = 1,
	onValueChange,
	onChange,
	onBlur,
	...props
}, ref) => {
	const { hasError, displayHelperText } = useValidationMessage({
		error,
		errorMessage,
		helperText,
		value,
	})

	const selectedDateTime = useMemo(() => parseDateTime(value), [value])
	const minDateTimeValue = useMemo(() => parseDateTimeBoundary(minDateTime, "start"), [minDateTime])
	const maxDateTimeValue = useMemo(() => parseDateTimeBoundary(maxDateTime, "end"), [maxDateTime])

	const [isOpen, setIsOpen] = useState(false)
	const [cursor, setCursor] = useState<Dayjs>(() => selectedDateTime ?? dayjs())
	const [hour, setHour] = useState(() => selectedDateTime?.hour() ?? dayjs().hour())
	const [minute, setMinute] = useState(() => selectedDateTime?.minute() ?? 0)

	const dropdownRef = useRef<HTMLDivElement | null>(null)
	const { triggerRef, setTriggerRef } = useForwardedButtonRef(ref)
	const { placement, resetPlacement } = useDropdownPlacement(
		isOpen,
		triggerRef,
		dropdownRef
	)

	useEffect(() => {
		if (selectedDateTime) {
			setCursor(selectedDateTime)
			setHour(selectedDateTime.hour())
			setMinute(selectedDateTime.minute())
		}
	}, [selectedDateTime])

	const isDisabledDate = useCallback(
		(date: Dayjs) => {
			if (minDateTimeValue && date.endOf("day").isBefore(minDateTimeValue)) return true
			if (maxDateTimeValue && date.startOf("day").isAfter(maxDateTimeValue)) return true
			return false
		},
		[minDateTimeValue, maxDateTimeValue]
	)

	const emitChange = useCallback(
		(next: string) => {
			onValueChange?.(next)
			onChange?.(next)
		},
		[onValueChange, onChange]
	)

	const closeDropdown = useCallback(() => {
		setIsOpen(false)
		onBlur?.()
	}, [onBlur])

	const openDropdown = useCallback(() => {
		if (disabled) return
		if (selectedDateTime) {
			setCursor(selectedDateTime)
			setHour(selectedDateTime.hour())
			setMinute(selectedDateTime.minute())
		} else {
			setCursor(dayjs())
			setHour(dayjs().hour())
			setMinute(0)
		}
		resetPlacement()
		setIsOpen(true)
	}, [disabled, selectedDateTime, resetPlacement])

	const toggleDropdown = useCallback(() => {
		if (disabled) return
		if (isOpen) {
			closeDropdown()
			return
		}
		openDropdown()
	}, [disabled, isOpen, openDropdown, closeDropdown])

	const handleSelectDate = useCallback(
		(date: Dayjs) => {
			if (isDisabledDate(date)) return
			const combined = date.hour(hour).minute(minute)
			emitChange(combined.format(ISO_DATETIME_FORMAT))
		},
		[isDisabledDate, emitChange, hour, minute]
	)

	const handleHourChange = useCallback(
		(newHour: number) => {
			setHour(newHour)
			if (selectedDateTime) {
				const combined = selectedDateTime.hour(newHour).minute(minute)
				emitChange(combined.format(ISO_DATETIME_FORMAT))
			}
		},
		[selectedDateTime, minute, emitChange]
	)

	const handleMinuteChange = useCallback(
		(newMinute: number) => {
			setMinute(newMinute)
			if (selectedDateTime) {
				const combined = selectedDateTime.hour(hour).minute(newMinute)
				emitChange(combined.format(ISO_DATETIME_FORMAT))
			}
		},
		[selectedDateTime, hour, emitChange]
	)

	const handleClear = useCallback(
		(e: MouseEvent) => {
			e.stopPropagation()
			emitChange("")
		},
		[emitChange]
	)

	const handleClearFromDropdown = useCallback(() => {
		emitChange("")
	}, [emitChange])

	const handleNow = useCallback(() => {
		const now = dayjs()
		const combined = now
		if (minDateTimeValue && combined.isBefore(minDateTimeValue)) {
			setCursor(now)
			setHour(now.hour())
			setMinute(now.minute())
			return
		}
		if (maxDateTimeValue && combined.isAfter(maxDateTimeValue)) {
			setCursor(now)
			setHour(now.hour())
			setMinute(now.minute())
			return
		}
		emitChange(combined.format(ISO_DATETIME_FORMAT))
		setHour(now.hour())
		setMinute(now.minute())
	}, [emitChange, minDateTimeValue, maxDateTimeValue])

	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (!isOpen) {
				if (["Enter", " ", "ArrowDown"].includes(e.key)) {
					e.preventDefault()
					openDropdown()
				}
				return
			}
			if (e.key === "Escape") {
				e.preventDefault()
				closeDropdown()
				triggerRef.current?.focus()
			}
		},
		[isOpen, openDropdown, closeDropdown, triggerRef]
	)

	useOutsideClick(isOpen, triggerRef, dropdownRef, closeDropdown)

	const calendar = useMemo(
		() => buildCalendarMatrix(cursor, weekStartsOn),
		[cursor, weekStartsOn]
	)
	const weekdayLabels = useMemo(
		() => getWeekdayLabels(weekStartsOn),
		[weekStartsOn]
	)

	const radiusClass = useMemo(() => getRadiusClass(radius), [radius])
	const sizeClass = useMemo(() => getSizeClass(size), [size])

	const today = useMemo(() => dayjs().startOf("day"), [])
	const handlePreviousMonth = useCallback(() => {
		setCursor((c) => c.subtract(1, "month"))
	}, [])
	const handleNextMonth = useCallback(() => {
		setCursor((c) => c.add(1, "month"))
	}, [])

	return (
		<Box
			className={cn(
				isFullWidth ? "w-full" : "",
				"mr-0 flex flex-col justify-start",
				isFixedHeight ? "h-20" : ""
			)}
			style={width ? { width: `${width}px` } : {}}
		>
			{label && (
				<Text as="label" size="2" weight="medium" className="block mb-1">
					{label}
				</Text>
			)}

			<div className="datetime-picker-container relative mb-1">
				<button
					ref={setTriggerRef}
					type="button"
					onClick={toggleDropdown}
					onKeyDown={handleKeyDown}
					disabled={disabled}
					aria-haspopup="dialog"
					aria-expanded={isOpen}
					className={cn(
						"w-full flex items-center justify-between bg-white border shadow-sm",
						"transition-all duration-200 text-left",
						sizeClass,
						radiusClass,
						hasError
							? "border-red-300 hover:border-red-400"
							: "border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent",
						disabled && "opacity-60 cursor-not-allowed bg-gray-50",
						className
					)}
					data-error={hasError ? "true" : undefined}
					{...props}
				>
					<div className="flex flex-1 min-w-0 items-center gap-2">
						<CalendarIcon className="h-4 w-4 text-gray-400 shrink-0" />
						<span
							className={cn(
								"truncate",
								selectedDateTime ? "text-gray-900" : "text-gray-400"
							)}
						>
							{selectedDateTime ? selectedDateTime.format(displayFormat) : placeholder}
						</span>
					</div>
					{clearable && selectedDateTime && !disabled && (
						<span
							role="button"
							tabIndex={-1}
							aria-label="Clear datetime"
							onClick={handleClear}
							className="ml-2 inline-flex items-center justify-center rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
						>
							<X className="h-3.5 w-3.5" />
						</span>
					)}
				</button>

				{isOpen && (
					<DateTimeDropdown
						dropdownRef={dropdownRef}
						placement={placement}
						cursor={cursor}
						calendar={calendar}
						weekdayLabels={weekdayLabels}
						selectedDateTime={selectedDateTime}
						today={today}
						clearable={clearable}
						hour={hour}
						minute={minute}
						minuteStep={minuteStep}
						isDisabledDate={isDisabledDate}
						onSelectDate={handleSelectDate}
						onNow={handleNow}
						onClear={handleClearFromDropdown}
						onPreviousMonth={handlePreviousMonth}
						onNextMonth={handleNextMonth}
						onHourChange={handleHourChange}
						onMinuteChange={handleMinuteChange}
					/>
				)}
			</div>

			<HelperText hasError={hasError} message={displayHelperText} />
		</Box>
	)
})

DateTimePickerBase.displayName = "DateTimePicker"

export { DateTimePickerBase }
