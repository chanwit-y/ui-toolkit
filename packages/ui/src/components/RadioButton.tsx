import type { ElementRef } from "react"
import type { RadioButtonProps } from "./@types"

import { Box, Flex, RadioGroup, Text } from '@radix-ui/themes'
import { AlertCircle } from "lucide-react"
import { forwardRef, useEffect, useMemo, useState } from "react"
import { cn } from "../util/utils"

const RadioButtonBase = forwardRef<
	ElementRef<typeof RadioGroup.Root>,
	RadioButtonProps & { onChange?: (value: string) => void }
>(({
	className,
	label,
	helperText,
	error = false,
	errorMessage,
	variant = "surface",
	size = "2",
	value,
	defaultValue,
	onValueChange,
	onChange,
	options = [],
	orientation = "vertical",
	...props
}, ref) => {
	const isControlled = value !== undefined
	const [selectedValue, setSelectedValue] = useState(defaultValue ?? "")

	useEffect(() => {
		if (isControlled) {
			setSelectedValue(value ?? "")
		}
	}, [isControlled, value])

	const hasValue = useMemo(() => {
		return !!String(isControlled ? (value ?? "") : selectedValue).trim()
	}, [isControlled, value, selectedValue])

	const hasError = useMemo(() => {
		return !hasValue && (error || !!errorMessage)
	}, [error, errorMessage, hasValue])
	const displayHelperText = hasError ? errorMessage : helperText

	// Handle both onChange (from form) and onValueChange (direct usage)
	const handleValueChange = (newValue: string) => {
		setSelectedValue(newValue)
		onValueChange?.(newValue)
		onChange?.(newValue)
	}

	return (
		<Box className="w-full">
			{label && (
				<Text as="label" size="2" weight="medium" className="block mb-2">
					{label}
				</Text>
			)}

			<RadioGroup.Root
				ref={ref}
				variant={variant}
				size={size}
				value={isControlled ? value : undefined}
				defaultValue={!isControlled ? defaultValue : undefined}
				onValueChange={handleValueChange}
				orientation={orientation}
				className={cn(
					"transition duration-200 ease-in-out",
					hasError && "data-[error=true]:text-red-500",
					className
				)}
				{...props}
				{...(hasError && { 'data-error': 'true' })}
			>
				<Flex 
					direction={orientation === "horizontal" ? "row" : "column"} 
					gap="3"
					wrap={orientation === "horizontal" ? "wrap" : undefined}
				>
					{options.map((option) => (
						<Flex key={option.value} align="center" gap="2" asChild>
							<Text as="label" size="2" className="cursor-pointer">
								<RadioGroup.Item
									value={option.value}
									disabled={option.disabled}
									className={cn(
										"transition duration-200 ease-in-out",
										hasError
											? "focus:outline-none focus:ring-2 focus:ring-red-500 data-[state=checked]:border-red-500"
											: "focus:outline-none focus:ring-2 focus:ring-[var(--accent-8,#3b82f6)] focus:border-transparent",
										option.disabled && "opacity-50 cursor-not-allowed"
									)}
								/>
								<Box>
									<Text weight="medium">{option.label}</Text>
									{option.helperText && (
										<Text size="1" className="text-gray-600 block">
											{option.helperText}
										</Text>
									)}
								</Box>
							</Text>
						</Flex>
					))}
				</Flex>
			</RadioGroup.Root>

			{displayHelperText && (
				<Text
					size="1"
					className={cn(
						"block mt-2 mr-1 ",
						hasError ? "text-red-500 flex items-center gap-0.5" : "text-gray-600"
					)}>
					{hasError && <AlertCircle className=" inline-block h-3 w-3 mr-[0.1rem]" />}
					<span>{displayHelperText}</span>
				</Text>
			)}
		</Box>
	)
})

RadioButtonBase.displayName = "RadioButton"

// const RadioButton = withTheam(RadioButtonBase)

export { RadioButtonBase }

