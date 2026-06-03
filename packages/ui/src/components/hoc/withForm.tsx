import { type ComponentProps, type ComponentType } from "react"
import type { Control, FieldValues, Path, UseFormReturn } from "react-hook-form"
import { Controller } from "react-hook-form"

type WithFormProps<TFieldValues extends FieldValues = FieldValues> = {
	control: Control<TFieldValues>
	name: Path<TFieldValues>
} | {
	form: UseFormReturn<TFieldValues>
	name: Path<TFieldValues>
}

type FormComponentProps = {
	onChange?: (...event: unknown[]) => void
	onBlur?: () => void
}

export const withForm = <T extends any>(Component:
	ComponentType<T>) => {
	return <TFieldValues extends FieldValues = FieldValues>(
		props: WithFormProps<TFieldValues> & ComponentProps<ComponentType<T & FormComponentProps>>
	) => {
		const { name, ...restProps } = props

		// Extract control from either 'control' prop or 'form.control'
		const control = 'control' in props ? props.control : props.form.control

		// Check if this is a number input field
		const isNumberType = (restProps as any)?.dataType === 'number' || (restProps as any)?.type === 'number'

		return <Controller
			name={name}
			control={control}
			defaultValue={(restProps as any)?.defaultValue}
			render={({ field: { onChange, onBlur, value, ref }, fieldState: { error } }) => {
				// Wrap onChange to convert string to number for number inputs
				const handleChange = (event: any) => {
					if (isNumberType) {
						// Extract value from event object or use directly if it's already a value
						const stringValue = event?.target?.value ?? event
						
						// Convert empty string to undefined, otherwise parse as number
						if (stringValue === '' || stringValue === null || stringValue === undefined) {
							onChange(undefined)
						} else {
							const numValue = Number(stringValue)
							// Only update if it's a valid number (not NaN)
							if (!isNaN(numValue)) {
								onChange(numValue)
							}
						}
					} else {
						// For non-number types, extract value from event if needed
						const finalValue = event?.target?.value ?? event
						onChange(finalValue)
					}
				}

				return (
					<Component
						ref={ref}
						name={name}
						onChange={handleChange}
						onBlur={onBlur}
						value={value}
						error={!!error}
						errorMessage={error?.message}
						// fields={fields}
						// append={append}
						// remove={remove}
						{...(restProps as any)}
					/>
				)
			}}
		/>
	}
}