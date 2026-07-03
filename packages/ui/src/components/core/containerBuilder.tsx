import type { ApiMaster, TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import type { Container, ContainerLoad, DataValue, APIFunction, Bin, TElement, ThemeContextType } from "../@types";
import { Form } from "../form";
import { Schema } from "./schema";
import { Provider } from "./context";
import { ElementContext } from "./elementBuilder";
import { useMemo, useEffect, useId, useReducer } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { get } from "lodash";
import { ConditionExpression } from "./expression";
import { useTheme } from "../context";
import { useData } from "../context/DataProvider";
import { getStateStore } from "./stateStore";
import { engineDebug } from "./engineDebug";
import { resolveDataValues, drillPaths } from "./dataValue";
import { getBinGridItemStyle, getContainerGridStyle } from "./containerGrid";
import { getContainerSurface } from "./containerSurface";

type StateBinding = { name: string; key: string; path?: string };

/** Collect read-bindings (`element.value` of type "state") across containers. */
function collectStateBindings(containers: Container[]): StateBinding[] {
	const out: StateBinding[] = [];
	for (const c of containers) {
		for (const b of c.bins) {
			const el = b.element as { name?: string; value?: DataValue } | undefined;
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

type ContainerLoaderProps = {
	load: ContainerLoad;
	apis: ApiMaster<TModelMaster, TApiMaster<TModelMaster>>;
};

/**
 * Renders nothing. Fires `load.api` (params/query/body resolved from the URL via
 * react-router) through the typed caller, drills `load.api.paths`, and writes
 * the result into the `load.key` global-state slice. Refetches when the resolved
 * URL params change (react-query key) and clears the slice on unmount.
 */
const ContainerLoader = ({ load, apis }: ContainerLoaderProps) => {
	const params = useParams();
	const [searchParams] = useSearchParams();
	const api = apis.api[load.api.name] as APIFunction | undefined;

	// Positional args must match the built caller's order (query, param, body),
	// skipping the segments the endpoint doesn't declare. See ApiFactory.
	const args = useMemo(() => {
		const scope = { params, searchParams };
		const list: any[] = [];
		if (load.api.query) list.push(resolveDataValues(load.api.query, scope));
		if (load.api.params) list.push(resolveDataValues(load.api.params, scope));
		if (load.api.body) list.push(resolveDataValues(load.api.body, scope));
		return list;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [load, JSON.stringify(params), searchParams.toString()]);

	const { data } = useQuery({
		queryKey: [`state-load-${load.key}`, args],
		queryFn: async () => {
			if (!api) return undefined;
			const res = await (api as (...a: any[]) => Promise<unknown>)(...args);
			return drillPaths(res, load.api.paths);
		},
		enabled: !!api,
	});

	useEffect(() => {
		getStateStore(load.key).getState().setData(data);
	}, [load.key, data]);

	useEffect(
		() => () => {
			getStateStore(load.key).getState().clear();
		},
		[load.key]
	);

	return null;
};

type ContainerRendererProps = {
	builder: ContainerBuilder<TModelMaster, TApiMaster<TModelMaster>>;
	isRoot: boolean;
	withAuth: boolean;
};

/**
 * Renders a container as a proper React component so hooks (useData, useForm, ...)
 * run at the position in the tree where the container is actually mounted.
 * This matters for modal containers: they must read contextData from the same
 * DataProvider that DataTable2 writes the selected row into.
 */
const ContainerRenderer = ({ builder, isRoot, withAuth }: ContainerRendererProps) => {
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

	// Keep the form component identity stable across re-renders; defaultValue
	// changes are applied through reset() below instead of remounting the form.
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const F = useMemo(() => new Form(builder.getSchema(), defaultValues).setup().create(), [builder]);

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
				<Provider isRoot={isRoot} withAuth={withAuth}>
					{containers.filter((c) => c.load).map((c) => (
							<ContainerLoader
								key={`${c.id}-load`}
								load={c.load!}
								apis={builder.apis as unknown as ApiMaster<TModelMaster, TApiMaster<TModelMaster>>}
							/>
						))}
						{containers.map((c) => {
						const surface = getContainerSurface(c);
						const grid = (
							<div
								className="grid grid-cols-12"
								style={getContainerGridStyle(c)}
							>
								{c.bins.map((b, binIndex) => {
								if (b.condition)
									if (!(new ConditionExpression(ctx).expression(b.condition))) return null;

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

								const gridItemStyle = getBinGridItemStyle(b);

								return (
									<div
										key={`${c.id}-bin-${binIndex}`}
										className={`${colClasses} ${alignClass}`}
										style={gridItemStyle}
									>
										{builder.renderElement(b, f, api, theme)}
									</div>
								);
							})}
						</div>
						);

						if (!surface) return <div key={c.id}>{grid}</div>;

						return (
							<div key={c.id} className={surface.wrapperClass}>
								{surface.title && (
									<h3 className={surface.titleClass}>{surface.title}</h3>
								)}
								{grid}
							</div>
						);
					})}
				</Provider>
			);
		}}
	</F.Fn>;
};

export class ContainerBuilder<M extends TModelMaster, A extends TApiMaster<M>> {

	constructor(private _containers: Container[], private _apis: ApiMaster<M, A>) { }

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

	public draw(isRoot: boolean = false, withAuth: boolean = false, _t: ThemeContextType | undefined = undefined) {
		return <ContainerRenderer
			builder={this as unknown as ContainerBuilder<TModelMaster, TApiMaster<TModelMaster>>}
			isRoot={isRoot}
			withAuth={withAuth}
		/>;
	}
}
