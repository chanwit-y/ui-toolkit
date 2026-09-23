import * as Popover from "@radix-ui/react-popover"
import * as Tooltip from "@radix-ui/react-tooltip"
import { IconButton, Text, type ThemeProps } from "@radix-ui/themes"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type Column, type ColumnDef, type ColumnFiltersState, type ColumnPinningState, type PaginationState, type SortingState } from "@tanstack/react-table"
import { ColumnResizeHandle, pinStyle, sizeStyle, sizeVars, useColumnResize, withFiller } from "./dataTableResize"
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, ListFilter, Pin, PinOff } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { dtHeaderBgClass, dtHeaderTextClass, dtHeaderFontSizeClass, dtHeaderFontWeightClass, dtHeaderHoverClass, dtPaginationBgClass, dtPaginationHoverClass, dtRingClass, dtRowHoverClass } from "../util/constant"
import type { ButtonAction, DataTableProps } from "./@types"
import { ButtonBase } from "./Button"
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
import { resolveDataValues } from "./core/dataValue"
import { DataTableFilter } from "./DataTableFilter"
import { ClampedCell, DEFAULT_CELL_LINES } from "./ClampedCell"
import { columnMeta, computeSpans, headerPinStyle, headerRows, headerTopStyle, spanKey, useHeaderRowTops } from "./dataTableLayout"

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
const renderCellWithHighlight = (cell: any, globalFilter: string) => {
	const cellValue = cell.getValue()
	const cellContent = flexRender(cell.column.columnDef.cell, cell.getContext())

	// HTML columns (`ColumnDef.html`) always render their markup — the search
	// still matches them by accessor value, they just aren't highlighted.
	if (cell.column.columnDef.meta?.html) return cellContent

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
	filterContainer,
	renderFilterBins,
	filterDefaults,
	filterButton,
	filterDisplay,
	urlParams,
	sortFields,

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
	const pageCfg = apiInfo?.pagination
	const isServer = !!pageCfg
	const pageSizeOptions = pageCfg?.pageSizeOptions ?? [5, 10, 20, 30, 40, 50]

	const [data, setData] = useState<T[]>([])
	const [total, setTotal] = useState(0)
	const [globalFilter, setGlobalFilter] = useState('')
	// Debounced search term sent to the API in server mode (searchKey present).
	const [serverSearch, setServerSearch] = useState('')
	// Server-side sort (`api.sort`): the header icons drive the request instead
	// of sorting the fetched rows. The field sent is the column's `sortField`,
	// else its accessor; the config's `default` seeds the state.
	const sortCfg = apiInfo?.sort
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
	// Column pinning: the config's `pin`s seed it (the action column always
	// leads on the left); the header toggle then changes it for the session.
	const hasActionColumn = canEdit || canDelete
	const initialPinning = useMemo<ColumnPinningState>(() => ({
		left: [...(hasActionColumn ? [ACTION_COLUMN_ID] : []), ...(pinnedColumns?.left ?? [])],
		right: [...(pinnedColumns?.right ?? [])],
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}), [hasActionColumn, (pinnedColumns?.left ?? []).join('|'), (pinnedColumns?.right ?? []).join('|')])
	const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(initialPinning)
	useEffect(() => setColumnPinning(initialPinning), [initialPinning])
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
							size="2"
							color={editButtonColor}
							className="cursor-pointer"
							aria-label="Edit row"
							title="Edit"
							onClick={() => {
								dataCtx?.updateContextData(name ?? '', row.original)
								setOpenModal(true)
							}}
						>
							<Icon icon="edit" size={14} />
						</IconButton>
					)}
					{canDelete && (
						<IconButton
							type="button"
							variant="soft"
							size="2"
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
							<Icon icon="trash" size={14} />
						</IconButton>
					)}
				</div>
			)
			,
			enableSorting: false,
			enableColumnFilter: false,
			size: 40,
			minSize: 80,
			maxSize: 80,
			enableResizing: false,
		}

		return canEdit || canDelete ? [actionIconColumn, ...columns] : [...columns]
	}, [columns, canDelete, canEdit, dataCtx, editButtonColor, deleteButtonColor, name, apiDeleteInfo, executeActions])

	// Column resizing (see ./dataTableResize): a column that declares a `size`
	// puts the table in exact-pixel mode from the first paint.
	const resize = useColumnResize(
		canResizeColumns,
		columns.some((col: { size?: number }) => typeof col.size === 'number'),
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
		},
		onGlobalFilterChange: setGlobalFilter,
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
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onPaginationChange: setPagination,
		manualPagination: isServer,
		manualFiltering: isServer,
		...(isServer ? { rowCount: total } : {}),
	})

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
		// Keep the current page visible while the next one loads (no empty flash).
		placeholderData: keepPreviousData,
	})

	const showSkeleton = (isLoading || isFetching) && data.length === 0
	// A filtered table says why it is empty: the call is held on a URL `:param`
	// no filter feeds yet, or the filters matched nothing.
	const filterNote = !filterContainer || data.length > 0
		? null
		: !request.ready ? 'Choose the filters to load rows.' : 'No rows match the filters.'
	const visibleColumns = table.getVisibleLeafColumns()
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
	const pageRows = table.getPaginationRowModel().rows
	const spans = useMemo(() => computeSpans(pageRows, visibleColumns), [pageRows, visibleColumns])
	// Exact-pixel mode: a width-less cell per row takes the container's slack.
	const fillerCell = resize.exact && <td key="__filler__" aria-hidden className="datatable-body-cell datatable-filler-cell" />
	// Cell widths and sticky offsets are CSS variables on the <table>, so the
	// body needn't re-render (and HTML cells re-sanitise) on every mouse move:
	// while a drag lasts the same element is handed back and React skips it.
	const tableBody = useMemo(() => (
		<tbody className={`datatable-tbody ${isPageChanging ? 'page-changing' : ''} ${isFiltering ? 'filtering' : ''}`}>
			{showSkeleton
				? Array.from({ length: pagination.pageSize }).map((_, rowIndex) => (
					<tr key={`skeleton-${rowIndex}`} className="datatable-body-row">
						{withFiller(visibleColumns, column => column, column => (
							<td
								key={`skeleton-cell-${column.id}`}
								className={`datatable-body-cell px-4 py-1 ${pinClass(column)}`}
								style={{ ...sizeStyle(column), textAlign: align[column.id], ...pinStyle(column) }}
							>
								<div className="min-h-10 flex flex-col justify-center">
									<div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
								</div>
							</td>
						), fillerCell)}
					</tr>
				))
				: pageRows.map(row => (
					<tr key={row.id} className={`datatable-body-row ${rowNavigate ? 'cursor-pointer' : ''}
					${dtRowHoverClass(theme.components.dataTable?.rowHoverColor)}`}
						onClick={rowNavigate ? (e) => onRowClick(e, row.original) : undefined}>
						{withFiller(row.getVisibleCells(), cell => cell.column, cell => {
							// Merged cells: a covered cell is not drawn, the first one spans.
							const span = spans.get(spanKey(row.id, cell.column.id))
							if (span === null) return null
							const meta = columnMeta(cell.column)
							const Cell = meta.rowHeader ? 'th' : 'td'
							return (
								<Cell
									key={cell.id}
									scope={meta.rowHeader ? 'row' : undefined}
									rowSpan={span?.rowSpan}
									colSpan={span?.colSpan}
									className={`datatable-body-cell px-4 py-1 ${pinClass(cell.column)} ${meta.rowHeader ? 'datatable-row-header' : ''} ${span && span.rowSpan > 1 ? 'datatable-cell-merged' : ''}`}
									style={{ ...(span && span.colSpan > 1 ? {} : sizeStyle(cell.column)), textAlign: align[cell.column.id], ...pinStyle(cell.column) }}
								>
									<div className="min-h-10 flex flex-col justify-center">
										<ClampedCell lines={cellLinesFor(cell.column)}>
											{renderCellWithHighlight(cell, globalFilter)}
										</ClampedCell>
									</div>
								</Cell>
							)
						}, fillerCell)}
					</tr>
				))}
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
		setData(queryResult?.rows ?? [])
		setTotal(queryResult?.total ?? 0)
	}, [queryResult])

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


	useEffect(() => {
		updateFnCtxs(name ?? '', refetch)
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

	return (<Tooltip.Provider delayDuration={300}><div className="datatable-container">

		<div className={`datatable-header ${gapClass}`}>
			<div className="datatable-title">{title}</div>

			{(canAdd || showSearch || showFilterButton) && (
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
						{showFilterButton && filterForm}
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
			<div className="datatable-scroll">
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
									: header.column.columnDef.header && <th key={header.id} data-column-id={header.column.id} colSpan={colSpan} rowSpan={rowSpan} className={`datatable-header-cell ${pinClass(header.column)}
									 ${headerCellClass}
									 ${dtHeaderHoverClass(theme.components.dataTable?.headerHoverColor)} cursor-pointer`}
									style={{ ...sizeStyle(header.column), ...pinStyle(header.column), ...headerTopStyle(rowIndex) }}>
									<div className="datatable-header-content" >
										{flexRender(header.column.columnDef.header, header.getContext())}
										{header.column.id !== ACTION_COLUMN_ID && (
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
														<div className="p-1 bg-white dark:bg-gray-900 ">
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
								const totalRows = isServer ? total : table.getFilteredRowModel().rows.length
								const { pageIndex, pageSize } = table.getState().pagination
								const from = totalRows === 0 ? 0 : pageIndex * pageSize + 1
								const to = Math.min((pageIndex + 1) * pageSize, totalRows)
								return `Showing ${from} to ${to} of ${totalRows} entries`
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