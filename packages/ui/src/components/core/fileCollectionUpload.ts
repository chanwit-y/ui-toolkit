import type { AcceptConfig } from "../../util/accept";
import { matchesAccept, resolveAccept } from "../../util/accept";
import { fileKind } from "../../util/file";

/*
 * The pure half of the file collection's upload (spec §11): which dropped /
 * picked files are sent, what each request carries, how a batch runs and how
 * the skipped ones are reported. `FileCollection.tsx` wires it to the slot.
 */

/** Requests in flight at once for one drop / pick. */
export const UPLOAD_CONCURRENCY = 3;
/** The New-menu entry's defaults. */
export const DEFAULT_UPLOAD_LABEL = "Upload files…";
export const DEFAULT_UPLOAD_ICON = "upload";

export type UploadRules = { accept?: AcceptConfig; maxSizeMB?: number; maxFiles?: number };
export type UploadRejectReason = "type" | "size" | "count" | "empty" | "folder";
export type UploadRejection = { file: File; reason: UploadRejectReason };
export type UploadTarget = { collectionId: string; parentId: string | null };
/** A ghost row: a file being uploaded into `parentId` of `collectionId`. */
export type PendingUpload = UploadTarget & { key: string; name: string; kind: string };

/** The `kind` sent with a file: the engine's preset name (the backend maps or ignores it). */
export const uploadKind = (file: { name: string; type: string }): string => fileKind(file);

/**
 * Splits a batch into the files to send and the ones to skip, in the drop's
 * order: OS folder entries, zero-byte files, a type outside `accept`, a size
 * over `maxSizeMB`, then everything past `maxFiles`. The rest still lands.
 */
export function partitionDrop(files: File[], rules: UploadRules, folders: File[] = []): { accepted: File[]; rejected: UploadRejection[] } {
	const tokens = resolveAccept(rules.accept);
	const maxBytes = rules.maxSizeMB && rules.maxSizeMB > 0 ? rules.maxSizeMB * 1024 * 1024 : Infinity;
	const maxFiles = rules.maxFiles && rules.maxFiles > 0 ? rules.maxFiles : Infinity;
	const accepted: File[] = [];
	const rejected: UploadRejection[] = folders.map((file) => ({ file, reason: "folder" as const }));
	for (const file of files) {
		if (file.size === 0) rejected.push({ file, reason: "empty" });
		else if (!matchesAccept(file, tokens)) rejected.push({ file, reason: "type" });
		else if (file.size > maxBytes) rejected.push({ file, reason: "size" });
		else if (accepted.length >= maxFiles) rejected.push({ file, reason: "count" });
		else accepted.push(file);
	}
	return { accepted, rejected };
}

/** Whether a native drag carries OS files (not text, not a dnd-kit row). */
export function hasFiles(dt: DataTransfer | null | undefined): boolean {
	if (!dt) return false;
	return Array.from(dt.types ?? []).includes("Files");
}

/**
 * The files of a drop, with the entries that are OS folders set apart
 * (`webkitGetAsEntry` where the browser has it; a folder otherwise arrives as
 * a zero-byte file and is skipped as empty). Not walked: v1 uploads files.
 */
export function filesFromDataTransfer(dt: DataTransfer): { files: File[]; folders: File[] } {
	const files: File[] = [];
	const folders: File[] = [];
	const items = dt.items ? Array.from(dt.items) : [];
	if (items.length > 0 && items.some((item) => item.kind === "file")) {
		for (const item of items) {
			if (item.kind !== "file") continue;
			const file = item.getAsFile();
			if (!file) continue;
			const entry = (item as DataTransferItem & { webkitGetAsEntry?: () => { isDirectory?: boolean } | null }).webkitGetAsEntry?.();
			if (entry?.isDirectory) folders.push(file);
			else files.push(file);
		}
		return { files, folders };
	}
	return { files: Array.from(dt.files ?? []), folders };
}

/**
 * The multipart body of one upload: `file`, `collectionId`, `parentId`
 * (omitted at the root — a `FormData` can't carry `null`), `name`, `kind`,
 * then the slot's resolved `extraBody` values as strings.
 */
export function uploadFormData(file: File, target: UploadTarget, extra: Record<string, unknown> = {}): FormData {
	const body = new FormData();
	body.append("file", file, file.name);
	body.append("collectionId", target.collectionId);
	if (target.parentId != null) body.append("parentId", target.parentId);
	body.append("name", file.name);
	body.append("kind", uploadKind(file));
	for (const [key, value] of Object.entries(extra)) {
		if (value === undefined || value === null) continue;
		body.append(key, typeof value === "string" ? value : JSON.stringify(value));
	}
	return body;
}

/** What a `:param` of the upload endpoint may read (the target, like `createItem`'s subject). */
export function uploadSubject(file: { name: string; type: string }, target: UploadTarget): Record<string, unknown> {
	return { collectionId: target.collectionId, parentId: target.parentId, id: target.parentId, name: file.name, kind: uploadKind(file) };
}

const reasonText = (reason: UploadRejectReason, rules: UploadRules): string => {
	switch (reason) {
		case "type":
			return "file type not allowed";
		case "size":
			return `over ${rules.maxSizeMB} MB`;
		case "count":
			return `limit of ${rules.maxFiles} file${rules.maxFiles === 1 ? "" : "s"}`;
		case "empty":
			return "empty file";
		case "folder":
			return "folders can't be uploaded";
	}
};

/** One line naming every skipped file and why, the upload component's wording. */
export function rejectionMessage(rejected: UploadRejection[], rules: UploadRules): string {
	if (rejected.length === 1) return `"${rejected[0].file.name}" was skipped: ${reasonText(rejected[0].reason, rules)}`;
	return `${rejected.length} files skipped: ${rejected.map((r) => `${r.file.name} (${reasonText(r.reason, rules)})`).join(", ")}`;
}

/** One line naming every file whose request failed. */
export function failureMessage(failed: { name: string; error: unknown }[]): string {
	const text = (error: unknown) => (error instanceof Error ? error.message : "upload failed");
	if (failed.length === 1) return `"${failed[0].name}" failed: ${text(failed[0].error)}`;
	return `${failed.length} files failed: ${failed.map((f) => `${f.name} (${text(f.error)})`).join(", ")}`;
}

/** `Promise.allSettled` over `tasks`, at most `limit` running at once, results in task order. */
export async function runWithConcurrency<T>(tasks: Array<() => Promise<T>>, limit = UPLOAD_CONCURRENCY): Promise<PromiseSettledResult<T>[]> {
	const results: PromiseSettledResult<T>[] = new Array(tasks.length);
	let next = 0;
	const worker = async () => {
		while (next < tasks.length) {
			const index = next++;
			try {
				results[index] = { status: "fulfilled", value: await tasks[index]() };
			} catch (reason) {
				results[index] = { status: "rejected", reason };
			}
		}
	};
	await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, tasks.length)) }, worker));
	return results;
}
