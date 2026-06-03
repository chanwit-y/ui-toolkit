import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	type ForwardedRef,
	type MutableRefObject,
	type RefObject,
} from "react"
import {
	DROPDOWN_VIEWPORT_MARGIN,
	ESTIMATED_DROPDOWN_HEIGHT,
} from "./constants"
import type { DateTimePickerBaseProps, DropdownPlacement } from "./types"

export const useValidationMessage = ({
	error,
	errorMessage,
	helperText,
	value,
}: Pick<
	DateTimePickerBaseProps,
	"error" | "errorMessage" | "helperText" | "value"
>) => {
	const hasError = !!(error || errorMessage) && !(value ?? "").trim()

	return {
		hasError,
		displayHelperText: hasError ? errorMessage : helperText,
	}
}

export const useForwardedButtonRef = (ref: ForwardedRef<HTMLButtonElement>) => {
	const triggerRef = useRef<HTMLButtonElement | null>(null)

	const setTriggerRef = useCallback(
		(node: HTMLButtonElement | null) => {
			triggerRef.current = node
			if (typeof ref === "function") {
				ref(node)
			} else if (ref) {
				;(ref as MutableRefObject<HTMLButtonElement | null>).current = node
			}
		},
		[ref]
	)

	return { triggerRef, setTriggerRef }
}

export const useOutsideClick = (
	isEnabled: boolean,
	triggerRef: RefObject<HTMLButtonElement>,
	dropdownRef: RefObject<HTMLDivElement>,
	onOutsideClick: () => void
) => {
	useEffect(() => {
		if (!isEnabled) return undefined
		const isOutside = (target: Node | null) => {
			if (!target) return false
			const trigger = triggerRef.current
			const dropdown = dropdownRef.current
			const insideTrigger = !!trigger && trigger.contains(target)
			const insideDropdown = !!dropdown && dropdown.contains(target)
			return !insideTrigger && !insideDropdown
		}

		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target as Node | null
			if (isOutside(target)) {
				onOutsideClick()
			}
		}

		const handleFocusIn = (event: FocusEvent) => {
			const target = event.target as Node | null
			if (isOutside(target)) {
				onOutsideClick()
			}
		}

		document.addEventListener("pointerdown", handlePointerDown)
		document.addEventListener("focusin", handleFocusIn)
		return () => {
			document.removeEventListener("pointerdown", handlePointerDown)
			document.removeEventListener("focusin", handleFocusIn)
		}
	}, [isEnabled, triggerRef, dropdownRef, onOutsideClick])
}

type TriggerRect = {
	top: number
	bottom: number
	left: number
	width: number
}

export const useDropdownPlacement = (
	isOpen: boolean,
	triggerRef: RefObject<HTMLButtonElement>,
	dropdownRef: RefObject<HTMLDivElement>
) => {
	const [placement, setPlacement] = useState<DropdownPlacement>("bottom")

	const resetPlacement = useCallback(() => {
		setPlacement("bottom")
	}, [])

	const updatePlacement = useCallback(() => {
		const trigger = triggerRef.current
		if (!trigger) return
		const rect = trigger.getBoundingClientRect()
		const dropdownHeight =
			dropdownRef.current?.offsetHeight ?? ESTIMATED_DROPDOWN_HEIGHT

		const modalContent = trigger.closest(".modal-content") as HTMLElement | null
		const boundaryTop = modalContent
			? modalContent.getBoundingClientRect().top
			: 0
		const boundaryBottom = modalContent
			? modalContent.getBoundingClientRect().bottom
			: window.innerHeight

		const spaceBelow = boundaryBottom - rect.bottom - DROPDOWN_VIEWPORT_MARGIN
		const spaceAbove = rect.top - boundaryTop - DROPDOWN_VIEWPORT_MARGIN
		const needed = dropdownHeight + DROPDOWN_VIEWPORT_MARGIN

		setPlacement(
			spaceBelow < needed && spaceAbove > spaceBelow ? "top" : "bottom"
		)
	}, [triggerRef, dropdownRef])

	useLayoutEffect(() => {
		if (!isOpen) return undefined
		updatePlacement()
		const raf = window.requestAnimationFrame(updatePlacement)

		const handleReposition = () => updatePlacement()
		window.addEventListener("resize", handleReposition)
		window.addEventListener("scroll", handleReposition, true)

		return () => {
			window.cancelAnimationFrame(raf)
			window.removeEventListener("resize", handleReposition)
			window.removeEventListener("scroll", handleReposition, true)
		}
	}, [isOpen, updatePlacement])

	return { placement, resetPlacement }
}
