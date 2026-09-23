import { forwardRef, useCallback, useEffect, useRef, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import type { DrawerAnchor } from "./@types"
import { ThemeProvider, useTheme } from "./context"
import { useStord } from "./core/stord"
import "./Modal.css"
import "./Drawer.css"

export const DEFAULT_DRAWER_SIZE: Record<DrawerAnchor, string> = {
	left: "360px",
	right: "360px",
	top: "50vh",
	bottom: "50vh",
}

export interface DrawerProps {
	/** Registered in the engine's fn registry so `CloseModal` / `OpenModal` buttons can drive it. */
	id: string
	trigger?: JSX.Element
	title?: string
	description?: string
	children?: ReactNode
	/** The edge the panel slides in from (default `right`). */
	anchor?: DrawerAnchor
	/** Width (left / right) or height (top / bottom); any CSS length. */
	size?: string
	open?: boolean
	onOpenChange?: (open: boolean) => void
	hiddenTrigger?: boolean
	/** Drop the title row (title, description, close button). */
	hideHeader?: boolean
}

/**
 * MUI's temporary drawer on Radix Dialog — the same shell as {@link Modal}
 * (portal, scrim, focus trap, Esc, `fnCtxs[id]` registration, the inner
 * ThemeProvider that carries the Radix panel vars into the portal) with the
 * content pinned to one viewport edge and slid in along that axis
 * (`Drawer.css`, keyed by `data-anchor`).
 */
const Drawer = forwardRef<HTMLDivElement, DrawerProps>(
	(
		{
			id,
			trigger,
			title,
			description,
			children,
			anchor = "right",
			size,
			open,
			onOpenChange,
			hiddenTrigger,
			hideHeader,
		},
		ref,
	) => {
		const [isOpen, setIsOpen] = useState(open ?? false)
		const currentTheme = useTheme()
		const updateFnCtxs = useStord((state) => state.updateFnCtxs)

		useEffect(() => {
			if (open === undefined) return
			setIsOpen(open)
		}, [open])

		const handleOpenChange = useCallback(
			(nextOpen: boolean) => {
				setIsOpen(nextOpen)
				onOpenChange?.(nextOpen)
			},
			[onOpenChange],
		)
		const handleOpenChangeRef = useRef(handleOpenChange)
		handleOpenChangeRef.current = handleOpenChange

		useEffect(() => {
			updateFnCtxs?.(id, (...args: any[]) => handleOpenChangeRef.current(...(args as [boolean])))
		}, [id, updateFnCtxs])

		// Same guard as Modal: an inspector surface must not dismiss the drawer.
		const guardDevtoolsInteraction = useCallback(
			(event: { target: EventTarget | null; preventDefault: () => void }) => {
				const target = event.target as Element | null
				if (target?.closest?.("[data-engine-devtools]")) event.preventDefault()
			},
			[],
		)

		const horizontal = anchor === "left" || anchor === "right"
		// The one genuinely dynamic value: the config size on the anchor axis.
		const sizeStyle: CSSProperties = horizontal
			? { width: size ?? DEFAULT_DRAWER_SIZE[anchor] }
			: { height: size ?? DEFAULT_DRAWER_SIZE[anchor] }

		return (
			<Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
				{trigger && !hiddenTrigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
				<Dialog.Portal>
					<Dialog.Overlay className="modal-overlay fixed inset-0 z-99999" />
					<Dialog.Content
						ref={ref}
						data-anchor={anchor}
						style={sizeStyle}
						onPointerDownOutside={guardDevtoolsInteraction}
						onInteractOutside={guardDevtoolsInteraction}
						onFocusOutside={guardDevtoolsInteraction}
						{...(description ? {} : { "aria-describedby": undefined })}
						className="drawer-content"
					>
						<ThemeProvider
							theme={currentTheme.theme}
							components={{ ...currentTheme.components, textField: { size: "2" } }}
							className="flex flex-col flex-1 min-h-0 overflow-hidden bg-[var(--color-panel-solid)]"
						>
							{hideHeader ? (
								// Radix wants a title for the dialog's accessible name even when none is drawn.
								<Dialog.Title className="sr-only">{title || "Drawer"}</Dialog.Title>
							) : (
								<div className="flex items-start justify-between gap-4 flex-shrink-0 py-4 px-6 border-b border-[var(--gray-6)]">
									<div className="flex-1 min-w-0">
										<Dialog.Title className="text-lg font-semibold">{title || <span className="sr-only">Drawer</span>}</Dialog.Title>
										{description && (
											<Dialog.Description className="mt-0.5 text-xs text-[var(--gray-11)]">{description}</Dialog.Description>
										)}
									</div>
									<Dialog.Close asChild>
										<button type="button" aria-label="Close drawer" className="modal__action">
											<X className="h-4 w-4" />
										</button>
									</Dialog.Close>
								</div>
							)}
							{children && <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0">{children}</div>}
						</ThemeProvider>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		)
	},
)

Drawer.displayName = "Drawer"

export { Drawer }
