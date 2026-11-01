import type { ReactNode } from "react"

import { useEffect, useState } from "react"
import { Download, ExternalLink } from "lucide-react"
import { Blurhash, blurhashHold } from "./Blurhash"
import { FileKindIcon } from "./UploadFileParts"
import { fileKind, isTextFile, isUrlContent, toFileBlob, type UploadFileContent } from "../util/file"

/** What the viewers can show: an uploaded file, or a record pointing at one by URL. */
export type ViewableFile = {
	name: string
	type: string
	size?: number
	data?: UploadFileContent
	/** A URL the browser loads itself; wins over `data`. */
	url?: string
	/** An image's placeholder while it loads. */
	blurhash?: string
}

export type ViewerMode = "image" | "pdf" | "video" | "audio" | "text" | "none"

/** Text previews read at most this much of the file. */
const TEXT_PREVIEW_LIMIT = 200_000

const viewerMode = (file: ViewableFile): ViewerMode => {
	const kind = fileKind(file)
	if (kind === "image" || kind === "pdf" || kind === "video" || kind === "audio") return kind
	return isTextFile(file) ? "text" : "none"
}

const isSvg = (file: ViewableFile): boolean =>
	file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")

/**
 * The mime type the viewer's blob is created with. A blob URL shares the page's
 * origin, so the stored type is never trusted: text is forced to plain text and
 * anything the viewer can't show becomes an opaque download.
 */
const blobType = (file: ViewableFile, mode: ViewerMode): string => {
	if (mode === "pdf") return "application/pdf"
	if (mode === "text") return "text/plain"
	if (mode === "none") return "application/octet-stream"
	return file.type
}

/**
 * A URL for the file: its own remote URL, or a blob URL revoked on change /
 * unmount. Content that doesn't decode (a record's `data` isn't base64) is
 * `failed`, not a crash.
 */
const useFileUrl = (file: ViewableFile | undefined, mode: ViewerMode) => {
	const [state, setState] = useState<{ url?: string; failed?: boolean }>({})

	useEffect(() => {
		if (!file) return setState({})
		if (file.url) return setState({ url: file.url })

		let blob: Blob | undefined
		try {
			blob = toFileBlob(file, blobType(file, mode))
		} catch {
			return setState({ failed: true })
		}
		if (!blob) {
			setState({ url: typeof file.data === "string" && isUrlContent(file.data) ? file.data : undefined })
			return
		}
		const objectUrl = URL.createObjectURL(blob)
		setState({ url: objectUrl })
		return () => URL.revokeObjectURL(objectUrl)
	}, [file, mode])

	return state
}

const useFileText = (url: string | undefined, enabled: boolean, attempt: number) => {
	const [state, setState] = useState<{ text?: string; failed?: boolean }>({})

	useEffect(() => {
		setState({})
		if (!enabled || !url) return
		let alive = true
		fetch(url)
			.then((res) => {
				if (!res.ok) throw new Error(`${res.status}`)
				return res.text()
			})
			.then((body) => alive && setState({ text: body.slice(0, TEXT_PREVIEW_LIMIT) }))
			.catch(() => alive && setState({ text: "Unable to read this file.", failed: true }))
		return () => {
			alive = false
		}
	}, [url, enabled, attempt])

	return state
}

export type FilePreviewState = {
	mode: ViewerMode
	url?: string
	text?: string
	/** Whether it may open as a document: an SVG runs its scripts there, so it is only ever an `<img>`. */
	canOpen: boolean
	/** The content didn't decode, or the text didn't load. Media reports through `onLoadError`. */
	failed: boolean
}

/** How one file is shown; `attempt` re-reads a text file on a retry. */
export const useFilePreview = (file: ViewableFile | undefined, attempt = 0): FilePreviewState => {
	const mode = file ? viewerMode(file) : "none"
	const { url, failed: broken } = useFileUrl(file, mode)
	const { text, failed } = useFileText(url, mode === "text", attempt)
	return {
		mode,
		url,
		text,
		canOpen: mode !== "none" && !!file && !isSvg(file),
		failed: !!broken || !!failed,
	}
}

export type FilePreviewActionsProps = {
	file: ViewableFile
	preview: FilePreviewState
	className?: string
}

