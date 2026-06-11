import type { UploadedFile, UploadFileProps } from "./@types"
import type { ChangeEvent, DragEvent, ElementRef } from "react"

import { forwardRef, useCallback, useMemo, useRef, useState } from "react"
import { Box, Text } from "@radix-ui/themes"
import { AlertCircle, FileText, Loader2, UploadCloud, X } from "lucide-react"
import { cn } from "../util/utils"
import { dataUrlToUploadContent, readFileAsDataUrl } from "../util/file"
import { uploadFileToApi, deleteFileFromApi } from "../util/uploadApi"

export type UploadFileBaseProps = UploadFileProps & {
	onChange?: (value: UploadedFile[]) => void
}

const formatFileSize = (bytes: number): string => {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const UploadFileBase = forwardRef<
	ElementRef<"div">,
	UploadFileBaseProps
>(({
	className,
	label,
	helperText,
	isRequired = false,
	error = false,
	errorMessage,
	accept,
	multiple = false,
	maxFiles,
	maxSizeMB,
	isFullWidth = false,
	width,
	disabled = false,
	valueFormat = "dataUrl",
	uploadApi,
	value,
	onValueChange,
	onChange,
	onBlur,
	...props
}, ref) => {
	const inputRef = useRef<HTMLInputElement | null>(null)
	const [isDragging, setIsDragging] = useState(false)
	const [internalError, setInternalError] = useState<string | null>(null)
	const [uploading, setUploading] = useState(false)

	const isApiMode = valueFormat === "api"

	const files = useMemo(() => value ?? [], [value])

	const hasError = useMemo(
		() => error || !!errorMessage || !!internalError,
		[error, errorMessage, internalError]
	)
	const displayHelperText = internalError ?? (hasError ? errorMessage : helperText)

	const emitChange = useCallback(
		(next: UploadedFile[]) => {
			onValueChange?.(next)
			onChange?.(next)
		},
		[onValueChange, onChange]
	)

	const processFiles = useCallback(
		async (fileList: FileList | null) => {
			if (!fileList || fileList.length === 0) return

			const incoming = multiple ? Array.from(fileList) : [fileList[0]]

			if (maxSizeMB) {
				const tooBig = incoming.find((f) => f.size > maxSizeMB * 1024 * 1024)
				if (tooBig) {
					setInternalError(`"${tooBig.name}" exceeds the ${maxSizeMB} MB limit`)
					return
				}
			}

			if (multiple && maxFiles && files.length + incoming.length > maxFiles) {
				setInternalError(`You can upload up to ${maxFiles} file${maxFiles > 1 ? "s" : ""}`)
				return
			}

			try {
				if (isApiMode && uploadApi) {
					setUploading(true)
					const uploaded: UploadedFile[] = await Promise.all(
						incoming.map(async (file) => {
							const result = await uploadFileToApi(file, {
								...uploadApi,
								fieldName: uploadApi.fieldName ?? "file",
							})
							return {
								name: result.originalName,
								size: file.size,
								type: file.type,
								data: result.url,
								_filename: result.filename,
							} as UploadedFile
						})
					)
					setInternalError(null)
					emitChange(multiple ? [...files, ...uploaded] : uploaded)
				} else {
					const uploaded: UploadedFile[] = await Promise.all(
						incoming.map(async (file) => ({
							name: file.name,
							size: file.size,
							type: file.type,
							data: dataUrlToUploadContent(
								await readFileAsDataUrl(file),
								valueFormat
							),
						}))
					)
					setInternalError(null)
					emitChange(multiple ? [...files, ...uploaded] : uploaded)
				}
			} catch (err) {
				setInternalError(
					err instanceof Error ? err.message : "Failed to read file"
				)
			} finally {
				setUploading(false)
				onBlur?.()
			}
		},
		[multiple, maxFiles, maxSizeMB, valueFormat, isApiMode, uploadApi, files, emitChange, onBlur]
	)

	const handleInputChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			void processFiles(event.target.files)
			// Allow re-selecting the same file
			event.target.value = ""
		},
		[processFiles]
	)

	const handleDrop = useCallback(
		(event: DragEvent<HTMLDivElement>) => {
			event.preventDefault()
			setIsDragging(false)
			if (disabled) return
			void processFiles(event.dataTransfer.files)
		},
		[disabled, processFiles]
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

	const handleRemove = useCallback(
		async (index: number) => {
			if (disabled) return

			const file = files[index]
			if (isApiMode && uploadApi?.deleteUrl && file) {
				const filename = (file as any)._filename ?? (typeof file.data === "string" ? file.data.split("/").pop() : "")
				if (filename) {
					try {
						await deleteFileFromApi(filename, uploadApi)
					} catch {
						// Best-effort: still remove from the list
					}
				}
			}

			setInternalError(null)
			emitChange(files.filter((_, i) => i !== index))
			onBlur?.()
		},
		[disabled, files, isApiMode, uploadApi, emitChange, onBlur]
	)

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
				multiple={multiple}
				className="hidden"
				disabled={disabled}
				onChange={handleInputChange}
			/>

			{uploading ? (
				<div className="flex flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-blue-400 bg-blue-50/50 px-4 py-6">
					<Loader2 className="h-7 w-7 text-blue-500 animate-spin" />
					<Text size="2" className="text-blue-600">Uploading...</Text>
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
						"flex flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed px-4 py-6 transition duration-200 ease-in-out",
						disabled
							? "cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400"
							: "cursor-pointer text-gray-500 hover:border-blue-400 hover:bg-blue-50/50",
						isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300",
						hasError && "border-red-300 hover:border-red-400"
					)}
				>
					<UploadCloud className="h-7 w-7" />
					<Text size="2" className="text-center">
						Click or drag {multiple ? "files" : "a file"} here to upload
					</Text>
					{(accept || maxSizeMB) && (
						<Text size="1" className="text-gray-400 text-center">
							{[accept, maxSizeMB ? `max ${maxSizeMB} MB` : null]
								.filter(Boolean)
								.join(" · ")}
						</Text>
					)}
				</div>
			)}

			{files.length > 0 && (
				<ul className="mt-2 flex flex-col gap-1.5">
					{files.map((file, index) => (
						<li
							key={`${file.name}-${index}`}
							className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
						>
							<FileText className="h-4 w-4 shrink-0 text-gray-500" />
							<span className="min-w-0 flex-1 truncate text-sm text-gray-700">
								{file.name}
							</span>
							<span className="shrink-0 text-xs text-gray-400">
								{formatFileSize(file.size)}
							</span>
							{!disabled && (
								<button
									type="button"
									title={`Remove ${file.name}`}
									onClick={(e) => {
										e.stopPropagation()
										handleRemove(index)
									}}
									className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-red-500 transition"
								>
									<X className="h-4 w-4" />
								</button>
							)}
						</li>
					))}
				</ul>
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

UploadFileBase.displayName = "UploadFile"

export { UploadFileBase }
