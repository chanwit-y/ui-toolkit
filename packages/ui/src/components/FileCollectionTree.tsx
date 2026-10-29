import { useDraggable, useDroppable } from "@dnd-kit/core";
import { DropdownMenu } from "@radix-ui/themes";
import {
	useEffect,
	useRef,
	useState,
	type KeyboardEvent,
	type MouseEvent,
	type ReactNode,
} from "react";
import type { FileCollection, FileCollectionNewItem, FileCollectionNode } from "./@types";
import Icon from "./Icon";
import { IconData } from "./core/const/iconData";
import { nodeIcon } from "./core/fileCollectionTree";

/*
 * The rows of a file collection: a collection header (toggle, hover + / …,
 * root drop zone, animated body) and the node rows beneath it (indent,
 * dotted connectors, chevron, icon, inline rename, hover … menu, drag source
 * and drop target). Everything behavioural comes in through `TreeActions`,
 * so the studio canvas renders the same rows over mock data with no-ops.
 */

export type IconKey = keyof typeof IconData;

/** An `IconData` key, or `file` when the key is unknown (a typo in a config never breaks a row). */
export function safeIcon(key: string | undefined | null, fallback: IconKey = "file"): IconKey {
	return key && key in IconData ? (key as IconKey) : fallback;
}

/** What the rows may do; an absent handler hides its affordance (an unwired slot). */
export type TreeActions = {
	readOnly: boolean;
	/** The **…** menu button on rows and collection headers (`menu: false` hides it). */
	showMenu: boolean;
	newItems: FileCollectionNewItem[];
	kindIcons?: Record<string, string>;
	onSelect: (node: FileCollectionNode) => void;
	onToggleFolder: (id: string) => void;
	onToggleCollection: (id: string) => void;
	/** Open the New popover's name modal for `entry` under `parentId` (null = root) of `collectionId`. */
	onNewItem?: (collectionId: string, parentId: string | null, entry: FileCollectionNewItem, fromHeader: boolean) => void;
	onRenameCollection?: (collection: FileCollection, name: string) => void;
	onDeleteCollection?: (collection: FileCollection) => void;
	onRenameItem?: (node: FileCollectionNode, name: string) => void;
	onDeleteItem?: (node: FileCollectionNode) => void;
	onMoveItem?: (node: FileCollectionNode) => void;
	onDuplicateItem?: (node: FileCollectionNode) => void;
	canDrag: boolean;
};

type InlineEditProps = {
	initialValue: string;
	onCommit: (value: string) => void;
	onCancel: () => void;
	className?: string;
};

/**
 * The in-place rename input: focused and fully selected on mount; Enter
 * commits, Escape cancels, blur commits; the first of commit / cancel wins
 * (Enter is followed by the blur the unmount fires). Pointer events are
 * stopped so typing never selects the row or starts a drag.
 */
export function InlineEdit({ initialValue, onCommit, onCancel, className }: InlineEditProps) {
	const [value, setValue] = useState(initialValue);
	const ref = useRef<HTMLInputElement>(null);
	const done = useRef(false);
	useEffect(() => {
		ref.current?.focus();
		ref.current?.select();
	}, []);
	const commit = () => {
		if (done.current) return;
		done.current = true;
		onCommit(value);
	};
	const cancel = () => {
		if (done.current) return;
		done.current = true;
		onCancel();
	};
	return (
		<input
			ref={ref}
			className={className ?? "gummy-fc-rename"}
			value={value}
			spellCheck={false}
			aria-label="Rename"
			onChange={(e) => setValue(e.target.value)}
			onKeyDown={(e) => {
				e.stopPropagation();
				if (e.key === "Enter") {
					e.preventDefault();
					commit();
				} else if (e.key === "Escape") {
					e.preventDefault();
					cancel();
				}
			}}
			onBlur={commit}
			onClick={(e) => e.stopPropagation()}
			onDoubleClick={(e) => e.stopPropagation()}
			onPointerDown={(e) => e.stopPropagation()}
		/>
	);
}

/** One `…` / New menu entry. */
function Entry({ icon, label, onSelect, color }: { icon: IconKey; label: string; onSelect: () => void; color?: "red" }) {
	return (
		<DropdownMenu.Item color={color} onSelect={onSelect}>
			<Icon icon={icon} size={14} />
			{label}
		</DropdownMenu.Item>
	);
}

