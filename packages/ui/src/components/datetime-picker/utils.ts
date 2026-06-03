import dayjs, { type Dayjs } from "dayjs"
import type { DateTimePickerProps } from "../@types"

export const buildCalendarMatrix = (
	cursor: Dayjs,
	weekStartsOn: 0 | 1
): Dayjs[][] => {
	const startOfMonth = cursor.startOf("month")
	const endOfMonth = cursor.endOf("month")

	const startWeekday = startOfMonth.day()
	const offsetFromStart = (startWeekday - weekStartsOn + 7) % 7
	const gridStart = startOfMonth.subtract(offsetFromStart, "day")

	const endWeekday = endOfMonth.day()
	const offsetFromEnd = 6 - ((endWeekday - weekStartsOn + 7) % 7)
	const gridEnd = endOfMonth.add(offsetFromEnd, "day")

	const totalDays = gridEnd.diff(gridStart, "day") + 1
	const matrix: Dayjs[][] = []
	for (let i = 0; i < totalDays; i += 7) {
		const week: Dayjs[] = []
		for (let j = 0; j < 7; j += 1) {
			week.push(gridStart.add(i + j, "day"))
		}
		matrix.push(week)
	}
	return matrix
}

export const getWeekdayLabels = (weekStartsOn: 0 | 1) => {
	const base = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
	if (weekStartsOn === 0) return base
	return [...base.slice(1), base[0]]
}

export const parseDateTime = (value?: string) => {
	if (!value) return undefined
	const parsed = dayjs(value)
	if (!parsed.isValid()) return undefined
	return parsed
}

export const parseDateTimeBoundary = (
	value?: string,
	boundary: "start" | "end" = "start"
) => {
	if (!value) return undefined
	const parsed = dayjs(value)
	if (!parsed.isValid()) return undefined
	return boundary === "start"
		? parsed
		: parsed.endOf("minute")
}

export const getRadiusClass = (radius: DateTimePickerProps["radius"]) => {
	switch (radius) {
		case "none":
			return "rounded-none"
		case "small":
			return "rounded-sm"
		case "large":
			return "rounded-lg"
		case "full":
			return "rounded-full"
		case "medium":
		default:
			return "rounded-md"
	}
}

export const getSizeClass = (size: DateTimePickerProps["size"]) => {
	switch (size) {
		case "1":
			return "h-[28px] text-xs px-2"
		case "2":
			return "h-[32px] text-sm px-3"
		case "3":
		default:
			return "h-[40px] text-sm px-4"
	}
}

export const padZero = (num: number): string => {
	return num.toString().padStart(2, "0")
}

export const getFilteredMinutes = (minuteStep: number): number[] => {
	const minutes: number[] = []
	for (let i = 0; i < 60; i += minuteStep) {
		minutes.push(i)
	}
	return minutes
}
