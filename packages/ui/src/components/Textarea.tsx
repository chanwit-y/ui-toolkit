import type { ElementRef } from "react"
import type { TextareaProps } from "./@types"

import { Box, Text } from '@radix-ui/themes'
import { AlertCircle } from "lucide-react"
import { forwardRef, useEffect, useMemo, useRef } from "react"
import { cn } from "../util/utils"
// import { withTheam } from "./context"

const TextareaBase = forwardRef<
	ElementRef<"textarea">,
	TextareaProps
>(({
	className,
	label,
	placeholder,
	helperText,
	error = false,
	errorMessage,
	rows = 4,
	cols,
	resize = "vertical",
	autoResize = false,
	maxLength,
	showCharCount = false,
	value,
	onChange,
	...props
}, ref) => {
	const hasError = useMemo(() => (error || !!errorMessage) && !value, [error, errorMessage, value])
	const displayHelperText = hasError ? errorMessage : helperText
	const internalRef = useRef<HTMLTextAreaElement>(null)
	const textareaRef = ref || internalRef

	// Auto-resize functionality
	useEffect(() => {
		if (autoResize && textareaRef && 'current' in textareaRef && textareaRef.current) {
			const textarea = textareaRef.current
			textarea.style.height = 'auto'
			textarea.style.height = `${textarea.scrollHeight}px`
		}
	}, [value, autoResize, textareaRef])

	// Character count
	const currentLength = typeof value === 'string' ? value.length : 0
	const showCount = showCharCount || maxLength

	return (
		<Box className="w-full">
			{label && (
				<Text as="label" size="2" weight="medium" className="block mb-1">
					{label}
				</Text>
			)}

			<textarea
				ref={textareaRef}
				value={value}
				onChange={onChange}
				placeholder={placeholder}
				rows={rows}
				cols={cols}
				maxLength={maxLength}
				className={cn(
					// Base styles matching Radix UI theme
					"w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2",
					"text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500",
					"transition duration-200 ease-in-out",
					"",
					// "hover:border-gray-300",
					"disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed",
					// Resize styles
					resize === "none" && "resize-none",
					resize === "both" && "resize",
					resize === "horizontal" && "resize-x",
					resize === "vertical" && "resize-y",
					// Auto-resize styles
					autoResize && "resize-none overflow-hidden",
					// Error styles
					hasError ? "border border-red-300 hover:border-red-400" : "focus:outline-none focus:ring-2 focus:ring-[var(--accent-8,#3b82f6)] focus:border-transparent",
					className
				)}
				{...props}
				{...(hasError && { 'data-error': 'true' })}
			/>

			<div className="flex justify-between ">
				<div>
					{displayHelperText && (
						<Text
							size="1"
							className={cn(
								"block mt-1 mr-1",
								hasError ? "text-red-500 flex items-center gap-0.5" : "text-gray-600 dark:text-gray-400"
							)}
						>
							{hasError && <AlertCircle className="inline-block h-3 w-3 mr-[0.1rem]" />}
							<span>{displayHelperText}</span>
						</Text>
					)}
				</div>
				<div>

					{showCount && (
						<Text
							size="1"
							className={cn(
								"text-right ml-2",
								maxLength && currentLength > maxLength ? "text-red-500" : "text-gray-500 dark:text-gray-400"
							)}
						>
							{maxLength ? `${currentLength}/${maxLength}` : currentLength}
						</Text>
					)}
				</div>
			</div>
		</Box>
	)
})

TextareaBase.displayName = "Textarea"

// const Textarea = withTheam(TextareaBase)

export { TextareaBase }
