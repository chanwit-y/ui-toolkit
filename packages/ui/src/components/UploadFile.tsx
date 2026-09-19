import type { UploadedFile, UploadFileProps } from "./@types"
import type { ChangeEvent, DragEvent, ElementRef } from "react"

import { forwardRef, useCallback, useMemo, useRef, useState } from "react"
import { Box, Text } from "@radix-ui/themes"
import { AlertCircle, FileText, Loader2, RefreshCw, UploadCloud, X } from "lucide-react"
import { cn } from "../util/utils"
import { acceptLabel, matchesAccept, resolveAccept } from "../util/accept"
import { dataUrlToUploadContent, readFileAsDataUrl } from "../util/file"
import { uploadFileToApi, deleteFileFromApi } from "../util/uploadApi"
import { FileThumb, formatFileSize } from "./UploadFileParts"
import { UploadFileViewer } from "./UploadFileViewer"

export type UploadFileBaseProps = UploadFileProps & {
	onChange?: (value: UploadedFile[]) => void
}

type SkippedFile = { name: string; reason: string }

const formatSkipped = (skipped: SkippedFile[]): string =>
	skipped.length === 1
		? `"${skipped[0].name}" was skipped: ${skipped[0].reason}`
		: `${skipped.length} files skipped: ${skipped.map((f) => `${f.name} (${f.reason})`).join(", ")}`

/** The server-side name of a file uploaded in "api" mode, for its DELETE call. */
const serverFilename = (file: UploadedFile): string =>
	(file as UploadedFile & { _filename?: string })._filename ??
	(typeof file.data === "string" ? file.data.split("/").pop() ?? "" : "")

const ITEM_ACTION_CLASS =
	"shrink-0 rounded p-1 text-[var(--gray-10)] transition hover:bg-[var(--gray-a4)]"
