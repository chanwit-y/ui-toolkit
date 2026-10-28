import {
	DndContext,
	DragOverlay,
	PointerSensor,
	TouchSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
	type DragStartEvent,
} from "@dnd-kit/core";
import { Spinner } from "@radix-ui/themes";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type {
	FileCollection as Collection,
	FileCollectionNewItem,
	FileCollectionNode,
	FileCollectionProps,
	FileCollectionSelected,
	FormListDeleteApi,
	FormListMutationApi,
	SnackbarElement,
} from "./@types";
import { DeleteModal, MoveModal, NameModal } from "./FileCollectionDialogs";
import { CollectionGroup, safeIcon, type TreeActions } from "./FileCollectionTree";
import Icon from "./Icon";
import { useSnackbar, type SnackbarVariant } from "./Snackbar";
import { resolveDataValues, type DataValueScope } from "./core/dataValue";
import {
	allNodeIds,
	checkDrop,
	countFiles,
	creationTarget,
	findCreated,
	findNode,
	nodeIcon,
	parseCollections,
	selectedOf,
	substitute,
} from "./core/fileCollectionTree";
import { useNavigateTo } from "./core/pages";
import { callArgs, useRouteScope } from "./core/readApi";
import { useRowScope } from "./core/rowScope";
import { getStateStore } from "./core/stateStore";
import { useReadApi } from "./core/useReadApi";

type Row = Record<string, unknown>;

/** The default New menu. */
export const DEFAULT_NEW_ITEMS: FileCollectionNewItem[] = [
	{ label: "New folder", icon: "folder", type: "folder" },
	{ label: "New file", icon: "file", type: "file" },
];

/** The selection slice key for a file collection. */
export function fileCollectionStateKey(name: string, selection?: { stateKey: string }): string {
	return selection?.stateKey || `${name}Selected`;
}

/** `{ id: "id" }` → `{ id: subject.id }` — a slot's `:param` map over the node / collection. */
function subjectParams(mapping: Record<string, string> | undefined, subject: Row): Row {
	if (!mapping) return {};
	return Object.entries(mapping).reduce<Row>((acc, [param, field]) => {
		acc[param] = subject[field];
		return acc;
	}, {});
}

type Dialog =
	| { kind: "newCollection" }
	| { kind: "newItem"; collectionId: string; parentId: string | null; entry: FileCollectionNewItem }
	| { kind: "deleteCollection"; collection: Collection }
	| { kind: "deleteItem"; node: FileCollectionNode }
	| { kind: "move"; node: FileCollectionNode };

/** The skeleton of §5.1: a fake header and ten rows of a square + a shrinking bar. */
export function FileCollectionSkeleton() {
	return (
		<div className="gummy-fc-skeleton" aria-hidden>
			<div className="gummy-fc-skeleton-bar" style={{ width: 128, height: 16 }} />
			<div className="gummy-fc-skeleton-bar" style={{ width: 96 }} />
			{Array.from({ length: 10 }, (_, i) => (
				<div key={i} className="gummy-fc-skeleton-row">
					<div className="gummy-fc-skeleton-square" />
					<div className="gummy-fc-skeleton-bar" style={{ width: 160 - i * 7 }} />
				</div>
			))}
		</div>
	);
}

export type FileCollectionViewProps = {
	name: string;
	title?: string;
	collapsible?: boolean;
	height?: string;
	collections: Collection[];
	/** First fetch in flight ⇒ the skeleton. */
	loading?: boolean;
	/** The fetch failed ⇒ the message + Retry. */
	error?: string | null;
	onRetry?: () => void;
	/** A mutation / re-fetch in flight ⇒ the header spinner. */
	busy?: boolean;
	selectedId: string | null;
	expanded: Set<string>;
	collapsedCollections: Set<string>;
	renamingId: string | null;
	setRenamingId: (id: string | null) => void;
	actions: TreeActions;
	/** The header **+** (hidden when absent). */
	onAddCollection?: () => void;
	/** Studio note under the empty state (no list endpoint). */
	note?: ReactNode;
	onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
	children?: ReactNode;
};

/**
 * The hook-light view: header, the collapsed rail, the loading / failed /
 * empty states and the collection groups. The engine component wraps it in
 * the drag context and the dialogs; the studio canvas renders it over mock
 * data with inert actions.
 */
