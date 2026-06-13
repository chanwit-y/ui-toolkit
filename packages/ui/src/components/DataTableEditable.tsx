import * as Popover from "@radix-ui/react-popover"
import { Text, type ThemeProps } from "@radix-ui/themes"
import { useQuery } from "@tanstack/react-query"
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef, type ColumnFiltersState, type FilterFn, type PaginationState, type Row, type SortingState } from "@tanstack/react-table"
import { AlertCircle, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, ListFilter } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { actionButtonTextColors, paginationBgColors, paginationHoverBgColors, ringColors, rowHoverBgColors, tableBgColors, tableHoverBgColors } from "../util/constant"
import type { CrudMutationApi, DataTableEditableColumn, DataTableEditableProps, SnackbarElement } from "./@types"
import { ConfirmBox } from "./ConfirmBox"
import Icon from "./Icon"
import { useSnackbar, type SnackbarVariant } from "./Snackbar"
import { SelectFieldBase as SelectField } from "./SelectField"
import { TextFieldBase as TextField } from "./TextField"
import { useLoading, useTheme } from "./context"
import { useStord } from "./core/stord"

const NEW_ROW_ID = "__new__"

const getActionButtonClassName = (color: string) =>
	`datatable-action-button ${tableBgColors[color] ?? tableBgColors.blue} ${tableHoverBgColors[color] ?? tableHoverBgColors.blue} ${actionButtonTextColors[color] ?? actionButtonTextColors.blue} hover:ring-1 ${ringColors[color] ?? ringColors.blue}`

const multiSelectFilter: FilterFn<any> = (row, columnId, filterValue) => {
	const values = filterValue as string[]
	if (!values || values.length === 0) return true
	return values.includes(String(row.getValue(columnId)))
}

