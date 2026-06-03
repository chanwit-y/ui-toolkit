import type { HiddenProps } from "./@types"
import type { ElementRef } from "react"

import { forwardRef } from "react"

const HiddenBase = forwardRef<
	ElementRef<"input">,
	HiddenProps
>(({
	value,
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

