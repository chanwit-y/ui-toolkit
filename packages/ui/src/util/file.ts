import { ACCEPT_PRESETS, matchesAccept } from "./accept"

/**
 * Format of the upload value stored in the form and sent to the API:
 * - "dataUrl": full data URL string ("data:image/png;base64,....")
 * - "base64": base64-encoded bytes without the data URL prefix
 * - "bytes": raw bytes as a number array
 */
export type UploadValueFormat = "dataUrl" | "base64" | "bytes" | "api"

export type UploadFileContent = string | number[]

export const readFileAsDataUrl = (file: File): Promise<string> =>
	new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(reader.result as string)
		reader.onerror = () => reject(reader.error)
		reader.readAsDataURL(file)
	})

export const dataUrlToBase64 = (dataUrl: string): string =>
	dataUrl.substring(dataUrl.indexOf(",") + 1)

export const base64ToBytes = (base64: string): number[] => {
	const binary = atob(base64)
	const bytes = new Array<number>(binary.length)
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
	return bytes
}

export const bytesToBase64 = (bytes: number[]): string => {
	let binary = ""
	// Chunked to avoid call-stack limits of String.fromCharCode on large files
	const chunkSize = 0x8000
	for (let i = 0; i < bytes.length; i += chunkSize) {
		binary += String.fromCharCode(...bytes.slice(i, i + chunkSize))
	}
	return btoa(binary)
}

/** Converts a data URL into the requested upload value format. */
export const dataUrlToUploadContent = (
	dataUrl: string,
	format: UploadValueFormat
): UploadFileContent => {
	switch (format) {
		case "base64":
			return dataUrlToBase64(dataUrl)
		case "bytes":
			return base64ToBytes(dataUrlToBase64(dataUrl))
		default:
			return dataUrl
	}
}

const IMAGE_MIME_SIGNATURES: Array<{ prefix: string; mime: string }> = [
	{ prefix: "iVBOR", mime: "image/png" },
	{ prefix: "/9j/", mime: "image/jpeg" },
	{ prefix: "R0lGOD", mime: "image/gif" },
	{ prefix: "UklGR", mime: "image/webp" },
	{ prefix: "PHN2Zy", mime: "image/svg+xml" },
	{ prefix: "Qk", mime: "image/bmp" },
]

/** Detects the image mime type from base64 magic bytes. Defaults to PNG. */
export const sniffImageMimeFromBase64 = (base64: string): string =>
	IMAGE_MIME_SIGNATURES.find(({ prefix }) => base64.startsWith(prefix))?.mime ??
	"image/png"

/**
 * Builds a displayable image src from an upload value in any supported
 * format (data URL, remote/blob URL, raw base64, or byte array).
 */
export const toImagePreviewSrc = (
	value: UploadFileContent | undefined
): string | undefined => {
	if (!value || (Array.isArray(value) && value.length === 0)) return undefined

	if (Array.isArray(value)) {
		const base64 = bytesToBase64(value)
		return `data:${sniffImageMimeFromBase64(base64)};base64,${base64}`
	}

	if (isUrlContent(value)) return value

	// Raw base64 content
	return `data:${sniffImageMimeFromBase64(value)};base64,${value}`
}

/**
 * Whether a string upload value is a URL (data / blob / remote / root-relative)
 * rather than raw base64. Base64 may itself start with "/" (every JPEG does:
 * "/9j/…"), so a slash-led value made only of base64 characters is content.
 */
export const isUrlContent = (value: string): boolean => {
	if (/^(data:|blob:|https?:\/\/)/.test(value)) return true
	if (!value.startsWith("/")) return false
	return !(value.length > 64 && value.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value))
}

/** What a file is, for picking its icon and how the viewer shows it. */
export type FileKind =
	| "image"
	| "pdf"
	| "video"
	| "audio"
	| "spreadsheet"
	| "document"
	| "presentation"
	| "archive"
	| "text"
	| "other"

// Order matters: a .csv is a spreadsheet before it is text.
const FILE_KINDS: Exclude<FileKind, "other">[] = [
	"image", "pdf", "video", "audio", "spreadsheet", "document", "presentation", "archive", "text",
]

export const fileKind = (file: { name: string; type: string }): FileKind =>
	FILE_KINDS.find((kind) => matchesAccept(file, ACCEPT_PRESETS[kind].tokens)) ?? "other"

/** Whether the file's content can be read as plain text by the viewer. */
export const isTextFile = (file: { name: string; type: string }): boolean =>
	matchesAccept(file, ACCEPT_PRESETS.text.tokens)

type FileLike = { name: string; type: string; data: UploadFileContent }

/**
 * A src for an uploaded file in any value format: the URL itself, or a data
 * URL built from base64 / bytes with the file's own mime type.
 */
export const toFileSrc = (file: FileLike): string | undefined => {
	const { data } = file
	if (!data || (Array.isArray(data) && data.length === 0)) return undefined
	if (typeof data === "string" && isUrlContent(data)) return data
	const base64 = Array.isArray(data) ? bytesToBase64(data) : data
	return `data:${file.type || "application/octet-stream"};base64,${base64}`
}

/**
 * The file as a Blob (`type` overrides the stored mime), or `undefined` when
 * its content is a remote URL — open that directly instead.
 */
export const toFileBlob = (file: FileLike, type?: string): Blob | undefined => {
	const { data } = file
	if (!data || (Array.isArray(data) && data.length === 0)) return undefined

	let bytes: number[]
	if (Array.isArray(data)) bytes = data
	else if (data.startsWith("data:")) bytes = base64ToBytes(dataUrlToBase64(data))
	else if (isUrlContent(data)) return undefined
	else bytes = base64ToBytes(data)

	return new Blob([new Uint8Array(bytes)], { type: type ?? file.type })
}