/** The New menu's entries (one per `newItems` element). */
function NewEntries({ entries, onPick }: { entries: FileCollectionNewItem[]; onPick: (entry: FileCollectionNewItem) => void }) {
	return (
		<>
			{entries.map((entry, i) => (
				<Entry
					key={`${entry.label}-${i}`}
					icon={safeIcon(entry.icon, entry.type === "folder" ? "folder" : "file")}
					label={entry.label}
					onSelect={() => onPick(entry)}
				/>
			))}
		</>
	);
}

/** A hover-revealed icon button on a row (the Remove button); the click never selects or drags the row. */
function RowButton({ label, icon, danger, onClick }: { label: string; icon: IconKey; danger?: boolean; onClick: () => void }) {
	return (
		<button
			type="button"
			className={`gummy-fc-icon-btn is-small${danger ? " is-danger" : ""}`}
			aria-label={label}
			title={label}
			onClick={(e) => {
				e.stopPropagation();
				onClick();
			}}
			onPointerDown={(e) => e.stopPropagation()}
			onKeyDown={(e) => e.stopPropagation()}
		>
			<Icon icon={icon} size={14} />
		</button>
	);
}

type MenuButtonProps = { label: string; icon: IconKey; small?: boolean; children: ReactNode; onOpenChange?: (open: boolean) => void };

/** A `gummy-fc-icon-btn` opening a Radix dropdown (portaled, so it clears a modal). */
function MenuButton({ label, icon, small, children, onOpenChange }: MenuButtonProps) {
	return (
		<DropdownMenu.Root onOpenChange={onOpenChange}>
			<DropdownMenu.Trigger>
				<button
					type="button"
					className={`gummy-fc-icon-btn${small ? " is-small" : ""}`}
					aria-label={label}
					title={label}
					onClick={(e) => e.stopPropagation()}
					onPointerDown={(e) => e.stopPropagation()}
					onKeyDown={(e) => e.stopPropagation()}
				>
					<Icon icon={icon} size={14} />
				</button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content size="1" align="end" onClick={(e) => e.stopPropagation()}>
				{children}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	);
}

export type NodeRowProps = {
	node: FileCollectionNode;
	level: number;
	isLast: boolean;
	selectedId: string | null;
	expanded: Set<string>;
	renamingId: string | null;
	setRenamingId: (id: string | null) => void;
	actions: TreeActions;
};

