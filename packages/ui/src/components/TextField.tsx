import type { TextFieldProps } from "./@types"
import type { ChangeEvent, ElementRef } from "react"

import { forwardRef, useEffect, useMemo, useRef, useState } from "react"
import { TextField as RadixTextField, Text, Box } from '@radix-ui/themes'
import { cn } from "../util/utils"
// import { withTheam } from "./context"
import { AlertCircle } from "lucide-react"

const TextFieldBase = forwardRef<
	ElementRef<typeof RadixTextField.Root>,
	TextFieldProps
>(({
	className,
	dataType,
	label,
	placeholder,
	helperText,
	error = false,
	errorMessage,
	variant = "surface",
	size = "3",
	radius = "medium",
	isFullWidth = false,
	isFixedHeight = true,
	width,
	regex,
	regexErrorMessage = "Invalid character",
	onChange,
	...props
}, ref) => {
	const pattern = useMemo(
		() => (regex ? (typeof regex === "string" ? new RegExp(regex) : regex) : undefined),
		[regex],
	)

	// Transient hint shown when a keystroke is rejected by `regex`. It auto-clears
	// shortly after the user stops typing invalid characters.
	const [regexError, setRegexError] = useState(false)
	const regexErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => () => {
		if (regexErrorTimer.current) clearTimeout(regexErrorTimer.current)
	}, [])

	// const hasError = error || !!errorMessage
	const hasError = useMemo(
		() => error || !!errorMessage || regexError,
		[error, errorMessage, regexError],
	)
	const displayHelperText = hasError
		? (errorMessage || (regexError ? regexErrorMessage : undefined))
		: helperText

	const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
		// Reject any change that would leave the field holding a value that does
		// not match the pattern. An empty value is always allowed so the field
		// can be cleared. Surface a brief error hint on rejection.
		if (pattern && event.target.value !== "" && !pattern.test(event.target.value)) {
			setRegexError(true)
			if (regexErrorTimer.current) clearTimeout(regexErrorTimer.current)
			regexErrorTimer.current = setTimeout(() => setRegexError(false), 1500)
			return
		}
		setRegexError(false)
		onChange?.(event)
	}

	return (
		<Box
			className={cn(
				isFullWidth ? "w-full" : "",
				"mr-0 flex flex-col justify-start",
				isFixedHeight ? "h-20" : "")}
			style={width ? { width: `${width}px` } : {}}>
			{label && (
				<Text as="label" size="2" weight="medium" className="block mb-1">
					{label}
				</Text>
			)}

			<RadixTextField.Root
				ref={ref}
				variant={variant}
				size={size}
				radius={radius}
				placeholder={placeholder}
				type={dataType}
				// className={cn(
				// 	 "border-red-500 focus-within:border-red-500",
				// 	className
				// )}
				className={cn(
					// Base styles for consistent appearance
					"transition duration-200 ease-in-out",
					// "mb-1",
					// "focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent",
					// "hover:border-gray-300",
					// "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
					// Error styles
					// hasError && "border-red-500 focus-within:ring-red-500 focus-within:border-red-500",
					//focus:outline-none
					// hasError ? "border border-red-500 focus:outline-none  focus:border-red-500" : "focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent",
					hasError ? "border border-red-300  hover:border-red-400  " : "focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent",
					className)}
				// className="border border-amber-600"
				// className={cn(
				// // 	// Base Tailwind classes that work with Radix
				// // 	// "w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-200 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow",
				// // 	// "w-full border-red-400",
				// 	hasError && "border-red-500 focus-within:border-red-500",
				// 	className
				// )}

				{...props}
				onChange={handleChange}
				{...(hasError && { 'data-error': 'true' })}
			/>
			{/* {String(hasError)} */}

			{displayHelperText && (
				// <Text
				// 	size="1"
				// 	className={cn(
				// 		"block mt-2",
				// 		hasError ? "text-red-500" : "text-gray-600"
				// 	)}
				// >
				// 	{displayHelperText}
				// </Text>

				<Text
					size="1"
					id="autocomplete-helper"
					className={cn(
						"block mr-1 ",
						hasError ? "text-red-500 flex items-center gap-0.5" : "text-gray-600"
					)}>
					{hasError && <AlertCircle className=" inline-block h-3 w-3 mr-[0.1rem]" />}
					<span>{displayHelperText}</span>
				</Text>
			)}
		</Box>
	)
})

TextFieldBase.displayName = "TextField"

// const TextField = withTheam(TextFieldBase)

export { TextFieldBase }