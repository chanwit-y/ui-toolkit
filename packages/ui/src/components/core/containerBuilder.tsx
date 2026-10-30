import type { ApiMaster, TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import type { Container, DataValue, APIFunction, Bin, PageLoad, TElement, ThemeContextType } from "../@types";
import { Form } from "../form";
import { Schema } from "./schema";
import { Provider } from "./context";
import { ElementContext } from "./elementBuilder";
import { useMemo, useEffect, useId, useReducer, useRef, type ReactNode } from "react";
import { useFormContext, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { get } from "lodash";
import { ConditionExpression } from "./expression";
import { useTheme } from "../context";
import { useData } from "../context/DataProvider";
import { getStateStore, readSlice, setLoadingMode } from "./stateStore";
import { loadingMode } from "./pageLoads";
import { useSkeleton } from "./rowScope";
import { binSkeleton, binSkeletonValue } from "./skeletons";
import { engineDebug } from "./engineDebug";
import { StateLoader } from "./stateLoader";
import { conditionStateKeys } from "./expression";
import { useStateVersion } from "./readApi";
import { getBinGridItemStyle, getContainerGridStyle } from "./containerGrid";
import { getContainerSurface } from "./containerSurface";
import { isBlank, isLegacyCondition, type LogicScope } from "./formula";
import { FormLogicProvider, useCondition, useFormLogic, useFormula, useLogicLibrary } from "./logic";
import { useRowScope } from "./rowScopeContext";
import { useRouteScope } from "./readApi";
import { collectFieldGates, computedCycles, gateDecisions, narrowSchema } from "./formLogic";

type StateBinding = { name: string; key: string; path?: string };

/**
 * Collect read-bindings (`element.value` of type "state") across containers,
 * including the bins drawn on the same form: a tab's panels and a card's
 * content / collapse (the same walk as `schema.ts`).
 */
function collectStateBindings(containers: Container[], out: StateBinding[] = []): StateBinding[] {
	for (const c of containers) {
		for (const b of c.bins) {
			if (b.type === "formlist" || b.type === "repeater" || b.type === "filecollection" || b.type === "chart") continue;
			const el = b.element as
				| { name?: string; value?: DataValue; tabs?: { container: Container }[]; content?: Container; collapse?: Container }
				| undefined;
			if (b.type === "tab" && el?.tabs) collectStateBindings(el.tabs.map((t) => t.container), out);
			if (b.type === "card") collectStateBindings([el?.content, el?.collapse].filter((x): x is Container => !!x), out);
			const v = el?.value;
			if (el?.name && v && v.type === "state") {
				out.push({ name: el.name, key: v.key, path: v.path });
			}
		}
	}
	return out;
}

/**
 * Subscribe to every global-state slice referenced by `bindings` and project
 * the (path-drilled) values into a `{ fieldName: value }` map used as the form's
 * read-only initial values. Manual `store.subscribe` (rather than a hook per
 * binding) keeps hook order stable regardless of how many keys are referenced.
 */
function useStateDefaults(bindings: StateBinding[]): Record<string, any> {
	const [version, bump] = useReducer((x) => x + 1, 0);
	const keysSig = bindings.map((b) => b.key).join("|");

	useEffect(() => {
		const distinct = [...new Set(bindings.map((b) => b.key))];
		const unsubs = distinct.map((k) => getStateStore(k).subscribe(() => bump()));
		return () => unsubs.forEach((u) => u());
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [keysSig]);

	// eslint-disable-next-line react-hooks/exhaustive-deps
	return useMemo(
		() =>
			bindings.reduce((acc, b) => {
				const data = getStateStore(b.key).getState().data;
				const v = b.path ? get(data, b.path) : data;
				// Seed an empty string before the slice loads so the bound input is
				// controlled from the first render (avoids React's uncontrolled→
				// controlled warning when the async value arrives).
				acc[b.name] = v !== undefined ? v : "";
				return acc;
			}, {} as Record<string, any>),
		[keysSig, version]
	);
}

type ContainerGridProps = {
	container: Container;
	builder: ContainerBuilder<TModelMaster, TApiMaster<TModelMaster>>;
	/** The form object elements bind to (anything `withForm` accepts). */
	form: any;
	theme: ThemeContextType | undefined;
	/** `contextData` for bin `condition`s. */
	ctx: Record<string, any> | undefined;
};

/**
 * One container's 12-column grid: its bins laid out with their spans and
 * self-alignment, conditions evaluated against `ctx`, each element built
 * through `builder.renderElement`. Shared by the engine's container renderer
 * and by components that host a container per row (FormList).
 */
export function ContainerGrid({ container: c, builder, form, theme, ctx }: ContainerGridProps) {
	// Conditions reading a state slice (`source: "state"`) re-evaluate when it changes.
	const condKeys = useMemo(
		() => conditionStateKeys(c.bins.map((b) => (isLegacyCondition(b.condition) ? b.condition : undefined))),
		[c.bins],
	);
	useStateVersion(condKeys);
	return (
		<div className="grid grid-cols-12" style={getContainerGridStyle(c)}>
			{c.bins.map((b, binIndex) => {
				// The old expression reads the container context here; a `Cond` /
				// `{ rule }` is evaluated by the cell, which subscribes to what it reads.
				if (isLegacyCondition(b.condition))
					if (!(new ConditionExpression(ctx ?? {}).expression(b.condition))) return null;

				const api = b.element && 'api' in b.element && b.element.api && 'name' in b.element.api ? builder.apis.api[b.element.api.name] as APIFunction : undefined;
				const colClasses = `sm-col-span-${b.sm} md-col-span-${b.md} lg-col-span-${b.lg} xl-col-span-${b.xl} `;
				const alignClass =
					b.align === "start"
						? "text-left"
						: b.align === "end"
							? "text-right"
							: b.align === "center"
								? "text-center"
								: "";

				return (
					<BinCell key={`${c.id}-bin-${binIndex}`} bin={b} ctx={ctx} className={`${colClasses} ${alignClass}`}>
						{builder.renderElement(withoutLogic(b), form, api, theme)}
					</BinCell>
				);
			})}
		</div>
	);
}

/**
 * One bin's grid cell. A form field whose `value` reads a page load in
 * `skeleton` mode draws its placeholder here, over the rendered element,
 * until the slice lands (display elements with their own bindings handle
 * theirs — see `skeletons.tsx`).
 */
function BinCell({ bin, ctx, className, children }: { bin: Bin; ctx: Record<string, any> | undefined; className: string; children: ReactNode }) {
	const pending = useSkeleton(binSkeletonValue(bin));
	const el = bin.element as FieldLogicLike | undefined;
	const shown = useCondition(isLegacyCondition(bin.condition) ? undefined : bin.condition, ctx);
	const enabled = useCondition(isLegacyCondition(el?.enabledWhen) ? undefined : el?.enabledWhen, ctx);
	const computed = el?.valueMode === "computed" && el.value?.type === "formula";
	if (!shown) return null;
	const content = pending ? binSkeleton(bin, children) : children;
	return (
		<div className={className} style={getBinGridItemStyle(bin)}>
			{el?.name && el.value?.type === "formula" && (
				<FieldValueSync name={el.name} dataType={el.dataType} value={el.value} mode={computed ? "computed" : "initial"} ctx={ctx} />
			)}
			{/* A disabled (or computed, so locked) cell: the fieldset disables every control in it. */}
			{!enabled || computed ? (
				<fieldset className="gummy-gate" disabled aria-disabled="true">
					{content}
				</fieldset>
			) : (
				content
			)}
		</div>
	);
}

type FieldLogicLike = {
	name?: string;
	dataType?: string;
	enabledWhen?: Bin["condition"];
	valueMode?: string;
	value?: DataValue;
};

/**
 * The element as its builder sees it: a `Cond` / `{ rule }` `enabledWhen` is
 * the cell's (a fieldset), never the component's — those that take one only
 * understand the observe form.
 */
function withoutLogic(b: Bin): Bin {
	const el = b.element as FieldLogicLike | undefined;
	if (!el?.enabledWhen || isLegacyCondition(el.enabledWhen)) return b;
	return { ...b, element: { ...(b.element as object), enabledWhen: undefined } as Bin["element"] };
}

/** Same value for a field: equal primitives, or dates at the same instant. */
function sameValue(a: unknown, b: unknown): boolean {
	if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
	if (isBlank(a) && isBlank(b)) return true;
	return Object.is(a, b);
}

/** A result as the field holds it: a number field keeps numbers (blank `null`), a text field text. */
function fieldValue(value: unknown, dataType: string | undefined): unknown {
	const t = dataType?.toLowerCase();
	if (t === "number") return isBlank(value) ? null : value;
	if (t === "string" || t === "email" || t === "url") return isBlank(value) ? "" : value instanceof Date ? value.toISOString() : String(value);
	return isBlank(value) ? undefined : value;
}

/**
 * Feeds a form field from its `value` formula: `computed` recalculates on
 * every change of what it reads (writing only a changed result, so it can't
 * loop); `initial` writes the first non-blank result into a field the user
 * hasn't touched, then lets go.
 */
function FieldValueSync({ name, dataType, value, mode, ctx }: { name: string; dataType?: string; value: DataValue; mode: "computed" | "initial"; ctx: Record<string, any> | undefined }) {
	const form = useFormContext();
	const { cyclic } = useFormLogic();
	const formula = useFormula(value, ctx);
	const seeded = useRef(false);
	const skip = cyclic.has(name);
	useEffect(() => {
		if (skip) console.warn(`[gummy-ui] Computed field "${name}" reads itself through other computed fields — skipped.`);
	}, [skip, name]);
	useEffect(() => {
		if (!form || skip || !formula.active) return;
		const next = fieldValue(formula.error ? null : formula.value, dataType);
		if (mode === "computed") {
			if (!sameValue(form.getValues(name), next)) form.setValue(name, next, { shouldValidate: true });
			return;
		}
		if (seeded.current || isBlank(next)) return;
		seeded.current = true;
		if (!form.getFieldState(name).isDirty && isBlank(form.getValues(name))) form.setValue(name, next, { shouldValidate: true });
	}, [form, skip, formula.active, formula.value, formula.error, mode, name, dataType]);
	return null;
}

/** A container's grid inside its optional themed surface. */
export function ContainerSection(props: ContainerGridProps) {
	const surface = getContainerSurface(props.container);
	const grid = <ContainerGrid {...props} />;
	if (!surface) return <div>{grid}</div>;
	return (
		<div className={surface.wrapperClass}>
			{surface.title && <h3 className={surface.titleClass}>{surface.title}</h3>}
			{grid}
		</div>
	);
}

type ContainerRendererProps = {
	builder: ContainerBuilder<TModelMaster, TApiMaster<TModelMaster>>;
	isRoot: boolean;
};

/**
 * Renders a container as a proper React component so hooks (useData, useForm, ...)
 * run at the position in the tree where the container is actually mounted.
 * This matters for modal containers: they must read contextData from the same
 * DataProvider that DataTable2 writes the selected row into.
 */
const ContainerRenderer = ({ builder, isRoot }: ContainerRendererProps) => {
	const { contextData: ctx } = useData();
	const theme = useTheme();

	const containers = builder.containers;

	const stateBindings = useMemo(() => collectStateBindings(containers), [containers]);
	const stateDefaults = useStateDefaults(stateBindings);

	const defaultValues = useMemo(() => {
		const ctxDefaults =
			containers.length > 0 ? ctx?.[containers[0]?.contextData ?? ""] ?? {} : {};
		// State read-bindings take precedence over contextData for the same field.
		return { ...ctxDefaults, ...stateDefaults };
	}, [ctx, containers, stateDefaults]);

	// What the logic does at submit (spec §7): the resolver narrows the schema
	// to the fields shown and enabled right now, reading the latest scope.
	const library = useLogicLibrary();
	const route = useRouteScope();
	const rowScope = useRowScope();
	const gates = useMemo(() => collectFieldGates(containers), [containers]);
	const formLogic = useMemo(
		() => ({
			fieldTypes: Object.fromEntries(gates.map((g) => [g.name, g.dataType ?? ""])),
			cyclic: computedCycles(gates, library ?? undefined),
		}),
		[gates, library],
	);
	const scopeRef = useRef<Omit<LogicScope, "field"> & { ctx: Record<string, any> }>({ ctx: {} });
	scopeRef.current = {
		ctx: ctx ?? {},
		row: rowScope ? rowScope.row : ctx,
		index: rowScope?.index,
		params: route.params,
		searchParams: route.searchParams,
		library: library ?? undefined,
		fieldType: (n) => formLogic.fieldTypes[n],
		state: readSlice,
	};

	// Keep the form component identity stable across re-renders; defaultValue
	// changes are applied through reset() below instead of remounting the form.
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const F = useMemo(() => {
		const schema = builder.getSchema();
		const resolver: Resolver<any> = (values, context, options) => {
			const { ctx: legacyCtx, ...scope } = scopeRef.current;
			const decisions = gateDecisions(gates, { ...scope, field: (n) => get(values, n) }, legacyCtx);
			return zodResolver(narrowSchema(schema, decisions))(values, context, options);
		};
		return new Form(schema, defaultValues, resolver).setup().create();
	}, [builder]);

	// Debug-mirror key: container name for readability, mount id for uniqueness
	// (the same config can render in several places, e.g. app + preview). The
	// `#` separator is the display contract — inspectors strip from it.
	const debugId = useId();
	const debugKey = `${containers[0]?.name ?? "container"}#${debugId}`;

	return <F.Fn>
		{(f) => {
			useEffect(() => {
				if (f._form && Object.keys(defaultValues).length > 0) {
					f._form.reset(defaultValues);
				}
			}, [defaultValues, f]);

			// The form lives behind this FormProvider — register it so external
			// inspectors (studio dev-tools) can watch values/errors.
			useEffect(() => {
				if (f._form) engineDebug.registerForm(debugKey, f._form);
				return () => engineDebug.unregisterForm(debugKey);
			}, [f, debugKey]);

			return (
				<FormLogicProvider value={formLogic}>
				<Provider isRoot={isRoot}>
					{isRoot && builder.loads.map((l) => (
							<StateLoader
								key={`page-load-${l.key}`}
								load={l}
								apis={builder.apis as unknown as ApiMaster<TModelMaster, TApiMaster<TModelMaster>>}
							/>
						))}
					{containers.filter((c) => c.load).map((c) => (
							<StateLoader
								key={`${c.id}-load`}
								load={c.load!}
								apis={builder.apis as unknown as ApiMaster<TModelMaster, TApiMaster<TModelMaster>>}
							/>
						))}
						{containers.map((c) => (
							<ContainerSection
								key={c.id}
								container={c}
								builder={builder}
								form={f}
								theme={theme}
								ctx={ctx}
							/>
						))}
				</Provider>
				</FormLogicProvider>
			);
		}}
	</F.Fn>;
};

export class ContainerBuilder<M extends TModelMaster, A extends TApiMaster<M>> {

	constructor(
		private _containers: Container[],
		private _apis: ApiMaster<M, A>,
		/** Page-level loads, mounted by the root renderer only (`draw(true)`). */
		private _loads: PageLoad[] = [],
	) {
		// Known before the first render, so bound components skeleton from
		// their first paint rather than after the loaders' mount effects.
		for (const l of _loads) setLoadingMode(l.key, loadingMode(l));
	}

	public get loads() {
		return this._loads;
	}

	private _schema() {
		const schema = new Schema(this._containers);
		return schema.generate();
	}

	public getSchema() {
		return this._schema();
	}

	public get containers() {
		return this._containers;
	}

	public get apis() {
		return this._apis;
	}

	public renderElement(b: Bin, f: any | undefined, _api: APIFunction | undefined, t: ThemeContextType | undefined) {
		let el = (new ElementContext(b.element as TElement))
			.Form(f)
			.APIs(this._apis as unknown as ApiMaster<TModelMaster, TApiMaster<TModelMaster>>);

		if (t) {
			el = el.Theme(t);
		}

		const builtElement = el.build(b.type);

		if (builtElement !== null) return builtElement.create();

		// Nested container
		if (b.container && b.container.bins) {
			return (new ContainerBuilder([b.container], this._apis)).draw();
		}

		// Fallback
		return <span></span>;
	}

	/** `_withAuth` is kept for the callers' positional args; sign-in is `AzureAuth` / `GummyApp project.auth` now. */
	public draw(isRoot: boolean = false, _withAuth: boolean = false, _t: ThemeContextType | undefined = undefined) {
		return <ContainerRenderer
			builder={this as unknown as ContainerBuilder<TModelMaster, TApiMaster<TModelMaster>>}
			isRoot={isRoot}
		/>;
	}
}