const GRID_ACTION_CLASS =
	"rounded-full border border-[var(--gray-6)] bg-[var(--color-panel-solid)] p-1 text-[var(--gray-11)] shadow-sm transition"

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
	preview = true,
	previewLayout = "list",
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
	const [viewerIndex, setViewerIndex] = useState<number | null>(null)

	const isApiMode = valueFormat === "api"

	const files = useMemo(() => value ?? [], [value])
	const acceptTokens = useMemo(() => resolveAccept(accept), [accept])
	const acceptHint = useMemo(() => acceptLabel(accept), [accept])

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

	const deleteFromApi = useCallback(
		async (file: UploadedFile | undefined) => {
			const filename = file ? serverFilename(file) : ""
			if (!isApiMode || !uploadApi?.deleteUrl || !filename) return
			try {
				await deleteFileFromApi(filename, uploadApi)
			} catch {
				// Best-effort: the value is updated even if the server delete fails
			}
		},
		[isApiMode, uploadApi]
	)

	const toUploadedFile = useCallback(
		async (file: File): Promise<UploadedFile> => {
			if (isApiMode && uploadApi) {
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
			}
			return {
				name: file.name,
				size: file.size,
				type: file.type,
				data: dataUrlToUploadContent(await readFileAsDataUrl(file), valueFormat),
			}
		},
		[isApiMode, uploadApi, valueFormat]
	)

	// Invalid files are skipped one by one and reported; the valid rest still lands.
	const processFiles = useCallback(
		async (fileList: FileList | null) => {
			if (!fileList || fileList.length === 0) return

			const skipped: SkippedFile[] = []
			let incoming = (multiple ? Array.from(fileList) : [fileList[0]]).filter((file) => {
				if (!matchesAccept(file, acceptTokens)) {
					skipped.push({ name: file.name, reason: "file type not allowed" })
					return false
				}
				if (maxSizeMB && file.size > maxSizeMB * 1024 * 1024) {
					skipped.push({ name: file.name, reason: `over ${maxSizeMB} MB` })
					return false
				}
				return true
			})

			if (multiple && maxFiles) {
				const room = Math.max(0, maxFiles - files.length)
				incoming.slice(room).forEach((file) =>
					skipped.push({ name: file.name, reason: `limit of ${maxFiles} file${maxFiles > 1 ? "s" : ""}` })
				)
				incoming = incoming.slice(0, room)
			}

			if (incoming.length > 0) {
				setUploading(isApiMode && !!uploadApi)
				const results = await Promise.allSettled(incoming.map(toUploadedFile))
				setUploading(false)

				const uploaded: UploadedFile[] = []
				results.forEach((result, i) => {
					if (result.status === "fulfilled") uploaded.push(result.value)
					else
						skipped.push({
							name: incoming[i].name,
							reason: result.reason instanceof Error ? result.reason.message : "failed to read file",
						})
				})

				if (uploaded.length > 0) {
					emitChange(multiple ? [...files, ...uploaded] : uploaded)
					// Single mode replaces: the file it replaced is gone from the value.
					if (!multiple) void deleteFromApi(files[0])
				}
			}

			setInternalError(skipped.length > 0 ? formatSkipped(skipped) : null)
			onBlur?.()
		},
		[multiple, maxFiles, maxSizeMB, acceptTokens, isApiMode, uploadApi, files, toUploadedFile, deleteFromApi, emitChange, onBlur]
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
			await deleteFromApi(files[index])
			setInternalError(null)
			emitChange(files.filter((_, i) => i !== index))
			onBlur?.()
		},
		[disabled, files, deleteFromApi, emitChange, onBlur]
	)

	// Single mode swaps the dropzone for the file itself, which carries Replace.
	const showDropzone = multiple || files.length === 0

	const itemActions = (file: UploadedFile, index: number, className: string) =>
		!disabled && (
			<>
				{!multiple && (
					<button
						type="button"
						title="Replace file"
						aria-label="Replace file"
						onClick={openFileDialog}
						className={cn(className, "hover:text-[var(--accent-11)]")}
					>
						<RefreshCw className="h-4 w-4" />
					</button>
				)}
				<button
					type="button"
					title={`Remove ${file.name}`}
					aria-label={`Remove ${file.name}`}
					onClick={() => handleRemove(index)}
					className={cn(className, "hover:text-red-500")}
				>
					<X className="h-4 w-4" />
				</button>
			</>
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
				accept={acceptTokens.join(",") || undefined}
				multiple={multiple}
				className="hidden"
				disabled={disabled}
				onChange={handleInputChange}
			/>

			{uploading ? (
				<div className="flex flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-[var(--accent-8,#60a5fa)] bg-[var(--accent-a3,#eff6ff80)] px-4 py-6">
					<Loader2 className="h-7 w-7 text-[var(--accent-11,#2563eb)] animate-spin" />
					<Text size="2" className="text-[var(--accent-11,#2563eb)]">Uploading...</Text>
				</div>
			) : showDropzone && (
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
							? "cursor-not-allowed bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500"
							: "cursor-pointer text-gray-500 dark:text-gray-400 hover:border-[var(--accent-8,#60a5fa)] hover:bg-[var(--accent-a3,#eff6ff80)]",
						isDragging ? "border-[var(--accent-8,#3b82f6)] bg-[var(--accent-3,#eff6ff)]" : "border-gray-300 dark:border-gray-600",
						hasError && "border-red-300 hover:border-red-400"
					)}
				>
					<UploadCloud className="h-7 w-7" />
					<Text size="2" className="text-center">
						Click or drag {multiple ? "files" : "a file"} here to upload
					</Text>
					{(acceptHint || maxSizeMB) && (
						<Text size="1" className="text-gray-400 dark:text-gray-500 text-center">
							{[acceptHint, maxSizeMB ? `max ${maxSizeMB} MB` : null]
								.filter(Boolean)
								.join(" · ")}
						</Text>
					)}
				</div>
			)}

			{files.length > 0 && !(uploading && !multiple) && (
				preview && previewLayout === "grid" ? (
					<ul className={cn("grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2", showDropzone && "mt-2")}>
						{files.map((file, index) => (
							<li
								key={`${file.name}-${index}`}
								className="group relative overflow-hidden rounded-md border border-[var(--gray-6)] bg-[var(--gray-a2)]"
							>
								<button
									type="button"
									title={`Preview ${file.name}`}
									onClick={() => setViewerIndex(index)}
									className="block aspect-square w-full cursor-zoom-in bg-[var(--gray-a3)]"
								>
									<FileThumb file={file} iconClassName="h-9 w-9" />
								</button>
								<div className="px-2 py-1.5">
									<span className="block truncate text-xs text-[var(--gray-12)]">{file.name}</span>
									<span className="block text-[11px] text-[var(--gray-10)]">{formatFileSize(file.size)}</span>
								</div>
								<div className="absolute right-1 top-1 flex gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
									{itemActions(file, index, GRID_ACTION_CLASS)}
								</div>
							</li>
						))}
					</ul>
				) : (
					<ul className={cn("flex flex-col gap-1.5", showDropzone && "mt-2")}>
						{files.map((file, index) => (
							<li
								key={`${file.name}-${index}`}
								className="flex items-center gap-2 rounded-md border border-[var(--gray-6)] bg-[var(--gray-a2)] px-2 py-1.5"
							>
								{preview ? (
									<button
										type="button"
										title={`Preview ${file.name}`}
										onClick={() => setViewerIndex(index)}
										className="flex min-w-0 flex-1 cursor-zoom-in items-center gap-2 text-left"
									>
										<span className="h-10 w-10 shrink-0 overflow-hidden rounded bg-[var(--gray-a3)]">
											<FileThumb file={file} />
										</span>
										<span className="min-w-0 flex-1 truncate text-sm text-[var(--gray-12)]">{file.name}</span>
									</button>
								) : (
									<>
										<FileText className="ml-1 h-4 w-4 shrink-0 text-[var(--gray-10)]" />
										<span className="min-w-0 flex-1 truncate py-1 text-sm text-[var(--gray-12)]">{file.name}</span>
									</>
								)}
								<span className="shrink-0 text-xs text-[var(--gray-10)]">{formatFileSize(file.size)}</span>
								{itemActions(file, index, ITEM_ACTION_CLASS)}
							</li>
						))}
					</ul>
				)
			)}

			{preview && (
				<UploadFileViewer files={files} index={viewerIndex} onIndexChange={setViewerIndex} />
			)}

			{displayHelperText && (
				<Text
					size="1"
					className={cn(
						"block mr-1 mt-1",
						hasError ? "text-red-500 flex items-center gap-0.5" : "text-gray-600 dark:text-gray-400"
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
