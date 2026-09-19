import { zodResolver } from "@hookform/resolvers/zod";
import { Button as RadixButton, IconButton, type ThemeProps } from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FormProvider, useForm, useFormState } from "react-hook-form";
import { useParams, useSearchParams } from "react-router-dom";
import type {
	ButtonDisplay,
	Container,
	FormListMutationApi,
	FormListProps,
	SnackbarElement,
} from "./@types";
import { ConfirmBox } from "./ConfirmBox";
import Icon from "./Icon";
import type { IconData } from "./core/const/iconData";
import { useSnackbar, type SnackbarVariant } from "./Snackbar";
import { useLoading, useTheme } from "./context";
import { Schema } from "./core/schema";
import { drillPaths, resolveDataValues, type DataValueScope } from "./core/dataValue";
import { callArgs, stateKeys, useStateVersion } from "./core/readApi";
import { useStord } from "./core/stord";

type Row = Record<string, any>;
type Draft = { key: string };

/**
 * `""` for every field the row template binds (nested containers included) —
 * the draft's defaults, and the floor under a persisted row, so each input is
 * controlled from its first render.
 */
function emptyRowValues(container: Container): Row {
	const out: Row = {};
	const walk = (c: Container) => {
		for (const b of c.bins) {
			const name = (b.element as { name?: string } | undefined)?.name;
			if (name && b.type !== "formlist") out[name] = "";
			if (b.container) walk(b.container);
		}
	};
	walk(container);
	return out;
}

/** Row-field mapping → concrete params, e.g. `{ id: "_id" }` → `{ id: row._id }`. */
function rowParams(mapping: Record<string, string> | undefined, row: Row): Row {
	if (!mapping) return {};
	return Object.entries(mapping).reduce<Row>((acc, [param, field]) => {
		acc[param] = row[field];
		return acc;
	}, {});
}

type ChromeButtonProps = {
	variant: "outline" | "ghost";
	color: ThemeProps["accentColor"] | undefined;
	label: string;
	icon: keyof typeof IconData;
	display: ButtonDisplay;
	onClick: () => void;
};

/**
 * Add / Remove chrome: icon + label, the icon alone (label as accessible name
 * and tooltip) or the label alone, per `display`.
 */
function ChromeButton({ variant, color, label, icon, display, onClick }: ChromeButtonProps) {
	if (display === "icon") {
		return (
			<IconButton
				type="button"
				variant={variant}
				color={color}
				size="2"
				aria-label={label}
				title={label}
				onClick={onClick}
				className="cursor-pointer"
			>
				<Icon icon={icon} size={16} />
			</IconButton>
		);
	}
	return (
		<RadixButton
			type="button"
			variant={variant}
			color={color}
			size="2"
			onClick={onClick}
			className="cursor-pointer"
		>
			{display !== "label" && <Icon icon={icon} size={14} />}
			{label}
		</RadixButton>
	);
}

type RowFormProps = {
	rowContainer: Container;
	renderBins: FormListProps["renderBins"];
	row: Row;
	isDraft: boolean;
	readOnly: boolean;
	canSave: boolean;
	canRemove: boolean;
	saveLabel: string;
	removeLabel: string;
	removeIcon: keyof typeof IconData;
	removeDisplay: ButtonDisplay;
	controlsPosition: "start" | "end" | "below";
	color: ThemeProps["accentColor"] | undefined;
	onSave: (values: Row) => Promise<boolean>;
	onRemove: () => void;
};

/**
 * One row: its own react-hook-form instance validated by the row template's
 * schema. Save appears only while the row is dirty; a click validates, then
 * hands the values up. Persisted rows without an update API are disabled as a
 * whole through the fieldset.
 */
