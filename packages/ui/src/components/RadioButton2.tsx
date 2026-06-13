import {
	forwardRef,
	useCallback,
	useEffect,
	useMemo,
	useState,
	type ElementRef,
} from "react"
import { RadioGroup } from "@radix-ui/themes"
import { useQuery } from "@tanstack/react-query"
import { isEmpty } from "lodash"

import { RadioButtonBase } from "./RadioButton"
import { useCore } from "./core/context"
import { useData } from "./context/DataProvider"
import { useObservableCleanup } from "../hooks"
import { ConditionExpression } from "./core/expression"
import type { DataValue, Obs, RadioButtonProps2 } from "./@types"

/**
 * Engine-aware radio. Resolves options either from a static `options` array or,
 * when an `api` caller is supplied, by fetching once and mapping rows via `keys`.
 * Supports the same reactivity as Autocomplete2: publishing its value
 * (`canObserve`), feeding API params from another field (`observeTo`), and
 * conditional enable/disable (`enabledWhen`). Visuals are delegated to
 * RadioButtonBase. Must be rendered inside the engine's Core Provider.
 */
const RadioButtonBase2 = forwardRef<
	ElementRef<typeof RadioGroup.Root>,
	RadioButtonProps2
>(({
	name,
	options,
	api,
	apiInfo,
	keys,
	isSingleLoad,
	canObserve,
	observeTo,
	enabledWhen,
	value,
	onValueChange,
	onChange,
	...rest
}, ref) => {
	const { addObserveTable, getObserveTable: getDataValue } = useCore()
	const { contextData: ctx } = useData()

	const [items, setItems] = useState<any[]>([])
	const [observeApiData, setObserveApiData] = useState<unknown>()
	const [isObserveEnabled, setIsObserveEnabled] = useState(true)

	const resolveDataValue = useCallback((dv: DataValue) => {
		return dv.type === "value" ? dv.value : undefined
	}, [])

	const fetchData = useCallback(() => {
		if (!api) return undefined

		const q = Object.entries(apiInfo?.query ?? {}).reduce((acc, [k, v]) => {
			return { ...acc, [k]: resolveDataValue(v) }
		}, {} as Record<string, unknown>)

		const b = Object.entries(apiInfo?.body ?? {}).reduce((acc, [k, v]) => {
			return { ...acc, [k]: resolveDataValue(v) }
		}, {} as Record<string, unknown>)

		if (observeTo) {
			if (!isEmpty(apiInfo?.params) && !isEmpty(observeApiData)) {
				const p = Object.entries(apiInfo?.params ?? {}).reduce((acc, [k, v]) => {
					return {
						...acc,
						[k]: v.type === "observe"
							? observeApiData
							: v.type === "value"
								? resolveDataValue(v)
								: v,
					}
				}, {} as Record<string, unknown>)

				if (!isEmpty(apiInfo?.query) && !isEmpty(apiInfo?.body)) return api({ ...q }, { ...p }, { ...b })
				return api({ ...q }, { ...p })
			}
		} else if (!isEmpty(apiInfo?.query) && !isEmpty(apiInfo?.body)) {
			return api({ ...q }, { ...b })
		} else if (!isEmpty(apiInfo?.query)) {
			return api({ ...q })
		} else if (!isEmpty(apiInfo?.body)) {
			return api({ ...b })
		} else {
			return api()
		}

		return undefined
	}, [api, apiInfo, observeTo, observeApiData, resolveDataValue])

	const getItems = useCallback((res: any) => {
		let data = res
		apiInfo?.paths?.forEach((path) => { data = data?.[path] })
		return Array.isArray(data) ? data : []
	}, [apiInfo])

	const { data } = useQuery({
		queryKey: [`${name}-${apiInfo?.name}-radio`, observeApiData],
		queryFn: () => fetchData(),
		staleTime: Infinity,
		gcTime: Infinity,
		enabled: !!api,
	})

	useEffect(() => {
		if (!api) return
		if (isSingleLoad && items.length > 0) return
		if (data) setItems(getItems(data))
	}, [api, data, getItems, isSingleLoad, items.length])

	// Publish this field's value so other fields can observe it.
	useEffect(() => {
		if (canObserve && name) addObserveTable(name)
	}, [canObserve, name, addObserveTable])

	// React to an observed field: reset selection and refetch with the new param.
	useObservableCleanup(
		observeTo ? getDataValue({ key: observeTo, type: "observe" }) : null,
		(d: unknown) => {
			onChange?.(null as any)
			onValueChange?.(null as any)
			setObserveApiData(d)
		},
		[observeTo, onChange, onValueChange]
	)

	// Conditional enable/disable based on another field.
	useObservableCleanup(
		enabledWhen ? getDataValue({ key: (enabledWhen.left as Obs).key, type: "observe" }) : null,
		(d: unknown) => {
			if (enabledWhen) {
				const result = !(new ConditionExpression(ctx).expression({ ...enabledWhen, left: { val: d } }))
				setIsObserveEnabled(result)
			}
		},
		[enabledWhen, ctx]
	)

	const resolvedOptions = useMemo(() => {
		if (api) {
			const valueKey = keys?.value ?? "value"
			const labelKey = keys?.label ?? "label"
			return items.map((it) => ({
				value: String(it?.[valueKey] ?? ""),
				label: String(it?.[labelKey] ?? ""),
			}))
		}
		return options ?? []
	}, [api, items, keys, options])

	const handleValueChange = useCallback((v: string) => {
		onValueChange?.(v)
		onChange?.(v)
		if (canObserve && name) getDataValue({ key: name, type: "observe" })?.next(v)
	}, [onValueChange, onChange, canObserve, name, getDataValue])

	return (
		<RadioButtonBase
			ref={ref}
			value={value}
			options={resolvedOptions}
			onValueChange={handleValueChange}
			disabled={!isObserveEnabled}
			{...rest}
		/>
	)
})

RadioButtonBase2.displayName = "RadioButton2"

export { RadioButtonBase2 }
