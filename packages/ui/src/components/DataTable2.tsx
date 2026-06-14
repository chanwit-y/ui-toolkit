import * as Popover from "@radix-ui/react-popover"
import { Text, type ThemeProps } from "@radix-ui/themes"
import { useQuery } from "@tanstack/react-query"
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef, type ColumnFiltersState, type PaginationState, type SortingState } from "@tanstack/react-table"
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, ListFilter } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { dtActionButtonClass, dtHeaderBgClass, dtHeaderTextClass, dtHeaderFontSizeClass, dtHeaderFontWeightClass, dtHeaderHoverClass, dtPaginationBgClass, dtPaginationHoverClass, dtRingClass, dtRowHoverClass, tableBgColors, tableHoverBgColors } from "../util/constant"
import type { ButtonAction, DataTableProps } from "./@types"
import { ConfirmBox } from "./ConfirmBox"
import Icon from "./Icon"
import { Modal } from "./Modal"
import { useSnackbar } from "./Snackbar"
import { TextFieldBase as TextField } from "./TextField"
import { useLoading, useTheme } from "./context"
import { useData } from "./context/DataProvider"
import { useStord } from "./core/stord"

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

// Enhanced cell renderer with highlighting support
const renderCellWithHighlight = (cell: any, globalFilter: string) => {
	const cellValue = cell.getValue()
	const cellContent = flexRender(cell.column.columnDef.cell, cell.getContext())

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
	columns = [],
	canSearchAllColumns = false,
	modalContainer,
	modalMaxWidth,
	modalMinWidth,
	modalMaxHeight,
	canEdit = false,
	canDelete = false,
	align = {},

	// editModalContainer,
}: DataTableProps) => {

	const [openModal, setOpenModal] = useState(false)
	const [openConfirmBox, setOpenConfirmBox] = useState(false)

	const [data, setData] = useState<T[]>([])
	const [globalFilter, setGlobalFilter] = useState('')
	const [sorting, setSorting] = useState<SortingState>([])
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	})
	const [isPageChanging, setIsPageChanging] = useState(false)
	const [isFiltering, setIsFiltering] = useState(false)
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




	const executeActions = useCallback(async (
		actionsToExecute: ButtonAction[] = [],
		_event?: React.MouseEvent<HTMLButtonElement>
	) => {
		let loaderId: string | undefined;

		for (const action of actionsToExecute) {
			switch (action) {
				case 'SubmitFormToDeleteAPI':
					if (apiDeleteInfo && selectedRow && apiDeleteInfo.params?.["id"] && selectedRow[apiDeleteInfo.params["id"]] && apiDelete) {
						await apiDelete({ id: selectedRow[apiDeleteInfo.params["id"]] || selectedRow[apiDeleteInfo.params["_id"]] })
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

		if (apiDeleteInfo?.snackbarSuccess) {
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
	// Undefined → the edit button follows the theme accent (and flips in dark mode);
	// set theme.components.dataTable.editButtonColor to pin a specific named color.
	const editButtonColor = (theme.components.dataTable?.editButtonColor as ThemeProps['accentColor']) || (theme.components.button?.color as ThemeProps['accentColor']) || undefined
	// Delete icon is a fixed red (matching DataTableEditable), not theme-driven.

	const enhancedColumns = useMemo<ColumnDef<T, unknown>[]>(() => {
		const actionIconColumn: ColumnDef<T, unknown> = {
			id: '__icon__',
			header: () => (
				<>ACTION</>
			),
			cell: ({ row }) => (
				<div className="datatable-action-cell">
					{canEdit && (
						<button
							type="button"
							className={dtActionButtonClass(editButtonColor)}
							aria-label="Edit row"
							onClick={() => {
								dataCtx?.updateContextData(name ?? '', row.original)
								setOpenModal(true)
							}}
						>
							<Icon icon="edit" size={14} />
						</button>
					)}
					{canDelete && (
						<button
							type="button"
							className={`datatable-action-button ${tableBgColors.red} ${tableHoverBgColors.red} text-red-700 hover:ring-1 ring-red-100`}
							aria-label="Delete row"
							onClick={() => {
								setSelectedRow(row.original)
								setOpenConfirmBox(true)
							}}
						>
							<Icon icon="trash" size={14} />
						</button>
					)}
				</div>
			)
			,
			enableSorting: false,
			enableColumnFilter: false,
			size: 40,
			minSize: 80,
			maxSize: 80,
		}

		return canEdit || canDelete ? [actionIconColumn, ...columns] : [...columns]
	}, [columns, canDelete, canEdit, dataCtx, editButtonColor, name])

	const table = useReactTable({
		data,
		columns: enhancedColumns,
		state: {
			globalFilter,
			pagination,
			sorting,
			columnFilters,
		},
		onGlobalFilterChange: setGlobalFilter,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onPaginationChange: setPagination,
		manualPagination: false,
	})


	const fetchData = useCallback(async () => {
		console.log('DataTable2 fetchData called', { api, apiInfo, hasApi: !!api });
		
		const q = Object.entries(apiInfo?.query ?? {}).reduce((acc, [key, value]) => {
			return { ...acc, [key]: value.type === "value" ? value.value : undefined }
		}, {})

		const b = Object.entries(apiInfo?.body ?? {}).reduce((acc, [key, value]) => {
			return { ...acc, [key]: value.type === "value" ? value.value : undefined }
		}, {})

		console.log('DataTable2 request params', { query: q, body: b });

		if (!!api) {
			let result;

			if (!!apiInfo?.query) {
				result = await api({ ...q } as any)
			} else {
				result = await api({ ...q, ...b })
			}

			console.log('DataTable2 API result', result);

			let data = result

			apiInfo?.paths?.forEach((path) => {
				data = data[path]
			})

			console.log('DataTable2 final data', data);
			return data ?? []
		}
		console.log('DataTable2: No API provided, returning empty array');
		return []
	}, [api, apiInfo])

	const { data: tableData, refetch, isLoading, isFetching } = useQuery({ queryKey: [`table-data-${title}`], queryFn: fetchData })

	const showSkeleton = (isLoading || isFetching) && data.length === 0
	const visibleColumns = table.getVisibleLeafColumns()

	useEffect(() => {
		setData(tableData ?? [])
	}, [tableData])


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



	return (<div className="datatable-container">

		<div className="datatable-header">
			<div className="datatable-title">{title}</div>

			{canSearchAllColumns && (
				<div className="datatable-controls-wrapper">
					<TextField
						ref={filterRef}
						width={200}
						placeholder="Search all columns..."
						value={globalFilter ?? ''}
						dataType="text"
						isFixedHeight={false}
						onChange={(e) => setGlobalFilter(e.target.value)} />

					<span className="datatable-row-count">
						{table.getFilteredRowModel().rows.length} of {table.getCoreRowModel().rows.length} total rows
					</span>
				</div>
			)}
		</div>

		<div className="datatable-table-wrapper">
			<div className="datatable-scroll-x">
				<table className="datatable-table" style={{ width: table.getTotalSize(), minWidth: '100%' }}>
					<thead className="datatable-thead">

					{table.getHeaderGroups().map(headerGroup => (
						<tr key={headerGroup.id} className="datatable-header-row">
							{headerGroup.headers.map(header => (
								header.column.columnDef.header && <th key={header.id} className={`datatable-header-cell
									 ${dtHeaderBgClass(theme.components.dataTable?.headerColor)}
									 ${dtHeaderTextClass(theme.components.dataTable?.headerTextColor, theme.components.dataTable?.headerColor)}
									 ${dtHeaderFontSizeClass(theme.components.dataTable?.headerFontSize)}
									 ${dtHeaderFontWeightClass(theme.components.dataTable?.headerFontWeight)}
									 ${dtHeaderHoverClass(theme.components.dataTable?.headerHoverColor)} cursor-pointer`}
									style={{ width: header.getSize() }}>
									<div className="datatable-header-content" >
										{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
										{header.column.getCanSort() && (
											<span className="datatable-sort-icon" onClick={header.column.getToggleSortingHandler()}>
												{{
													asc: <Icon icon="arrowUp" size={14} className="datatable-sort-icon-bounce" />,
													desc: <Icon icon="arrowDown" size={14} className="datatable-sort-icon-bounce" />,
												}[header.column.getIsSorted() as string] ?? <Icon icon="arrowDownUp" size={14} className="datatable-sort-icon-default" />}

											</span>
										)}
										{header.column.getCanFilter() && (
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
								</th>
							))}
						</tr>
					))}
				</thead>

				<tbody className={`datatable-tbody ${isPageChanging ? 'page-changing' : ''} ${isFiltering ? 'filtering' : ''}`}>
					{showSkeleton
						? Array.from({ length: pagination.pageSize }).map((_, rowIndex) => (
							<tr key={`skeleton-${rowIndex}`} className="datatable-body-row">
								{visibleColumns.map((column, columnIndex) => (
									<td
										key={`skeleton-cell-${column.id}-${columnIndex}`}
										className="datatable-body-cell px-4 py-1"
										style={{ width: column.getSize(), textAlign: align[column.id] }}
									>
										<div className="min-h-10 flex flex-col justify-center">
											<div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
										</div>
									</td>
								))}
							</tr>
						))
						: table.getPaginationRowModel().rows.map(row => (
							<tr key={row.id} className={`datatable-body-row
							${dtRowHoverClass(theme.components.dataTable?.rowHoverColor)}`}>
								{row.getVisibleCells().map(cell => (
									<td key={cell.id} className="datatable-body-cell px-4 py-1" style={{ width: cell.column.getSize(), textAlign: align[cell.column.id] }}>
										<div className="min-h-10 flex flex-col justify-center">
											{renderCellWithHighlight(cell, globalFilter)}
										</div>
									</td>
								))}
							</tr>
						))}
				</tbody>
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
								{[5, 10, 20, 30, 40, 50].map(pageSize => (
									<option key={pageSize} value={pageSize}>
										{pageSize}
									</option>
								))}
							</select>
						</div>
						<div>
							Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
							{Math.min(
								(table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
								table.getFilteredRowModel().rows.length
							)}{' '}
							of {table.getFilteredRowModel().rows.length} entries
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
			title="Delete item"
			description="This action cannot be undone. Are you sure you want to continue?"
		/>
	</div>)
}