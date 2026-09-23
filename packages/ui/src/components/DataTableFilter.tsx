import { zodResolver } from "@hookform/resolvers/zod"
import { Button as RadixButton, type ThemeProps } from "@radix-ui/themes"
import isEqual from "lodash/isEqual"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { FormProvider, useForm } from "react-hook-form"
import type { Container, DataTableFilterButton, DataTableFilterDisplay } from "./@types"
import { ButtonBase } from "./Button"
import { Popover } from "./Popover"
import { useTheme } from "./context"
import { isEmptyFilterValue } from "./core/dataValue"
import { Schema } from "./core/schema"

type Values = Record<string, unknown>

export type DataTableFilterProps = {
	container: Container
	/** Draws the container's bins against the form (the engine's `ContainerGrid`). */
	renderBins: (container: Container, form: unknown) => ReactNode
	/** The filters the table opens with; Clear returns to them. */
	defaults: Values
	/** The filters currently in the request. */
	applied: Values
	onApply: (values: Values) => void
	button?: DataTableFilterButton
	display?: DataTableFilterDisplay
}

/** How many applied filters differ from where the table started. */
export function activeFilterCount(applied: Values, defaults: Values): number {
	return Object.keys(applied).filter(
		(key) => !isEmptyFilterValue(applied[key]) && !isEqual(applied[key], defaults[key]),
	).length
}

/**
 * A data table's filter form (`DataTableElement.filterContainer`): its own
 * react-hook-form instance over the container's fields, validated by their
 * schema, with the table's Apply / Clear. Nothing reaches the API until Apply —
 * the table only ever sees `onApply(values)`. `popover` hangs the form off a
 * Filter button (badge = active filters); `inline` lays it out as a bar.
 */
export function DataTableFilter({
	container,
	renderBins,
	defaults,
	applied,
	onApply,
	button,
	display = "popover",
}: DataTableFilterProps) {
	const theme = useTheme()
	const color = theme.components.button?.color as ThemeProps["accentColor"] | undefined
	const schema = useMemo(() => new Schema([container]).generate(), [container])
	const form = useForm<Values>({ mode: "all", resolver: zodResolver(schema), defaultValues: defaults })
	// Everything `withForm` accepts (`form.control`), plus `_form` for parity
	// with the engine's Form wrapper.
	const f = useMemo(() => ({ _form: form, control: form.control }), [form])
	const [open, setOpen] = useState(false)

	// Reopening shows what is applied, not edits abandoned by closing the popover.
	const appliedSig = JSON.stringify(applied)
	useEffect(() => {
		if (open) form.reset(applied, { keepDefaultValues: true })
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, appliedSig])

	const apply = form.handleSubmit((values) => {
		onApply(values)
		setOpen(false)
	})
	const clear = () => {
		form.reset(defaults)
		onApply(defaults)
		setOpen(false)
	}

	const count = activeFilterCount(applied, defaults)
	const inline = display === "inline"

	const actions = (
		<div className={`flex items-center gap-2 ${inline ? "shrink-0 pt-7" : "justify-end pt-3"}`}>
			<RadixButton type="button" variant="soft" color="gray" className="cursor-pointer" onClick={clear}>
				Clear
			</RadixButton>
			<RadixButton type="button" variant="solid" color={color} className="cursor-pointer" onClick={() => void apply()}>
				Apply
			</RadixButton>
		</div>
	)

	const body = (
		<FormProvider {...form}>
			{/* Not a <form>: field chrome (a select's option buttons) would submit
			    it. Only the Apply button applies. */}
			<div className={inline ? "flex items-start gap-3" : "block"}>
				<div className="min-w-0 flex-1">{renderBins(container, f)}</div>
				{actions}
			</div>
		</FormProvider>
	)

	if (inline) return <div className="datatable-filter-inline">{body}</div>

	const label = button?.label ?? "Filter"
	return (
		<Popover
			open={open}
			onOpenChange={setOpen}
			placement="bottom-end"
			contentClassName="datatable-filter-popover"
			content={<div className="datatable-filter-popover-body">{body}</div>}
		>
			<span className="datatable-filter-trigger">
				<ButtonBase label={label} icon={button?.icon ?? "filter"} variant={button?.variant ?? "outlined"} />
				{count > 0 && (
					<span className="datatable-filter-badge" aria-label={`${count} active filters`}>
						{count}
					</span>
				)}
			</span>
		</Popover>
	)
}