export function FileCollectionView({
	name,
	title,
	collapsible,
	height,
	collections,
	loading,
	error,
	onRetry,
	busy,
	selectedId,
	expanded,
	collapsedCollections,
	renamingId,
	setRenamingId,
	actions,
	onAddCollection,
	note,
	onKeyDown,
	children,
}: FileCollectionViewProps) {
	const [collapsed, setCollapsed] = useState(false);
	const showAdd = !!onAddCollection && !actions.readOnly;

	return (
		<div className="gummy-fc gummy-surface" data-file-collection={name} data-collapsed={collapsed || undefined} style={height ? { height } : undefined}>
			<div className="gummy-fc-header">
				{!collapsed && <span className="gummy-fc-title">{title}</span>}
				<div className="gummy-fc-header-actions">
					{!collapsed && busy && (
						<span className="gummy-fc-spinner" aria-label="Updating">
							<Spinner size="1" />
						</span>
					)}
					{!collapsed && showAdd && (
						<button type="button" className="gummy-fc-icon-btn" aria-label="Add collection" title="Add collection" onClick={onAddCollection}>
							<Icon icon="puls" size={16} />
						</button>
					)}
					{collapsible && (
						<button
							type="button"
							className="gummy-fc-icon-btn"
							aria-label={collapsed ? "Expand" : "Collapse"}
							title={collapsed ? "Expand" : "Collapse"}
							aria-expanded={!collapsed}
							onClick={() => setCollapsed((c) => !c)}
						>
							<Icon icon={collapsed ? "panelLeftOpen" : "panelLeftClose"} size={16} />
						</button>
					)}
				</div>
			</div>
			{!collapsed && (
				<div className="gummy-fc-body" role="tree" aria-label={title || name} onKeyDown={onKeyDown}>
					{loading ? (
						<FileCollectionSkeleton />
					) : error ? (
						<div className="gummy-fc-state" role="alert">
							<span>Couldn't load files</span>
							{onRetry && (
								<button type="button" className="gummy-fc-text-btn" onClick={onRetry}>
									Retry
								</button>
							)}
						</div>
					) : collections.length === 0 ? (
						<div className="gummy-fc-state">
							<span>No collections yet</span>
							{showAdd && (
								<button type="button" className="gummy-fc-text-btn" onClick={onAddCollection}>
									Add collection
								</button>
							)}
							{note}
						</div>
					) : (
						collections.map((collection) => (
							<CollectionGroup
								key={collection.id}
								collection={collection}
								selectedId={selectedId}
								expanded={expanded}
								collapsedCollections={collapsedCollections}
								renamingId={renamingId}
								setRenamingId={setRenamingId}
								actions={actions}
							/>
						))
					)}
				</div>
			)}
			{children}
		</div>
	);
}

/**
 * The `filecollection` element — see `FileCollectionElement` for the
 * contract. Reads the tree through `api.list` (held until every URL `:param`
 * resolves, refetch registered under `name`), runs the eight mutation slots
 * with their fixed bodies and re-fetches after each, keeps expand state by
 * id across re-fetches, publishes the selection as a global-state slice and
 * plays `selectNavigate` on a file click. Needs the engine providers (query
 * client, snackbar, router).
 */
