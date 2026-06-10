import {
	forwardRef,
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type MutableRefObject,
} from "react"
import { Box, Text } from "@radix-ui/themes"
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn } from "../../util/utils"
import { HelperText } from "../date-picker/parts"
import { getRadiusClass, getSizeClass } from "../date-picker/utils"
import type { DateRange, DateRangePickerBaseProps } from "./types"

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
const MONTHS = [
	"January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December",
]
const SHORT_MONTHS = [
	"Jan", "Feb", "Mar", "Apr", "May", "Jun",
	"Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

function toDateString(d: Date): string {
	const y = d.getFullYear()
	const m = String(d.getMonth() + 1).padStart(2, "0")
	const day = String(d.getDate()).padStart(2, "0")
	return `${y}-${m}-${day}`
}

function parseDate(v: string | Date | null | undefined): Date | null {
	if (!v) return null
	if (v instanceof Date) return isNaN(v.getTime()) ? null : v
	const d = new Date(v + "T00:00:00")
	return isNaN(d.getTime()) ? null : d
}

function formatDisplay(d: Date, fmt: string): string {
	const y = d.getFullYear()
	const m = String(d.getMonth() + 1).padStart(2, "0")
	const day = String(d.getDate()).padStart(2, "0")
	switch (fmt) {
		case "MM/dd/yyyy": return `${m}/${day}/${y}`
		case "dd/MM/yyyy": return `${day}/${m}/${y}`
		default: return `${y}-${m}-${day}`
	}
}

function formatShort(d: Date): string {
	return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function getDaysInMonth(year: number, month: number): number {
	return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
	return new Date(year, month, 1).getDay()
}

function isSameDay(a: Date, b: Date): boolean {
	return a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
}

function isInRange(d: Date, start: Date, end: Date): boolean {
	const t = d.getTime()
	return t > start.getTime() && t < end.getTime()
}

export const DateRangePickerBase = forwardRef<HTMLButtonElement, DateRangePickerBaseProps>(
	function DateRangePickerBase(
		{
			label,
			placeholder = "Select date range",
			helperText,
			error = false,
			errorMessage,
			size = "3",
			radius = "medium",
			isFullWidth = false,
			isFixedHeight = true,
			width,
			value,
			defaultValue,
			disabled,
			isRequired,
			className,
			id,
			name,
			minDate,
			maxDate,
			displayFormat = "yyyy-MM-dd",
			onChange,
			onBlur,
			clearable = true,
			...props
		},
		ref,
	) {
		const autoId = useId()
		const triggerId = id ?? autoId
		const hasError = useMemo(() => error || !!errorMessage, [error, errorMessage])
		const displayHelperText = hasError ? errorMessage : helperText

		const minDateValue = useMemo(() => parseDate(minDate), [minDate])
		const maxDateValue = useMemo(() => parseDate(maxDate), [maxDate])

		const isControlled = value !== undefined
		const [internalValue, setInternalValue] = useState<DateRange | null>(
			defaultValue ?? null,
		)
		const currentValue = isControlled ? value ?? null : internalValue

		const startDate = useMemo(() => parseDate(currentValue?.start), [currentValue?.start])
		const endDate = useMemo(() => parseDate(currentValue?.end), [currentValue?.end])

		const [isOpen, setIsOpen] = useState(false)
		const [placement, setPlacement] = useState<"bottom" | "top">("bottom")
		const [selecting, setSelecting] = useState<"start" | "end">("start")
		const [hoverDate, setHoverDate] = useState<Date | null>(null)
		const [tempStart, setTempStart] = useState<Date | null>(null)
		const [leftYear, setLeftYear] = useState(() => startDate?.getFullYear() ?? new Date().getFullYear())
		const [leftMonth, setLeftMonth] = useState(() => startDate?.getMonth() ?? new Date().getMonth())

		const rightYear = leftMonth === 11 ? leftYear + 1 : leftYear
		const rightMonth = (leftMonth + 1) % 12

		const triggerRef = useRef<HTMLButtonElement | null>(null)
		const dropdownRef = useRef<HTMLDivElement | null>(null)

		const setTriggerRef = useCallback(
			(node: HTMLButtonElement | null) => {
				triggerRef.current = node
				if (typeof ref === "function") ref(node)
				else if (ref) (ref as MutableRefObject<HTMLButtonElement | null>).current = node
			},
			[ref],
		)

		const updatePlacement = useCallback(() => {
			const trigger = triggerRef.current
			if (!trigger) return
			const rect = trigger.getBoundingClientRect()
			const dropdownHeight = dropdownRef.current?.offsetHeight ?? 360

			const modalContent = trigger.closest(".modal-content") as HTMLElement | null
			const boundaryTop = modalContent ? modalContent.getBoundingClientRect().top : 0
			const boundaryBottom = modalContent
				? modalContent.getBoundingClientRect().bottom
				: window.innerHeight

			const margin = 8
			const spaceBelow = boundaryBottom - rect.bottom - margin
			const spaceAbove = rect.top - boundaryTop - margin
			const needed = dropdownHeight + margin

			setPlacement(spaceBelow < needed && spaceAbove > spaceBelow ? "top" : "bottom")
		}, [])

		const closeDropdown = useCallback(() => {
			setIsOpen(false)
			setSelecting("start")
			setTempStart(null)
			setHoverDate(null)
			setPlacement("bottom")
			onBlur?.()
		}, [onBlur])

		const openDropdown = useCallback(() => {
			if (disabled) return
			if (startDate) {
				setLeftYear(startDate.getFullYear())
				setLeftMonth(startDate.getMonth())
			}
			setSelecting("start")
			setTempStart(null)
			setIsOpen(true)
		}, [disabled, startDate])

		const toggleDropdown = useCallback(() => {
			if (disabled) return
			if (isOpen) closeDropdown()
			else openDropdown()
		}, [disabled, isOpen, openDropdown, closeDropdown])

		const commitValue = useCallback(
			(next: DateRange | null) => {
				if (!isControlled) setInternalValue(next)
				onChange?.(next)
			},
			[isControlled, onChange],
		)

		const handleDayClick = useCallback(
			(d: Date) => {
				if (minDateValue && d < minDateValue) return
				if (maxDateValue && d > maxDateValue) return

				if (selecting === "start") {
					setTempStart(d)
					setSelecting("end")
				} else {
					const s = tempStart!
					const [rangeStart, rangeEnd] = s <= d ? [s, d] : [d, s]
					commitValue({
						start: toDateString(rangeStart),
						end: toDateString(rangeEnd),
					})
					closeDropdown()
					triggerRef.current?.focus()
				}
			},
			[selecting, tempStart, minDateValue, maxDateValue, commitValue, closeDropdown],
		)

		const handleClear = useCallback(
			(e: React.MouseEvent) => {
				e.stopPropagation()
				commitValue(null)
			},
			[commitValue],
		)

		const prevMonth = useCallback(() => {
			setLeftMonth((m) => {
				if (m === 0) { setLeftYear((y) => y - 1); return 11 }
				return m - 1
			})
		}, [])

		const nextMonth = useCallback(() => {
			setLeftMonth((m) => {
				if (m === 11) { setLeftYear((y) => y + 1); return 0 }
				return m + 1
			})
		}, [])

		useEffect(() => {
			if (!isOpen) return
			const handleClickOutside = (e: MouseEvent) => {
				const target = e.target as Node
				if (!triggerRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
					closeDropdown()
				}
			}
			document.addEventListener("mousedown", handleClickOutside)
			return () => {
				document.removeEventListener("mousedown", handleClickOutside)
			}
		}, [isOpen, closeDropdown])

		useLayoutEffect(() => {
			if (!isOpen) return
			updatePlacement()
			const raf = window.requestAnimationFrame(updatePlacement)
			const handleReposition = () => updatePlacement()
			window.addEventListener("resize", handleReposition)
			window.addEventListener("scroll", handleReposition, true)
			return () => {
				window.cancelAnimationFrame(raf)
				window.removeEventListener("resize", handleReposition)
				window.removeEventListener("scroll", handleReposition, true)
			}
		}, [isOpen, updatePlacement])

		const handleKeyDown = useCallback(
			(e: React.KeyboardEvent<HTMLButtonElement>) => {
				if (disabled) return
				if (!isOpen && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
					e.preventDefault()
					openDropdown()
				}
				if (isOpen && e.key === "Escape") {
					e.preventDefault()
					closeDropdown()
				}
			},
			[disabled, isOpen, openDropdown, closeDropdown],
		)

		const today = useMemo(() => new Date(), [])
		const radiusClass = useMemo(() => getRadiusClass(radius), [radius])
		const sizeClass = useMemo(() => getSizeClass(size), [size])

		const isDateDisabled = useCallback(
			(year: number, month: number, day: number) => {
				const d = new Date(year, month, day)
				if (minDateValue && d < minDateValue) return true
				if (maxDateValue && d > maxDateValue) return true
				return false
			},
			[minDateValue, maxDateValue],
		)

		const displayValue = useMemo(() => {
			if (!startDate || !endDate) return null
			return `${formatDisplay(startDate, displayFormat)} — ${formatDisplay(endDate, displayFormat)}`
		}, [startDate, endDate, displayFormat])

		function renderMonth(year: number, month: number) {
			const daysInM = getDaysInMonth(year, month)
			const firstD = getFirstDayOfMonth(year, month)

			const cells = []
			for (let i = 0; i < firstD; i++) {
				cells.push(<div key={`empty-${year}-${month}-${i}`} className="h-8" />)
			}

			for (let day = 1; day <= daysInM; day++) {
				const d = new Date(year, month, day)
				const isDayDisabled = isDateDisabled(year, month, day)
				const isToday = isSameDay(d, today)

				const activeStart = tempStart ?? startDate
				const activeEnd = selecting === "end" && tempStart && hoverDate
					? (hoverDate >= tempStart ? hoverDate : tempStart)
					: endDate
				const actualStart = tempStart ?? startDate
				const actualEnd = selecting === "end" && tempStart && hoverDate
					? (hoverDate < tempStart ? hoverDate : null)
					: null
				const rangeStart = actualEnd ?? actualStart
				const rangeEnd = actualEnd ? actualStart : activeEnd

				const isStart = rangeStart ? isSameDay(d, rangeStart) : false
				const isEnd = rangeEnd ? isSameDay(d, rangeEnd) : false
				const inRange = rangeStart && rangeEnd
					? isInRange(d, rangeStart < rangeEnd ? rangeStart : rangeEnd, rangeStart < rangeEnd ? rangeEnd : rangeStart)
					: false

				const isHoverRange = selecting === "end" && tempStart && hoverDate
					? isInRange(
						d,
						tempStart <= hoverDate ? tempStart : hoverDate,
						tempStart <= hoverDate ? hoverDate : tempStart,
					)
					: false

				cells.push(
					<button
						key={day}
						type="button"
						disabled={isDayDisabled}
						onClick={() => handleDayClick(d)}
						onMouseEnter={() => setHoverDate(d)}
						onMouseLeave={() => setHoverDate(null)}
						tabIndex={-1}
						className={cn(
							"h-8 w-full flex items-center justify-center text-xs transition-colors",
							isStart || isEnd
								? "bg-blue-600 text-white font-semibold rounded-full"
								: inRange || isHoverRange
									? "bg-blue-50 text-gray-700 rounded-none"
									: "rounded-full text-gray-700",
							isToday && !isStart && !isEnd && "border border-blue-500 font-semibold",
							!isDayDisabled && !isStart && !isEnd && !inRange && !isHoverRange && "hover:bg-gray-100",
							isDayDisabled && "opacity-40 cursor-not-allowed",
						)}
					>
						{day}
					</button>,
				)
			}
			return cells
		}

		const presets = useMemo(() => {
			const t = new Date()
			t.setHours(0, 0, 0, 0)
			return [
				{ label: "Today", start: t, end: t },
				{ label: "Last 7 days", start: new Date(t.getFullYear(), t.getMonth(), t.getDate() - 6), end: t },
				{ label: "Last 30 days", start: new Date(t.getFullYear(), t.getMonth(), t.getDate() - 29), end: t },
				{ label: "This month", start: new Date(t.getFullYear(), t.getMonth(), 1), end: t },
				{ label: "Last month", start: new Date(t.getFullYear(), t.getMonth() - 1, 1), end: new Date(t.getFullYear(), t.getMonth(), 0) },
			]
		}, [])

		const renderCalendar = (year: number, month: number, showPrev?: boolean, showNext?: boolean) => (
			<div className="p-3 min-w-[240px]">
				<div className="flex items-center justify-between mb-2">
					{showPrev ? (
						<button
							type="button"
							onClick={prevMonth}
							tabIndex={-1}
							className="p-1 rounded-md hover:bg-gray-100 transition-colors text-gray-600"
						>
							<ChevronLeft className="h-4 w-4" />
						</button>
					) : (
						<div className="w-6" />
					)}
					<Text size="2" weight="medium" className="text-gray-800">
						{MONTHS[month]} {year}
					</Text>
					{showNext ? (
						<button
							type="button"
							onClick={nextMonth}
							tabIndex={-1}
							className="p-1 rounded-md hover:bg-gray-100 transition-colors text-gray-600"
						>
							<ChevronRight className="h-4 w-4" />
						</button>
					) : (
						<div className="w-6" />
					)}
				</div>
				<div className="grid grid-cols-7 gap-0 mb-1">
					{DAYS.map((d) => (
						<div
							key={`${year}-${month}-${d}`}
							className="h-7 flex items-center justify-center text-[11px] font-medium text-gray-500 uppercase"
						>
							{d}
						</div>
					))}
				</div>
				<div className="grid grid-cols-7 gap-0">
					{renderMonth(year, month)}
				</div>
			</div>
		)

		return (
			<Box
				className={cn(
					isFullWidth ? "w-full" : "",
					"mr-0 flex flex-col justify-start",
					isFixedHeight ? "h-20" : "",
				)}
				style={width ? { width: `${width}px` } : {}}
			>
				{label && (
					<Text as="label" htmlFor={triggerId} size="2" weight="medium" className="block mb-1">
						{label}
					</Text>
				)}

				<div className="date-range-picker-container relative mb-1">
					<button
						ref={setTriggerRef}
						id={triggerId}
						type="button"
						role="combobox"
						aria-haspopup="dialog"
						aria-expanded={isOpen}
						aria-invalid={hasError || undefined}
						aria-required={isRequired || undefined}
						disabled={disabled}
						onClick={toggleDropdown}
						onKeyDown={handleKeyDown}
						className={cn(
							"w-full flex items-center justify-between bg-white border shadow-sm",
							"transition-all duration-200 text-left",
							sizeClass,
							radiusClass,
							hasError
								? "border-red-300 hover:border-red-400"
								: "border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent",
							disabled && "opacity-60 cursor-not-allowed bg-gray-50",
							className,
						)}
						data-error={hasError ? "true" : undefined}
						{...props}
					>
						<div className="flex flex-1 min-w-0 items-center gap-2">
							<Calendar className="h-4 w-4 text-gray-400 shrink-0" />
							<span
								className={cn(
									"truncate",
									displayValue ? "text-gray-900" : "text-gray-400",
								)}
							>
								{displayValue ?? placeholder}
							</span>
						</div>
						{clearable && currentValue?.start && !disabled && (
							<span
								role="button"
								tabIndex={-1}
								aria-label="Clear date range"
								onClick={handleClear}
								className="ml-2 inline-flex items-center justify-center rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
							>
								<X className="h-3.5 w-3.5" />
							</span>
						)}
					</button>

					{name && (
						<>
							<input type="hidden" name={`${name}_start`} value={currentValue?.start ?? ""} />
							<input type="hidden" name={`${name}_end`} value={currentValue?.end ?? ""} />
						</>
					)}

					{isOpen && (
						<div
							ref={dropdownRef}
							role="dialog"
							aria-label="Choose date range"
							className={cn(
								"date-range-picker-dropdown bg-white border border-gray-200 rounded-md shadow-lg z-[100000]",
								"absolute left-0 w-max max-w-[92vw]",
								placement === "top" ? "bottom-full mb-1" : "top-full mt-1",
							)}
						>
							<div className="flex">
								<div className="flex flex-col gap-0.5 p-2 border-r border-gray-100 min-w-[130px]">
									{presets.map((p) => (
										<button
											key={p.label}
											type="button"
											tabIndex={-1}
											onClick={() => {
												commitValue({
													start: toDateString(p.start),
													end: toDateString(p.end),
												})
												closeDropdown()
												triggerRef.current?.focus()
											}}
											className="text-xs px-2.5 py-1.5 text-left rounded-md text-gray-700 hover:bg-gray-100 transition-colors whitespace-nowrap"
										>
											{p.label}
										</button>
									))}
								</div>

								<div className="flex">
									{renderCalendar(leftYear, leftMonth, true, false)}
									{renderCalendar(rightYear, rightMonth, false, true)}
								</div>
							</div>

							<div className="px-3 py-2 border-t border-gray-100 text-center">
								<Text size="1" className="text-gray-500">
									{selecting === "end" && tempStart
										? `${formatShort(tempStart)} — ...`
										: startDate && endDate
											? `${formatShort(startDate)} — ${formatShort(endDate)}`
											: "Select start date"}
								</Text>
							</div>
						</div>
					)}
				</div>

				<HelperText hasError={hasError} message={displayHelperText} />
			</Box>
		)
	},
)

DateRangePickerBase.displayName = "DateRangePicker"
