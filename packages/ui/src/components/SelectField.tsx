import type { SelectFieldProps } from "./@types"
import type { ElementRef } from "react"

import { forwardRef, useMemo } from "react"
import { Select as RadixSelect, Text, Box } from '@radix-ui/themes'
import { cn } from "../util/utils"
// import { withTheam } from "./context"

const SelectFieldBase = forwardRef<
	ElementRef<typeof RadixSelect.Trigger>,
	SelectFieldProps & { onChange?: (value: string) => void }
>(({
	label,
	placeholder,
	helperText,
	error = false,
	errorMessage,
	variant = "surface",
	size = "2",
	radius = "medium",
	options,
	value,
	onValueChange,
	onChange,
	className,
	...props
}, ref) => {
	const hasError = useMemo(() => error || !!errorMessage, [error, errorMessage])
	const displayHelperText = hasError ? errorMessage : helperText
	
	// Handle both onChange (from form) and onValueChange (direct usage)
	const handleValueChange = (newValue: string) => {
		onValueChange?.(newValue)
		onChange?.(newValue)
	}

	return (
		<Box className="w-full">
			{label && (
				<Text as="label" size="2" weight="medium" className="block mb-1">
					{label}
				</Text>
			)}


			<RadixSelect.Root
				value={value}
				onValueChange={handleValueChange}
			>
				<RadixSelect.Trigger
					ref={ref}
					variant={variant}
					radius={radius}
					placeholder={placeholder}
					className={cn(
						"w-full",
						"transition duration-200 ease-in-out",
						hasError
							? "!border !border-red-500 focus:outline-none focus:!border-red-500"
							: "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
						className
					)}
					{...props}
					{...(hasError && { 'data-error': 'true' })}
				/>
				<RadixSelect.Content>
					{options.map((option) => (
						<RadixSelect.Item
							key={option.value}
							value={option.value}
							disabled={option.disabled}
						>
							{option.label}
						</RadixSelect.Item>
					))}
				</RadixSelect.Content>
			</RadixSelect.Root>

			{displayHelperText && (
				<Text
					size="1"
					className={cn(
						"block mt-1",
						hasError ? "text-red-500" : "text-gray-600"
					)}
				>
					{displayHelperText}
				</Text>
			)}
		</Box>
	)
})

SelectFieldBase.displayName = "SelectField"

// const SelectField = withTheam(SelectFieldBase)

export { SelectFieldBase }
