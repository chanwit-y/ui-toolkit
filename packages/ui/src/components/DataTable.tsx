import { createColumnHelper, useReactTable, flexRender, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getPaginationRowModel, type SortingState, type ColumnFiltersState, type PaginationState } from "@tanstack/react-table"
import { useState, useMemo } from "react"
import { Popover } from "./Popover"
import { FilterIcon } from "./FilterIcon"
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
} from '@dnd-kit/core'
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
	useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type Person = {
	id: string
	firstName: string
	lastName: string
	age: number
	visits: number
	status: string
	progress: number
}


const columnHelper = createColumnHelper<Person>();

const columns = [
	columnHelper.display({
		id: 'drag-handle',
		header: '',
		cell: () => null, // The drag handle will be rendered in DraggableRow
		size: 40,
		enableSorting: false,
		enableColumnFilter: false,
	}),
	columnHelper.accessor('firstName', {
		id: 'firstName',
		header: 'First Name',
		cell: props => <>{props.row.original.firstName}</>,
		enableSorting: true,
		enableColumnFilter: true,
		filterFn: (row, columnId, value) => {
			if (!value || value.length === 0) return true;
			return value.includes(String(row.getValue(columnId)));
		},
	}),
	columnHelper.accessor('lastName', {
		id: 'lastName',
		header: 'Last Name',
		cell: props => <>{props.row.original.lastName}</>,
		enableSorting: true,
		enableColumnFilter: true,
		filterFn: (row, columnId, value) => {
			if (!value || value.length === 0) return true;
			return value.includes(String(row.getValue(columnId)));
		},
	}),
	columnHelper.accessor('age', {
		id: 'age',
		header: 'Age',
		cell: props => <>{props.row.original.age}</>,
		enableSorting: true,
		enableColumnFilter: true,
		filterFn: (row, columnId, value) => {
			if (!value || value.length === 0) return true;
			return value.includes(String(row.getValue(columnId)));
		},
	}),
	columnHelper.accessor('visits', {
		id: 'visits',
		header: 'Visits',
		cell: props => <>{props.row.original.visits}</>,
		enableSorting: true,
		enableColumnFilter: true,
		filterFn: (row, columnId, value) => {
			if (!value || value.length === 0) return true;
			return value.includes(String(row.getValue(columnId)));
		},
	}),
	columnHelper.accessor('progress', {
		id: 'progress',
		header: 'Progress',
		cell: props => <>{props.row.original.progress}%</>,
		enableSorting: true,
		enableColumnFilter: true,
		filterFn: (row, columnId, value) => {
			if (!value || value.length === 0) return true;
			return value.includes(String(row.getValue(columnId)));
		},
	}),
	columnHelper.accessor('status', {
		id: 'status',
		header: 'Status',
		cell: props => <>{props.row.original.status}</>,
		enableSorting: true,
		enableColumnFilter: true,
		filterFn: (row, columnId, value) => {
			if (!value || value.length === 0) return true;
			return value.includes(String(row.getValue(columnId)));
		},
	}),
]

