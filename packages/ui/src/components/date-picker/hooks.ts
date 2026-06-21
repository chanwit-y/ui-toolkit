import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	type CSSProperties,
	type ForwardedRef,
	type MutableRefObject,
	type RefObject,
} from "react"
import {
	DEFAULT_DROPDOWN_WIDTH,
	DROPDOWN_TRIGGER_GAP,
	DROPDOWN_VIEWPORT_MARGIN,
	ESTIMATED_DROPDOWN_HEIGHT,
} from "./constants"
import type { DatePickerBaseProps } from "./types"

export const useValidationMessage = ({
	isRequired,
	error,
	errorMessage,
	helperText,
	value,
}: Pick<
	DatePickerBaseProps,
	"isRequired" | "error" | "errorMessage" | "helperText" | "value"
>) => {
	const [errorValueSnapshot, setErrorValueSnapshot] = useState<
		string | undefined
	>(undefined)
	const normalizedValue = value?.trim() ?? ""
	const hasMissingRequiredValue = !!isRequired && normalizedValue === ""
	const hasValue = normalizedValue !== ""

	useEffect(() => {
		if (error || errorMessage) {
			setErrorValueSnapshot(normalizedValue)
		} else {
			setErrorValueSnapshot(undefined)
		}
		// Intentionally exclude `value` so the snapshot is only taken when the
		// error state transitions, not on every value change.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [error, errorMessage])

	const isRequiredValidationError = !!errorMessage && /required/i.test(errorMessage)
	const shouldRespectErrorSnapshot = hasValue
	const hasExternalError = !!(error || errorMessage) &&
		(!hasValue || !isRequiredValidationError) &&
		(
			!shouldRespectErrorSnapshot ||
			errorValueSnapshot === undefined ||
			normalizedValue === errorValueSnapshot
		)
	const hasError = hasMissingRequiredValue || hasExternalError

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

export const useDropdownPlacement = (
	isOpen: boolean,
	triggerRef: RefObject<HTMLButtonElement>,
	dropdownRef: RefObject<HTMLDivElement>
) => {
	const [dropdownStyles, setDropdownStyles] = useState<CSSProperties>({})

	const resetDropdownStyles = useCallback(() => {
		setDropdownStyles({})
	}, [])

	const updatePlacement = useCallback(() => {
		const trigger = triggerRef.current
		if (!trigger) return
		const rect = trigger.getBoundingClientRect()
		const dropdownHeight =
			dropdownRef.current?.offsetHeight ?? ESTIMATED_DROPDOWN_HEIGHT
		const dropdownWidth =
			dropdownRef.current?.offsetWidth ?? DEFAULT_DROPDOWN_WIDTH

		// The dropdown is portaled to document.body, so `position: fixed`
		// resolves against the viewport and the trigger's viewport-relative
		// rect can be used directly — no containing-block correction needed.
		const margin = DROPDOWN_VIEWPORT_MARGIN
		const triggerGap = DROPDOWN_TRIGGER_GAP
		const spaceBelow = window.innerHeight - rect.bottom - triggerGap - margin
		const spaceAbove = rect.top - triggerGap - margin
		const needed = dropdownHeight + triggerGap + margin
		const showAbove = spaceBelow < needed && spaceAbove > spaceBelow

		const left = Math.max(
			margin,
			Math.min(rect.left, window.innerWidth - dropdownWidth - margin),
		)

		const styles: CSSProperties = {
			position: "fixed",
			left,
			width: rect.width,
			minWidth: DEFAULT_DROPDOWN_WIDTH,
			zIndex: 100000,
		}

		if (showAbove) {
			styles.bottom = window.innerHeight - rect.top + triggerGap
		} else {
			styles.top = rect.bottom + triggerGap
		}

		setDropdownStyles(styles)
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

	return { dropdownStyles, resetDropdownStyles }
}
