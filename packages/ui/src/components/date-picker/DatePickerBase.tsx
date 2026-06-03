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
	DEFAULT_DISPLAY_FORMAT,
	ISO_FORMAT,
} from "./constants"
import {
	useDropdownPlacement,
	useForwardedButtonRef,
	useOutsideClick,
	useValidationMessage,
} from "./hooks"
import { CalendarDropdown, HelperText } from "./parts"
import type { DatePickerBaseProps } from "./types"
import {
	buildCalendarMatrix,
	getRadiusClass,
	getSizeClass,
	getWeekdayLabels,
	parseDate,
} from "./utils"

const DatePickerBase = forwardRef<
	ElementRef<"button">,
	DatePickerBaseProps
>(({
	className,
	label,
	placeholder = "Select date",
	helperText,
	isRequired = false,
	error = false,
	errorMessage,
	size = "3",
	radius = "medium",
	isFullWidth = false,
	isFixedHeight = true,
	width,
	value,
	displayFormat = DEFAULT_DISPLAY_FORMAT,
	minDate,
	maxDate,
	weekStartsOn = 0,
	clearable = true,
	disabled = false,
	onValueChange,
	onChange,
	onBlur,
	...props
}, ref) => {
	const { hasError, displayHelperText } = useValidationMessage({
		isRequired,
		error,
		errorMessage,
		helperText,
		value,
	})

	const selectedDate = useMemo(() => parseDate(value), [value])
	const minDateValue = useMemo(() => parseDate(minDate), [minDate])
	const maxDateValue = useMemo(() => parseDate(maxDate, "end"), [maxDate])

	const [isOpen, setIsOpen] = useState(false)
	const [cursor, setCursor] = useState<Dayjs>(() => selectedDate ?? dayjs())

	const dropdownRef = useRef<HTMLDivElement | null>(null)
	const { triggerRef, setTriggerRef } = useForwardedButtonRef(ref)
	const { placement, resetPlacement } = useDropdownPlacement(
		isOpen,
		triggerRef,
		dropdownRef
	)

	useEffect(() => {
		if (selectedDate) setCursor(selectedDate)
	}, [selectedDate])

	const isDisabledDate = useCallback(
		(date: Dayjs) => {
			if (minDateValue && date.isBefore(minDateValue, "day")) return true
			if (maxDateValue && date.isAfter(maxDateValue, "day")) return true
			return false
		},
		[minDateValue, maxDateValue]
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
		setCursor(selectedDate ?? dayjs())
		resetPlacement()
		setIsOpen(true)
	}, [disabled, selectedDate, resetPlacement])

	const toggleDropdown = useCallback(() => {
		if (disabled) return
		if (isOpen) {
			closeDropdown()
			return
		}
		openDropdown()
	}, [disabled, isOpen, openDropdown, closeDropdown])

	const handleSelect = useCallback(
		(date: Dayjs) => {
			if (isDisabledDate(date)) return
			emitChange(date.format(ISO_FORMAT))
			setIsOpen(false)
			onBlur?.()
		},
		[isDisabledDate, emitChange, onBlur]
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

	const handleToday = useCallback(() => {
		const today = dayjs().startOf("day")
		if (isDisabledDate(today)) {
			setCursor(today)
			return
		}
		handleSelect(today)
	}, [handleSelect, isDisabledDate])

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

			<div className="date-picker-container relative mb-1">
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
								selectedDate ? "text-gray-900" : "text-gray-400"
							)}
						>
							{selectedDate ? selectedDate.format(displayFormat) : placeholder}
						</span>
					</div>
					{clearable && selectedDate && !disabled && (
						<span
							role="button"
							tabIndex={-1}
							aria-label="Clear date"
							onClick={handleClear}
							className="ml-2 inline-flex items-center justify-center rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
						>
							<X className="h-3.5 w-3.5" />
						</span>
					)}
				</button>

				{isOpen && (
					<CalendarDropdown
						dropdownRef={dropdownRef}
						placement={placement}
						cursor={cursor}
						calendar={calendar}
						weekdayLabels={weekdayLabels}
						selectedDate={selectedDate}
						today={today}
						clearable={clearable}
						isDisabledDate={isDisabledDate}
						onSelect={handleSelect}
						onToday={handleToday}
						onClear={handleClearFromDropdown}
						onPreviousMonth={handlePreviousMonth}
						onNextMonth={handleNextMonth}
					/>
				)}
			</div>

			<HelperText hasError={hasError} message={displayHelperText} />
		</Box>
	)
})

DatePickerBase.displayName = "DatePicker"

export { DatePickerBase }