export const DataTableEditable = <T extends Record<string, any>>({
	name,
	title,
	idKey = "id",
	columns = [],
	apiCrud,
	align = {},
}: DataTableEditableProps) => {

	const [openConfirmBox, setOpenConfirmBox] = useState(false)

	const [data, setData] = useState<T[]>([])
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

	// Editing state: NEW_ROW_ID means a new row is being created
	const [editingRowId, setEditingRowId] = useState<string | null>(null)
	const [draft, setDraft] = useState<Record<string, any>>({})
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [rowToDelete, setRowToDelete] = useState<T | null>(null)

	const { showSnackbar } = useSnackbar()
	const { startLoading, stopLoading } = useLoading()

	const canCreate = !!apiCrud.create
	const canEdit = !!apiCrud.update
	const canDelete = !!apiCrud.delete

	const columnMap = useMemo(() => {
		const map: Record<string, DataTableEditableColumn> = {}
		columns.forEach((col) => {
			map[col.accessorKey] = col
		})
		return map
	}, [columns])

	const cellAlign = useCallback((columnId: string) =>
		align[columnId] ?? columnMap[columnId]?.align, [align, columnMap])

	const columnValues = useMemo(() => {
		const values: Record<string, string[]> = {}
		columns.forEach((col) => {
			const uniqueValues = [...new Set(data.map(row => String(row[col.accessorKey])))]
				.filter(Boolean)
				.sort()
			values[col.accessorKey] = uniqueValues
		})
		return values
	}, [columns, data])

	const theme = useTheme()

	const updateFnCtxs = useStord((state) => state.updateFnCtxs)

	// Edit icon follows the theme, same as DataTable2.
	const editButtonColor = (theme.components.dataTable?.editButtonColor as ThemeProps['accentColor']) || (theme.components.button?.color as ThemeProps['accentColor']) || 'blue'
	const saveButtonColor: ThemeProps['accentColor'] = 'green'
	const cancelButtonColor: ThemeProps['accentColor'] = 'gray'

	const fetchData = useCallback(async () => {
		const result = await apiCrud.read.api(apiCrud.read.query ?? {})

		let rows = result
		apiCrud.read.paths?.forEach((path) => {
			rows = rows?.[path]
		})

		return rows ?? []
	}, [apiCrud.read])

	const { data: tableData, refetch, isLoading, isFetching } = useQuery({ queryKey: [`table-data-editable-${name}`], queryFn: fetchData })

	const showSkeleton = (isLoading || isFetching) && data.length === 0

	useEffect(() => {
		setData(tableData ?? [])
	}, [tableData])

	useEffect(() => {
		updateFnCtxs(name ?? '', refetch)
	}, [name, updateFnCtxs, refetch])

	const cancelEdit = useCallback(() => {
		setEditingRowId(null)
		setDraft({})
		setErrors({})
	}, [])

	const startAdd = useCallback(() => {
		const defaults = columns.reduce<Record<string, any>>((acc, col) => {
			if (col.defaultValue !== undefined) acc[col.accessorKey] = col.defaultValue
			return acc
		}, {})
		setDraft(defaults)
		setErrors({})
		setEditingRowId(NEW_ROW_ID)
	}, [columns])

	const startEdit = useCallback((row: Row<T>) => {
		setDraft({ ...row.original })
		setErrors({})
		setEditingRowId(row.id)
	}, [])

	const validateField = useCallback((col: DataTableEditableColumn, value: any, values: Record<string, any>): string | null => {
		const isEmpty = value === undefined || value === null || String(value).trim() === ''

		if (isEmpty) {
			if (col.isRequired) {
				return col.validation?.requiredMessage ?? `${col.header} is required`
			}
			return null
		}

		const rules = col.validation
		if (!rules) return null

		if (col.editor === 'number') {
			const num = Number(value)
			if (Number.isNaN(num)) return `${col.header} must be a number`
			if (rules.min !== undefined && num < rules.min) return `${col.header} must be at least ${rules.min}`
			if (rules.max !== undefined && num > rules.max) return `${col.header} must be at most ${rules.max}`
		}

		const str = String(value)
		if (rules.minLength !== undefined && str.length < rules.minLength) return `${col.header} must be at least ${rules.minLength} characters`
		if (rules.maxLength !== undefined && str.length > rules.maxLength) return `${col.header} must be at most ${rules.maxLength} characters`

		if (rules.pattern) {
			const regex = typeof rules.pattern === 'string' ? new RegExp(rules.pattern) : rules.pattern
			if (!regex.test(str)) return rules.patternMessage ?? `${col.header} is invalid`
		}

		return rules.validate?.(value, values) ?? null
	}, [])

	const validateDraft = useCallback((values: Record<string, any>) => {
		const validationErrors: Record<string, string> = {}
		columns.forEach((col) => {
			if (col.editable === false) return
			const message = validateField(col, values[col.accessorKey], values)
			if (message) validationErrors[col.accessorKey] = message
		})
		return validationErrors
	}, [columns, validateField])

	const coerceDraft = useCallback((values: Record<string, any>) => {
		const payload = { ...values }
		columns.forEach((col) => {
			if (col.editor === 'number' && payload[col.accessorKey] !== undefined && payload[col.accessorKey] !== null && payload[col.accessorKey] !== '') {
				payload[col.accessorKey] = Number(payload[col.accessorKey])
			}
		})
		return payload
	}, [columns])

	const notifySuccess = useCallback((info: CrudMutationApi | undefined, fallbackMessage: string) => {
		const snackbar: SnackbarElement = info?.snackbarSuccess ?? { type: 'success', message: fallbackMessage }
		showSnackbar({ variant: snackbar.type, message: snackbar.message })
	}, [showSnackbar])

	const notifyError = useCallback((info: CrudMutationApi | undefined, error: unknown) => {
		let variant: SnackbarVariant = 'error'
		let message = error instanceof Error ? error.message : 'Something went wrong'
		if (info?.snackbarError && info.snackbarError !== '$exception') {
			variant = info.snackbarError.type
			message = info.snackbarError.message
		}
		showSnackbar({ variant, message })
	}, [showSnackbar])

	// Maps API param names to row field values, e.g. { id: "_id" } -> { id: row._id }
	const buildParams = useCallback((mapping: Record<string, string> | undefined, row: Record<string, any>) => {
		if (!mapping) return undefined
		return Object.entries(mapping).reduce<Record<string, any>>((acc, [param, field]) => {
			acc[param] = row[field]
			return acc
		}, {})
	}, [])

	const handleSave = useCallback(async () => {
		const isCreating = editingRowId === NEW_ROW_ID
		const mutation = isCreating ? apiCrud.create : apiCrud.update
		if (!mutation) return

		const validationErrors = validateDraft(draft)
		if (Object.keys(validationErrors).length > 0) {
			setErrors(validationErrors)
			showSnackbar({ variant: 'warning', message: 'Please fix the highlighted fields' })
			return
		}

		const payload = coerceDraft(draft)
		const paramValues = buildParams(mutation.params, draft)
		const loaderId = startLoading()
		try {
			if (paramValues) {
				await mutation.api(paramValues, payload)
			} else {
				await mutation.api(payload)
			}
			notifySuccess(mutation, isCreating ? 'Created successfully' : 'Updated successfully')
			cancelEdit()
			await refetch()
		} catch (error) {
			notifyError(mutation, error)
		} finally {
			stopLoading(loaderId)
		}
	}, [editingRowId, apiCrud.create, apiCrud.update, draft, validateDraft, coerceDraft, buildParams, startLoading, stopLoading, notifySuccess, notifyError, cancelEdit, refetch, showSnackbar])

	const handleConfirmDelete = useCallback(async (isConfirm: boolean) => {
		if (!isConfirm || !rowToDelete || !apiCrud.delete) {
			setRowToDelete(null)
			return
		}

		const loaderId = startLoading()
		try {
			const paramValues = buildParams(apiCrud.delete.params, rowToDelete) ?? { [idKey]: rowToDelete[idKey] }
			await apiCrud.delete.api(paramValues)
			notifySuccess(apiCrud.delete, 'Deleted successfully')
			await refetch()
		} catch (error) {
			notifyError(apiCrud.delete, error)
		} finally {
			setRowToDelete(null)
			stopLoading(loaderId)
		}
	}, [rowToDelete, apiCrud.delete, idKey, buildParams, startLoading, stopLoading, notifySuccess, notifyError, refetch])

	const updateDraftValue = useCallback((accessorKey: string, value: any) => {
		const nextDraft = { ...draft, [accessorKey]: value }
		setDraft(nextDraft)

		// Re-validate fields that are already in error so the message clears as
		// soon as the user fixes the value
		if (errors[accessorKey] !== undefined) {
			const col = columnMap[accessorKey]
			const message = col ? validateField(col, value, nextDraft) : null
			setErrors((prev) => {
				const { [accessorKey]: _omit, ...rest } = prev
				return message ? { ...rest, [accessorKey]: message } : rest
			})
		}
	}, [draft, errors, columnMap, validateField])

	const renderFieldError = (message?: string) => (
		message ? (
			<span className="mt-1 flex items-center gap-0.5 text-xs text-red-500">
				<AlertCircle className="inline-block h-3 w-3 shrink-0" />
				{message}
			</span>
		) : null
	)

	const renderEditor = (col: DataTableEditableColumn) => {
		const value = draft[col.accessorKey]
		const fieldError = errors[col.accessorKey]

		switch (col.editor) {
			case 'select':
				return (
					<SelectField
						options={col.options ?? []}
						value={value ? String(value) : undefined}
						placeholder="-- Select --"
						error={!!fieldError}
						errorMessage={fieldError}
						onValueChange={(newValue) => updateDraftValue(col.accessorKey, newValue)}
					/>
				)
			case 'checkbox':
				return (
					<div className="flex flex-col">
						<input
							type="checkbox"
							checked={!!value}
							onChange={(e) => updateDraftValue(col.accessorKey, e.target.checked)}
							aria-invalid={!!fieldError}
							className="h-4 w-4 cursor-pointer"
						/>
						{renderFieldError(fieldError)}
					</div>
				)
			default:
				return (
					<TextField
						dataType={col.editor === 'number' ? 'number' : col.editor === 'date' ? 'date' : 'text'}
						size="2"
						className="[--text-field-padding:0.625rem]"
						isFullWidth
						isFixedHeight={false}
						value={value ?? ''}
						error={!!fieldError}
						errorMessage={fieldError}
						onChange={(e) => updateDraftValue(col.accessorKey, e.target.value)}
					/>
				)
		}
	}

	const renderSaveCancelButtons = () => (
		<div className="datatable-action-cell">
			<button
				type="button"
				className={getActionButtonClassName(saveButtonColor)}
				aria-label="Save row"
				onClick={handleSave}
			>
				<Icon icon="check" size={14} />
			</button>
			<button
				type="button"
				className={getActionButtonClassName(cancelButtonColor)}
				aria-label="Cancel editing"
				onClick={cancelEdit}
			>
				<Icon icon="x" size={14} />
			</button>
		</div>
	)

	const enhancedColumns = useMemo<ColumnDef<T, unknown>[]>(() => {
		const dataColumns: ColumnDef<T, unknown>[] = columns.map((col) => ({
			accessorKey: col.accessorKey,
			header: col.header,
			enableSorting: col.enableSorting ?? true,
			enableColumnFilter: col.enableColumnFilter ?? false,
			filterFn: multiSelectFilter,
			...(col.size ? { size: col.size } : {}),
		}))

		if (!canEdit && !canDelete && !canCreate) return dataColumns

		const actionColumn: ColumnDef<T, unknown> = {
			id: '__actions__',
			header: () => (
				<>ACTION</>
			),
			cell: ({ row }) => {
				if (editingRowId === row.id) {
					return renderSaveCancelButtons()
				}

				return (
					<div className="datatable-action-cell">
						{canEdit && (
							<button
								type="button"
								className={getActionButtonClassName(editButtonColor)}
								aria-label="Edit row"
								disabled={editingRowId !== null}
								onClick={() => startEdit(row)}
							>
								<Icon icon="edit" size={14} />
							</button>
						)}
						{canDelete && (
							<button
								type="button"
								className={`datatable-action-button ${tableBgColors.red} ${tableHoverBgColors.red} text-red-700 hover:ring-1 ring-red-100`}
								aria-label="Delete row"
								disabled={editingRowId !== null}
								onClick={() => {
									setRowToDelete(row.original)
									setOpenConfirmBox(true)
								}}
							>
								<Icon icon="trash" size={14} />
							</button>
						)}
					</div>
				)
			},
			enableSorting: false,
			enableColumnFilter: false,
			size: 40,
			minSize: 80,
			maxSize: 80,
		}

		return [actionColumn, ...dataColumns]
	}, [columns, canCreate, canEdit, canDelete, editingRowId, draft, editButtonColor, handleSave, cancelEdit, startEdit])

	const table = useReactTable({
		data,
		columns: enhancedColumns,
		state: {
			pagination,
			sorting,
			columnFilters,
		},
		getRowId: (row, index) => row[idKey] != null ? String(row[idKey]) : String(index),
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onPaginationChange: setPagination,
		manualPagination: false,
	})

	const visibleColumns = table.getVisibleLeafColumns()

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

			<div className="datatable-controls-wrapper">
				{canCreate && (
					<button
						type="button"
						disabled={editingRowId !== null}
						onClick={startAdd}
						aria-label="Add row"
						title="Add row"
						className="flex items-center justify-center mb-2 p-2 text-white rounded cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--accent-10,var(--violet-10))] hover:bg-[var(--accent-11,var(--violet-11))]"
					>
						<Icon icon="puls" size={16} />
					</button>
				)}
			</div>
		</div>

		<div className="datatable-table-wrapper">
			<div className="datatable-scroll-x">
				<table className="datatable-table table-fixed" style={{ width: table.getTotalSize(), minWidth: '100%' }}>
					<thead className="datatable-thead">

					{table.getHeaderGroups().map(headerGroup => (
						<tr key={headerGroup.id} className="datatable-header-row">
							{headerGroup.headers.map(header => (
								header.column.columnDef.header && <th key={header.id} className={`datatable-header-cell
									 ${tableBgColors[theme.components.dataTable?.headerColor || 'blue']}
									 ${tableHoverBgColors[theme.components.dataTable?.headerHoverColor || 'blue']} text-gray-500 cursor-pointer`}
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
														<div className="p-1 bg-white ">
															<div className="flex items-center justify-between mb-3">
																<div className="text-xs font-medium text-gray-700">
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
																		<div key={value} className="flex  p-1 hover:bg-gray-50 rounded">
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
																<div className="mt-2 pt-2 border-t border-gray-200">
																	<div className="flex space-x-2 justify-around">
																		<button
																			onClick={() => {
																				header.column.setFilterValue(columnValues[header.column.id]);
																			}}
																			className=" text-xs text-gray-600 hover:text-gray-800 font-medium cursor-pointer"
																		>
																			Select All
																		</button>
																		<span className="text-xs text-gray-400">|</span>
																		<button
																			onClick={() => header.column.setFilterValue(undefined)}
																			className=" text-xs text-gray-600 hover:text-gray-800 font-medium cursor-pointer"
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
					{editingRowId === NEW_ROW_ID && (
						<tr className="datatable-body-row bg-[var(--accent-a3,#eff6ff80)]">
							{visibleColumns.map((column) => {
								if (column.id === '__actions__') {
									return (
										<td key={`new-${column.id}`} className="datatable-body-cell px-4" style={{ width: column.getSize() }}>
											{renderSaveCancelButtons()}
										</td>
									)
								}

								const col = columnMap[column.id]
								return (
									<td key={`new-${column.id}`} className="datatable-body-cell px-4 py-1" style={{ width: column.getSize(), textAlign: cellAlign(column.id) }}>
										<div className="min-h-10 flex flex-col justify-center">
											{col && (col.editable ?? true) ? renderEditor(col) : null}
										</div>
									</td>
								)
							})}
						</tr>
					)}
					{showSkeleton
						? Array.from({ length: pagination.pageSize }).map((_, rowIndex) => (
							<tr key={`skeleton-${rowIndex}`} className="datatable-body-row">
								{visibleColumns.map((column, columnIndex) => (
									<td
										key={`skeleton-cell-${column.id}-${columnIndex}`}
										className="datatable-body-cell px-4 py-1"
										style={{ width: column.getSize(), textAlign: cellAlign(column.id) }}
									>
										<div className="h-4 w-full rounded bg-gray-200 animate-pulse" />
									</td>
								))}
							</tr>
						))
						: table.getPaginationRowModel().rows.map(row => (
							<tr key={row.id} className={`datatable-body-row
							${rowHoverBgColors[theme.components.dataTable?.rowHoverColor || 'blue']}
							${editingRowId === row.id ? 'bg-[var(--accent-a3,#eff6ff80)]' : ''}`}>
								{row.getVisibleCells().map(cell => {
									const col = columnMap[cell.column.id]
									const isEditingCell = editingRowId === row.id && col && (col.editable ?? true)

									return (
										<td key={cell.id} className="datatable-body-cell px-4 py-1" style={{ width: cell.column.getSize(), textAlign: cellAlign(cell.column.id) }}>
											<div className="min-h-10 flex flex-col justify-center">
												{isEditingCell ? renderEditor(col) : flexRender(cell.column.columnDef.cell, cell.getContext())}
											</div>
										</td>
									)
								})}
							</tr>
						))}
				</tbody>
				</table>
			</div>
			<div className="datatable-footer">
				<div className="flex items-center space-x-6 text-sm text-gray-700">
						<div className="flex items-center space-x-2">
							<span>Rows per page:</span>
							<select
								value={table.getState().pagination.pageSize}
								onChange={e => {
									table.setPageSize(Number(e.target.value))
								}}
								className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-8,#3b82f6)] hover:bg-[var(--accent-5,#93c5fd)]"
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
							className="px-2 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							<ChevronFirst className="w-4 h-4" />
						</button>
						<button
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
							className="px-2 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
										<span key={`ellipsis-${index}`} className="px-2 py-1 text-sm text-gray-500">
											...
										</span>
									) : (
										<button
											key={page}
											onClick={() => table.setPageIndex(Number(page) - 1)}
											className={`px-3 py-1 text-sm cursor-pointer border rounded transition-colors ${currentPage === page
													? `${paginationBgColors[theme.components.dataTable?.paginationButtonColor || 'blue']}
													${paginationHoverBgColors[theme.components.dataTable?.paginationButtonHoverColor || 'blue']}
													text-white ring-1 ${ringColors[theme.components.dataTable?.paginationButtonColor || 'blue']}`
												: 'border-gray-300 hover:bg-gray-50'
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
							className="px-2 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							<ChevronRight className="w-4 h-4" />
						</button>
						<button
							onClick={() => table.setPageIndex(table.getPageCount() - 1)}
							disabled={!table.getCanNextPage()}
							className="px-2 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							<ChevronLast className="w-4 h-4" />
						</button>
					</div>
			</div>
		</div>

		<ConfirmBox
			id={`${name}-confirmBox`}
			open={openConfirmBox}
			onOpenChange={() => setOpenConfirmBox(!openConfirmBox)}
			onConfirm={handleConfirmDelete}
			title={apiCrud.delete?.confirmBox?.title ?? "Delete item"}
			description={apiCrud.delete?.confirmBox?.description ?? "This action cannot be undone. Are you sure you want to continue?"}
		/>
	</div>)
}