export const FileCollection = ({
	name,
	title,
	collapsible,
	readOnly = false,
	height,
	menu = true,
	api,
	newItems = DEFAULT_NEW_ITEMS,
	kindIcons,
	selection,
	selectNavigate,
}: FileCollectionProps) => {
	const { showSnackbar } = useSnackbar();
	const navigateTo = useNavigateTo();
	const route = useRouteScope();
	const parent = useRowScope();
	const scope = useMemo<DataValueScope>(() => ({ ...route, row: parent?.row }), [route, parent]);

	// The read: `paths` applied here, after the string tolerance (§2.2).
	const listApi = useMemo(() => ({ ...api.list, paths: undefined }), [api.list]);
	const { data, isLoading, isFetching, error, refetch, held } = useReadApi(name, listApi);
	const collections = useMemo(() => parseCollections(data, api.list.paths), [data, api.list.paths]);

	const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
	const [collapsedCollections, setCollapsedCollections] = useState<Set<string>>(() => new Set());
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const [dialog, setDialog] = useState<Dialog | null>(null);
	const [busy, setBusy] = useState(false);
	const [dragging, setDragging] = useState<FileCollectionNode | null>(null);
	// The create we're waiting on: select the node once the re-fetch returns it.
	const pendingSelect = useRef<{ collectionId: string; parentId: string | null; name: string } | null>(null);

	// ---- the selection slice --------------------------------------------
	const stateKey = fileCollectionStateKey(name, selection);
	const selected: FileCollectionSelected | null = useMemo(
		() => (selectedId ? selectedOf(collections, selectedId) : null),
		[collections, selectedId],
	);
	useEffect(() => {
		getStateStore(stateKey).getState().setLoad({ data: selected, status: "success" });
	}, [stateKey, selected]);
	useEffect(() => () => getStateStore(stateKey).getState().clear(), [stateKey]);

	// A re-fetch may have dropped the selected node (deleted elsewhere), or
	// returned the node a create was waiting on.
	useEffect(() => {
		if (!data) return;
		const ids = allNodeIds(collections);
		if (selectedId && !ids.has(selectedId)) setSelectedId(null);
		const pending = pendingSelect.current;
		if (pending) {
			pendingSelect.current = null;
			const created = findCreated(collections, pending.collectionId, pending.parentId, pending.name);
			if (created) select(created, false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [collections]);

	const expandAncestors = useCallback(
		(id: string) => {
			const found = findNode(collections, id);
			if (!found) return;
			setExpanded((prev) => {
				const next = new Set(prev);
				for (const a of found.ancestors) next.add(a.id);
				return next;
			});
			setCollapsedCollections((prev) => {
				if (!prev.has(found.collection.id)) return prev;
				const next = new Set(prev);
				next.delete(found.collection.id);
				return next;
			});
		},
		[collections],
	);

	const select = useCallback(
		(node: FileCollectionNode, fromClick: boolean) => {
			setSelectedId(node.id);
			expandAncestors(node.id);
			if (fromClick && node.type === "file" && selectNavigate) navigateTo(selectNavigate, { row: node });
		},
		[expandAncestors, navigateTo, selectNavigate],
	);

	// ---- mutations --------------------------------------------------------
	const notifyError = useCallback(
		(info: FormListMutationApi, err: unknown) => {
			let variant: SnackbarVariant = "error";
			let message = err instanceof Error ? err.message : "Something went wrong";
			if (info.snackbarError && info.snackbarError !== "$exception") {
				variant = info.snackbarError.type;
				message = info.snackbarError.message;
			}
			showSnackbar({ variant, message });
		},
		[showSnackbar],
	);

	/** Call a slot for `subject` with the fixed `body`; re-fetch on success. True on success. */
	const mutate = useCallback(
		async (info: FormListMutationApi, subject: Row, body: Row | undefined): Promise<boolean> => {
			const query = resolveDataValues(info.query, scope);
			const p = { ...subjectParams(info.params, subject), ...resolveDataValues(info.extraParams, scope) };
			const b = body === undefined ? undefined : { ...body, ...resolveDataValues(info.extraBody, scope) };
			setBusy(true);
			try {
				await (info.api as (...a: unknown[]) => Promise<unknown>)(...callArgs(info.segments, query, p, b));
				const success: SnackbarElement | undefined = info.snackbarSuccess;
				if (success?.message) showSnackbar({ variant: success.type, message: success.message });
				await refetch();
				return true;
			} catch (err) {
				notifyError(info, err);
				return false;
			} finally {
				setBusy(false);
			}
		},
		[scope, refetch, showSnackbar, notifyError],
	);

	const closeDialog = () => setDialog(null);

	const addCollection = async (collectionName: string) => {
		if (!api.createCollection) return;
		const ok = await mutate(api.createCollection, {}, { name: collectionName });
		if (ok) closeDialog();
	};

	const addItem = async (d: Extract<Dialog, { kind: "newItem" }>, itemName: string) => {
		if (!api.createItem) return;
		const subject: Row = { collectionId: d.collectionId, parentId: d.parentId, id: d.parentId, name: itemName, kind: d.entry.kind ?? null };
		pendingSelect.current = { collectionId: d.collectionId, parentId: d.parentId, name: itemName };
		const ok = await mutate(api.createItem, subject, {
			collectionId: d.collectionId,
			parentId: d.parentId,
			name: itemName,
			type: d.entry.type,
			kind: d.entry.kind || null,
		});
		if (!ok) pendingSelect.current = null;
		else {
			closeDialog();
			if (d.parentId) setExpanded((prev) => new Set(prev).add(d.parentId!));
		}
	};

	const renameCollection = async (collection: Collection, next: string) => {
		if (!api.renameCollection) return;
		await mutate(api.renameCollection, { id: collection.id, collectionId: collection.id, name: collection.name }, { name: next });
	};
	const renameItem = async (node: FileCollectionNode, next: string) => {
		if (!api.renameItem) return;
		await mutate(api.renameItem, node as unknown as Row, { name: next });
	};
	const deleteCollection = async (collection: Collection) => {
		if (!api.deleteCollection) return;
		const ok = await mutate(api.deleteCollection, { id: collection.id, collectionId: collection.id, name: collection.name }, undefined);
		if (ok) closeDialog();
	};
	const deleteItem = async (node: FileCollectionNode) => {
		if (!api.deleteItem) return;
		const ok = await mutate(api.deleteItem, node as unknown as Row, undefined);
		if (ok) closeDialog();
	};
	const duplicateItem = async (node: FileCollectionNode) => {
		if (!api.duplicateItem) return;
		await mutate(api.duplicateItem, node as unknown as Row, undefined);
	};
	const moveItem = async (node: FileCollectionNode, collectionId: string, parentId: string | null) => {
		if (!api.moveItem) return false;
		const ok = await mutate(api.moveItem, node as unknown as Row, { collectionId, parentId });
		if (ok && parentId) setExpanded((prev) => new Set(prev).add(parentId));
		return ok;
	};

	// ---- drag and drop ----------------------------------------------------
	const canDrag = !readOnly && !!api.moveItem;
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
		useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
	);
	const onDragStart = (e: DragStartEvent) => setDragging((e.active.data.current as { node?: FileCollectionNode } | undefined)?.node ?? null);
	const onDragEnd = async (e: DragEndEvent) => {
		setDragging(null);
		const over = e.over?.data.current as { targetFolderId: string | null; collectionId: string } | undefined;
		if (!over) return;
		const check = checkDrop(collections, String(e.active.id), over.collectionId, over.targetFolderId);
		if (!check.ok) return;
		const found = findNode(collections, String(e.active.id));
		if (found) await moveItem(found.node, check.collectionId, check.parentId);
	};

	// ---- keyboard ---------------------------------------------------------
	const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		const el = e.target as HTMLElement;
		const id = el.getAttribute?.("data-node-id");
		if (!id || el.tagName === "INPUT") return;
		const rows = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[role='treeitem']"));
		const index = rows.indexOf(el);
		const found = findNode(collections, id);
		if (!found) return;
		const isFolder = found.node.type === "folder";
		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				rows[index + 1]?.focus();
				break;
			case "ArrowUp":
				e.preventDefault();
				rows[index - 1]?.focus();
				break;
			case "ArrowRight":
				e.preventDefault();
				if (isFolder && !expanded.has(id) && found.node.children?.length) setExpanded((prev) => new Set(prev).add(id));
				else if (isFolder && expanded.has(id)) rows[index + 1]?.focus();
				break;
			case "ArrowLeft":
				e.preventDefault();
				if (isFolder && expanded.has(id)) {
					setExpanded((prev) => {
						const next = new Set(prev);
						next.delete(id);
						return next;
					});
				} else if (found.node.parentId) {
					e.currentTarget.querySelector<HTMLElement>(`[data-node-id="${CSS.escape(found.node.parentId)}"]`)?.focus();
				}
				break;
			case "Enter":
				e.preventDefault();
				select(found.node, true);
				break;
			default:
				break;
		}
	};

	const actions: TreeActions = {
		readOnly,
		showMenu: menu,
		newItems,
		kindIcons,
		canDrag,
		onSelect: (node) => select(node, true),
		onToggleFolder: (id) =>
			setExpanded((prev) => {
				const next = new Set(prev);
				if (next.has(id)) next.delete(id);
				else next.add(id);
				return next;
			}),
		onToggleCollection: (id) =>
			setCollapsedCollections((prev) => {
				const next = new Set(prev);
				if (next.has(id)) next.delete(id);
				else next.add(id);
				return next;
			}),
		onNewItem: api.createItem
			? (collectionId, parentId, entry, fromHeader) =>
					setDialog({ kind: "newItem", collectionId, parentId: fromHeader ? creationTarget(collections, collectionId, selectedId) : parentId, entry })
			: undefined,
		onRenameCollection: api.renameCollection ? renameCollection : undefined,
		onDeleteCollection: api.deleteCollection ? (collection) => setDialog({ kind: "deleteCollection", collection }) : undefined,
		onRenameItem: api.renameItem ? renameItem : undefined,
		onDeleteItem: api.deleteItem ? (node) => setDialog({ kind: "deleteItem", node }) : undefined,
		onMoveItem: api.moveItem ? (node) => setDialog({ kind: "move", node }) : undefined,
		onDuplicateItem: api.duplicateItem ? duplicateItem : undefined,
	};

	const firstLoad = (isLoading || held) && !data;
	const deleteInfo = (d: Dialog | null): { info: FormListDeleteApi | undefined; subjectName: string; count: number; blocked: boolean } => {
		if (d?.kind === "deleteCollection") return { info: api.deleteCollection, subjectName: d.collection.name, count: countFiles(d.collection.directories), blocked: false };
		if (d?.kind === "deleteItem") return { info: api.deleteItem, subjectName: d.node.name, count: countFiles(d.node.children), blocked: d.node.type === "folder" && !!d.node.children?.length };
		return { info: undefined, subjectName: "", count: 0, blocked: false };
	};
	const del = deleteInfo(dialog);

	return (
		<DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
			<FileCollectionView
				name={name}
				title={title}
				collapsible={collapsible}
				height={height}
				collections={collections}
				loading={firstLoad}
				error={error ? (error instanceof Error ? error.message : "Couldn't load files") : null}
				onRetry={() => void refetch()}
				busy={busy || (isFetching && !!data)}
				selectedId={selectedId}
				expanded={expanded}
				collapsedCollections={collapsedCollections}
				renamingId={renamingId}
				setRenamingId={setRenamingId}
				actions={actions}
				onAddCollection={api.createCollection ? () => setDialog({ kind: "newCollection" }) : undefined}
				onKeyDown={onKeyDown}
			>
				<DragOverlay dropAnimation={null}>
					{dragging && (
						<span className="gummy-fc-drag-chip">
							<Icon icon={safeIcon(nodeIcon(dragging, kindIcons, false))} size={14} />
							{dragging.name}
						</span>
					)}
				</DragOverlay>
				<NameModal
					id={`${name}-add-collection`}
					open={dialog?.kind === "newCollection"}
					title="Add collection"
					fieldLabel="Collection name"
					busy={busy}
					onClose={closeDialog}
					onConfirm={(value) => void addCollection(value)}
				/>
				<NameModal
					id={`${name}-add-item`}
					open={dialog?.kind === "newItem"}
					title={dialog?.kind === "newItem" ? `Add ${dialog.entry.label}` : "Add"}
					fieldLabel={dialog?.kind === "newItem" ? `${dialog.entry.label} name` : "Name"}
					busy={busy}
					onClose={closeDialog}
					onConfirm={(value) => dialog?.kind === "newItem" && void addItem(dialog, value)}
				/>
				<DeleteModal
					id={`${name}-delete`}
					open={dialog?.kind === "deleteCollection" || dialog?.kind === "deleteItem"}
					title={del.info?.confirmBox?.title ?? (dialog?.kind === "deleteCollection" ? "Delete collection" : "Delete item")}
					description={substitute(
						del.info?.confirmBox?.description ?? (dialog?.kind === "deleteCollection" ? 'Delete "{{name}}" and its {{count}} files? This cannot be undone.' : 'Delete "{{name}}"? This cannot be undone.'),
						{ name: del.subjectName, count: del.count },
					)}
					blocked={del.blocked}
					busy={busy}
					onClose={closeDialog}
					onConfirm={() => {
						if (dialog?.kind === "deleteCollection") void deleteCollection(dialog.collection);
						else if (dialog?.kind === "deleteItem") void deleteItem(dialog.node);
					}}
				/>
				<MoveModal
					id={`${name}-move`}
					open={dialog?.kind === "move"}
					node={dialog?.kind === "move" ? dialog.node : null}
					collections={collections}
					busy={busy}
					onClose={closeDialog}
					onConfirm={async (collectionId, parentId) => {
						if (dialog?.kind !== "move") return;
						const ok = await moveItem(dialog.node, collectionId, parentId);
						if (ok) closeDialog();
					}}
				/>
			</FileCollectionView>
		</DndContext>
	);
};