function RowForm({
	rowContainer,
	renderBins,
	row,
	isDraft,
	readOnly,
	canSave,
	canRemove,
	saveLabel,
	removeLabel,
	removeIcon,
	removeDisplay,
	controlsPosition,
	color,
	onSave,
	onRemove,
}: RowFormProps) {
	const schema = useMemo(() => new Schema([rowContainer]).generate(), [rowContainer]);
	const form = useForm<Row>({ mode: "all", resolver: zodResolver(schema), defaultValues: row });
	const { isDirty, isSubmitting } = useFormState({ control: form.control });

	// A refetch hands the row back with its saved values: adopt them as the new
	// baseline so the row reads clean again.
	const rowSig = JSON.stringify(row);
	useEffect(() => {
		form.reset(row);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [rowSig]);

	// Everything `withForm` accepts (`form.control`), plus `_form` for parity
	// with the engine's Form wrapper.
	const f = useMemo(() => ({ _form: form, control: form.control }), [form]);

	const submit = form.handleSubmit(async (values) => {
		const ok = await onSave(values);
		if (ok && !isDraft) form.reset(values);
	});

	const showSave = canSave && (isDirty || isDraft);
	const below = controlsPosition === "below";

	const fields = (
		<fieldset disabled={readOnly} className="m-0 min-w-0 flex-1 border-0 p-0">
			{renderBins(rowContainer, f)}
		</fieldset>
	);
	const controls = (showSave || canRemove) && (
		<div
			className={
				below
					? "flex items-center justify-end gap-1"
					: "flex shrink-0 items-center gap-1 pt-7"
			}
		>
			{showSave && (
				<IconButton
					type="button"
					variant="soft"
					color={color}
					size="2"
					aria-label={saveLabel}
					title={saveLabel}
					disabled={isSubmitting}
					onClick={() => void submit()}
					className="cursor-pointer"
				>
					<Icon icon="check" size={16} />
				</IconButton>
			)}
			{canRemove && (
				<ChromeButton
					variant="ghost"
					color="gray"
					label={removeLabel}
					icon={removeIcon}
					display={removeDisplay}
					onClick={onRemove}
				/>
			)}
		</div>
	);

	return (
		<FormProvider {...form}>
			<div className={below ? "flex flex-col gap-2" : "flex items-start gap-3"}>
				{controlsPosition === "start" && controls}
				{fields}
				{controlsPosition !== "start" && controls}
			</div>
		</FormProvider>
	);
}

/**
 * Repeating-form list backed by CRUD APIs — see `FormListElement` for the
 * contract. Rows come from `apiCrud.read` and render `rowContainer` each as an
 * independent form; drafts (Add) live locally after them. Save creates or
 * updates by `idKey`, Remove confirms then deletes (drafts are discarded), and
 * every mutation refetches. Needs the engine providers (query client,
 * snackbar, loading, router).
 */
export const FormList = ({
	name,
	title,
	idKey = "id",
	rowContainer,
	apiCrud,
	renderBins,
	addLabel = "Add",
	addIcon = "puls",
	addPosition = "bottom",
	addAlign = "start",
	addDisplay = "both",
	saveLabel = "Save",
	removeLabel = "Remove",
	removeIcon = "trash",
	removePosition = "end",
	removeDisplay = "both",
	emptyText = "No items yet",
}: FormListProps) => {
	const params = useParams();
	const [searchParams] = useSearchParams();
	const theme = useTheme();
	const { showSnackbar } = useSnackbar();
	const { startLoading, stopLoading } = useLoading();
	const updateFnCtxs = useStord((state) => state.updateFnCtxs);

	const [drafts, setDrafts] = useState<Draft[]>([]);
	const emptyRow = useMemo(() => emptyRowValues(rowContainer), [rowContainer]);
	const [rowToDelete, setRowToDelete] = useState<Row | null>(null);

	const { read, create, update, delete: remove } = apiCrud;
	const canCreate = !!create;
	const canUpdate = !!update;
	const canDelete = !!remove;
	const color = (theme.components.button?.color as ThemeProps["accentColor"]) || undefined;

	const scope = useMemo<DataValueScope>(() => ({ params, searchParams }), [params, searchParams]);
	const stateVersion = useStateVersion(
		stateKeys(read.params, read.query, read.body),
	);

	// Resolve the read config now; the query key carries the result so a
	// route change (or a state slice arriving) refetches with the new values.
	const readArgs = useMemo(() => {
		const q = resolveDataValues(read.query, scope);
		const p = resolveDataValues(read.params, scope);
		const b = resolveDataValues(read.body, scope);
		const ready = (read.urlParams ?? []).every((k) => p[k] !== undefined && p[k] !== "");
		return { args: callArgs(read.segments, q, p, read.segments?.body || read.body ? b : undefined), ready };
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [read, scope, stateVersion]);

	const { data, refetch, isLoading } = useQuery({
		queryKey: [`form-list-${name}`, readArgs.args],
		queryFn: async () => {
			const res = await (read.api as (...a: unknown[]) => Promise<unknown>)(...readArgs.args);
			const rows = drillPaths(res, read.paths);
			return Array.isArray(rows) ? (rows as Row[]) : [];
		},
		enabled: readArgs.ready,
	});
	const rows = data ?? [];

	useEffect(() => {
		updateFnCtxs(name, refetch);
	}, [name, updateFnCtxs, refetch]);

	const notifySuccess = useCallback(
		(info: FormListMutationApi, fallback: string) => {
			const snackbar: SnackbarElement = info.snackbarSuccess ?? { type: "success", message: fallback };
			showSnackbar({ variant: snackbar.type, message: snackbar.message });
		},
		[showSnackbar],
	);

	const notifyError = useCallback(
		(info: FormListMutationApi, error: unknown) => {
			let variant: SnackbarVariant = "error";
			let message = error instanceof Error ? error.message : "Something went wrong";
			if (info.snackbarError && info.snackbarError !== "$exception") {
				variant = info.snackbarError.type;
				message = info.snackbarError.message;
			}
			showSnackbar({ variant, message });
		},
		[showSnackbar],
	);

	/** Run a mutation for `row` (form values as the body); true on success. */
	const mutate = useCallback(
		async (info: FormListMutationApi, row: Row, body: Row | undefined, fallback: string) => {
			const query = resolveDataValues(info.query, scope);
			const p = { ...rowParams(info.params, row), ...resolveDataValues(info.extraParams, scope) };
			const b = body === undefined ? undefined : { ...body, ...resolveDataValues(info.extraBody, scope) };
			const loaderId = startLoading();
			try {
				await (info.api as (...a: unknown[]) => Promise<unknown>)(...callArgs(info.segments, query, p, b));
				notifySuccess(info, fallback);
				await refetch();
				return true;
			} catch (error) {
				notifyError(info, error);
				return false;
			} finally {
				stopLoading(loaderId);
			}
		},
		[scope, startLoading, stopLoading, notifySuccess, notifyError, refetch],
	);

	const saveDraft = useCallback(
		async (draft: Draft, values: Row) => {
			if (!create) return false;
			const ok = await mutate(create, values, values, "Created successfully");
			if (ok) setDrafts((prev) => prev.filter((d) => d.key !== draft.key));
			return ok;
		},
		[create, mutate],
	);

	const saveRow = useCallback(
		async (row: Row, values: Row) => {
			if (!update) return false;
			return mutate(update, { ...row, ...values }, values, "Updated successfully");
		},
		[update, mutate],
	);

	const confirmDelete = useCallback(
		async (isConfirm: boolean) => {
			const row = rowToDelete;
			setRowToDelete(null);
			if (!isConfirm || !row || !remove) return;
			const info: FormListMutationApi = {
				...remove,
				params: remove.params ?? { [idKey]: idKey },
			};
			await mutate(info, row, undefined, "Deleted successfully");
		},
		[rowToDelete, remove, idKey, mutate],
	);

	const addDraft = () => setDrafts((prev) => [...prev, { key: crypto.randomUUID() }]);
	const addButton = canCreate && (
		<div
			className={
				addAlign === "end"
					? "flex justify-end"
					: addAlign === "center"
						? "flex justify-center"
						: "flex justify-start"
			}
		>
			<ChromeButton
				variant="outline"
				color={color}
				label={addLabel}
				icon={addIcon}
				display={addDisplay}
				onClick={addDraft}
			/>
		</div>
	);
	// Not "empty" while the read is held on an unresolved route param.
	const isEmpty = readArgs.ready && !isLoading && rows.length === 0 && drafts.length === 0;

	return (
		<div className="flex w-full flex-col gap-4" data-form-list={name}>
			{title && (
				<h3 className="text-sm font-semibold text-slate-800 dark:text-gray-100">{title}</h3>
			)}

			{addPosition === "top" && addButton}

			{rows.map((row, index) => (
				<RowForm
					key={row[idKey] != null ? String(row[idKey]) : `row-${index}`}
					rowContainer={rowContainer}
					renderBins={renderBins}
					row={{ ...emptyRow, ...row }}
					isDraft={false}
					readOnly={!canUpdate}
					canSave={canUpdate}
					canRemove={canDelete}
					saveLabel={saveLabel}
					removeLabel={removeLabel}
					removeIcon={removeIcon}
					removeDisplay={removeDisplay}
					controlsPosition={removePosition}
					color={color}
					onSave={(values) => saveRow(row, values)}
					onRemove={() => setRowToDelete(row)}
				/>
			))}

			{drafts.map((draft) => (
				<RowForm
					key={draft.key}
					rowContainer={rowContainer}
					renderBins={renderBins}
					row={emptyRow}
					isDraft
					readOnly={false}
					canSave={canCreate}
					canRemove
					saveLabel={saveLabel}
					removeLabel={removeLabel}
					removeIcon={removeIcon}
					removeDisplay={removeDisplay}
					controlsPosition={removePosition}
					color={color}
					onSave={(values) => saveDraft(draft, values)}
					onRemove={() => setDrafts((prev) => prev.filter((d) => d.key !== draft.key))}
				/>
			))}

			{isEmpty && (
				<p className="text-sm text-slate-500 dark:text-gray-400">{emptyText}</p>
			)}

			{addPosition === "bottom" && addButton}

			{canDelete && (
				<ConfirmBox
					id={`${name}-confirmBox`}
					open={rowToDelete !== null}
					onOpenChange={(open) => { if (!open) setRowToDelete(null); }}
					onConfirm={confirmDelete}
					title={remove?.confirmBox?.title ?? "Delete item"}
					description={remove?.confirmBox?.description ?? "This action cannot be undone. Are you sure you want to continue?"}
				/>
			)}
		</div>
	);
};
