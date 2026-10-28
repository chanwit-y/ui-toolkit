import * as Popover from "@radix-ui/react-popover"
import * as Tooltip from "@radix-ui/react-tooltip"
import { Checkbox, IconButton, Text, type ThemeProps } from "@radix-ui/themes"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { flexRender, getCoreRowModel, getExpandedRowModel, getFilteredRowModel, getGroupedRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type Column, type ColumnDef, type ColumnFiltersState, type ColumnPinningState, type ExpandedState, type PaginationState, type Row, type RowSelectionState, type SortingState, type Table } from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import get from "lodash/get"
import { ColumnResizeHandle, pinStyle, sizeStyle, sizeVars, useColumnResize, withFiller } from "./dataTableResize"
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, ListFilter, Pin, PinOff } from "lucide-react"
import { ChevronRight as GroupChevron } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { dtHeaderBgClass, dtHeaderTextClass, dtHeaderFontSizeClass, dtHeaderFontWeightClass, dtHeaderHoverClass, dtPaginationBgClass, dtPaginationHoverClass, dtRingClass, dtRowHoverClass } from "../util/constant"
import type { ButtonAction, DataTableProps } from "./@types"
import { actionSizeSpec } from "./dataTableActions"
import { ButtonBase } from "./Button"
import { useLocale } from "./core/locale"
import { formatCell } from "../util/format"
import { csvFileName, downloadCsv, toCsv } from "../util/csv"
import { renderHtmlCell } from "./HtmlCell"
import { DataTableColumnsMenu } from "./DataTableColumnsMenu"
import { useColumnLayout, type ColumnLayout } from "./dataTableColumnState"
import { cellLook, resolveStyles } from "./dataTableStyles"
import { aggregateValues, expandedToDepth } from "./dataTableGrouping"
import { getStateStore } from "./core/stateStore"
import { matchPageKey, usePages } from "./core/pages"
import { ConfirmBox } from "./ConfirmBox"
import Icon from "./Icon"
import { Modal } from "./Modal"
import { useSnackbar } from "./Snackbar"
import { TextFieldBase as TextField } from "./TextField"
import { useLoading, useTheme } from "./context"
import { useData } from "./context/DataProvider"
import { useStord } from "./core/stord"
import { useNavigateTo } from "./core/pages"
import { callArgs, stateKeys, useRouteScope, useStateVersion } from "./core/readApi"
import { resolveDataValue, resolveDataValues } from "./core/dataValue"
import { DataTableFilter } from "./DataTableFilter"
import { ClampedCell, DEFAULT_CELL_LINES } from "./ClampedCell"
import { SkeletonBlock } from "./Skeleton"
import { useSkeleton } from "./core/rowScope"
import { columnMeta, computeSpans, headerPinStyle, headerRows, headerTopStyle, spanKey, useHeaderRowTops, displayedLeafColumns } from "./dataTableLayout"

// Utility function to highlight matching text
const highlightText = (text: string, searchTerm: string) => {
	if (!searchTerm || !text) {
		return <>{text}</>
	}

	const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const splitRegex = new RegExp(`(${escaped})`, 'gi')
	const testRegex = new RegExp(`^${escaped}$`, 'i')
	const parts = text.split(splitRegex)

	return (
		<>
			{parts.map((part, index) =>
				testRegex.test(part) ? (
					<mark key={index} className="bg-yellow-200 px-1 rounded">
						{part}
					</mark>
				) : (
					part
				)
			)}
		</>
	)
}

const ACTION_COLUMN_ID = '__icon__'
const SELECT_COLUMN_ID = '__select__'
/** Columns the table adds itself: never in the Columns menu, the export or the layout state. */
const FIXED_COLUMN_IDS = new Set([ACTION_COLUMN_ID, SELECT_COLUMN_ID])
/** More rendered rows than this are virtualised (unless cells merge). */
const VIRTUAL_ROW_THRESHOLD = 60

/** The data columns' leaf ids, in config order (a group header's leaves inline). */
const leafColumnIds = (cols: any[]): string[] =>
	cols.flatMap((c) => (Array.isArray(c?.columns) ? leafColumnIds(c.columns) : [String(c?.id ?? c?.accessorKey ?? '').replace(/\./g, '_')])).filter(Boolean)

/** A header's text (a function header renders to its id). */
const headerLabel = (column: Column<any, unknown> | undefined, fallback: string): string =>
	typeof column?.columnDef.header === 'string' ? column.columnDef.header : fallback

/** Plain text of an HTML string (for the CSV export). */
const htmlText = (html: string): string => {
	if (typeof DOMParser === 'undefined') return html.replace(/<[^>]*>/g, '')
	return new DOMParser().parseFromString(html, 'text/html').body.textContent ?? ''
}

/** The icon-only Add button's Radix variant for each engine button variant. */
const ADD_ICON_VARIANTS = { contained: 'solid', outlined: 'outline', text: 'ghost' } as const

// Header spacing — literal classes so Tailwind's scanner emits them.
const HEADER_GAPS: Record<string, string> = {
	'0': 'gap-0',
	'1': 'gap-1',
	'2': 'gap-2',
	'3': 'gap-3',
	'4': 'gap-4',
	'6': 'gap-6',
	'8': 'gap-8',
}

/** Sticky class plus the inner-edge shadow on the last left / first right pinned cell. */
const pinClass = (column: Column<any, unknown>): string => {
	const pinned = column.getIsPinned()
	if (!pinned) return ''
	const edge =
		pinned === 'left' && column.getIsLastColumn('left')
			? ' datatable-cell-pinned-left-last'
			: pinned === 'right' && column.getIsFirstColumn('right')
				? ' datatable-cell-pinned-right-first'
				: ''
	return `datatable-cell-pinned${edge}`
}

// Enhanced cell renderer with highlighting support
const renderCellWithHighlight = (cell: any, globalFilter: string, locale?: string) => {
	const cellValue = cell.getValue()
	const cellContent = flexRender(cell.column.columnDef.cell, cell.getContext())

	// HTML columns (`ColumnDef.html`) always render their markup — the search
	// still matches them by accessor value, they just aren't highlighted.
	if (cell.column.columnDef.meta?.html) return cellContent

	// A formatted column shows `formatCell`'s text (number / currency / date …).
	const format = cell.column.columnDef.meta?.format
	if (format) return highlightText(formatCell(cellValue, format, locale), globalFilter)

	// If there's a global filter and the cell value is a string, highlight it
	if (globalFilter && typeof cellValue === 'string') {
		return highlightText(cellValue, globalFilter)
	}

	// For custom cell renderers, try to extract text content and highlight
	if (globalFilter && cellContent && typeof cellContent === 'object' && 'props' in cellContent) {
		// If it's a React element with children, try to highlight text content
		if (cellContent.props && cellContent.props.children) {
			const children = cellContent.props.children
			if (typeof children === 'string') {
				return highlightText(children, globalFilter)
			}
		}
	}

	return cellContent
}

