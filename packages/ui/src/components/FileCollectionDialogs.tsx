import { Button, TextField, type ThemeProps } from "@radix-ui/themes";
import { useEffect, useMemo, useState } from "react";
import type { FileCollection, FileCollectionNode } from "./@types";
import { Modal } from "./Modal";
import { SelectFieldBase } from "./SelectField";
import { useTheme } from "./context";
import { descendantIds, flattenFolders } from "./core/fileCollectionTree";

type ModalActionsProps = {
	/** The primary action's label ("Add", "Move", "Delete"). */
	label: string;
	/** Submits the enclosing form when "submit" (Enter in the field also does). */
	type?: "button" | "submit";
	/** `red` for a destructive action; absent = the theme's button colour, then the accent. */
	color?: ThemeProps["accentColor"];
	disabled?: boolean;
	/** A request is in flight: the primary shows a spinner, both buttons lock. */
	busy?: boolean;
	onClick?: () => void;
	onCancel: () => void;
};

/**
 * The footer of every file-collection modal: a soft gray **Cancel** and a
 * solid primary, both the standard size, right-aligned over a hairline. The
 * primary takes the theme's button colour like every engine button
 * (`ButtonBase`) and shows Radix's spinner while `busy`.
 */
export function ModalActions({ label, type = "button", color, disabled, busy, onClick, onCancel }: ModalActionsProps) {
	const theme = useTheme();
	const primaryColor = color || (theme.components.button?.color as ThemeProps["accentColor"]) || undefined;
	return (
		<div className="gummy-fc-modal-actions">
			<Button type="button" size="2" variant="soft" color="gray" onClick={onCancel} disabled={busy} className="cursor-pointer">
				Cancel
			</Button>
			<Button type={type} size="2" variant="solid" color={primaryColor} disabled={disabled} loading={busy} onClick={onClick} className="cursor-pointer gummy-fc-modal-primary">
				{label}
			</Button>
		</div>
	);
}

/*
 * The file collection's modals on the library `Modal`: the name prompt
 * (Add <label> / Add collection), the delete confirm (with the non-empty
 * folder block) and the Move to picker. Each is controlled by the engine
 * component and reports through `onConfirm`.
 */

type NameModalProps = {
	id: string;
	open: boolean;
	title: string;
	fieldLabel: string;
	submitLabel?: string;
	busy?: boolean;
	onClose: () => void;
	onConfirm: (name: string) => void;
};

/** "Add <label>": one required text field, Enter submits, Add disabled while blank. */
export function NameModal({ id, open, title, fieldLabel, submitLabel = "Add", busy, onClose, onConfirm }: NameModalProps) {
	const [value, setValue] = useState("");
	useEffect(() => {
		if (open) setValue("");
	}, [open]);
	const trimmed = value.trim();
	const submit = () => {
		if (!trimmed || busy) return;
		onConfirm(trimmed);
	};
	return (
		<Modal id={id} open={open} onOpenChange={(next) => { if (!next) onClose(); }} title={title} width="420px" minWidth="320px">
			<form
				className="gummy-fc-modal-body"
				onSubmit={(e) => {
					e.preventDefault();
					submit();
				}}
			>
				<label className="flex flex-col gap-1 text-sm text-[var(--gray-12)]">
					<span>{fieldLabel}</span>
					<TextField.Root autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder={fieldLabel} />
				</label>
				<ModalActions label={submitLabel} type="submit" disabled={!trimmed} busy={busy} onCancel={onClose} />
			</form>
		</Modal>
	);
}

type DeleteModalProps = {
	id: string;
	open: boolean;
	title: string;
	description: string;
	/** A non-empty folder: the body explains and Delete is disabled. */
	blocked?: boolean;
	busy?: boolean;
	onClose: () => void;
	onConfirm: () => void;
};

/** The delete confirm: Cancel / Delete (red); `blocked` swaps the body and disables Delete. */
export function DeleteModal({ id, open, title, description, blocked, busy, onClose, onConfirm }: DeleteModalProps) {
	return (
		<Modal id={id} open={open} onOpenChange={(next) => { if (!next) onClose(); }} title={title} width="420px" minWidth="320px">
			<div className="gummy-fc-modal-body">
				<p>{blocked ? "Folder is not empty. Remove items before deleting." : description}</p>
				<ModalActions label="Delete" color="red" disabled={!!blocked} busy={busy} onClick={onConfirm} onCancel={onClose} />
			</div>
		</Modal>
	);
}

const ROOT = "__root__";

type MoveModalProps = {
	id: string;
	open: boolean;
	node: FileCollectionNode | null;
	collections: FileCollection[];
	busy?: boolean;
	onClose: () => void;
	onConfirm: (collectionId: string, parentId: string | null) => void;
};

/**
 * "Move <folder|file>": Collection + Folder selects seeded at the node's
 * current place, the folder list flattened with "/" paths plus a
 * "(Collection root)" entry, a folder's own subtree left out; Move is
 * disabled while the destination is where the node already is.
 */
export function MoveModal({ id, open, node, collections, busy, onClose, onConfirm }: MoveModalProps) {
	const [collectionId, setCollectionId] = useState<string>("");
	const [folder, setFolder] = useState<string>(ROOT);
	useEffect(() => {
		if (!open || !node) return;
		setCollectionId(node.collectionId);
		setFolder(node.parentId ?? ROOT);
	}, [open, node]);

	const folderOptions = useMemo(() => {
		const collection = collections.find((c) => c.id === collectionId);
		const exclude = node && node.type === "folder" && node.collectionId === collectionId ? descendantIds(node) : new Set<string>();
		const folders = collection ? flattenFolders(collection.directories, exclude) : [];
		return [{ value: ROOT, label: "(Collection root)" }, ...folders.map((f) => ({ value: f.id, label: f.label }))];
	}, [collections, collectionId, node]);
	// A folder that vanished with a collection switch falls back to the root.
	const folderValue = folderOptions.some((o) => o.value === folder) ? folder : ROOT;
	const parentId = folderValue === ROOT ? null : folderValue;
	const same = !!node && collectionId === node.collectionId && parentId === (node.parentId ?? null);

	return (
		<Modal
			id={id}
			open={open}
			onOpenChange={(next) => { if (!next) onClose(); }}
			title={`Move ${node?.type === "folder" ? "folder" : "file"}`}
			width="420px"
			minWidth="320px"
		>
			<div className="gummy-fc-modal-body">
				{node && (
					<p>
						Move <strong className="text-[var(--gray-12)]">“{node.name}”</strong> to:
					</p>
				)}
				<SelectFieldBase
					label="Collection"
					options={collections.map((c) => ({ value: c.id, label: c.name }))}
					value={collectionId}
					onValueChange={(v) => setCollectionId(v)}
				/>
				<SelectFieldBase label="Folder" options={folderOptions} value={folderValue} onValueChange={(v) => setFolder(v)} />
				<ModalActions
					label="Move"
					disabled={!node || !collectionId || same}
					busy={busy}
					onClick={() => node && onConfirm(collectionId, parentId)}
					onCancel={onClose}
				/>
			</div>
		</Modal>
	);
}
