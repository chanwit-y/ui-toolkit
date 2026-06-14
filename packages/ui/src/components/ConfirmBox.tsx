import * as AlertDialog from "@radix-ui/react-dialog"
import type { ThemeProps } from "@radix-ui/themes"
import { CSSProperties, forwardRef, useMemo } from "react"
import type { ModalProps } from "./Modal"
import { Modal } from "./Modal"
import { useTheme } from "./context"

export interface ConfirmBoxProps
	extends Omit<ModalProps, "children" | "title"> {
	title: string
	description: string
	onConfirm: (isConfirm: boolean) => void
}

const ConfirmBox = forwardRef<HTMLDivElement, ConfirmBoxProps>(
	(
		{
			title,
			description,
			hiddenTrigger = true,
			onConfirm,
			...modalProps
		},
		ref
	) => {
		const theme = useTheme()

		const buttonColor = useMemo(() => (theme.components.button?.color as ThemeProps["accentColor"]) || "blue", [])

		const confirmButtonStyle = useMemo<CSSProperties>(() => {
			return {
				"--confirm-bg": `var(--${buttonColor}-9)`,
				"--confirm-bg-hover": `var(--${buttonColor}-10)`,
				"--confirm-ring": `var(--${buttonColor}-8)`,
			} as CSSProperties
		}, [buttonColor])

		return (
			<Modal
				{...modalProps}
				ref={ref}
				hiddenTrigger={hiddenTrigger}
			>
				<div className="flex flex-col gap-2 text-left">
					{title && (
						<h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
					)}
					{description && (
						<p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
					)}
					<div className="mt-6 flex justify-end gap-2">
						<AlertDialog.Close asChild>
							<button
								type="button"
								onClick={() => onConfirm(false)}
								className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
							>
								Close
							</button>
						</AlertDialog.Close>
						<AlertDialog.Close asChild>
							<button
								type="button"
								onClick={() => onConfirm(true)}
								style={confirmButtonStyle}
								className="inline-flex items-center justify-center rounded-md bg-[var(--confirm-bg)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--confirm-bg-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--confirm-ring)] focus-visible:ring-offset-2"
							>
								Confirm
							</button>
						</AlertDialog.Close>
					</div>
				</div>
			</Modal>
		)
	}
)

ConfirmBox.displayName = "ConfirmBox"

export { ConfirmBox }