export const DataTable2 = <T extends Record<string, any>>({
	name,
	title,
	api,
	apiDeleteInfo,
	apiDelete,
	apiInfo,
	apiSegments,
	pinnedColumns,
	columns = [],
	canSearchAllColumns = false,
	modalContainer,
	modalMaxWidth,
	modalMinWidth,
	modalMaxHeight,
	canEdit = false,
	canDelete = false,
	canAdd = false,
	addButton,
	headerGap,
	align = {},
	rowNavigate,
	canResizeColumns = true,
	cellLines = DEFAULT_CELL_LINES,
	actionSize,
	filterContainer,
	renderFilterBins,
	filterDefaults,
	filterButton,
	filterDisplay,
	urlParams,
	sortFields,
	items,
	canChooseColumns = true,
	columnsButton,
	columnState,
	hiddenColumns,
	lockedColumns,
	selection,
	rowStyles,
	grouping,
	canExport = false,
	exportButton,
	exportOptions,
	paging = 'pages',

	// editModalContainer,
}: DataTableProps) => {

	const navigateTo = useNavigateTo()
	// Row click → page change. Clicks that land on a control inside the row
	// (edit/delete buttons, links, inputs) keep their own behaviour.
	const onRowClick = useCallback((e: React.MouseEvent<HTMLTableRowElement>, row: T) => {
		if (!rowNavigate) return
		if ((e.target as HTMLElement).closest('button, a, input, select, textarea, [role="menuitem"]')) return
		navigateTo(rowNavigate, { row })
	}, [rowNavigate, navigateTo])

	const [openModal, setOpenModal] = useState(false)
	const [openConfirmBox, setOpenConfirmBox] = useState(false)

	// Server-side pagination config. Present ⇒ the table sends offset/limit (and
	// optionally a search term) to the API per page and reads the total count out
	// of the response, instead of fetching everything and slicing in memory.
	// `items` (rows from a DataValue — a page load's slice) is in-memory only:
	// server paging and sort talk to an API, so they don't apply.
	const pageCfg = items ? undefined : apiInfo?.pagination
	const isServer = !!pageCfg
	const pageSizeOptions = pageCfg?.pageSizeOptions ?? [5, 10, 20, 30, 40, 50]

	const [data, setData] = useState<T[]>([])
	const [total, setTotal] = useState(0)
	const [globalFilter, setGlobalFilter] = useState('')
	const locale = useLocale()
	// The search box matches the raw value *and* its formatted text (`meta.format`), so
	// typing "1,250" or "Jan 2025" finds the row the way it reads on screen.
	const tableRef = useRef<Table<any> | null>(null)
	const globalFilterFn = useCallback((row: Row<any>, columnId: string, filterValue: unknown) => {
		const q = String(filterValue ?? '').toLowerCase()
		if (!q) return true
		const raw = row.getValue(columnId)
		if (String(raw ?? '').toLowerCase().includes(q)) return true
		const column = tableRef.current?.getColumn(columnId)
		const format = column ? columnMeta(column).format : undefined
		return !!format && formatCell(raw, format, locale).toLowerCase().includes(q)
	}, [locale])
	// Debounced search term sent to the API in server mode (searchKey present).
	const [serverSearch, setServerSearch] = useState('')
	// Server-side sort (`api.sort`): the header icons drive the request instead
	// of sorting the fetched rows. The field sent is the column's `sortField`,
	// else its accessor; the config's `default` seeds the state.
	const sortCfg = items ? undefined : apiInfo?.sort
	const sortFieldOf = useCallback((columnId: string) => sortFields?.[columnId] ?? columnId, [sortFields])
	const [sorting, setSorting] = useState<SortingState>(() => {
		const initial = apiInfo?.sort?.default
		if (!initial) return []
		const id = Object.keys(sortFields ?? {}).find((k) => sortFields?.[k] === initial.field) ?? initial.field
		return [{ id, desc: initial.order === "desc" }]
	})
	// Custom filters (`filterContainer`): what the last Apply sent. They start
	// from the config's defaults, so the first fetch is already filtered.
	const initialFilters = useMemo(() => filterDefaults ?? {}, [filterDefaults])
	const [appliedFilters, setAppliedFilters] = useState<Record<string, unknown>>(initialFilters)
	const applyFilters = useCallback((values: Record<string, unknown>) => {
		setAppliedFilters(values)
		setPagination((p) => ({ ...p, pageIndex: 0 }))
	}, [])
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: pageCfg?.defaultPageSize ?? 10,
	})
	const [isPageChanging, setIsPageChanging] = useState(false)
	const [isFiltering, setIsFiltering] = useState(false)
	// Column layout (see ./dataTableColumnState): order, visibility, widths, pins
	// and grouping — one remembered object behind the Columns menu, the header
	// pin toggle and the resize handles. The config seeds it; the action and
	// selection columns always lead on the left and are not part of it.
	const hasActionColumn = canEdit || canDelete
	// Server paging / sort fetch one page, so a client group or a scroll of
	// "every row" would be a lie: both stay off there (warned once).
	const groupingCfg = isServer || sortCfg ? undefined : grouping
	const scrollMode = paging === 'scroll' && !isServer
	useEffect(() => {
		if (grouping && (isServer || sortCfg)) console.warn(`[gummy-ui] DataTable "${name}": grouping is client-side, so it is off under api.pagination / api.sort.`)
		if (paging === 'scroll' && isServer) console.warn(`[gummy-ui] DataTable "${name}": paging "scroll" is client-side, so the pager stays under api.pagination.`)
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])
	const fixedLeft = useMemo(() => [...(hasActionColumn ? [ACTION_COLUMN_ID] : []), ...(selection ? [SELECT_COLUMN_ID] : [])], [hasActionColumn, selection])
	const dataIds = useMemo(() => leafColumnIds(columns), [columns])
	const layoutDefaults = useMemo<ColumnLayout>(() => ({
		order: dataIds,
		visibility: Object.fromEntries((hiddenColumns ?? []).map((id) => [id, false])),
		sizing: {},
		pinning: { left: [...(pinnedColumns?.left ?? [])], right: [...(pinnedColumns?.right ?? [])] },
		grouping: (groupingCfg?.by ?? []).map((id) => id.replace(/\./g, '_')),
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}), [dataIds.join('|'), (hiddenColumns ?? []).join('|'), (pinnedColumns?.left ?? []).join('|'), (pinnedColumns?.right ?? []).join('|'), (groupingCfg?.by ?? []).join('|')])
	const pages = usePages()
	const storageKey = useMemo(() => {
		if (columnState?.key) return columnState.key
		const path = typeof window === 'undefined' ? '' : window.location.pathname
		const pageKey = pages ? matchPageKey(pages, path) : null
		return `gummy.table.${pageKey ?? '_'}.${name}`
	}, [columnState?.key, pages, name])
	const layout = useColumnLayout({
		ids: dataIds,
		defaults: layoutDefaults,
		locked: lockedColumns ?? [],
		storageKey,
		persist: columnState?.persist ?? 'local',
	})
	const columnPinning = useMemo<ColumnPinningState>(() => ({
		left: [...fixedLeft, ...(layout.pinning.left ?? []).filter((id) => !FIXED_COLUMN_IDS.has(id))],
		right: (layout.pinning.right ?? []).filter((id) => !FIXED_COLUMN_IDS.has(id)),
	}), [fixedLeft, layout.pinning])
	const setColumnPinning = useCallback((updater: ColumnPinningState | ((old: ColumnPinningState) => ColumnPinningState)) => {
		const next = typeof updater === 'function' ? updater(columnPinning) : updater
		layout.setPinning({
			left: (next.left ?? []).filter((id) => !FIXED_COLUMN_IDS.has(id)),
			right: (next.right ?? []).filter((id) => !FIXED_COLUMN_IDS.has(id)),
		})
	}, [columnPinning, layout])
	const groupingState = groupingCfg ? layout.grouping : []
	const [expanded, setExpanded] = useState<ExpandedState>({})
	// Row selection (`selection`): TanStack's state keyed by the row id, the
	// picked rows kept by id so a server page change doesn't lose them.
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
	const selectedRows = useRef(new Map<string, T>())
	const selectionKey = selection?.stateKey ?? `${name}Selected`
	const rowIdOf = useCallback((row: T, index: number): string => {
		const v = selection?.idKey ? get(row, selection.idKey) : (row as any)?._id ?? (row as any)?.id
		return v === undefined || v === null || v === '' ? String(index) : String(v)
	}, [selection?.idKey])
	const prevPageIndexRef = useRef(pagination.pageIndex)
	const prevColumnFiltersRef = useRef(columnFilters)

	const [selectedRow, setSelectedRow] = useState<T | null>(null)

	const { showSnackbar } = useSnackbar()
	const { startLoading, stopLoading } = useLoading()

	const columnValues = useMemo(() => {
		const values: Record<string, string[]> = {}
		columns.forEach((col: { accessorKey: string; id: string }) => {
			// Skip display columns like drag-handle
			if ('accessorKey' in col && col.accessorKey) {
				const accessor = col.accessorKey as string
				const columnId = col.id || accessor
				const uniqueValues = [...new Set(data.map(row => String(row[accessor])))]
					.filter(Boolean)
					.sort()
				values[columnId] = uniqueValues
			}
		})
		return values
	}, [columns, data])




	// `row` overrides `selectedRow` for the confirm-less path, where the delete
	// runs in the same tick as the click and the selection state hasn't committed.
	const executeActions = useCallback(async (
		actionsToExecute: ButtonAction[] = [],
		row?: T
	) => {
		let loaderId: string | undefined;
		let deleted = false;
		const targetRow = row ?? selectedRow

		for (const action of actionsToExecute) {
			switch (action) {
				case 'SubmitFormToDeleteAPI':
					if (apiDeleteInfo && targetRow && apiDeleteInfo.params?.["id"] && targetRow[apiDeleteInfo.params["id"]] && apiDelete) {
						await apiDelete({ id: targetRow[apiDeleteInfo.params["id"]] || targetRow[apiDeleteInfo.params["_id"]] })
						deleted = true;
						apiDeleteInfo?.isReload && await refetch();
					}
					break;
				case 'StartLoading':
					loaderId = startLoading();
					break;
				case 'StopLoading':
					loaderId && stopLoading(loaderId);
					break;
				case 'CloseModal':
					setOpenModal(false);
					break;
				default:
					break;
			}
		}

		// Only after an actual delete — cancelling the confirm box runs an empty
		// (or delete-less) action list and must not report success.
		if (deleted && apiDeleteInfo?.snackbarSuccess) {
			showSnackbar({
				variant: apiDeleteInfo?.snackbarSuccess.type,
				message: apiDeleteInfo?.snackbarSuccess.message,
			})
		}
	}, [apiDeleteInfo, apiDelete, showSnackbar, selectedRow])


	const handleConfirm = useCallback((isConfirm: boolean) => {
		if (isConfirm) {
			executeActions(apiDeleteInfo?.confirmBox?.True || [])
		} else {
			executeActions(apiDeleteInfo?.confirmBox?.False || [])
		}
	}, [apiDeleteInfo, selectedRow])

	const filterRef = useRef<HTMLInputElement>(null);
	const theme = useTheme()

	const updateFnCtxs = useStord((state) => state.updateFnCtxs)
	const dataCtx = useData()

	// Prepend a default display column with an icon.
	// Row actions are Radix IconButtons, so they take the theme's radius, hover
	// and dark mode. Edit follows the buttons' colour (dataTable.editButtonColor,
	// else button.color, else the accent); delete is red unless pinned.
	const editButtonColor = (theme.components.dataTable?.editButtonColor || theme.components.button?.color) as ThemeProps['accentColor'] | undefined
	const deleteButtonColor = (theme.components.dataTable?.deleteButtonColor || 'red') as ThemeProps['accentColor']
	// Row-action size: button step, glyph and the ACTION column's width.
	const actionSpec = actionSizeSpec(actionSize)

	const enhancedColumns = useMemo<ColumnDef<T, unknown>[]>(() => {
		const actionIconColumn: ColumnDef<T, unknown> = {
			id: ACTION_COLUMN_ID,
			header: () => (
				<>ACTION</>
			),
			cell: ({ row }) => (
				<div className="datatable-action-cell">
					{canEdit && (
						<IconButton
							type="button"
							variant="soft"
							size={actionSpec.button}
							color={editButtonColor}
							className="cursor-pointer"
							aria-label="Edit row"
							title="Edit"
							onClick={() => {
								dataCtx?.updateContextData(name ?? '', row.original)
								setOpenModal(true)
							}}
						>
							<Icon icon="edit" size={actionSpec.icon} />
						</IconButton>
					)}
					{canDelete && (
						<IconButton
							type="button"
							variant="soft"
							size={actionSpec.button}
							color={deleteButtonColor}
							className="cursor-pointer"
							aria-label="Delete row"
							title="Delete"
							onClick={() => {
								setSelectedRow(row.original)
								// No confirmBox authored → run the delete sequence directly;
								// opening the dialog would confirm into an empty action list.
								if (apiDeleteInfo && !apiDeleteInfo.confirmBox) {
									executeActions(['StartLoading', 'SubmitFormToDeleteAPI', 'StopLoading'], row.original)
								} else {
									setOpenConfirmBox(true)
								}
							}}
						>
							<Icon icon="trash" size={actionSpec.icon} />
						</IconButton>
					)}
				</div>
			)
			,
			enableSorting: false,
			enableColumnFilter: false,
			size: actionSpec.columnWidth,
			minSize: actionSpec.columnWidth,
			maxSize: actionSpec.columnWidth,
			enableResizing: false,
		}

		const multi = selection?.mode === 'multi'
		const headerMode = selection?.headerCheckbox ?? 'page'
		const selectColumn: ColumnDef<T, unknown> = {
			id: SELECT_COLUMN_ID,
			header: ({ table }) => {
				if (!multi || headerMode === 'none') return <span className="sr-only">Select</span>
				const all = headerMode === 'all' ? table.getIsAllRowsSelected() : table.getIsAllPageRowsSelected()
				const some = headerMode === 'all' ? table.getIsSomeRowsSelected() : table.getIsSomePageRowsSelected()
				return (
					<div className="datatable-select-cell">
						<Checkbox
							size="1"
							checked={all ? true : some ? 'indeterminate' : false}
							onCheckedChange={(checked) => (headerMode === 'all' ? table.toggleAllRowsSelected(checked === true) : table.toggleAllPageRowsSelected(checked === true))}
							aria-label={headerMode === 'all' ? 'Select all rows' : 'Select the rows on this page'}
						/>
					</div>
				)
			},
			cell: ({ row }) => row.getCanSelect() ? (
				<div className="datatable-select-cell">
					<Checkbox
						size="1"
						checked={row.getIsSelected()}
						onCheckedChange={(checked) => row.toggleSelected(checked === true)}
						aria-label="Select row"
					/>
				</div>
			) : null,
			enableSorting: false,
			enableColumnFilter: false,
			enableHiding: false,
			enableGrouping: false,
			size: 44,
			minSize: 44,
			maxSize: 44,
			enableResizing: false,
		}
		return [
			...(canEdit || canDelete ? [actionIconColumn] : []),
			...(selection ? [selectColumn] : []),
			...columns,
		]
	}, [columns, canDelete, canEdit, dataCtx, editButtonColor, deleteButtonColor, actionSpec, name, apiDeleteInfo, executeActions, selection])

	// Column resizing (see ./dataTableResize): a column that declares a `size`
	// puts the table in exact-pixel mode from the first paint.
	const resize = useColumnResize(
		canResizeColumns,
		columns.some((col: { size?: number }) => typeof col.size === 'number'),
		layout.sizing,
	)

	const table = useReactTable({
		data,
		columns: enhancedColumns,
		...resize.tableOptions,
		state: {
			columnSizing: resize.columnSizing,
			// In server mode the search box drives a server query, not the
			// in-memory global filter — keep TanStack's client filter empty so it
			// doesn't re-filter the already-paged page.
			globalFilter: isServer ? '' : globalFilter,
			pagination,
			sorting,
			columnFilters,
			columnPinning,
			columnOrder: [...fixedLeft, ...layout.order],
			columnVisibility: layout.visibility,
			grouping: groupingState,
			expanded,
			rowSelection,
		},
		onColumnVisibilityChange: layout.setVisibility,
		onColumnOrderChange: (updater) => {
			const next = typeof updater === 'function' ? updater([...fixedLeft, ...layout.order]) : updater
			layout.setOrder(next.filter((id) => !FIXED_COLUMN_IDS.has(id)))
		},
		onGroupingChange: (updater) => {
			const next = typeof updater === 'function' ? updater(groupingState) : updater
			layout.setGrouping(next)
		},
		onExpandedChange: setExpanded,
		onRowSelectionChange: setRowSelection,
		enableRowSelection: selection ? (row) => !row.getIsGrouped() : false,
		enableMultiRowSelection: selection?.mode === 'multi',
		...(selection ? { getRowId: (row: T, index: number) => rowIdOf(row, index) } : {}),
		...(groupingCfg ? { getGroupedRowModel: getGroupedRowModel(), getExpandedRowModel: getExpandedRowModel(), groupedColumnMode: false as const, autoResetExpanded: false } : {}),
		onGlobalFilterChange: setGlobalFilter,
		globalFilterFn,
		// TanStack only searches columns whose first value is a string or number;
		// a formatted column (a boolean shown as a label, a date) is searched by
		// its text regardless.
		getColumnCanGlobalFilter: (column) => {
			if (columnMeta(column).format) return true
			const value = column.columnDef.enableGlobalFilter === false
				? undefined
				: tableRef.current?.getCoreRowModel().flatRows[0]?.getValue(column.id)
			return typeof value === 'string' || typeof value === 'number'
		},
		onSortingChange: (updater) => {
			setSorting(updater)
			// A new server sort starts again from the first page.
			if (sortCfg) setPagination((p) => ({ ...p, pageIndex: 0 }))
		},
		manualSorting: !!sortCfg,
		enableMultiSort: !sortCfg,
		onColumnFiltersChange: setColumnFilters,
		onColumnPinningChange: setColumnPinning,
		enableColumnPinning: true,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		...(scrollMode ? {} : { getPaginationRowModel: getPaginationRowModel() }),
		getSortedRowModel: getSortedRowModel(),
		onPaginationChange: setPagination,
		manualPagination: isServer,
		manualFiltering: isServer,
		...(isServer ? { rowCount: total } : {}),
	})
	tableRef.current = table

	// Widths go back into the remembered layout once a drag ends.
	const resizingNow = !!table.getState().columnSizingInfo.isResizingColumn
	useEffect(() => {
		if (!resizingNow) layout.setSizing(resize.columnSizing)
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [resize.columnSizing, resizingNow])

	// Grouping opens to the config's depth: on the first rows and whenever the
	// grouped columns change (a user's own expand / collapse then stays).
	const groupingSig = groupingState.join('|')
	const expandedFor = useRef<string | null>(null)
	useEffect(() => {
		if (!groupingCfg || data.length === 0 || expandedFor.current === groupingSig) return
		expandedFor.current = groupingSig
		const depth = groupingCfg.expanded ?? 0
		setExpanded(depth === 'all' ? true : depth > 0 ? expandedToDepth(table.getGroupedRowModel().rows, depth) : {})
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [groupingSig, data.length, groupingCfg])

	// The selection, published as a state slice: `{ ids, rows, count }`.
	useEffect(() => {
		if (!selection) return
		const byId = table.getCoreRowModel().rowsById
		const kept = new Map<string, T>()
		for (const id of Object.keys(rowSelection)) {
			if (!rowSelection[id]) continue
			const row = (byId[id]?.original as T | undefined) ?? selectedRows.current.get(id)
			if (row) kept.set(id, row)
		}
		selectedRows.current = kept
		const rows = [...kept.values()]
		const idKey = selection.idKey
		const ids = rows.map((r) => (idKey ? get(r, idKey) : (r as any)?._id ?? (r as any)?.id))
		getStateStore(selectionKey).getState().setLoad({ data: { ids, rows, count: rows.length }, status: 'success' })
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [rowSelection, selection, selectionKey, data])
	useEffect(() => () => {
		if (selection) getStateStore(selectionKey).getState().clear()
	}, [selection, selectionKey])
	// `keepAcrossPages: false`: a new page starts with nothing picked.
	useEffect(() => {
		if (selection?.keepAcrossPages === false) setRowSelection({})
	}, [pagination.pageIndex, selection?.keepAcrossPages])
	const selectedCount = Object.values(rowSelection).filter(Boolean).length

	// The header rows (one, or two with a group band); the lower row's cells
	// stick below the upper one (see `headerTopStyle`).
	const headerRowList = headerRows(table.getHeaderGroups())
	const theadRef = useHeaderRowTops(headerRowList.length)

	// The request maps. Every DataValue source resolves here: literals, the
	// route (`url`), global state, and the applied filters (`filter`). Blank
	// entries are dropped, so an unset filter leaves its key out of the call.
	const routeScope = useRouteScope()
	const stateVersion = useStateVersion(stateKeys(apiInfo?.query, apiInfo?.params, apiInfo?.body))
	const request = useMemo(() => {
		const scope = { ...routeScope, filters: appliedFilters }
		const q = resolveDataValues(apiInfo?.query, scope)
		const p = resolveDataValues(apiInfo?.params, scope)
		const b = resolveDataValues(apiInfo?.body, scope)
		// A URL `:param` that doesn't resolve (a blank filter with no fallback,
		// a route param not there yet) holds the call rather than firing a
		// broken URL.
		const ready = (urlParams ?? []).every((k) => p[k] !== undefined && p[k] !== "")
		return { q, p, b, ready }
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [apiInfo, appliedFilters, routeScope.params, routeScope.searchParams, stateVersion, (urlParams ?? []).join("|")])
	const requestSig = JSON.stringify([request.q, request.p, request.b])
	// Rows bound to a DataValue instead of fetched: re-read when the slice changes.
	const itemsVersion = useStateVersion(items?.type === "state" ? [items.key] : [])
	// Rows from a page load in `skeleton` mode: skeleton rows until it lands.
	const itemsPending = useSkeleton(items)
	const boundRows = useMemo(() => {
		if (!items) return undefined
		const v = resolveDataValue(items, routeScope)
		return (Array.isArray(v) ? v : []) as T[]
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [JSON.stringify(items), itemsVersion, routeScope.params, routeScope.searchParams])
	const sort = sortCfg ? sorting[0] : undefined
	const sortSig = sort ? `${sortFieldOf(sort.id)}:${sort.desc ? "desc" : "asc"}` : ""

	const fetchData = useCallback(async (): Promise<{ rows: T[]; total: number }> => {
		if (!request.ready) return { rows: [], total: 0 }
		const q: Record<string, any> = { ...request.q }
		const b: Record<string, any> = { ...request.b }
		// Keys without an explicit placement go where the endpoint reads them
		// from: it declares a body ⇒ body, else query.
		const inferred = apiSegments ? (apiSegments.body ? "body" : "query") : "body"

		// Server pagination: write the live page offset/limit (and search term,
		// when a searchKey is configured) into the placement slot.
		if (pageCfg) {
			const slot = (pageCfg.placement ?? inferred) === "query" ? q : b
			slot[pageCfg.offsetKey] = pagination.pageIndex * pagination.pageSize
			slot[pageCfg.limitKey] = pagination.pageSize
			if (pageCfg.searchKey) slot[pageCfg.searchKey] = serverSearch
		}

		// Server sort: the sorted column's field and direction, when there is one.
		if (sortCfg && sort) {
			const slot = (sortCfg.placement ?? inferred) === "query" ? q : b
			const order = sort.desc ? "desc" : "asc"
			slot[sortCfg.sortKey] = sortFieldOf(sort.id)
			slot[sortCfg.orderKey] = sortCfg.orderValues?.[order] ?? order
		}

		if (!api) return { rows: [], total: 0 }

		let result
		if (apiSegments) {
			// Declared segments ⇒ positional (query, param, body) args, so each
			// map reaches the slot the endpoint reads it from.
			result = await (api as (...args: unknown[]) => Promise<any>)(...callArgs(apiSegments, q, request.p, b))
		} else if (!isServer && !!apiInfo?.query) {
			// Hand-wired caller: keep the original single merged-arg shapes.
			result = await api({ ...q } as any)
		} else {
			result = await api({ ...q, ...b })
		}

		let rows: any = result
		apiInfo?.paths?.forEach((path) => {
			rows = rows?.[path]
		})
		rows = (rows ?? []) as T[]

		let totalCount = Array.isArray(rows) ? rows.length : 0
		if (pageCfg) {
			let t: any = result
			pageCfg.totalPath.forEach((path) => {
				t = t?.[path]
			})
			if (typeof t === "number") totalCount = t
		}

		return { rows, total: totalCount }
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [api, apiInfo, apiSegments, isServer, pageCfg, pagination.pageIndex, pagination.pageSize, serverSearch, requestSig, request.ready, sortSig])

	const { data: queryResult, refetch, isLoading, isFetching } = useQuery({
		// Server mode refetches on page/size/search change; client mode keeps a
		// single stable key (fetch once, page in memory) as before. `name` is in the
		// key because titles aren't unique — two same-titled tables must not share a
		// cache entry.
		// The resolved request (filters, route, state) and the server sort are part
		// of the key in both modes, so applying a filter or sorting calls the API.
		queryKey: isServer
			? [`table-data-${name}-${title}`, pagination.pageIndex, pagination.pageSize, serverSearch, requestSig, sortSig]
			: [`table-data-${name}-${title}`, requestSig, sortSig],
		queryFn: fetchData,
		enabled: !items,
		// Keep the current page visible while the next one loads (no empty flash).
		placeholderData: keepPreviousData,
	})

	const showSkeleton = itemsPending || ((isLoading || isFetching) && data.length === 0)
	// A filtered table says why it is empty: the call is held on a URL `:param`
	// no filter feeds yet, or the filters matched nothing.
	const filterNote = !filterContainer || data.length > 0
		? null
		: !request.ready ? 'Choose the filters to load rows.' : 'No rows match the filters.'
	// In the order the cells are drawn — left-pinned, centre, right-pinned — which
	// is what the <colgroup> widths and the merged-cell spans must follow. The
	// plain getVisibleLeafColumns() keeps the definition order and put a pinned
	// column's width on whichever column sat in its slot.
	const visibleColumns = displayedLeafColumns(table)
	const isResizing = !!table.getState().columnSizingInfo.isResizingColumn
	const headerCellClass = `${dtHeaderBgClass(theme.components.dataTable?.headerColor)}
		${dtHeaderTextClass(theme.components.dataTable?.headerTextColor, theme.components.dataTable?.headerColor)}
		${dtHeaderFontSizeClass(theme.components.dataTable?.headerFontSize)}
		${dtHeaderFontWeightClass(theme.components.dataTable?.headerFontWeight)}`
	// Plain cells clamp to the column's `meta.lines`, else the table's
	// `cellLines`; HTML cells (`meta.html`) render whole.
	const cellLinesFor = (column: Column<any, unknown>): number => {
		const meta = column.columnDef.meta as { html?: boolean; lines?: number } | undefined
		if (meta?.html) return 0
		return meta?.lines ?? cellLines
	}
	// Merged cells (`mergeRows` / `mergeColumns`) are computed for the rows on
	// screen — the current page, after sort and filter.
	// Exact-pixel mode: a width-less cell per row takes the container's slack.
	const fillerCell = resize.exact && <td key="__filler__" aria-hidden className="datatable-body-cell datatable-filler-cell" />
	const pageRows = table.getRowModel().rows
	// While grouped, a group already says what a merge said: no spans.
	const grouped = groupingState.length > 0
	const spans = useMemo(() => grouped ? new Map() : computeSpans(pageRows, visibleColumns), [pageRows, visibleColumns, grouped])
	const hasMerges = visibleColumns.some((c) => columnMeta(c).mergeRows || columnMeta(c).mergeColumns)
	// The first data column carries the group label (and the leaves' indent).
	const labelColumnId = visibleColumns.find((c) => !FIXED_COLUMN_IDS.has(c.id))?.id
	const showCount = groupingCfg?.showCount ?? true

	// Virtualised rows: past the threshold only the window in view is drawn,
	// spacer rows keep the scroll height (sticky header and pins still work).
	const scrollRef = useRef<HTMLDivElement>(null)
	const virtualize = !showSkeleton && !hasMerges && pageRows.length > VIRTUAL_ROW_THRESHOLD
	const virtualizer = useVirtualizer({
		count: virtualize ? pageRows.length : 0,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => 45,
		overscan: 12,
		scrollMargin: theadRef.current?.offsetHeight ?? 0,
		measureElement: (el) => el.getBoundingClientRect().height,
	})
	const virtualItems = virtualize ? virtualizer.getVirtualItems() : []
	const margin = virtualizer.options.scrollMargin
	const padTop = virtualize && virtualItems.length ? virtualItems[0].start - margin : 0
	const padBottom = virtualize && virtualItems.length ? virtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1].end - margin) : 0
	const rowsToDraw = virtualize ? virtualItems.map((v) => pageRows[v.index]).filter(Boolean) : pageRows
	const colCount = visibleColumns.length + (resize.exact ? 1 : 0)

	// The total row: every filtered leaf row summarised by its column's `aggregate`.
	const hasAggregates = visibleColumns.some((c) => !!columnMeta(c).aggregate)
	const totalRowAt = groupingCfg && hasAggregates ? groupingCfg.totalRow ?? 'none' : 'none'
	const aggregateText = (column: Column<any, unknown>, leaves: Row<any>[]): string => {
		const fn = columnMeta(column).aggregate
		if (!fn) return ''
		const v = aggregateValues(leaves.map((r) => r.getValue(column.id)), fn)
		if (v === undefined) return ''
		const format = columnMeta(column).format
		return fn === 'count' ? formatCell(v, { type: 'number' }, locale) : format ? formatCell(v, format, locale) : formatCell(v, { type: 'number', decimals: Number.isInteger(v) ? 0 : 2 }, locale)
	}
	const totalRow = totalRowAt !== 'none' && !showSkeleton && (
		<tr key="__total__" className={`datatable-body-row datatable-total-row ${totalRowAt === 'top' ? 'is-top' : ''}`}>
			{withFiller(visibleColumns, (c) => c, (column) => (
				<td key={column.id} className={`datatable-body-cell px-4 py-1 ${pinClass(column)}`} style={{ ...sizeStyle(column), textAlign: align[column.id], ...pinStyle(column) }}>
					<div className="min-h-10 flex flex-col justify-center">
						{column.id === labelColumnId && !columnMeta(column).aggregate ? 'Total' : aggregateText(column, table.getFilteredRowModel().rows)}
					</div>
				</td>
			), fillerCell)}
		</tr>
	)

	const groupRow = (row: Row<T>) => {
		// `getLeafRows()` also returns the nested group rows: summaries and the
		// count read the records only.
		const records = row.getLeafRows().filter((r) => !r.getIsGrouped())
		const groupColumn = table.getColumn(row.groupingColumnId ?? '')
		const value = row.groupingValue
		const format = groupColumn ? columnMeta(groupColumn).format : undefined
		const label = format ? formatCell(value, format, locale) : String(value ?? '—')
		const isOpen = row.getIsExpanded()
		return (
			<tr key={row.id} className="datatable-body-row datatable-group-row">
				{withFiller(row.getVisibleCells(), (cell) => cell.column, (cell) => (
					<td key={cell.id} className={`datatable-body-cell px-4 py-1 ${pinClass(cell.column)}`} style={{ ...sizeStyle(cell.column), textAlign: cell.column.id === labelColumnId ? 'start' : align[cell.column.id], ...pinStyle(cell.column) }}>
						<div className="min-h-10 flex flex-col justify-center">
							{cell.column.id === labelColumnId ? (
								<button
									type="button"
									className="datatable-group-toggle"
									style={{ paddingInlineStart: row.depth * 16 }}
									aria-expanded={isOpen}
									onClick={row.getToggleExpandedHandler()}
								>
									<GroupChevron size={14} />
									<span className="datatable-group-label">{headerLabel(groupColumn, row.groupingColumnId ?? '')}: {label}</span>
									{showCount && <span className="datatable-group-count">({records.length})</span>}
								</button>
							) : aggregateText(cell.column, records)}
						</div>
					</td>
				), fillerCell)}
			</tr>
		)
	}

	const leafRow = (row: Row<T>, index: number) => {
		const rowLook = resolveStyles(rowStyles, { row: row.original, index })
		return (
			<tr key={row.id} data-index={virtualize ? index : undefined} ref={virtualize ? virtualizer.measureElement : undefined}
				className={`datatable-body-row ${rowNavigate ? 'cursor-pointer' : ''} ${row.getIsSelected() ? 'is-selected' : ''}
				${dtRowHoverClass(theme.components.dataTable?.rowHoverColor)}`}
				onClick={rowNavigate ? (e) => onRowClick(e, row.original) : undefined}>
				{withFiller(row.getVisibleCells(), cell => cell.column, cell => {
					// Merged cells: a covered cell is not drawn, the first one spans.
					const span = spans.get(spanKey(row.id, cell.column.id))
					if (span === null) return null
					const meta = columnMeta(cell.column)
					const Cell = meta.rowHeader ? 'th' : 'td'
					const surface = !cell.column.getIsPinned() && !meta.rowHeader && !(span && span.rowSpan > 1)
					const look = FIXED_COLUMN_IDS.has(cell.column.id)
						? { className: '', tone: undefined }
						: cellLook(resolveStyles(meta.styles, { value: cell.getValue(), row: row.original, index }), rowLook, surface)
					return (
						<Cell
							key={cell.id}
							scope={meta.rowHeader ? 'row' : undefined}
							rowSpan={span?.rowSpan}
							colSpan={span?.colSpan}
							data-accent-color={look.tone}
							className={`datatable-body-cell px-4 py-1 ${pinClass(cell.column)} ${meta.rowHeader ? 'datatable-row-header' : ''} ${span && span.rowSpan > 1 ? 'datatable-cell-merged' : ''} ${look.className}`}
							style={{ ...(span && span.colSpan > 1 ? {} : sizeStyle(cell.column)), textAlign: align[cell.column.id], ...pinStyle(cell.column), ...(grouped && cell.column.id === labelColumnId ? { paddingInlineStart: 16 + row.depth * 16 } : {}) }}
						>
							<div className="min-h-10 flex flex-col justify-center">
								<ClampedCell lines={cellLinesFor(cell.column)}>
									{renderCellWithHighlight(cell, globalFilter, locale)}
								</ClampedCell>
							</div>
						</Cell>
					)
				}, fillerCell)}
			</tr>
		)
	}
	// Cell widths and sticky offsets are CSS variables on the <table>, so the
	// body needn't re-render (and HTML cells re-sanitise) on every mouse move:
	// while a drag lasts the same element is handed back and React skips it.
	const tableBody = useMemo(() => (
		<tbody className={`datatable-tbody ${isPageChanging ? 'page-changing' : ''} ${isFiltering ? 'filtering' : ''}`}>
			{showSkeleton
				? Array.from({ length: scrollMode ? 10 : pagination.pageSize }).map((_, rowIndex) => (
					<tr key={`skeleton-${rowIndex}`} className="datatable-body-row">
						{withFiller(visibleColumns, column => column, column => (
							<td
								key={`skeleton-cell-${column.id}`}
								className={`datatable-body-cell px-4 py-1 ${pinClass(column)}`}
								style={{ ...sizeStyle(column), textAlign: align[column.id], ...pinStyle(column) }}
							>
								<div className="min-h-10 flex flex-col justify-center">
									<SkeletonBlock height={16} />
								</div>
							</td>
						), fillerCell)}
					</tr>
				))
				: <>
					{totalRowAt === 'top' && totalRow}
					{padTop > 0 && <tr className="datatable-virtual-spacer" aria-hidden><td colSpan={colCount} style={{ height: padTop }} /></tr>}
					{rowsToDraw.map((row) => {
						const index = virtualize ? pageRows.indexOf(row) : pageRows.indexOf(row)
						return row.getIsGrouped() ? groupRow(row) : leafRow(row, index)
					})}
					{padBottom > 0 && <tr className="datatable-virtual-spacer" aria-hidden><td colSpan={colCount} style={{ height: padBottom }} /></tr>}
					{totalRowAt === 'bottom' && totalRow}
				</>}
			{filterNote && !showSkeleton && (
				<tr className="datatable-body-row">
					<td colSpan={visibleColumns.length + (resize.exact ? 1 : 0)} className="datatable-body-cell datatable-filter-note">
						{filterNote}
					</td>
				</tr>
			)}
		</tbody>
	// eslint-disable-next-line react-hooks/exhaustive-deps
	), [isResizing ? 'resizing' : {}])

	useEffect(() => {
		if (boundRows) {
			setData(boundRows)
			setTotal(boundRows.length)
			return
		}
		setData(queryResult?.rows ?? [])
		setTotal(queryResult?.total ?? 0)
	}, [queryResult, boundRows])

	// Debounce the search box into the server query and reset to the first page
	// whenever the term changes (only when server search is configured).
	useEffect(() => {
		if (!isServer || !pageCfg?.searchKey) return undefined
		const t = setTimeout(() => {
			setServerSearch(globalFilter)
			setPagination((p) => ({ ...p, pageIndex: 0 }))
		}, 300)
		return () => clearTimeout(t)
	}, [globalFilter, isServer, pageCfg?.searchKey])


	// CSV export (see `canExport` / the `ExportTable` action): the view as seen —
	// rows after search, filters and sort (leaf rows only), the visible columns
	// in their current order, the header labels first.
	const exportCsv = () => {
		const opts = exportOptions ?? {}
		const ordered = [...fixedLeft, ...layout.order]
		const cols = (opts.columns === 'all'
			? table.getAllLeafColumns().slice().sort((a, b) => ordered.indexOf(a.id) - ordered.indexOf(b.id))
			: displayedLeafColumns(table)
		).filter((c) => !FIXED_COLUMN_IDS.has(c.id))
		const rows = (isServer || opts.rows === 'page' ? table.getRowModel().rows : table.getSortedRowModel().flatRows)
			.filter((r) => !r.getIsGrouped())
		const raw = opts.values === 'raw'
		const text = (row: Row<T>, column: Column<any, unknown>): unknown => {
			const value = row.getValue(column.id)
			const meta = columnMeta(column)
			if (raw) return value !== null && typeof value === 'object' ? JSON.stringify(value) : value
			if (meta.template) return htmlText(renderHtmlCell(meta.template, row.original, meta.format ? formatCell(value, meta.format, locale) : value).html)
			if (meta.format) return formatCell(value, meta.format, locale)
			return value !== null && typeof value === 'object' ? JSON.stringify(value) : value
		}
		const csv = toCsv(cols.map((c) => headerLabel(c, c.id)), rows.map((r) => cols.map((c) => text(r, c))))
		downloadCsv(csv, csvFileName(opts.fileName, name || 'table'))
	}
	const exportRef = useRef(exportCsv)
	exportRef.current = exportCsv

	useEffect(() => {
		// A reload starts the selection afresh (the rows may be gone).
		updateFnCtxs(name ?? '', async () => {
			setRowSelection({})
			return refetch()
		})
		updateFnCtxs(`export:${name}`, () => exportRef.current())
		updateFnCtxs("modalEdit", (f: boolean) => setOpenModal(f))
	}, [name, updateFnCtxs, refetch])

	// Handle page change animation
	useEffect(() => {
		if (prevPageIndexRef.current !== pagination.pageIndex) {
			setIsPageChanging(true)
			prevPageIndexRef.current = pagination.pageIndex

			const timer = setTimeout(() => {
				setIsPageChanging(false)
			}, 300) // Match this with CSS animation duration

			return () => clearTimeout(timer)
		}
		return undefined
	}, [pagination.pageIndex])

	// Handle filter change animation
	useEffect(() => {
		const hasFilterChanged = JSON.stringify(prevColumnFiltersRef.current) !== JSON.stringify(columnFilters)

		if (hasFilterChanged && columnFilters.length >= 0) {
			setIsFiltering(true)
			prevColumnFiltersRef.current = columnFilters

			const timer = setTimeout(() => {
				setIsFiltering(false)
			}, 400) // Slightly longer animation for filter effect

			return () => clearTimeout(timer)
		}
		return undefined
	}, [columnFilters])



	// Add: the same modal as Edit, opened over an empty context so the form's
	// `<name>._id` condition shows its Create button instead of Update.
	const openAdd = () => {
		dataCtx?.updateContextData(name ?? '', {})
		setOpenModal(true)
	}
	const addLabel = addButton?.label ?? 'Add'
	const addIcon = addButton?.icon ?? 'puls'
	const addVariant = addButton?.variant ?? 'contained'
	// Server mode can only search when the API takes a term; either mode
	// respects the config's switch.
	const showSearch = canSearchAllColumns && (!isServer || !!pageCfg?.searchKey)
	// Custom filters: the form is the table's own (see ./DataTableFilter); only
	// an Apply / Clear reaches `applyFilters`, which refetches from page 1.
	const hasFilters = !!filterContainer && !!renderFilterBins
	const showFilterButton = hasFilters && filterDisplay !== 'inline'
	const filterForm = hasFilters && (
		<DataTableFilter
			container={filterContainer}
			renderBins={renderFilterBins}
			defaults={initialFilters}
			applied={appliedFilters}
			onApply={applyFilters}
			button={filterButton}
			display={filterDisplay}
		/>
	)
	// One gap between the title, the Add button and the search box.
	const gapClass = HEADER_GAPS[headerGap ?? '2'] ?? HEADER_GAPS['2']
	const showColumnsMenu = canChooseColumns && dataIds.length > 0
	const userCanGroup = !!groupingCfg && groupingCfg.userCanGroup !== false
	const menuItems = layout.order.map((id) => ({
		id,
		label: headerLabel(table.getColumn(id), id),
		locked: (lockedColumns ?? []).includes(id),
		visible: layout.visibility[id] !== false,
	}))
	const columnsMenu = showColumnsMenu && (
		<DataTableColumnsMenu
			items={menuItems}
			onToggle={(id, visible) => layout.setVisibility((old) => ({ ...old, [id]: visible }))}
			onReorder={layout.setOrder}
			grouping={userCanGroup ? groupingState : undefined}
			onGroupingChange={userCanGroup ? layout.setGrouping : undefined}
			onReset={() => {
				const fresh = layout.reset()
				resize.replace(fresh.sizing)
				expandedFor.current = null
			}}
			changed={layout.changed}
			button={columnsButton}
		/>
	)
	const exportLabel = exportButton?.label ?? 'Export'
	const exportControl = canExport && (
		<span title={isServer ? 'Exports the current page' : undefined}>
			<ButtonBase label={exportLabel} icon={exportButton?.icon ?? 'download'} variant={exportButton?.variant ?? 'outlined'} onClick={() => exportCsv()} />
		</span>
	)
	const selectionBar = selection && selectedCount > 0 && (
		<span className="datatable-selection-bar" role="status">
			{selectedCount} selected
			<button type="button" onClick={() => setRowSelection({})}>Clear</button>
		</span>
	)

	return (<Tooltip.Provider delayDuration={300}><div className="datatable-container">

		<div className={`datatable-header ${gapClass}`}>
			<div className="datatable-title">{title}</div>

			{(canAdd || showSearch || showFilterButton || showColumnsMenu || canExport || !!selectionBar) && (
				<div className="datatable-controls-wrapper">
					<div className={`flex items-center ${gapClass}`}>
						{canAdd && (addLabel
							? <ButtonBase label={addLabel} icon={addIcon} variant={addVariant} onClick={openAdd} />
							: (
								<IconButton
									type="button"
									variant={ADD_ICON_VARIANTS[addVariant] ?? 'solid'}
									color={theme.components.button?.color as ThemeProps['accentColor'] | undefined}
									className="cursor-pointer"
									aria-label="Add"
									title="Add"
									onClick={openAdd}
								>
									<Icon icon={addIcon} size={14} />
								</IconButton>
							))}
						{selectionBar}
						{showFilterButton && filterForm}
						{columnsMenu}
						{exportControl}
						{showSearch && (
							<TextField
								ref={filterRef}
								width={200}
								placeholder="Search all columns..."
								value={globalFilter ?? ''}
								dataType="text"
								isFixedHeight={false}
								onChange={(e) => setGlobalFilter(e.target.value)} />
						)}
					</div>

					{showSearch && (
						<span className="datatable-row-count">
							{isServer
								? `${total} total rows`
								: `${table.getFilteredRowModel().rows.length} of ${table.getCoreRowModel().rows.length} total rows`}
						</span>
					)}
				</div>
			)}
		</div>

		{hasFilters && filterDisplay === 'inline' && filterForm}

		<div className="datatable-table-wrapper">
			<div ref={scrollRef} className={`datatable-scroll ${scrollMode ? 'is-scroll-mode' : ''}`}>
				<table
					ref={resize.tableRef}
					className={`datatable-table ${isResizing ? 'is-resizing' : ''}`}
					style={{ ...sizeVars(table), width: table.getTotalSize(), minWidth: '100%' }}>
					{/* Column widths live on <col>s: `table-layout: fixed` reads the first
					    row otherwise, which spanning header cells would confuse. */}
					<colgroup>
						{withFiller(visibleColumns, column => column, column => <col key={column.id} style={sizeStyle(column)} />, resize.exact && <col key="__filler__" />)}
					</colgroup>
					<thead ref={theadRef} className="datatable-thead">

					{headerRowList.map((headerRow, rowIndex) => (
						<tr key={headerRow.id} className="datatable-header-row">
							{withFiller(headerRow.cells, cell => cell.header.column, ({ header, kind, colSpan, rowSpan }) => (
								kind === 'group'
									? <th key={header.id} colSpan={colSpan} className={`datatable-header-cell datatable-group-header ${pinClass(header.column)} ${headerCellClass}`} style={{ ...headerPinStyle(header.column), ...headerTopStyle(rowIndex) }}>
										<div className="datatable-header-content">{flexRender(header.column.columnDef.header, header.getContext())}</div>
									</th>
									: <th key={header.id} data-column-id={header.column.id} colSpan={colSpan} rowSpan={rowSpan} className={`datatable-header-cell ${pinClass(header.column)}
									 ${headerCellClass}
									 ${dtHeaderHoverClass(theme.components.dataTable?.headerHoverColor)} cursor-pointer`}
									style={{ ...sizeStyle(header.column), ...pinStyle(header.column), ...headerTopStyle(rowIndex) }}>
									<div className="datatable-header-content" >
										{flexRender(header.column.columnDef.header, header.getContext())}
										{!FIXED_COLUMN_IDS.has(header.column.id) && (
											<button
												type="button"
												className={`datatable-pin-icon ${header.column.getIsPinned() ? 'is-pinned' : ''}`}
												aria-label={header.column.getIsPinned() ? 'Unpin column' : 'Pin column'}
												aria-pressed={!!header.column.getIsPinned()}
												title={header.column.getIsPinned() ? 'Unpin column' : 'Pin column'}
												onClick={() => header.column.pin(header.column.getIsPinned() ? false : 'left')}
											>
												{header.column.getIsPinned() ? <PinOff size={14} /> : <Pin size={14} />}
											</button>
										)}
										{(!isServer || !!sortCfg) && header.column.getCanSort() && (
											<span className="datatable-sort-icon" onClick={header.column.getToggleSortingHandler()}>
												{{
													asc: <Icon icon="arrowUp" size={14} className="datatable-sort-icon-bounce" />,
													desc: <Icon icon="arrowDown" size={14} className="datatable-sort-icon-bounce" />,
												}[header.column.getIsSorted() as string] ?? <Icon icon="arrowDownUp" size={14} className="datatable-sort-icon-default" />}

											</span>
										)}
										{!isServer && header.column.getCanFilter() && (
											<Popover.Root>
												<Popover.Trigger asChild>
													<ListFilter size={14} className="datatable-filter-icon" />
												</Popover.Trigger>
												<Popover.Portal>
													<Popover.Content
														className="datatable-popover-content"
														side="bottom"
														align="center"
														sideOffset={5}
													>
														<div className="p-1">
															<div className="flex items-center justify-between mb-3">
																<div className="text-xs font-medium text-gray-700 dark:text-gray-300">
																	Filter {typeof header.column.columnDef.header === 'function' ? header.column.columnDef.header(header.getContext()) : header.column.columnDef.header}
																</div>
																<button
																	onClick={() => header.column.setFilterValue(undefined)}
																	className="text-xs text-[var(--accent-11,#2563eb)] hover:text-[var(--accent-12,#1e40af)] font-medium"
																>
																	Clear All
																</button>


															</div>
															<div className="space-y-1 max-h-48 overflow-y-auto">
																{columnValues[header.column.id]?.map((value) => {
																	const currentFilter = header.column.getFilterValue() as string[] || [];
																	const isChecked = currentFilter.includes(value);

																	return (
																		<div key={value} className="flex  p-1 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
																			<input
																				type="checkbox"
																				checked={isChecked}
																				className="mr-2"
																				onChange={(e) => {
																					const checked = e.target.checked;
																					const currentValues = header.column.getFilterValue() as string[] || [];
																					let newValues: string[];

																					if (checked) {
																						newValues = [...currentValues, value];
																					} else {
																						newValues = currentValues.filter(v => v !== value);
																					}


																					header.column.setFilterValue(newValues.length > 0 ? newValues : undefined);
																				}}
																			/>
																			<Text as="span" size="3">
																				{value}
																			</Text>
																		</div>
																	);
																})}
															</div>
															{columnValues[header.column.id]?.length > 0 && (
																<div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
																	<div className="flex space-x-2 justify-around">
																		<button
																			onClick={() => {
																				header.column.setFilterValue(columnValues[header.column.id]);
																			}}
																			className=" text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium cursor-pointer"
																		>
																			Select All
																		</button>
																		<span className="text-xs text-gray-400 dark:text-gray-500">|</span>
																		<button
																			onClick={() => header.column.setFilterValue(undefined)}
																			className=" text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium cursor-pointer"
																		>
																			Deselect All
																		</button>
																	</div>
																</div>
															)}
														</div>
														<Popover.Arrow className="fill-white" />
													</Popover.Content>
												</Popover.Portal>
											</Popover.Root>
										)}
									</div>
									<ColumnResizeHandle header={header} table={table} resize={resize} />
								</th>
							), resize.exact && <th key="__filler__" aria-hidden className={`datatable-header-cell datatable-filler-cell ${headerCellClass}`} />)}
						</tr>
					))}
				</thead>

				{tableBody}
				</table>
			</div>
			{scrollMode ? (
			<div className="datatable-footer">
				<span className="datatable-footer-count">
					{`${table.getFilteredRowModel().rows.length} of ${table.getCoreRowModel().rows.length} rows`}
				</span>
			</div>
			) : (
			<div className="datatable-footer">
				<div className="flex items-center space-x-6 text-sm text-gray-700 dark:text-gray-300">
						<div className="flex items-center space-x-2">
							<span>Rows per page:</span>
							<select
								value={table.getState().pagination.pageSize}
								onChange={e => {
									table.setPageSize(Number(e.target.value))
								}}
								className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-8,#3b82f6)] hover:bg-[var(--accent-5,#93c5fd)]"
							>
								{pageSizeOptions.map(pageSize => (
									<option key={pageSize} value={pageSize}>
										{pageSize}
									</option>
								))}
							</select>
						</div>
						<div>
							{(() => {
								// Grouped, the pages hold group rows (and the open groups' rows), so
								// the count is of those, with the records they stand for beside it.
								const leaves = isServer ? total : table.getFilteredRowModel().rows.length
								const totalRows = grouped ? table.getPrePaginationRowModel().rows.length : leaves
								const { pageIndex, pageSize } = table.getState().pagination
								const from = totalRows === 0 ? 0 : pageIndex * pageSize + 1
								const to = Math.min((pageIndex + 1) * pageSize, totalRows)
								return grouped
									? `Showing ${from} to ${to} of ${totalRows} rows · ${leaves} records`
									: `Showing ${from} to ${to} of ${totalRows} entries`
							})()}
						</div>
					</div>

					<div className="flex items-center space-x-2">
						<button
							onClick={() => table.setPageIndex(0)}
							disabled={!table.getCanPreviousPage()}
							className="px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							<ChevronFirst className="w-4 h-4" />
						</button>
						<button
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
							className="px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							<ChevronLeft className="w-4 h-4" />
						</button>

						<div className="flex items-center space-x-1">
							{(() => {
								const currentPage = table.getState().pagination.pageIndex + 1;
								const totalPages = table.getPageCount();
								const pages = [];

								// Always show first page
								if (totalPages > 0) pages.push(1);

								// Show pages around current page
								const start = Math.max(2, currentPage - 1);
								const end = Math.min(totalPages - 1, currentPage + 1);

								// Add ellipsis if there's a gap
								if (start > 2) pages.push('...');

								// Add pages around current
								for (let i = start; i <= end; i++) {
									if (i !== 1 && i !== totalPages) pages.push(i);
								}

								// Add ellipsis if there's a gap
								if (end < totalPages - 1) pages.push('...');

								// Always show last page
								if (totalPages > 1) pages.push(totalPages);

								return pages.map((page, index) => (
									page === '...' ? (
										<span key={`ellipsis-${index}`} className="px-2 py-1 text-sm text-gray-500 dark:text-gray-400">
											...
										</span>
									) : (
										<button
											key={page}
											onClick={() => table.setPageIndex(Number(page) - 1)}
											className={`px-3 py-1 text-sm cursor-pointer border rounded transition-colors ${currentPage === page
													? `${dtPaginationBgClass(theme.components.dataTable?.paginationButtonColor)}
													${dtPaginationHoverClass(theme.components.dataTable?.paginationButtonHoverColor)}
													text-white ring-1 ${dtRingClass(theme.components.dataTable?.paginationButtonColor)}`
												: 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
												}`}
										>
											{page}
										</button>
									)
								));
							})()}
						</div>

						<button
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
							className="px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							<ChevronRight className="w-4 h-4" />
						</button>
						<button
							onClick={() => table.setPageIndex(table.getPageCount() - 1)}
							disabled={!table.getCanNextPage()}
							className="px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							<ChevronLast className="w-4 h-4" />
						</button>
					</div>
			</div>
			)}
		</div>

		<Modal
			id={name}
			open={openModal}
			onOpenChange={(open) => {
				setOpenModal(open);
				// Clear context after the close animation finishes so the modal
				// content doesn't change while it is still fading out
				if (!open) {
					setTimeout(() => {
						dataCtx?.updateContextData(name ?? '', {});
					}, 200);
				}
			}}
			hiddenTrigger={true}
			maxWidth={modalMaxWidth}
			minWidth={modalMinWidth}
			maxHeight={modalMaxHeight}
		>
			{modalContainer}
		</Modal>
		<ConfirmBox
			id="confirmBox"
			open={openConfirmBox}
			onOpenChange={() => setOpenConfirmBox(!openConfirmBox)}
			onConfirm={handleConfirm}
			title={apiDeleteInfo?.confirmBox?.title ?? "Delete item"}
			description={apiDeleteInfo?.confirmBox?.description ?? "This action cannot be undone. Are you sure you want to continue?"}
		/>
	</div></Tooltip.Provider>)
}