const initialData = [
	{
		"id": "1",
		"firstName": "Tanner",
		"lastName": "Linsley",
		"age": 33,
		"visits": 100,
		"progress": 50,
		"status": "Married"
	},
	{
		"id": "2",
		"firstName": "Kevin",
		"lastName": "Vandy",
		"age": 27,
		"visits": 200,
		"progress": 100,
		"status": "Single"
	},
	{
		"id": "3",
		"firstName": "John",
		"lastName": "Doe",
		"age": 33,
		"visits": 150,
		"progress": 75,
		"status": "Single"
	},
	{
		"id": "4",
		"firstName": "Jane",
		"lastName": "Smith",
		"age": 28,
		"visits": 100,
		"progress": 50,
		"status": "Married"
	},
	{
		"id": "5",
		"firstName": "Alice",
		"lastName": "Johnson",
		"age": 35,
		"visits": 300,
		"progress": 90,
		"status": "Divorced"
	},
	{
		"id": "6",
		"firstName": "Bob",
		"lastName": "Brown",
		"age": 27,
		"visits": 75,
		"progress": 25,
		"status": "Single"
	},
	{
		"id": "7",
		"firstName": "Emily",
		"lastName": "Davis",
		"age": 31,
		"visits": 180,
		"progress": 65,
		"status": "Married"
	},
	{
		"id": "8",
		"firstName": "Michael",
		"lastName": "Wilson",
		"age": 29,
		"visits": 220,
		"progress": 85,
		"status": "Single"
	},
	{
		"id": "9",
		"firstName": "Sarah",
		"lastName": "Miller",
		"age": 26,
		"visits": 95,
		"progress": 40,
		"status": "Single"
	},
	{
		"id": "10",
		"firstName": "David",
		"lastName": "Garcia",
		"age": 38,
		"visits": 350,
		"progress": 95,
		"status": "Married"
	},
	{
		"id": "11",
		"firstName": "Lisa",
		"lastName": "Martinez",
		"age": 32,
		"visits": 125,
		"progress": 60,
		"status": "Divorced"
	},
	{
		"id": "12",
		"firstName": "James",
		"lastName": "Anderson",
		"age": 24,
		"visits": 80,
		"progress": 30,
		"status": "Single"
	},
	{
		"id": "13",
		"firstName": "Maria",
		"lastName": "Rodriguez",
		"age": 36,
		"visits": 280,
		"progress": 88,
		"status": "Married"
	},
	{
		"id": "14",
		"firstName": "Robert",
		"lastName": "Taylor",
		"age": 41,
		"visits": 420,
		"progress": 92,
		"status": "Divorced"
	},
	{
		"id": "15",
		"firstName": "Jennifer",
		"lastName": "Thomas",
		"age": 30,
		"visits": 160,
		"progress": 70,
		"status": "Single"
	},
	{
		"id": "16",
		"firstName": "William",
		"lastName": "Jackson",
		"age": 25,
		"visits": 90,
		"progress": 35,
		"status": "Single"
	},
	{
		"id": "17",
		"firstName": "Amanda",
		"lastName": "White",
		"age": 34,
		"visits": 240,
		"progress": 80,
		"status": "Married"
	},
	{
		"id": "18",
		"firstName": "Christopher",
		"lastName": "Harris",
		"age": 37,
		"visits": 310,
		"progress": 87,
		"status": "Divorced"
	},
	{
		"id": "19",
		"firstName": "Jessica",
		"lastName": "Clark",
		"age": 28,
		"visits": 140,
		"progress": 55,
		"status": "Single"
	},
	{
		"id": "20",
		"firstName": "Daniel",
		"lastName": "Lewis",
		"age": 39,
		"visits": 380,
		"progress": 93,
		"status": "Married"
	},
	{
		"id": "21",
		"firstName": "Ashley",
		"lastName": "Walker",
		"age": 26,
		"visits": 110,
		"progress": 45,
		"status": "Single"
	},
	{
		"id": "22",
		"firstName": "Matthew",
		"lastName": "Hall",
		"age": 33,
		"visits": 190,
		"progress": 72,
		"status": "Married"
	},
	{
		"id": "23",
		"firstName": "Stephanie",
		"lastName": "Allen",
		"age": 31,
		"visits": 170,
		"progress": 68,
		"status": "Divorced"
	},
	{
		"id": "24",
		"firstName": "Anthony",
		"lastName": "Young",
		"age": 29,
		"visits": 130,
		"progress": 58,
		"status": "Single"
	},
	{
		"id": "25",
		"firstName": "Michelle",
		"lastName": "King",
		"age": 35,
		"visits": 260,
		"progress": 82,
		"status": "Married"
	},
	{
		"id": "26",
		"firstName": "Joshua",
		"lastName": "Wright",
		"age": 27,
		"visits": 105,
		"progress": 42,
		"status": "Single"
	},
	{
		"id": "27",
		"firstName": "Kimberly",
		"lastName": "Lopez",
		"age": 32,
		"visits": 200,
		"progress": 75,
		"status": "Divorced"
	},
	{
		"id": "28",
		"firstName": "Andrew",
		"lastName": "Hill",
		"age": 40,
		"visits": 400,
		"progress": 90,
		"status": "Married"
	},
	{
		"id": "29",
		"firstName": "Nicole",
		"lastName": "Scott",
		"age": 28,
		"visits": 145,
		"progress": 62,
		"status": "Single"
	},
	{
		"id": "30",
		"firstName": "Ryan",
		"lastName": "Green",
		"age": 26,
		"visits": 85,
		"progress": 38,
		"status": "Single"
	},
	{
		"id": "31",
		"firstName": "Elizabeth",
		"lastName": "Adams",
		"age": 34,
		"visits": 230,
		"progress": 78,
		"status": "Married"
	},
	{
		"id": "32",
		"firstName": "Brandon",
		"lastName": "Baker",
		"age": 30,
		"visits": 175,
		"progress": 66,
		"status": "Single"
	},
	{
		"id": "33",
		"firstName": "Megan",
		"lastName": "Gonzalez",
		"age": 29,
		"visits": 155,
		"progress": 64,
		"status": "Divorced"
	},
	{
		"id": "34",
		"firstName": "Jason",
		"lastName": "Nelson",
		"age": 36,
		"visits": 290,
		"progress": 84,
		"status": "Married"
	},
	{
		"id": "35",
		"firstName": "Rachel",
		"lastName": "Carter",
		"age": 25,
		"visits": 95,
		"progress": 41,
		"status": "Single"
	},
	{
		"id": "36",
		"firstName": "Justin",
		"lastName": "Mitchell",
		"age": 31,
		"visits": 185,
		"progress": 71,
		"status": "Single"
	},
	{
		"id": "37",
		"firstName": "Samantha",
		"lastName": "Perez",
		"age": 33,
		"visits": 210,
		"progress": 76,
		"status": "Married"
	},
	{
		"id": "38",
		"firstName": "Kevin",
		"lastName": "Roberts",
		"age": 28,
		"visits": 120,
		"progress": 52,
		"status": "Single"
	},
	{
		"id": "39",
		"firstName": "Laura",
		"lastName": "Turner",
		"age": 37,
		"visits": 320,
		"progress": 89,
		"status": "Divorced"
	},
	{
		"id": "40",
		"firstName": "Steven",
		"lastName": "Phillips",
		"age": 42,
		"visits": 450,
		"progress": 96,
		"status": "Married"
	},
	{
		"id": "41",
		"firstName": "Amy",
		"lastName": "Campbell",
		"age": 27,
		"visits": 115,
		"progress": 48,
		"status": "Single"
	},
	{
		"id": "42",
		"firstName": "Brian",
		"lastName": "Parker",
		"age": 35,
		"visits": 270,
		"progress": 83,
		"status": "Married"
	},
	{
		"id": "43",
		"firstName": "Heather",
		"lastName": "Evans",
		"age": 30,
		"visits": 165,
		"progress": 67,
		"status": "Divorced"
	},
	{
		"id": "44",
		"firstName": "Mark",
		"lastName": "Edwards",
		"age": 38,
		"visits": 340,
		"progress": 91,
		"status": "Married"
	},
	{
		"id": "45",
		"firstName": "Crystal",
		"lastName": "Collins",
		"age": 26,
		"visits": 100,
		"progress": 43,
		"status": "Single"
	},
	{
		"id": "46",
		"firstName": "Eric",
		"lastName": "Stewart",
		"age": 32,
		"visits": 195,
		"progress": 73,
		"status": "Single"
	},
	{
		"id": "47",
		"firstName": "Angela",
		"lastName": "Sanchez",
		"age": 29,
		"visits": 150,
		"progress": 61,
		"status": "Married"
	},
	{
		"id": "48",
		"firstName": "Scott",
		"lastName": "Morris",
		"age": 34,
		"visits": 250,
		"progress": 79,
		"status": "Divorced"
	},
	{
		"id": "49",
		"firstName": "Rebecca",
		"lastName": "Rogers",
		"age": 31,
		"visits": 180,
		"progress": 69,
		"status": "Single"
	},
	{
		"id": "50",
		"firstName": "Gregory",
		"lastName": "Reed",
		"age": 39,
		"visits": 370,
		"progress": 94,
		"status": "Married"
	}
]

