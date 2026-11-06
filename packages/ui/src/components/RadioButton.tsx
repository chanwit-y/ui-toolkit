import type { ElementRef } from "react"
import type { RadioButtonProps } from "./@types"

import { Box, Flex, RadioGroup, Text } from '@radix-ui/themes'
import { AlertCircle, Check } from "lucide-react"
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
	display = "plain",
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
				{display === "chip" ? (
					// Content-sized pills, the pill itself the label. The Radix item
					// stays in the DOM (keyboard roving focus, checked state, a11y)
					// but is clipped away; the selected pill shows the check instead
					// (styles/radioCard.css). A helper text has no room, so it is
					// the pill's tooltip.
					<div
						className="gummy-radio-chips"
						data-orientation={orientation}
						data-size={size}
					>
						{options.map((option) => (
							<Text
								key={option.value}
								as="label"
								size="2"
								className="gummy-radio-chip gummy-surface"
								title={option.helperText || undefined}
							>
								<RadioGroup.Item
									value={option.value}
									disabled={option.disabled}
									className="gummy-radio-chip-input"
								/>
								<Check className="gummy-radio-chip-check" aria-hidden="true" />
								<Text weight="medium" as="span">{option.label}</Text>
							</Text>
						))}
					</div>
				) : display === "card" ? (
					// One bordered box per option, the box itself the label; the
					// selected / focus / error looks live in styles/radioCard.css
					// and read the Radix button's own state, so the circle inside
					// keeps the `variant` look.
					<div
						className="gummy-radio-cards"
						data-orientation={orientation}
						data-size={size}
					>
						{options.map((option) => (
							<Text
								key={option.value}
								as="label"
								size="2"
								className="gummy-radio-card gummy-surface"
							>
								<RadioGroup.Item value={option.value} disabled={option.disabled} />
								<span className="gummy-radio-card-text">
									<Text weight="medium" as="div">{option.label}</Text>
									{option.helperText && (
										<Text size="1" as="div" className="text-[var(--gray-11)]">
											{option.helperText}
										</Text>
									)}
								</span>
							</Text>
						))}
					</div>
				) : (
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
										<Text size="1" className="text-gray-600 dark:text-gray-400 block">
											{option.helperText}
										</Text>
									)}
								</Box>
							</Text>
						</Flex>
					))}
				</Flex>
				)}
			</RadioGroup.Root>

			{displayHelperText && (
				<Text
					size="1"
					className={cn(
						"block mt-2 mr-1 ",
						hasError ? "text-red-500 flex items-center gap-0.5" : "text-gray-600 dark:text-gray-400"
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

