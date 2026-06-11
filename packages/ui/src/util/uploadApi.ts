import type { UploadApiConfig } from "../components/@types"

/**
 * Resolves a dot-notation path on an object (e.g. "data.url" -> obj.data.url).
 */
const getByPath = (obj: any, path: string): any =>
	path.split(".").reduce((cur, key) => cur?.[key], obj)

/**
 * Uploads a single file to the configured API endpoint using FormData.
 * Returns the file URL extracted from the response via `responsePath`.
 */
export const uploadFileToApi = async (
	file: File,
	config: UploadApiConfig
): Promise<{ url: string; filename: string; originalName: string }> => {
	const formData = new FormData()
	formData.append(config.fieldName ?? "image", file)

	const res = await fetch(config.uploadUrl, {
		method: "POST",
		body: formData,
	})

	const json = await res.json().catch(() => null)

	if (!res.ok) {
		throw new Error(json?.message ?? `Upload failed (${res.status})`)
	}

	const responsePath = config.responsePath ?? "data.url"
	const url = getByPath(json, responsePath) as string

	if (!url) throw new Error("Upload response missing file URL")

	return {
		url,
		filename: json?.data?.filename ?? url.split("/").pop() ?? "",
		originalName: json?.data?.originalName ?? file.name,
	}
}

/**
 * Deletes a previously uploaded file from the server.
 */
export const deleteFileFromApi = async (
	filename: string,
	config: UploadApiConfig
): Promise<void> => {
	if (!config.deleteUrl) return

	const url = config.deleteUrl.replace(":filename", encodeURIComponent(filename))
	const res = await fetch(url, { method: "DELETE" })

	if (!res.ok) {
		const body = await res.json().catch(() => null)
		throw new Error(body?.message ?? `Delete failed (${res.status})`)
	}
}
