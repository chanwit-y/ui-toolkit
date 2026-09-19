import type { UploadedFile } from "./@types"

import { useEffect, useId, useState } from "react"
import { ChevronLeft, ChevronRight, Download, ExternalLink } from "lucide-react"
import { Modal } from "./Modal"
import { FileKindIcon, formatFileSize } from "./UploadFileParts"
import { fileKind, isTextFile, isUrlContent, toFileBlob } from "../util/file"

type ViewerMode = "image" | "pdf" | "video" | "audio" | "text" | "none"

/** Text previews read at most this much of the file. */
const TEXT_PREVIEW_LIMIT = 200_000

const viewerMode = (file: UploadedFile): ViewerMode => {
	const kind = fileKind(file)
	if (kind === "image" || kind === "pdf" || kind === "video" || kind === "audio") return kind
	return isTextFile(file) ? "text" : "none"
}

const isSvg = (file: UploadedFile): boolean =>
	file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")

/**
 * The mime type the viewer's blob is created with. A blob URL shares the page's
 * origin, so the stored type is never trusted: text is forced to plain text and
 * anything the viewer can't show becomes an opaque download.
 */
const blobType = (file: UploadedFile, mode: ViewerMode): string => {
	if (mode === "pdf") return "application/pdf"
	if (mode === "text") return "text/plain"
	if (mode === "none") return "application/octet-stream"
	return file.type
}

/** A URL for the file: its own remote URL, or a blob URL revoked on change / unmount. */
const useFileUrl = (file: UploadedFile | undefined, mode: ViewerMode): string | undefined => {
	const [url, setUrl] = useState<string>()

	useEffect(() => {
		if (!file) return setUrl(undefined)

		const blob = toFileBlob(file, blobType(file, mode))
		if (!blob) {
			setUrl(typeof file.data === "string" && isUrlContent(file.data) ? file.data : undefined)
			return
		}
		const objectUrl = URL.createObjectURL(blob)
		setUrl(objectUrl)
		return () => URL.revokeObjectURL(objectUrl)
	}, [file, mode])

	return url
}

const useFileText = (url: string | undefined, enabled: boolean): string | undefined => {
	const [text, setText] = useState<string>()

	useEffect(() => {
		setText(undefined)
		if (!enabled || !url) return
		let alive = true
		fetch(url)
			.then((res) => res.text())
			.then((body) => alive && setText(body.slice(0, TEXT_PREVIEW_LIMIT)))
			.catch(() => alive && setText("Unable to read this file."))
		return () => {
			alive = false
		}
	}, [url, enabled])

	return text
}

const ACTION_CLASS = "modal__action text-[var(--gray-11)] hover:text-[var(--gray-12)]"
const NAV_CLASS =
	"absolute top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--gray-6)] bg-[var(--color-panel-solid)] text-[var(--gray-11)] shadow-sm transition hover:text-[var(--gray-12)] hover:border-[var(--accent-8)]"

export type UploadFileViewerProps = {
	files: UploadedFile[]
	/** Index of the file on show; `null` closes the viewer. */
	index: number | null
	onIndexChange: (index: number | null) => void
}

/**
 * The upload's preview dialog: images, PDFs, video, audio and text are shown
 * in place, anything else offers a download. Steps through `files` with the
 * chevrons or the arrow keys.
 */
export const UploadFileViewer = ({ files, index, onIndexChange }: UploadFileViewerProps) => {
	const id = useId()
	const file = index === null ? undefined : files[index]
	const mode = file ? viewerMode(file) : "none"
	const url = useFileUrl(file, mode)
	const text = useFileText(url, mode === "text")
	const count = files.length

	useEffect(() => {
		if (index === null || count < 2) return
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "ArrowLeft") onIndexChange((index - 1 + count) % count)
			if (event.key === "ArrowRight") onIndexChange((index + 1) % count)
		}
		window.addEventListener("keydown", onKeyDown)
		return () => window.removeEventListener("keydown", onKeyDown)
	}, [index, count, onIndexChange])

	if (!file || index === null) return null

	// An SVG opened as a document runs its scripts; it is only ever shown in an <img>.
	const canOpen = mode !== "none" && !isSvg(file)

	return (
		<Modal
			id={`upload-viewer-${id}`}
			open
			onOpenChange={(open) => !open && onIndexChange(null)}
			title={file.name}
			description={[formatFileSize(file.size), count > 1 ? `${index + 1} / ${count}` : null]
				.filter(Boolean)
				.join(" · ")}
			width="min(92vw, 60rem)"
			headerActions={
				url && (
					<>
						{canOpen && (
							<a
								href={url}
								target="_blank"
								rel="noopener noreferrer"
								title="Open in new tab"
								aria-label="Open in new tab"
								className={ACTION_CLASS}
							>
								<ExternalLink className="h-4 w-4" />
							</a>
						)}
						<a
							href={url}
							download={file.name}
							title="Download"
							aria-label="Download"
							className={ACTION_CLASS}
						>
							<Download className="h-4 w-4" />
						</a>
					</>
				)
			}
		>
			<div className="relative flex h-[70vh] items-center justify-center">
				{mode === "image" && url && (
					<img src={url} alt={file.name} className="max-h-full max-w-full object-contain" />
				)}
				{mode === "pdf" && url && (
					<iframe
						src={url}
						title={file.name}
						className="h-full w-full rounded-md border border-[var(--gray-6)]"
					/>
				)}
				{mode === "video" && url && (
					<video src={url} controls className="max-h-full max-w-full rounded-md" />
				)}
				{mode === "audio" && url && <audio src={url} controls className="w-full max-w-md" />}
				{mode === "text" && (
					<pre className="h-full w-full overflow-auto rounded-md border border-[var(--gray-6)] bg-[var(--gray-a2)] p-3 text-xs text-[var(--gray-12)] whitespace-pre-wrap">
						{text ?? "Loading…"}
					</pre>
				)}
				{mode === "none" && (
					<div className="flex flex-col items-center gap-2 text-[var(--gray-11)]">
						<FileKindIcon kind={fileKind(file)} className="h-12 w-12" />
						<span className="text-sm">No preview available for this file type</span>
					</div>
				)}

				{count > 1 && (
					<>
						<button
							type="button"
							aria-label="Previous file"
							onClick={() => onIndexChange((index - 1 + count) % count)}
							className={`${NAV_CLASS} left-0`}
						>
							<ChevronLeft className="h-5 w-5" />
						</button>
						<button
							type="button"
							aria-label="Next file"
							onClick={() => onIndexChange((index + 1) % count)}
							className={`${NAV_CLASS} right-0`}
						>
							<ChevronRight className="h-5 w-5" />
						</button>
					</>
				)}
			</div>
		</Modal>
	)
}
