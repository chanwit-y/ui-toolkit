import { useDraggable, useDroppable } from "@dnd-kit/core";
import { DropdownMenu, Spinner } from "@radix-ui/themes";
import {
	useEffect,
	useRef,
	useState,
	type DragEvent,
	type KeyboardEvent,
	type MouseEvent,
	type ReactNode,
} from "react";
import type { FileCollection, FileCollectionNewItem, FileCollectionNode } from "./@types";
import Icon from "./Icon";
import { IconData } from "./core/const/iconData";
import { nodeIcon } from "./core/fileCollectionTree";
import { hasFiles, type PendingUpload } from "./core/fileCollectionUpload";

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
	/** OS files may be dropped on folders / collections and picked from the New menu (`uploadItem` wired, not read-only). */
	canUpload?: boolean;
	/** The New menu's trailing "Upload files…" entry. */
	uploadEntry?: { label: string; icon: IconKey };
	/** A native file drop on a folder (`parentId`), a file (its parent) or a collection (`null`). */
	onDropFiles?: (collectionId: string, parentId: string | null, dt: DataTransfer) => void;
	/** The New menu's upload entry: open the file picker for that target. */
	onPickFiles?: (collectionId: string, parentId: string | null, fromHeader: boolean) => void;
	/** Files in flight, drawn as ghost rows under their target. */
	pending?: PendingUpload[];
};

/**
 * Native file-drag handling for one target: the hovered state (a depth
 * counter, since enter / leave fire for every child) and the handlers to
 * spread on it. Only a drag that carries `Files` is taken — a dnd-kit row
 * drag is pointer-based and never reaches these — and each handler stops the
 * event, so the root zone / the root guard don't see a drop a row took.
 */
function useFileDrop(enabled: boolean, onDrop: (dt: DataTransfer) => void) {
	const [over, setOver] = useState(false);
	const depth = useRef(0);
	const take = (e: DragEvent) => enabled && hasFiles(e.dataTransfer);
	// A drag that ends anywhere else (dropped outside the window, cancelled) sends no leave: reset on the window's own end events.
	useEffect(() => {
		if (!over) return;
		const reset = () => {
			depth.current = 0;
			setOver(false);
		};
		window.addEventListener("drop", reset, true);
		window.addEventListener("dragend", reset, true);
		return () => {
			window.removeEventListener("drop", reset, true);
			window.removeEventListener("dragend", reset, true);
		};
	}, [over]);
	const props = {
		onDragEnter: (e: DragEvent) => {
			if (!take(e)) return;
			e.preventDefault();
			e.stopPropagation();
			depth.current += 1;
			setOver(true);
		},
		onDragOver: (e: DragEvent) => {
			if (!take(e)) return;
			e.preventDefault();
			e.stopPropagation();
			e.dataTransfer.dropEffect = "copy";
		},
		onDragLeave: (e: DragEvent) => {
			if (!take(e)) return;
			e.stopPropagation();
			depth.current = Math.max(0, depth.current - 1);
			if (depth.current === 0) setOver(false);
		},
		onDrop: (e: DragEvent) => {
			if (!take(e)) return;
			e.preventDefault();
			e.stopPropagation();
			depth.current = 0;
			setOver(false);
			onDrop(e.dataTransfer);
		},
	};
	return { over: enabled && over, props };
}

/** A file being uploaded: a greyed row with a spinner where it will appear. */
function PendingRow({ item, level, kindIcons }: { item: PendingUpload; level: number; kindIcons?: Record<string, string> }) {
	const indent = level * 20 + 8;
	const trunkX = indent - 12;
	const ghost: FileCollectionNode = { id: item.key, collectionId: item.collectionId, parentId: item.parentId, name: item.name, type: "file", kind: item.kind };
	return (
		<div className="gummy-fc-node" role="none">
			<span aria-hidden className="gummy-fc-line is-stub" style={{ left: trunkX }} />
			<span aria-hidden className="gummy-fc-line is-tick" style={{ left: trunkX }} />
			<div className="gummy-fc-row is-pending" role="treeitem" aria-level={level + 1} aria-selected={false} aria-busy tabIndex={-1} data-pending-upload style={{ marginLeft: indent }}>
				<span className="gummy-fc-chevron" />
				<span className="gummy-fc-node-icon">
					<Icon icon={safeIcon(nodeIcon(ghost, kindIcons, false))} size={16} />
				</span>
				<span className="gummy-fc-label" title={item.name}>
					{item.name}
				</span>
				<span className="gummy-fc-pending-spinner" aria-label="Uploading">
					<Spinner size="1" />
				</span>
			</div>
		</div>
	);
}

/** The ghost rows under one target (a folder, or `null` for the collection root). */
function pendingUnder(pending: PendingUpload[] | undefined, collectionId: string, parentId: string | null): PendingUpload[] {
	return (pending ?? []).filter((p) => p.collectionId === collectionId && p.parentId === parentId);
}

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

