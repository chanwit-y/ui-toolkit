import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ColumnPinningState, ColumnSizingState, VisibilityState } from "@tanstack/react-table"
import type { DataTableColumnState } from "./@types"

/**
 * The column layout a data table remembers (see the grilled design
 * `datatable-ag-grid-features`, §2): one object behind the Columns menu, the
 * header pin toggle, the resize handles and the group-by picker, written to
 * localStorage (default) or sessionStorage and reconciled against the config
 * on the way back — columns the config dropped are forgotten, new ones appear
 * at their config position. Fixed columns (row actions, selection) are not
 * part of it; the table puts them first itself.
 */
export type ColumnLayout = {
	order: string[]
	visibility: VisibilityState
	sizing: ColumnSizingState
	pinning: ColumnPinningState
	grouping: string[]
}

type Stored = Partial<ColumnLayout> & { v?: number }

const STORAGE_VERSION = 1

const unique = (ids: string[]) => [...new Set(ids)]

/**
 * A stored layout (anything, maybe stale or hand-edited) over the config's
 * defaults. `ids` — the config's data column ids, in config order; `locked` —
 * ids that are always visible.
 */
export function reconcileColumnLayout(stored: unknown, defaults: ColumnLayout, ids: string[], locked: string[] = []): ColumnLayout {
	const known = new Set(ids)
	const s = (stored && typeof stored === "object" ? stored : {}) as Stored
	const ok = (list: unknown): string[] => (Array.isArray(list) ? unique(list.filter((id): id is string => typeof id === "string" && known.has(id))) : [])

	// Order: the stored order, then every config column it lacks after the
	// config column that precedes it (or first).
	const order = Array.isArray(s.order) ? ok(s.order) : [...defaults.order]
	ids.forEach((id, i) => {
		if (order.includes(id)) return
		const before = ids.slice(0, i).reverse().find((prev) => order.includes(prev))
		order.splice(before === undefined ? 0 : order.indexOf(before) + 1, 0, id)
	})

	const visibility: VisibilityState = { ...defaults.visibility }
	if (s.visibility && typeof s.visibility === "object") {
		for (const [id, shown] of Object.entries(s.visibility)) if (known.has(id) && typeof shown === "boolean") visibility[id] = shown
	}
	for (const id of locked) visibility[id] = true

	const sizing: ColumnSizingState = {}
	if (s.sizing && typeof s.sizing === "object") {
		for (const [id, px] of Object.entries(s.sizing)) if (known.has(id) && typeof px === "number" && px > 0) sizing[id] = Math.round(px)
	}

	const pinning: ColumnPinningState = s.pinning && typeof s.pinning === "object"
		? { left: ok(s.pinning.left), right: ok(s.pinning.right).filter((id) => !ok(s.pinning?.left).includes(id)) }
		: { left: [...(defaults.pinning.left ?? [])], right: [...(defaults.pinning.right ?? [])] }

	const grouping = Array.isArray(s.grouping) ? ok(s.grouping) : [...defaults.grouping]

	return { order, visibility, sizing, pinning, grouping }
}

const storageFor = (persist: DataTableColumnState["persist"]): Storage | undefined => {
	if (persist === "none") return undefined
	try {
		return persist === "session" ? window.sessionStorage : window.localStorage
	} catch {
		return undefined
	}
}

function readStored(storage: Storage | undefined, key: string): unknown {
	if (!storage) return undefined
	try {
		const raw = storage.getItem(key)
		if (!raw) return undefined
		const parsed = JSON.parse(raw) as Stored
		return parsed?.v === STORAGE_VERSION ? parsed : undefined
	} catch {
		return undefined
	}
}

export type ColumnLayoutState = ColumnLayout & {
	setOrder: (order: string[]) => void
	setVisibility: (updater: VisibilityState | ((old: VisibilityState) => VisibilityState)) => void
	setPinning: (pinning: ColumnPinningState) => void
	setGrouping: (grouping: string[]) => void
	/** Record the widths (the resize hook owns them while the table lives). */
	setSizing: (sizing: ColumnSizingState) => void
	/** Back to the config, and forget what was stored. */
	reset: () => ColumnLayout
	/** True when anything differs from the config. */
	changed: boolean
}

/**
 * The layout state of one table. Read from storage once, synchronously, so
 * the first paint already has it; written back whenever it changes.
 */
export function useColumnLayout({ ids, defaults, locked, storageKey, persist }: {
	ids: string[]
	defaults: ColumnLayout
	locked: string[]
	storageKey: string
	persist: DataTableColumnState["persist"]
}): ColumnLayoutState {
	const storage = useMemo(() => storageFor(persist), [persist])
	const idsSig = ids.join("|")
	const [layout, setLayout] = useState<ColumnLayout>(() => reconcileColumnLayout(readStored(storage, storageKey), defaults, ids, locked))
	// A config change (columns added / removed) reconciles what is on screen.
	const firstIds = useRef(idsSig)
	useEffect(() => {
		if (firstIds.current === idsSig) return
		firstIds.current = idsSig
		setLayout((old) => reconcileColumnLayout({ v: STORAGE_VERSION, ...old }, defaults, ids, locked))
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [idsSig])

	const defaultsSig = JSON.stringify(defaults)
	const freshSig = useMemo(
		() => JSON.stringify(reconcileColumnLayout(undefined, defaults, ids, locked)),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[defaultsSig, idsSig],
	)
	const changed = JSON.stringify(layout) !== freshSig
	const pristine = useRef(true)
	useEffect(() => {
		if (pristine.current) {
			pristine.current = false
			return
		}
		if (!storage) return
		try {
			// Only a layout that differs from the config is stored: a stored copy
			// of the defaults would pin them against a later config change.
			if (changed) storage.setItem(storageKey, JSON.stringify({ v: STORAGE_VERSION, ...layout }))
			else storage.removeItem(storageKey)
		} catch {
			// Full or blocked storage: the layout still works for this session.
		}
	}, [layout, storage, storageKey, changed])

	// Not remembered (`persist: "none"`, the studio canvas): the config is the
	// layout, so a config change shows at once.
	useEffect(() => {
		if (persist === "none") setLayout(reconcileColumnLayout(undefined, defaults, ids, locked))
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [defaultsSig])

	const setOrder = useCallback((order: string[]) => setLayout((l) => ({ ...l, order })), [])
	const setVisibility = useCallback((updater: VisibilityState | ((old: VisibilityState) => VisibilityState)) =>
		setLayout((l) => {
			const next = typeof updater === "function" ? updater(l.visibility) : updater
			for (const id of locked) next[id] = true
			return { ...l, visibility: next }
		}), [locked])
	const setPinning = useCallback((pinning: ColumnPinningState) => setLayout((l) => ({ ...l, pinning })), [])
	const setGrouping = useCallback((grouping: string[]) => setLayout((l) => ({ ...l, grouping })), [])
	const setSizing = useCallback((sizing: ColumnSizingState) =>
		setLayout((l) => (JSON.stringify(l.sizing) === JSON.stringify(sizing) ? l : { ...l, sizing })), [])
	const reset = useCallback(() => {
		const fresh = reconcileColumnLayout(undefined, defaults, ids, locked)
		setLayout(fresh)
		try {
			storage?.removeItem(storageKey)
		} catch {
			// ignore
		}
		return fresh
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [defaultsSig, idsSig, storage, storageKey])

	return { ...layout, setOrder, setVisibility, setPinning, setGrouping, setSizing, reset, changed }
}