/** Open in a new tab and Download, once the file has a URL. */
export const FilePreviewActions = ({ file, preview, className }: FilePreviewActionsProps) => {
	const { url, canOpen } = preview
	if (!url) return null
	return (
		<>
			{canOpen && (
				<a
					href={url}
					target="_blank"
					rel="noopener noreferrer"
					title="Open in new tab"
					aria-label="Open in new tab"
					className={className}
				>
					<ExternalLink className="h-4 w-4" />
				</a>
			)}
			<a href={url} download={file.name} title="Download" aria-label="Download" className={className}>
				<Download className="h-4 w-4" />
			</a>
		</>
	)
}

export type FilePreviewBodyProps = {
	file: ViewableFile
	preview: FilePreviewState
	/** An image, video or audio file failed to load. A blocked `<iframe>` can't be detected. */
	onLoadError?: () => void
	/** Drawn under the "no preview" line. */
	noPreview?: ReactNode
	/** Keep an image's blurhash on show at least this long, in milliseconds. */
	blurhashDelay?: number
}

type PreviewImageProps = {
	url?: string
	alt: string
	blurhash?: string
	blurhashDelay?: number
	onLoadError?: () => void
}

/**
 * An image, faded in over its blurhash when it has one, once it is decoded and
 * `blurhashDelay` has passed: a decoded image paints at once, so the fade
 * doesn't start on an empty box. The hash covers the parent, which must be
 * positioned; a spacer gives it height under `height: "auto"`, where nothing
 * else does until the image arrives.
 */
const PreviewImage = ({ url, alt, blurhash, blurhashDelay, onLoadError }: PreviewImageProps) => {
	const hold = blurhash ? blurhashHold(blurhashDelay) : 0
	const [loaded, setLoaded] = useState(false)
	const [held, setHeld] = useState(hold > 0)
	const pending = !!blurhash && (!loaded || held)

	useEffect(() => {
		setHeld(hold > 0)
		if (hold === 0) return
		const timer = setTimeout(() => setHeld(false), hold)
		return () => clearTimeout(timer)
	}, [hold])

	return (
		<>
			{blurhash && <Blurhash hash={blurhash} className={`gummy-fp-blurhash ${pending ? "" : "is-loaded"}`} />}
			{blurhash && !loaded && <span aria-hidden className="gummy-fp-blurhash-space" />}
			{url && (
				<img
					src={url}
					alt={alt}
					decoding="async"
					onLoad={(event) => void event.currentTarget.decode().catch(() => undefined).finally(() => setLoaded(true))}
					onError={onLoadError}
					className={`gummy-fp-image relative max-h-full max-w-full object-contain ${pending ? "is-pending" : ""}`}
				/>
			)}
		</>
	)
}

/**
 * The file itself, sized by its parent: the single implementation of what each
 * kind is drawn with, shared by the upload's modal viewer and the `filepreview`
 * element, so the forced-mime and SVG rules can't drift apart.
 */
export const FilePreviewBody = ({ file, preview, onLoadError, noPreview, blurhashDelay }: FilePreviewBodyProps) => {
	const { mode, url, text } = preview
	return (
		<>
			{mode === "image" && (url || file.blurhash) && (
				<PreviewImage key={url} url={url} alt={file.name} blurhash={file.blurhash} blurhashDelay={blurhashDelay} onLoadError={onLoadError} />
			)}
			{mode === "pdf" && url && (
				<iframe src={url} title={file.name} className="h-full w-full rounded-md border border-[var(--gray-6)]" />
			)}
			{mode === "video" && url && (
				<video src={url} controls onError={onLoadError} className="max-h-full max-w-full rounded-md" />
			)}
			{mode === "audio" && url && <audio src={url} controls onError={onLoadError} className="w-full max-w-md" />}
			{mode === "text" && (
				<pre className="h-full w-full overflow-auto rounded-md border border-[var(--gray-6)] bg-[var(--gray-a2)] p-3 text-xs text-[var(--gray-12)] whitespace-pre-wrap">
					{text ?? "Loading…"}
				</pre>
			)}
			{mode === "none" && (
				<div className="flex flex-col items-center gap-2 text-center text-[var(--gray-11)]">
					<FileKindIcon kind={fileKind(file)} className="h-12 w-12" />
					<span className="text-sm">No preview available for this file type</span>
					{noPreview}
				</div>
			)}
		</>
	)
}
