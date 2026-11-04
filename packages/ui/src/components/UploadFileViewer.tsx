import type { ViewableFile } from "./FilePreviewBody"

import { useEffect, useId } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { FilePreviewActions, FilePreviewBody, useFilePreview } from "./FilePreviewBody"
import { Modal } from "./Modal"
import { formatFileSize } from "./UploadFileParts"

const ACTION_CLASS = "modal__action text-[var(--gray-11)] hover:text-[var(--gray-12)]"
const NAV_CLASS =
	"absolute top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--gray-6)] gummy-surface-strong text-[var(--gray-11)] shadow-sm transition hover:text-[var(--gray-12)] hover:border-[var(--accent-8)]"

export type UploadFileViewerProps = {
	files: ViewableFile[]
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
	const preview = useFilePreview(file)
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

	return (
		<Modal
			id={`upload-viewer-${id}`}
			open
			onOpenChange={(open) => !open && onIndexChange(null)}
			title={file.name}
			description={[file.size !== undefined ? formatFileSize(file.size) : null, count > 1 ? `${index + 1} / ${count}` : null]
				.filter(Boolean)
				.join(" · ")}
			width="min(92vw, 60rem)"
			headerActions={<FilePreviewActions file={file} preview={preview} className={ACTION_CLASS} />}
		>
			<div className="relative flex h-[70vh] items-center justify-center">
				<FilePreviewBody file={file} preview={preview} />

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
