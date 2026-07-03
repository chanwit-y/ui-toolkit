import type { HiddenProps } from "./@types"
import type { ElementRef } from "react"

import { forwardRef } from "react"

const HiddenBase = forwardRef<
	ElementRef<"input">,
	HiddenProps & { error?: boolean; errorMessage?: string }
>(({
	value,
	// withForm injects these into every wrapped field; a hidden input has no
	// error UI, and spreading them onto the raw <input> trips React's unknown-
	// attribute warnings.
	error: _error,
	errorMessage: _errorMessage,
	...props
}, ref) => {
	return (
		<input
			type="hidden"
			ref={ref}
			value={value}
			{...props}
		/>
	)
})

HiddenBase.displayName = "Hidden"


export { HiddenBase }

