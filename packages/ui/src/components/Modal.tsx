// import { AlertDialog } from "@radix-ui/themes"
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import * as AlertDialog from "@radix-ui/react-dialog"
import { ThemeProvider, useTheme } from "./context"
import "./Modal.css"
import { X } from "lucide-react"
import { useStord } from "./core/stord"

export interface ModalProps {
	id: string
	// context?: Context<DataContextType> 
	// trigger?: ButtonElement
	trigger?: JSX.Element
	title?: string
	description?: string
	children?: ReactNode
	width?: string
	height?: string
	maxWidth?: string
	minWidth?: string
	maxHeight?: string
	open?: boolean
	onOpenChange?: (open: boolean) => void
	hiddenTrigger?: boolean
	isHideTitleLine?: boolean // New prop to control title line visibility
}

const Modal = forwardRef<HTMLDivElement, ModalProps>(
	(
		{
			id,
			children,
			trigger,
			title,
			description,
			width,
			height,
			maxWidth,
			minWidth,
			maxHeight,
			open,
			onOpenChange,
			hiddenTrigger,
			isHideTitleLine,
		},
		ref
	) => {
		const [isOpen, setIsOpen] = useState(open ?? false)
		const currentTheme = useTheme()
		const updateFnCtxs = useStord((state) => state.updateFnCtxs)
		// const  dtCtx = useData()
		// const { updateFnCtxs } = context ? useContext(context) : {}

		useEffect(() => {
			if (open === undefined) return
			setIsOpen(open)
		}, [open])

		// const triggerElement = useMemo(() => {
		// 	if (!trigger) return null

		// 	return new ElementContext({ ...trigger }).build("button")?.create()
		// }, [trigger])

		const contentStyle = useMemo<CSSProperties | undefined>(() => {
			if (!maxWidth && !minWidth && !width && !height) return undefined

			return {
				width,
				height,
				// An explicit width must also override the max-w-lg class cap.
				maxWidth: maxWidth ?? width,
				minWidth,
			}
		}, [width, height, maxWidth, minWidth])

		const handleOpenChange = useCallback(
			(nextOpen: boolean) => {
				setIsOpen(nextOpen)
				onOpenChange?.(nextOpen)
			}, [onOpenChange])

		const handleOpenChangeRef = useRef(handleOpenChange)
		handleOpenChangeRef.current = handleOpenChange

		useEffect(() => {
			updateFnCtxs?.(id, (...args: any[]) => handleOpenChangeRef.current(...(args as [boolean])))
		}, [id, updateFnCtxs])

		// Interactions on an inspector surface (marked data-engine-devtools, e.g.
		// the studio's floating dev-tools panel) must not dismiss the dialog —
		// the whole point of the panel is to inspect state while it is open.
		const guardDevtoolsInteraction = useCallback(
			(event: { target: EventTarget | null; preventDefault: () => void }) => {
				const target = event.target as Element | null
				if (target?.closest?.("[data-engine-devtools]")) event.preventDefault()
			}, [])

		return (
			<AlertDialog.Root open={isOpen} onOpenChange={handleOpenChange}>
				{/* <AlertDialog.Root open={isOpen}>  */}

				{/* Radix's asChild Trigger throws on a missing child, so render it
				    only when a trigger exists (controlled trigger-less usage). */}
				{
					trigger && !hiddenTrigger ? (
						<AlertDialog.Trigger asChild>
							{trigger}
						</AlertDialog.Trigger>
					) : null
				}

				<AlertDialog.Portal>
					<AlertDialog.Overlay className="modal-overlay fixed inset-0 z-99999" />
					{/* The dialog surface uses Radix theme vars, which only resolve
					    inside a `.radix-themes` ancestor — at body level (portal)
					    there is none, so the panel background lives on the inner
					    ThemeProvider wrapper rather than on Content itself. */}
					<AlertDialog.Content
						ref={ref}
						style={contentStyle}
						onPointerDownOutside={guardDevtoolsInteraction}
						onInteractOutside={guardDevtoolsInteraction}
						onFocusOutside={guardDevtoolsInteraction}
						{...(description ? {} : { "aria-describedby": undefined })}
						className="modal-content fixed top-1/2 left-1/2 z-99999 mx-4 min-w-[400px] max-w-lg max-h-[90vh] transform -translate-x-1/2 -translate-y-1/2 rounded-lg shadow-lg flex flex-col"
					>

						<ThemeProvider
							theme={currentTheme.theme}
							components={{
								...currentTheme.components,
								textField: {
									size: "2",
								}
							}}
							className="flex flex-col flex-1 min-h-0 rounded-lg overflow-hidden bg-[var(--color-panel-solid)]">
							<div className={`flex items-start justify-between gap-4 flex-shrink-0 py-4 px-6 ${isHideTitleLine ? "" : "border-b border-[var(--gray-6)]"}`}>
								<div className="flex-1">
									{title && (
										<AlertDialog.Title className="text-lg font-semibold">
											{title}
										</AlertDialog.Title>
									)}
									{description && (
										<AlertDialog.Description className="mt-0.5 text-xs text-[var(--gray-11)]">
											{description}
										</AlertDialog.Description>
									)}
								</div>

								<AlertDialog.Close asChild>
									<button
										type="button"
										aria-label="Close modal"
										className="modal__action"
									// className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-700  cursor-pointer"
									>
										<X className="h-4 w-4" />
									</button>
								</AlertDialog.Close>
							</div>
							{/* {id}
							{String(isOpen)} */}
							{children && (
								<div className="px-6 py-4 overflow-y-auto flex-1 min-h-0" style={{ maxHeight: maxHeight || 'none' }}>
									{children}
								</div>
							)}
						</ThemeProvider>
					</AlertDialog.Content>
				</AlertDialog.Portal>
			</AlertDialog.Root>
		)
	}
)

Modal.displayName = "Modal"

export { Modal }