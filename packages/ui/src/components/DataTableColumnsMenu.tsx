import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Checkbox } from "@radix-ui/themes"
import { GripVertical, Layers, Lock } from "lucide-react"
import { useState } from "react"
import type { DataTableToolbarButton } from "./@types"
import { ButtonBase } from "./Button"
import { Popover } from "./Popover"

export type ColumnsMenuItem = { id: string; label: string; locked: boolean; visible: boolean }

export type DataTableColumnsMenuProps = {
	/** The data columns in their current order. */
	items: ColumnsMenuItem[]
	onToggle: (id: string, visible: boolean) => void
	onReorder: (order: string[]) => void
	/** Group-by list (`grouping.userCanGroup`): the grouped ids, outer first. Absent = no list. */
	grouping?: string[]
	/** Columns that can be grouped by (all data columns, by default). */
	groupable?: ColumnsMenuItem[]
	onGroupingChange?: (grouping: string[]) => void
	onReset: () => void
	/** Something differs from the config (Reset is offered). */
	changed: boolean
	button?: DataTableToolbarButton
}

function SortableRow({ item, onToggle }: { item: ColumnsMenuItem; onToggle: (id: string, visible: boolean) => void }) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
	return (
		<li
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
			className={`datatable-columns-row ${isDragging ? "is-dragging" : ""}`}
		>
			<button type="button" className="datatable-columns-grip" aria-label={`Move ${item.label}`} {...attributes} {...listeners}>
				<GripVertical size={14} />
			</button>
			<label className="datatable-columns-label">
				<Checkbox
					size="1"
					checked={item.visible}
					disabled={item.locked}
					onCheckedChange={(checked) => onToggle(item.id, checked === true)}
					aria-label={`Show ${item.label}`}
				/>
				<span>{item.label}</span>
			</label>
			{item.locked && <Lock size={12} className="datatable-columns-lock" aria-label="Always shown" />}
		</li>
	)
}

/**
 * The data table's **Columns** menu (`DataTableElement.canChooseColumns`):
 * a checkbox per column to show / hide it (locked columns stay), a grip to
 * drag it into another order (or move it with the keyboard: Space, arrows,
 * Space), an optional Group-by list, and Reset back to the config.
 */
export function DataTableColumnsMenu({ items, onToggle, onReorder, grouping, groupable, onGroupingChange, onReset, changed, button }: DataTableColumnsMenuProps) {
	const [open, setOpen] = useState(false)
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	)
	const ids = items.map((i) => i.id)
	const onDragEnd = ({ active, over }: DragEndEvent) => {
		if (!over || active.id === over.id) return
		onReorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))))
	}
	const hidden = items.filter((i) => !i.visible).length
	const toggleGroup = (id: string, on: boolean) => {
		if (!grouping || !onGroupingChange) return
		onGroupingChange(on ? [...grouping.filter((g) => g !== id), id] : grouping.filter((g) => g !== id))
	}

	const content = (
		<div className="datatable-columns-menu">
			<div className="datatable-columns-heading">
				<span>Columns</span>
				{changed && (
					<button type="button" className="datatable-columns-reset" onClick={onReset}>
						Reset
					</button>
				)}
			</div>
			<DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
				<SortableContext items={ids} strategy={verticalListSortingStrategy}>
					<ul className="datatable-columns-list">
						{items.map((item) => (
							<SortableRow key={item.id} item={item} onToggle={onToggle} />
						))}
					</ul>
				</SortableContext>
			</DndContext>
			{grouping && onGroupingChange && (
				<>
					<div className="datatable-columns-heading">
						<span className="inline-flex items-center gap-1.5">
							<Layers size={13} /> Group by
						</span>
						{grouping.length > 0 && (
							<button type="button" className="datatable-columns-reset" onClick={() => onGroupingChange([])}>
								Ungroup
							</button>
						)}
					</div>
					<ul className="datatable-columns-list">
						{(groupable ?? items).map((item) => {
							const level = grouping.indexOf(item.id)
							return (
								<li key={item.id} className="datatable-columns-row">
									<label className="datatable-columns-label">
										<Checkbox
											size="1"
											checked={level !== -1}
											onCheckedChange={(checked) => toggleGroup(item.id, checked === true)}
											aria-label={`Group by ${item.label}`}
										/>
										<span>{item.label}</span>
									</label>
									{level !== -1 && <span className="datatable-columns-level" title="Grouping level">{level + 1}</span>}
								</li>
							)
						})}
					</ul>
				</>
			)}
		</div>
	)

	const label = button?.label ?? "Columns"
	return (
		<Popover open={open} onOpenChange={setOpen} placement="bottom-end" contentClassName="datatable-filter-popover" content={content}>
			<span className="datatable-filter-trigger">
				<ButtonBase label={label} icon={button?.icon ?? "columns"} variant={button?.variant ?? "outlined"} />
				{hidden > 0 && (
					<span className="datatable-filter-badge" aria-label={`${hidden} hidden columns`}>
						{hidden}
					</span>
				)}
			</span>
		</Popover>
	)
}
