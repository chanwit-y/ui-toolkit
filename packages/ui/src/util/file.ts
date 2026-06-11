/**
 * Format of the upload value stored in the form and sent to the API:
 * - "dataUrl": full data URL string ("data:image/png;base64,....")
 * - "base64": base64-encoded bytes without the data URL prefix
 * - "bytes": raw bytes as a number array
 */
export type UploadValueFormat = "dataUrl" | "base64" | "bytes"

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

	if (/^(data:|blob:|https?:\/\/|\/)/.test(value)) return value

	// Raw base64 content
	return `data:${sniffImageMimeFromBase64(value)};base64,${value}`
}