/** One node and, when it is an open folder, its children. */
export function NodeRow({ node, level, isLast, selectedId, expanded, renamingId, setRenamingId, actions }: NodeRowProps) {
	const isFolder = node.type === "folder";
	const hasChildren = isFolder && !!node.children?.length;
	const isOpen = isFolder && expanded.has(node.id);
	const isSelected = selectedId === node.id;
	const isEditing = !actions.readOnly && renamingId === node.id && !!actions.onRenameItem;
	const [menuOpen, setMenuOpen] = useState(false);
	const indent = level * 20 + 8;
	const trunkX = indent - 12;

	const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
		id: node.id,
		data: { node },
		disabled: !actions.canDrag || isEditing,
	});
	// A folder takes drops into itself; a file forwards them to its parent.
	const { setNodeRef: setDropRef, isOver, active } = useDroppable({
		id: `drop:${node.id}`,
		data: { targetFolderId: isFolder ? node.id : node.parentId, collectionId: node.collectionId },
		disabled: !actions.canDrag,
	});
	const setRowRef = (el: HTMLDivElement | null) => {
		setDragRef(el);
		setDropRef(el);
	};
	const showDrop = isFolder && isOver && active?.id !== node.id;

	const onClick = (e: MouseEvent<HTMLDivElement>) => {
		e.stopPropagation();
		if (isEditing) return;
		if (isFolder) actions.onToggleFolder(node.id);
		actions.onSelect(node);
	};
	const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (isEditing) return;
		if (e.key === "F2" && actions.onRenameItem && !actions.readOnly) {
			e.preventDefault();
			e.stopPropagation();
			setRenamingId(node.id);
		}
	};

	const canRename = !actions.readOnly && !!actions.onRenameItem;
	const menuEntries: ReactNode[] = [];
	if (!actions.readOnly && actions.showMenu) {
		if (isFolder && actions.onNewItem && actions.newItems.length) {
			menuEntries.push(
				<DropdownMenu.Sub key="new">
					<DropdownMenu.SubTrigger>
						<Icon icon="puls" size={14} />
						New
					</DropdownMenu.SubTrigger>
					<DropdownMenu.SubContent>
						<NewEntries entries={actions.newItems} onPick={(entry) => actions.onNewItem?.(node.collectionId, node.id, entry, false)} />
					</DropdownMenu.SubContent>
				</DropdownMenu.Sub>,
			);
		}
		if (canRename) menuEntries.push(<Entry key="rename" icon="edit" label="Rename" onSelect={() => setRenamingId(node.id)} />);
		if (actions.onMoveItem) menuEntries.push(<Entry key="move" icon="folderInput" label="Move to" onSelect={() => actions.onMoveItem?.(node)} />);
		if (!isFolder && actions.onDuplicateItem) menuEntries.push(<Entry key="dup" icon="copy" label="Duplicate" onSelect={() => actions.onDuplicateItem?.(node)} />);
		if (actions.onDeleteItem) menuEntries.push(<Entry key="del" icon="trash" label="Delete" color="red" onSelect={() => actions.onDeleteItem?.(node)} />);
	}

	const iconKey = safeIcon(nodeIcon(node, actions.kindIcons, isOpen));
	const customIcon = !!node.icon || (!!node.kind && !!actions.kindIcons?.[node.kind]);

	return (
		<div className="gummy-fc-node" role="none">
			<span aria-hidden className="gummy-fc-line is-stub" style={{ left: trunkX }} />
			<span aria-hidden className="gummy-fc-line is-tick" style={{ left: trunkX }} />
			{!isLast && <span aria-hidden className="gummy-fc-line is-cont" style={{ left: trunkX }} />}
			<div
				ref={setRowRef}
				{...(isEditing ? {} : attributes)}
				{...(isEditing ? {} : listeners)}
				role="treeitem"
				tabIndex={0}
				aria-level={level + 1}
				aria-selected={isSelected}
				{...(isFolder ? { "aria-expanded": isOpen } : {})}
				data-node-id={node.id}
				data-node-type={node.type}
				data-drop={showDrop || undefined}
				data-dragging={isDragging || undefined}
				className="gummy-fc-row"
				style={{ marginLeft: indent }}
				onClick={onClick}
				onKeyDown={onKeyDown}
			>
				<span className="gummy-fc-chevron">{hasChildren && <Icon icon={isOpen ? "chevronDown" : "chevronRight"} size={14} />}</span>
				<span className={`gummy-fc-node-icon${isFolder ? " is-folder" : customIcon ? " is-custom" : ""}`}>
					<Icon icon={iconKey} size={16} />
				</span>
				{isEditing ? (
					<InlineEdit
						initialValue={node.name}
						onCommit={(value) => {
							setRenamingId(null);
							const next = value.trim();
							if (next && next !== node.name) actions.onRenameItem?.(node, next);
						}}
						onCancel={() => setRenamingId(null)}
					/>
				) : (
					<span
						className="gummy-fc-label"
						title={node.name}
						onDoubleClick={(e) => {
							e.stopPropagation();
							if (canRename) setRenamingId(node.id);
						}}
					>
						{node.name}
					</span>
				)}
				{!actions.readOnly && actions.onDeleteItem && !isEditing && (
					<RowButton label={`Remove ${node.name}`} icon="trash" danger onClick={() => actions.onDeleteItem?.(node)} />
				)}
				{menuEntries.length > 0 && !isEditing && (
					<span data-open={menuOpen || undefined} className="contents">
						<MenuButton label={`More actions for ${node.name}`} icon="moreHorizontal" small onOpenChange={setMenuOpen}>
							{menuEntries}
						</MenuButton>
					</span>
				)}
			</div>
			{hasChildren && (
				<Collapse open={isOpen}>
					<div role="group">
						{node.children!.map((child, i) => (
							<NodeRow
								key={child.id}
								node={child}
								level={level + 1}
								isLast={i === node.children!.length - 1}
								selectedId={selectedId}
								expanded={expanded}
								renamingId={renamingId}
								setRenamingId={setRenamingId}
								actions={actions}
							/>
						))}
					</div>
				</Collapse>
			)}
		</div>
	);
}

/** An animated `0fr → 1fr` section (150ms); clipping drops once open so popovers aren't cut. */
function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
	const [settled, setSettled] = useState(open);
	useEffect(() => {
		if (!open) {
			setSettled(false);
			return;
		}
		const t = setTimeout(() => setSettled(true), 160);
		return () => clearTimeout(t);
	}, [open]);
	return (
		<div className="gummy-fc-collapse" data-open={open} data-settled={settled} aria-hidden={!open}>
			<div style={open ? undefined : { visibility: "hidden" }}>{children}</div>
		</div>
	);
}

