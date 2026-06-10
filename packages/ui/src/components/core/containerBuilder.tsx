import type { ApiMaster, TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import type { Container, APIFunction, Bin, TElement, ThemeContextType } from "../@types";
import { Form } from "../form";
import { Schema } from "./schema";
import { Provider } from "./context";
import { ElementContext } from "./elementBuilder";
import { useMemo, useEffect } from "react";
import { ConditionExpression } from "./expression";
import { useTheme } from "../context";
import { useData } from "../context/DataProvider";
import { getBinGridItemStyle, getContainerGridStyle } from "./containerGrid";

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

	const defaultValues = useMemo(
		() => (containers.length > 0 ? ctx?.[containers[0]?.contextData ?? ""] ?? {} : {}),
		[ctx, containers]
	);

	// Keep the form component identity stable across re-renders; defaultValue
	// changes are applied through reset() below instead of remounting the form.
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const F = useMemo(() => new Form(builder.getSchema(), defaultValues).setup().create(), [builder]);

	return <F.Fn>
		{(f) => {
			useEffect(() => {
				if (f._form && Object.keys(defaultValues).length > 0) {
					f._form.reset(defaultValues);
				}
			}, [defaultValues, f]);

			return (
				<Provider isRoot={isRoot} withAuth={withAuth}>
					{containers.map((c) => (
						<div
							key={c.id}
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
					))}
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
