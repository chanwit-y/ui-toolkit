import type { UploadImageProps } from "./@types"
import type { UploadFileContent } from "../util/file"
import type { ChangeEvent, DragEvent, ElementRef } from "react"

import { forwardRef, useCallback, useMemo, useRef, useState } from "react"
import { Box, Text } from "@radix-ui/themes"
import { AlertCircle, ImagePlus, RefreshCw, Trash2 } from "lucide-react"
import { cn } from "../util/utils"
import {
	dataUrlToUploadContent,
	readFileAsDataUrl,
	toImagePreviewSrc,
} from "../util/file"

export type UploadImageBaseProps = UploadImageProps & {
	onChange?: (value: UploadFileContent) => void
}

const UploadImageBase = forwardRef<
	ElementRef<"div">,
	UploadImageBaseProps
>(({
	className,
	label,
	helperText,
	isRequired = false,
	error = false,
	errorMessage,
	accept = "image/*",
	maxSizeMB,
	shape = "square",
	previewHeight = 160,
	isFullWidth = false,
	width,
	disabled = false,
	valueFormat = "dataUrl",
	value,
	onValueChange,
	onChange,
	onBlur,
	...props
}, ref) => {
	const inputRef = useRef<HTMLInputElement | null>(null)
	const [isDragging, setIsDragging] = useState(false)
	const [internalError, setInternalError] = useState<string | null>(null)

	const previewSrc = useMemo(() => toImagePreviewSrc(value), [value])

	const hasError = useMemo(
		() => error || !!errorMessage || !!internalError,
		[error, errorMessage, internalError]
	)
	const displayHelperText = internalError ?? (hasError ? errorMessage : helperText)

	const emitChange = useCallback(
		(next: UploadFileContent) => {
			onValueChange?.(next)
			onChange?.(next)
		},
		[onValueChange, onChange]
	)

	const processFile = useCallback(
		async (file: File | undefined) => {
			if (!file) return

			if (!file.type.startsWith("image/")) {
				setInternalError("Only image files are allowed")
				return
			}
			if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
				setInternalError(`Image must be smaller than ${maxSizeMB} MB`)
				return
			}

			try {
				const dataUrl = await readFileAsDataUrl(file)
				setInternalError(null)
				emitChange(dataUrlToUploadContent(dataUrl, valueFormat))
			} catch {
				setInternalError("Failed to read image file")
			} finally {
				onBlur?.()
			}
		},
		[maxSizeMB, valueFormat, emitChange, onBlur]
	)

	const handleInputChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			void processFile(event.target.files?.[0])
			// Allow re-selecting the same file
			event.target.value = ""
		},
		[processFile]
	)

	const handleDrop = useCallback(
		(event: DragEvent<HTMLDivElement>) => {
			event.preventDefault()
			setIsDragging(false)
			if (disabled) return
			void processFile(event.dataTransfer.files?.[0])
		},
		[disabled, processFile]
	)

	const handleDragOver = useCallback(
		(event: DragEvent<HTMLDivElement>) => {
			event.preventDefault()
			if (!disabled) setIsDragging(true)
		},
		[disabled]
	)

	const openFileDialog = useCallback(() => {
		if (disabled) return
		inputRef.current?.click()
	}, [disabled])

	const handleRemove = useCallback(() => {
		if (disabled) return
		setInternalError(null)
		emitChange(valueFormat === "bytes" ? [] : "")
		onBlur?.()
	}, [disabled, valueFormat, emitChange, onBlur])

	return (
		<Box
			ref={ref}
			className={cn(
				isFullWidth ? "w-full" : "",
				"mr-0 flex flex-col justify-start",
				className
			)}
			style={width ? { width: `${width}px` } : {}}
			{...props}
		>
			{label && (
				<Text as="label" size="2" weight="medium" className="block mb-1">
					{label}
					{isRequired && <span className="text-red-500 ml-0.5">*</span>}
				</Text>
			)}

			<input
				ref={inputRef}
				type="file"
				accept={accept}
				className="hidden"
				disabled={disabled}
				onChange={handleInputChange}
			/>

			{previewSrc ? (
				<div
					className={cn(
						"relative group overflow-hidden border border-gray-200",
						shape === "circle" ? "rounded-full mx-auto" : "rounded-md w-full"
					)}
					style={
						shape === "circle"
							? { width: `${previewHeight}px`, height: `${previewHeight}px` }
							: { height: `${previewHeight}px` }
					}
				>
					<img
						src={previewSrc}
						alt={label ?? "Uploaded image"}
						className="h-full w-full object-cover"
					/>
					{!disabled && (
						<div className="absolute inset-0 hidden group-hover:flex items-center justify-center gap-2 bg-black/40">
							<button
								type="button"
								title="Replace image"
								onClick={openFileDialog}
								className="rounded-full bg-white/90 p-2 text-gray-700 hover:bg-white transition"
							>
								<RefreshCw className="h-4 w-4" />
							</button>
							<button
								type="button"
								title="Remove image"
								onClick={handleRemove}
								className="rounded-full bg-white/90 p-2 text-red-600 hover:bg-white transition"
							>
								<Trash2 className="h-4 w-4" />
							</button>
						</div>
					)}
				</div>
			) : (
				<div
					role="button"
					tabIndex={disabled ? -1 : 0}
					onClick={openFileDialog}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault()
							openFileDialog()
						}
					}}
					onDrop={handleDrop}
					onDragOver={handleDragOver}
					onDragLeave={() => setIsDragging(false)}
					className={cn(
						"flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed transition duration-200 ease-in-out",
						disabled
							? "cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400"
							: "cursor-pointer text-gray-500 hover:border-blue-400 hover:bg-blue-50/50",
						isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300",
						hasError && "border-red-300 hover:border-red-400"
					)}
					style={{ height: `${previewHeight}px` }}
				>
					<ImagePlus className="h-8 w-8" />
					<Text size="2" className="text-center">
						Click or drag an image here to upload
					</Text>
					{maxSizeMB && (
						<Text size="1" className="text-gray-400">
							Max size {maxSizeMB} MB
						</Text>
					)}
				</div>
			)}

			{displayHelperText && (
				<Text
					size="1"
					className={cn(
						"block mr-1 mt-1",
						hasError ? "text-red-500 flex items-center gap-0.5" : "text-gray-600"
					)}
				>
					{hasError && <AlertCircle className="inline-block h-3 w-3 mr-[0.1rem]" />}
					<span>{displayHelperText}</span>
				</Text>
			)}
		</Box>
	)
})

UploadImageBase.displayName = "UploadImage"

export { UploadImageBase }
