/**
 * Named groups of file types for an upload's `accept`. Each expands to the
 * extensions + mime types of that group, so one list drives both the native
 * `<input accept>` filter and the JS check on pick / drop (where `file.type`
 * can be empty, hence the extensions next to the mime wildcards).
 */
export type AcceptPreset =
	| "image"
	| "pdf"
	| "document"
	| "spreadsheet"
	| "presentation"
	| "text"
	| "archive"
	| "audio"
	| "video"

/** A preset name or a raw token: ".dwg", "image/png", "video/*". */
export type AcceptToken = AcceptPreset | (string & {})

/** Comma list ("image,.dwg") or token array (["image", ".dwg"]). */
export type AcceptConfig = string | AcceptToken[]

export const ACCEPT_PRESETS: Record<AcceptPreset, { label: string; tokens: string[] }> = {
	image: {
		label: "Images",
		tokens: ["image/*", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".avif", ".heic"],
	},
	pdf: {
		label: "PDF",
		tokens: ["application/pdf", ".pdf"],
	},
	document: {
		label: "Documents",
		tokens: [
			"application/msword",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			"application/vnd.oasis.opendocument.text",
			"application/rtf",
			".doc", ".docx", ".odt", ".rtf",
		],
	},
	spreadsheet: {
		label: "Spreadsheets",
		tokens: [
			"application/vnd.ms-excel",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			"application/vnd.oasis.opendocument.spreadsheet",
			"text/csv",
			".xls", ".xlsx", ".ods", ".csv",
		],
	},
	presentation: {
		label: "Presentations",
		tokens: [
			"application/vnd.ms-powerpoint",
			"application/vnd.openxmlformats-officedocument.presentationml.presentation",
			"application/vnd.oasis.opendocument.presentation",
			".ppt", ".pptx", ".odp",
		],
	},
	text: {
		label: "Text",
		tokens: ["text/*", "application/json", "application/xml", ".txt", ".md", ".csv", ".json", ".xml", ".log", ".yaml", ".yml"],
	},
	archive: {
		label: "Archives",
		tokens: [
			"application/zip",
			"application/x-zip-compressed",
			"application/x-7z-compressed",
			"application/x-rar-compressed",
			"application/vnd.rar",
			"application/gzip",
			"application/x-tar",
			".zip", ".7z", ".rar", ".gz", ".tar", ".tgz",
		],
	},
	audio: {
		label: "Audio",
		tokens: ["audio/*", ".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac"],
	},
	video: {
		label: "Video",
		tokens: ["video/*", ".mp4", ".webm", ".mov", ".mkv", ".avi", ".m4v"],
	},
}

const isPreset = (token: string): token is AcceptPreset => token in ACCEPT_PRESETS

const splitAccept = (accept: AcceptConfig | undefined): string[] =>
	(Array.isArray(accept) ? accept : (accept ?? "").split(","))
		.map((token) => token.trim())
		.filter(Boolean)

/**
 * Expands an `accept` config to raw tokens (extensions + mime types), presets
 * resolved and duplicates dropped. A bare word that is not a preset is taken
 * as an extension ("docx" → ".docx"). Empty ⇒ every file is accepted.
 */
export const resolveAccept = (accept: AcceptConfig | undefined): string[] => {
	const tokens = splitAccept(accept).flatMap((token) => {
		if (isPreset(token)) return ACCEPT_PRESETS[token].tokens
		if (token.startsWith(".") || token.includes("/")) return [token]
		return [`.${token}`]
	})
	return Array.from(new Set(tokens))
}

/** Whether a file passes the resolved tokens of `resolveAccept`. */
export const matchesAccept = (
	file: { name: string; type: string },
	tokens: string[]
): boolean => {
	if (tokens.length === 0) return true
	const name = file.name.toLowerCase()
	const type = file.type.toLowerCase()
	return tokens.some((raw) => {
		const token = raw.toLowerCase()
		if (token.startsWith(".")) return name.endsWith(token)
		if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1))
		return type === token
	})
}

/** Human label for the dropzone hint: "Images, PDF, .dwg". */
export const acceptLabel = (accept: AcceptConfig | undefined): string =>
	splitAccept(accept)
		.map((token) => (isPreset(token) ? ACCEPT_PRESETS[token].label : token))
		.join(", ")
