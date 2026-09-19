import type { UploadedFile } from "./@types"
import type { FileKind } from "../util/file"
import type { LucideIcon } from "lucide-react"

import { useMemo } from "react"
import {
	File,
	FileArchive,
	FileAudio,
	FileImage,
	FileSpreadsheet,
	FileText,
	FileVideo,
	Presentation,
} from "lucide-react"
import { cn } from "../util/utils"
import { fileKind, toFileSrc } from "../util/file"

export const formatFileSize = (bytes: number): string => {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const KIND_ICONS: Record<FileKind, LucideIcon> = {
	image: FileImage,
	pdf: FileText,
	video: FileVideo,
	audio: FileAudio,
	spreadsheet: FileSpreadsheet,
	document: FileText,
	presentation: Presentation,
	archive: FileArchive,
	text: FileText,
	other: File,
}

export const FileKindIcon = ({ kind, className }: { kind: FileKind; className?: string }) => {
	const Icon = KIND_ICONS[kind]
	return <Icon className={className} />
}

/** An image file's own picture, or the icon of its kind. Fills its parent. */
export const FileThumb = ({ file, iconClassName }: { file: UploadedFile; iconClassName?: string }) => {
	const kind = fileKind(file)
	const src = useMemo(() => (kind === "image" ? toFileSrc(file) : undefined), [kind, file])

	if (src) return <img src={src} alt="" className="h-full w-full object-cover" />
	return (
		<span className="flex h-full w-full items-center justify-center text-[var(--gray-10)]">
			<FileKindIcon kind={kind} className={cn("h-5 w-5", iconClassName)} />
		</span>
	)
}