// Draggable Row Component
interface DraggableRowProps {
	row: any
	children: React.ReactNode
}

const DraggableRow = ({ row, children }: DraggableRowProps) => {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: row.original.id })

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	}

	return (
		<tr
			ref={setNodeRef}
			style={style}
			{...attributes}
			className={`hover:bg-gray-50 transition-colors duration-200 ${
				isDragging ? 'bg-blue-50 shadow-lg z-10' : ''
			}`}
		>
			<td className="px-2 py-4 whitespace-nowrap text-sm text-gray-400">
				<div
					{...listeners}
					className="cursor-grab hover:cursor-grabbing p-1 hover:bg-gray-200 rounded transition-colors"
					title="Drag to reorder"
				>
					<svg
						width="16"
						height="16"
						viewBox="0 0 16 16"
						fill="currentColor"
						className="text-gray-400"
					>
						<path d="M3 7a1 1 0 0 1 1-1h8a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1zM3 11a1 1 0 0 1 1-1h8a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1z" />
					</svg>
				</div>
			</td>
			{children}
		</tr>
	)
}

export const DataTable = () => {
	const [data, setData] = useState<Person[]>(initialData)
	const [sorting, setSorting] = useState<SortingState>([])
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [globalFilter, setGlobalFilter] = useState('')
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	})

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	)

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event

		if (active.id !== over?.id) {
			setData((items) => {
				// Get the current page rows
				const currentPageRows = table.getPaginationRowModel().rows
				const activeRowIndex = currentPageRows.findIndex((row) => row.original.id === active.id)
				const overRowIndex = currentPageRows.findIndex((row) => row.original.id === over?.id)
				
				if (activeRowIndex === -1 || overRowIndex === -1) return items
				
				// Find the actual indices in the full data array
				const activeItem = currentPageRows[activeRowIndex].original
				const overItem = currentPageRows[overRowIndex].original
				
				const oldIndex = items.findIndex((item) => item.id === activeItem.id)
				const newIndex = items.findIndex((item) => item.id === overItem.id)

				return arrayMove(items, oldIndex, newIndex)
			})
		}
	}

	// Get unique values for each column for dropdown filters
	const columnValues = useMemo(() => {
		const values: Record<string, string[]> = {}
		
		columns.forEach(col => {
			// Skip display columns like drag-handle
			if ('accessorKey' in col && col.accessorKey) {
				const accessor = col.accessorKey as keyof Person
				const columnId = col.id || String(accessor)
				const uniqueValues = [...new Set(data.map(row => String(row[accessor])))]
					.filter(Boolean)
					.sort()
				values[columnId] = uniqueValues
			}
		})
		
		return values
	}, [data])

	const table = useReactTable({
		columns,
		data,
		state: {
			sorting,
			columnFilters,
			globalFilter,
			pagination,
		},
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onGlobalFilterChange: setGlobalFilter,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		manualPagination: false,
	})

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			onDragEnd={handleDragEnd}
		>
			<div className="w-full space-y-4">
				{/* Global Filter */}
				<div className="flex items-center space-x-2">
					<input
						value={globalFilter ?? ''}
						onChange={(e) => setGlobalFilter(e.target.value)}
						className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						placeholder="Search all columns..."
					/>
					<span className="text-sm text-gray-500">
						{table.getFilteredRowModel().rows.length} of {table.getCoreRowModel().rows.length} total rows
					</span>
				</div>
				
				<div className="overflow-x-auto shadow-lg rounded-lg">
					<table className="w-full bg-white border border-gray-200">
					<thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
						{table.getHeaderGroups().map(headerGroup => (
							<tr key={headerGroup.id}>
								<th></th>
								{headerGroup.headers.map(header => (
									<th key={header.id} className={`py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-widest border-r border-gray-200 last:border-r-0 transition-colors duration-200 select-none ${
										header.column.id === 'drag-handle' 
											? 'w-12 px-2 cursor-default' 
											: 'px-6 hover:bg-gray-200 cursor-pointer'
									}`}>
										<div className="flex flex-col space-y-1">
											<div 
												className="flex items-center space-x-1"
												onClick={header.column.id !== 'drag-handle' ? header.column.getToggleSortingHandler() : undefined}
											>
												<span>
													{header.isPlaceholder
														? null
														: flexRender(
															header.column.columnDef.header,
															header.getContext()
														)}
												</span>
												{header.column.getCanSort() && (
													<span className="ml-1">
														{{
															asc: '↑',
															desc: '↓',
														}[header.column.getIsSorted() as string] ?? '↕'}
													</span>
												)}
											</div>
											{header.column.getCanFilter() && (
												<Popover
													trigger="click"
													placement="bottom-start"
													content={
														<div className="p-3 min-w-[200px]">
															<div className="flex items-center justify-between mb-3">
																<div className="text-xs font-medium text-gray-700">
																	Filter {typeof header.column.columnDef.header === 'function' ? header.column.columnDef.header(header.getContext()) : header.column.columnDef.header}
																</div>
																<button
																	onClick={() => header.column.setFilterValue(undefined)}
																	className="text-xs text-blue-600 hover:text-blue-800 font-medium"
																>
																	Clear All
																</button>
															</div>
															<div className="space-y-1 max-h-48 overflow-y-auto">
																{columnValues[header.column.id]?.map((value) => {
																	const currentFilter = header.column.getFilterValue() as string[] || [];
																	const isChecked = currentFilter.includes(value);
																	
																	return (
																		<label key={value} className="flex items-center space-x-2 text-xs hover:bg-gray-50 p-1 rounded cursor-pointer">
																			<input
																				type="checkbox"
																				checked={isChecked}
																				onChange={(e) => {
																					const currentValues = header.column.getFilterValue() as string[] || [];
																					let newValues: string[];
																					
																					if (e.target.checked) {
																						newValues = [...currentValues, value];
																					} else {
																						newValues = currentValues.filter(v => v !== value);
																					}
																					
																					header.column.setFilterValue(newValues.length > 0 ? newValues : undefined);
																				}}
																				className="text-blue-600 focus:ring-blue-500 rounded"
																			/>
																			<span>{value}</span>
																		</label>
																	);
																})}
															</div>
															{columnValues[header.column.id]?.length > 0 && (
																<div className="mt-2 pt-2 border-t border-gray-200">
																	<div className="flex space-x-2">
																		<button
																			onClick={() => {
																				header.column.setFilterValue(columnValues[header.column.id]);
																			}}
																			className="text-xs text-gray-600 hover:text-gray-800 font-medium"
																		>
																			Select All
																		</button>
																		<span className="text-xs text-gray-400">|</span>
																		<button
																			onClick={() => header.column.setFilterValue(undefined)}
																			className="text-xs text-gray-600 hover:text-gray-800 font-medium"
																		>
																			Deselect All
																		</button>
																	</div>
																</div>
															)}
														</div>
													}
												>
													<button
														className="p-1 hover:bg-gray-200 rounded transition-colors duration-200"
														onClick={(e) => e.stopPropagation()}
													>
														<FilterIcon 
															size={14} 
															active={!!(header.column.getFilterValue() as string[])?.length} 
														/>
													</button>
												</Popover>
											)}
										</div>
									</th>
								))}
							</tr>
						))}
					</thead>
					<SortableContext
						items={table.getPaginationRowModel().rows.map(row => row.original.id)}
						strategy={verticalListSortingStrategy}
					>
						<tbody className="bg-white divide-y divide-gray-200">
							{table.getPaginationRowModel().rows.map(row => (
								<DraggableRow key={row.original.id} row={row}>
									{row.getVisibleCells().map(cell => (
										<td key={cell.id} className={`py-4 whitespace-nowrap text-sm text-gray-900 ${
											cell.column.id === 'drag-handle' ? 'px-2 w-12' : 'px-6'
										}`}>
											{cell.column.id !== 'drag-handle' && flexRender(cell.column.columnDef.cell, cell.getContext())}
										</td>
									))}
								</DraggableRow>
							))}
						</tbody>
					</SortableContext>
				</table>
				</div>
				
				{/* Pagination Controls */}
				<div className="flex items-center justify-between px-2 py-4 bg-white border-t border-gray-200">
					<div className="flex items-center space-x-6 text-sm text-gray-700">
						<div className="flex items-center space-x-2">
							<span>Rows per page:</span>
							<select
								value={table.getState().pagination.pageSize}
								onChange={e => {
									table.setPageSize(Number(e.target.value))
								}}
								className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
							className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{'<<'}
						</button>
						<button
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
							className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{'<'}
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
											className={`px-3 py-1 text-sm border rounded transition-colors ${
												currentPage === page
													? 'bg-blue-500 text-white border-blue-500'
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
							className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{'>'}
						</button>
						<button
							onClick={() => table.setPageIndex(table.getPageCount() - 1)}
							disabled={!table.getCanNextPage()}
							className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{'>>'}
						</button>
					</div>
				</div>
			</div>
		</DndContext>
	)
}