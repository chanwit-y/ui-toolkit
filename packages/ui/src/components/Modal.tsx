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
	// description?: string
	children?: ReactNode
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
			if (!maxWidth && !minWidth) return undefined

			return {
				maxWidth,
				minWidth,
			}
		}, [maxWidth, minWidth])

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

		return (
			<AlertDialog.Root open={isOpen} onOpenChange={handleOpenChange}>
				{/* <AlertDialog.Root open={isOpen}>  */}

				{
					hiddenTrigger && trigger ? null : (
						<AlertDialog.Trigger asChild>
							{trigger}
							{/* {triggerElement} */}
							{/* <button  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
								Open Dialog
							</button> */}
						</AlertDialog.Trigger>
					)
				}

				<AlertDialog.Portal>
					<AlertDialog.Overlay className="modal-overlay fixed inset-0 z-99999" />
					<AlertDialog.Content
						ref={ref}
						style={contentStyle}
						className="modal-content fixed top-1/2 left-1/2 z-99999 mx-4 min-w-[400px] max-w-lg transform -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white shadow-lg pb-6"
					>

						<ThemeProvider
							theme={currentTheme.theme}
							components={{
								...currentTheme.components,
								textField: {
									size: "2",
								}
							}}
							className="flex flex-col">
							<div className={`flex items-start justify-between gap-4 sticky top-0 bg-white py-4 px-6 ${isHideTitleLine ? "" : "border-b border-gray-200"}`}							>
								<div className="flex-1">
									{title && (
										<AlertDialog.Title className="text-lg font-semibold">
											{title}
										</AlertDialog.Title>
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
								<div className="px-6 overflow-y-auto" style={{ maxHeight }}>
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