/** The New menu's entries (one per `newItems` element), then the upload entry when files can be picked. */
function NewEntries({
	entries,
	onPick,
	uploadEntry,
	onUpload,
}: {
	entries: FileCollectionNewItem[];
	onPick: (entry: FileCollectionNewItem) => void;
	uploadEntry?: { label: string; icon: IconKey };
	onUpload?: () => void;
}) {
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
			{onUpload && (
				<>
					{entries.length > 0 && <DropdownMenu.Separator />}
					<Entry icon={uploadEntry?.icon ?? "upload"} label={uploadEntry?.label ?? "Upload files…"} onSelect={onUpload} />
				</>
			)}
		</>
	);
}

/** Whether a New menu has anything to show: a `newItems` entry (needs `createItem`) or the upload entry. */
function hasNewMenu(actions: TreeActions): boolean {
	return !actions.readOnly && ((!!actions.onNewItem && actions.newItems.length > 0) || !!actions.onPickFiles);
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
	// OS files: a folder takes them, a file forwards them to its parent (highlighted on the row itself so the drop has a visible home).
	const fileDrop = useFileDrop(!!actions.canUpload && !isEditing, (dt) => actions.onDropFiles?.(node.collectionId, isFolder ? node.id : node.parentId, dt));
	const pendingHere = isFolder ? pendingUnder(actions.pending, node.collectionId, node.id) : [];
	const hasRows = hasChildren || pendingHere.length > 0;

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
		if (isFolder && hasNewMenu(actions)) {
			menuEntries.push(
				<DropdownMenu.Sub key="new">
					<DropdownMenu.SubTrigger>
						<Icon icon="puls" size={14} />
						New
					</DropdownMenu.SubTrigger>
					<DropdownMenu.SubContent>
						<NewEntries
							entries={actions.onNewItem ? actions.newItems : []}
							onPick={(entry) => actions.onNewItem?.(node.collectionId, node.id, entry, false)}
							uploadEntry={actions.uploadEntry}
							onUpload={actions.onPickFiles ? () => actions.onPickFiles?.(node.collectionId, node.id, false) : undefined}
						/>
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
				data-drop={showDrop || fileDrop.over || undefined}
				data-dragging={isDragging || undefined}
				className="gummy-fc-row"
				style={{ marginLeft: indent }}
				onClick={onClick}
				onKeyDown={onKeyDown}
				{...fileDrop.props}
			>
				<span className="gummy-fc-chevron">{hasRows && <Icon icon={isOpen ? "chevronDown" : "chevronRight"} size={14} />}</span>
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
			{hasRows && (
				<Collapse open={isOpen}>
					<div role="group">
						{(node.children ?? []).map((child, i) => (
							<NodeRow
								key={child.id}
								node={child}
								level={level + 1}
								isLast={pendingHere.length === 0 && i === node.children!.length - 1}
								selectedId={selectedId}
								expanded={expanded}
								renamingId={renamingId}
								setRenamingId={setRenamingId}
								actions={actions}
							/>
						))}
						{pendingHere.map((item) => (
							<PendingRow key={item.key} item={item} level={level + 1} kindIcons={actions.kindIcons} />
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
	const showNew = hasNewMenu(actions);
	const showMenu = !actions.readOnly && actions.showMenu && (canRename || !!actions.onDeleteCollection);
	const showActions = showNew || showMenu || (!actions.readOnly && !!actions.onDeleteCollection);
	// OS files on the header or the body land at the collection root.
	const headerDrop = useFileDrop(!!actions.canUpload && !isEditing, (dt) => actions.onDropFiles?.(collection.id, null, dt));
	const rootDrop = useFileDrop(!!actions.canUpload, (dt) => actions.onDropFiles?.(collection.id, null, dt));
	const pendingRoot = pendingUnder(actions.pending, collection.id, null);

	return (
		<div data-collection-id={collection.id} role="none">
			<div
				className="gummy-fc-collection-header"
				role="none"
				tabIndex={0}
				data-collection-header={collection.id}
				data-drop={headerDrop.over || undefined}
				{...headerDrop.props}
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
								<NewEntries
									entries={actions.onNewItem ? actions.newItems : []}
									onPick={(entry) => actions.onNewItem?.(collection.id, null, entry, true)}
									uploadEntry={actions.uploadEntry}
									onUpload={actions.onPickFiles ? () => actions.onPickFiles?.(collection.id, null, true) : undefined}
								/>
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
				<div ref={setNodeRef} className="gummy-fc-root-zone" data-over={isOver || rootDrop.over || undefined} role="group" {...rootDrop.props}>
					{collection.directories.length === 0 && pendingRoot.length === 0 && <div className="gummy-fc-empty-row">Empty</div>}
					{collection.directories.map((node, i) => (
						<NodeRow
							key={node.id}
							node={node}
							level={0}
							isLast={pendingRoot.length === 0 && i === collection.directories.length - 1}
							selectedId={selectedId}
							expanded={expanded}
							renamingId={renamingId}
							setRenamingId={setRenamingId}
							actions={actions}
						/>
					))}
					{pendingRoot.map((item) => (
						<PendingRow key={item.key} item={item} level={0} kindIcons={actions.kindIcons} />
					))}
				</div>
			</Collapse>
		</div>
	);
}