export type CollectionGroupProps = {
	collection: FileCollection;
	selectedId: string | null;
	expanded: Set<string>;
	collapsedCollections: Set<string>;
	renamingId: string | null;
	setRenamingId: (id: string | null) => void;
	actions: TreeActions;
	/** The id the engine uses for the collection's rename (`collection:<id>`). */
};

export const collectionRenameId = (id: string) => `collection:${id}`;

/** A collection: its header row, the root drop zone and its nodes. */
export function CollectionGroup({ collection, selectedId, expanded, collapsedCollections, renamingId, setRenamingId, actions }: CollectionGroupProps) {
	const isOpen = !collapsedCollections.has(collection.id);
	const isEditing = !actions.readOnly && renamingId === collectionRenameId(collection.id) && !!actions.onRenameCollection;
	const [menuOpen, setMenuOpen] = useState(false);
	const { setNodeRef, isOver } = useDroppable({
		id: `drop-root:${collection.id}`,
		data: { targetFolderId: null, collectionId: collection.id },
		disabled: !actions.canDrag,
	});
	const canRename = !actions.readOnly && !!actions.onRenameCollection;
	const showNew = !actions.readOnly && !!actions.onNewItem && actions.newItems.length > 0;
	const showMenu = !actions.readOnly && actions.showMenu && (canRename || !!actions.onDeleteCollection);
	const showActions = showNew || showMenu || (!actions.readOnly && !!actions.onDeleteCollection);

	return (
		<div data-collection-id={collection.id} role="none">
			<div
				className="gummy-fc-collection-header"
				role="none"
				tabIndex={0}
				data-collection-header={collection.id}
				onClick={() => {
					if (!isEditing) actions.onToggleCollection(collection.id);
				}}
				onKeyDown={(e) => {
					if (isEditing) return;
					if (e.key === "F2" && canRename) {
						e.preventDefault();
						e.stopPropagation();
						setRenamingId(collectionRenameId(collection.id));
					} else if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						e.stopPropagation();
						actions.onToggleCollection(collection.id);
					}
				}}
			>
				<div className="gummy-fc-collection-name">
					<span className="gummy-fc-chevron">
						<Icon icon={isOpen ? "chevronDown" : "chevronRight"} size={14} />
					</span>
					{isEditing ? (
						<InlineEdit
							initialValue={collection.name}
							onCommit={(value) => {
								setRenamingId(null);
								const next = value.trim();
								if (next && next !== collection.name) actions.onRenameCollection?.(collection, next);
							}}
							onCancel={() => setRenamingId(null)}
						/>
					) : (
						<span
							className="gummy-fc-label"
							title={collection.name}
							onDoubleClick={(e) => {
								e.stopPropagation();
								if (canRename) setRenamingId(collectionRenameId(collection.id));
							}}
						>
							{collection.name}
						</span>
					)}
				</div>
				{showActions && !isEditing && (
					<div className="gummy-fc-collection-actions" data-open={menuOpen || undefined}>
						{showNew && (
							<MenuButton label="New" icon="puls" small onOpenChange={setMenuOpen}>
								<NewEntries entries={actions.newItems} onPick={(entry) => actions.onNewItem?.(collection.id, null, entry, true)} />
							</MenuButton>
						)}
						{!actions.readOnly && actions.onDeleteCollection && (
							<RowButton label={`Remove ${collection.name}`} icon="trash" danger onClick={() => actions.onDeleteCollection?.(collection)} />
						)}
						{showMenu && (
							<MenuButton label={`More actions for ${collection.name}`} icon="moreHorizontal" small onOpenChange={setMenuOpen}>
								{canRename && <Entry icon="edit" label="Rename" onSelect={() => setRenamingId(collectionRenameId(collection.id))} />}
								{actions.onDeleteCollection && (
									<Entry icon="trash" label="Delete collection" color="red" onSelect={() => actions.onDeleteCollection?.(collection)} />
								)}
							</MenuButton>
						)}
					</div>
				)}
			</div>
			<Collapse open={isOpen}>
				<div ref={setNodeRef} className="gummy-fc-root-zone" data-over={isOver || undefined} role="group">
					{collection.directories.length === 0 && <div className="gummy-fc-empty-row">Empty</div>}
					{collection.directories.map((node, i) => (
						<NodeRow
							key={node.id}
							node={node}
							level={0}
							isLast={i === collection.directories.length - 1}
							selectedId={selectedId}
							expanded={expanded}
							renamingId={renamingId}
							setRenamingId={setRenamingId}
							actions={actions}
						/>
					))}
				</div>
			</Collapse>
		</div>
	);
}
