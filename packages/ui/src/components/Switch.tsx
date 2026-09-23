import type { ElementRef } from "react"
import type { Obs, SwitchProps } from "./@types"

import { Box, Flex, Switch as RadixSwitch, Text } from "@radix-ui/themes"
import { AlertCircle } from "lucide-react"
import { forwardRef, useCallback, useEffect, useId, useMemo, useState } from "react"
import { cn } from "../util/utils"
import { useObservableCleanup } from "../hooks"
import { useCore } from "./core/context"
import { ConditionExpression } from "./core/expression"
import { useData } from "./context/DataProvider"

/**
 * An on / off control after MUI's Switch: Radix Themes' `Switch` with a label
 * on either side, helper / error text, and the engine's observe hooks —
 * `canObserve` publishes the value under `name`, `enabledWhen` keeps the
 * switch enabled only while another published field satisfies the condition.
 * Form-bound through `withForm` as `form/Switch`; the studio canvas renders
 * this base directly.
 */
const SwitchBase = forwardRef<
	ElementRef<typeof RadixSwitch>,
	SwitchProps
>(({
	name,
	label,
	labelPosition = "end",
	helperText,
	error = false,
	errorMessage,
	size = "2",
	variant = "surface",
	checked,
	value,
	disabled,
	canObserve,
	enabledWhen,
	onCheckedChange,
	onChange,
	className,
	id,
	defaultValue: _defaultValue,
	...props
}, ref) => {
	const generatedId = useId()
	const switchId = id ?? generatedId
	const { addObserveTable, getObserveTable } = useCore()
	const { contextData: ctx } = useData()

	const resolvedChecked = typeof value === "boolean" ? value : checked
	// `error` is the form's verdict (withForm sets it after validation); the
	// configured `errorMessage` alone never paints the switch red.
	const hasError = error && !!errorMessage
	const displayHelperText = hasError ? errorMessage : helperText

	// Publisher: register the Subject under `name` and push the value on change.
	// A Subject has no replay, so the current value is also pushed once the
	// Subject exists — a switch gated on this one may have mounted first.
	useEffect(() => {
		canObserve && name && addObserveTable(name)
	}, [canObserve, name, addObserveTable])
	const subject = canObserve && name ? getObserveTable({ key: name, type: "observe" }) : undefined
	useEffect(() => {
		subject?.next(resolvedChecked === true)
	}, [subject, resolvedChecked])

	// Subscriber: enabled while the condition holds; disabled until the first
	// value arrives so a gate that never publishes fails closed.
	const [conditionHolds, setConditionHolds] = useState(false)
	useObservableCleanup(
		enabledWhen ? getObserveTable({ key: (enabledWhen.left as Obs).key, type: "observe" }) : null,
		(data: unknown) => {
			if (enabledWhen) {
				setConditionHolds(new ConditionExpression(ctx).expression({ ...enabledWhen, left: { val: data } }))
			}
		},
		[enabledWhen, ctx],
	)
	const isDisabled = disabled || (!!enabledWhen && !conditionHolds)

	const handleCheckedChange = useCallback((next: boolean) => {
		onCheckedChange?.(next)
		onChange?.(next)
	}, [onCheckedChange, onChange])

	const labelNode = useMemo(() => label ? (
		<Text
			as="label"
			htmlFor={switchId}
			size="2"
			weight="medium"
			className={cn(isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer", hasError && "text-red-500")}
		>
			{label}
		</Text>
	) : null, [label, switchId, isDisabled, hasError])

	return (
		<Box>
			<Flex direction="column" gap="1">
				<Flex align="center" gap="2">
					{labelPosition === "start" && labelNode}
					<RadixSwitch
						ref={ref}
						id={switchId}
						name={name}
						variant={variant}
						size={size}
						checked={resolvedChecked}
						disabled={isDisabled}
						onCheckedChange={handleCheckedChange}
						className={cn("transition duration-200 ease-in-out", className)}
						{...props}
						{...(hasError && { "data-error": "true" })}
					/>
					{labelPosition === "end" && labelNode}
				</Flex>
				{displayHelperText && (
					<Text size="1" className={cn("block mt-1 mr-1", hasError ? "text-red-500 flex items-center gap-0.5" : "text-gray-600 dark:text-gray-400")}>
						{hasError && <AlertCircle className="inline-block h-3 w-3 mr-[0.1rem]" />}
						<span>{displayHelperText}</span>
					</Text>
				)}
			</Flex>
		</Box>
	)
})

SwitchBase.displayName = "Switch"

export { SwitchBase }
