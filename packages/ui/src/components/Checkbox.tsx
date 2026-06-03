import type { ElementRef } from "react"
import type { CheckboxProps } from "./@types"

import { Box, Flex, Checkbox as RadixCheckbox, Text } from '@radix-ui/themes'
import { AlertCircle } from "lucide-react"
import { forwardRef, useCallback, useMemo } from "react"
import { cn } from "../util/utils"
// import { withTheam } from "./context"

type CheckboxState = boolean | "indeterminate"

const CheckboxBase = forwardRef<
	ElementRef<typeof RadixCheckbox>,
	CheckboxProps & { onChange?: (value: boolean | string[]) => void }
>(({
	options = [],
	label,
	helperText,
	error = false,
	errorMessage,
	variant = "surface",
	size = "3",
	checked,
	value,
	onCheckedChange,
	onValueChange,
	onChange,
	orientation = "vertical",
	indeterminate,
	className,
	...props
}, ref) => {
	// Computed values
	const groupValues = useMemo<string[]>(() => {
		if (!Array.isArray(value)) return []
		return value.filter((item): item is string => typeof item === "string")
	}, [value])

	const resolvedChecked = useMemo<CheckboxState | undefined>(() => {
		if (typeof value === "boolean") return value
		if (checked !== undefined) return checked
		if (indeterminate) return "indeterminate"
		return undefined
	}, [checked, value, indeterminate])

	const hasValidValue = useMemo(() => {
		return options.length > 0 ? groupValues.length > 0 : resolvedChecked === true
	}, [options.length, groupValues, resolvedChecked])

	const hasError = useMemo(() => (error || !!errorMessage) && !hasValidValue, [error, errorMessage, hasValidValue])
	const displayHelperText = hasError ? errorMessage : helperText

	const handleSingleCheckedChange = useCallback((newChecked: CheckboxState) => {
		const booleanValue = newChecked === true
		onCheckedChange?.(booleanValue)
		onChange?.(booleanValue)
	}, [onCheckedChange, onChange])

	const handleGroupCheckedChange = useCallback((optionValue: string, newChecked: CheckboxState) => {
		const nextValue = newChecked === true
			? Array.from(new Set([...groupValues, optionValue]))
			: groupValues.filter((item) => item !== optionValue)

		onValueChange?.(nextValue)
		onChange?.(nextValue)
	}, [groupValues, onChange, onValueChange])

	return (
		<Box className="">
			<Flex direction="column" gap="1">
				{label && options.length > 0 && <Text size="2" weight="medium">{label}</Text>}

				{options.length === 0 && (
					<Flex align="center" gap="2">
						<RadixCheckbox
							ref={ref}
							variant={variant}
							size={size}
							checked={resolvedChecked}
							onCheckedChange={handleSingleCheckedChange}
							className={cn("transition duration-200 ease-in-out", className)}
							{...props}
							{...(hasError && { 'data-error': 'true' })}
							{...(indeterminate && { 'data-state': 'indeterminate' })}
						/>
						{label && (
							<Text
								as="label"
								size="2"
								weight='medium'
								className={cn("  cursor-pointer", hasError && "text-red-500")}
							>
								{label}
							</Text>
						)}
					</Flex>
				)}

				{options.length > 0 && (
					<Flex direction={orientation === "horizontal" ? "row" : "column"} gap="2" wrap={orientation === "horizontal" ? "wrap" : undefined}>
						{options.map((option, index) => (
							<Flex key={option.value} align="center" gap="2" className={cn(orientation === "horizontal" && "min-w-[80px]")}>
								<RadixCheckbox
									ref={index === 0 ? ref : undefined}
									variant={variant}
									size={size}
									value={option.value}
									checked={groupValues.includes(option.value)}
									disabled={option.disabled || props.disabled}
									onCheckedChange={(checked) => handleGroupCheckedChange(option.value, checked)}
									className={cn("transition duration-200 ease-in-out", className)}
									name={props.name}
									required={props.required}
									{...(hasError && { 'data-error': 'true' })}
								/>
								<Flex direction="column">
									<Text as="label" size="2" weight="medium" className={cn("cursor-pointer", hasError && "text-red-500")}>
										{option.label}
									</Text>
									{option.helperText && <Text size="1" className="text-gray-600">{option.helperText}</Text>}
								</Flex>
							</Flex>
						))}
					</Flex>
				)}

				{displayHelperText && (
					<Text size="1" className={cn("block mt-1 mr-1", hasError ? "text-red-500 flex items-center gap-0.5" : "text-gray-600")}>
						{hasError && <AlertCircle className="inline-block h-3 w-3 mr-[0.1rem]" />}
						<span>{displayHelperText}</span>
					</Text>
				)}
			</Flex>
		</Box>
	)
})

CheckboxBase.displayName = "Checkbox"

// const Checkbox = withTheam(CheckboxBase)

export { CheckboxBase }

