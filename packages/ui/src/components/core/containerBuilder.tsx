import type { ApiMaster, TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import type { Container, APIFunction, Bin, TElement, ThemeContextType } from "../@types";
import { Form } from "../form";
import { Schema } from "./schema";
import { Provider } from "./context";
import { ElementContext } from "./elementBuilder";
import {   useMemo } from "react";
import { ConditionExpression } from "./expression";
import { useTheme } from "../context";
import { useData } from "../context/DataProvider";
import { getBinGridItemStyle, getContainerGridStyle } from "./containerGrid";
export class ContainerBuilder<M extends TModelMaster, A extends TApiMaster<M>> {

	constructor(private _connainers: Container[], private _apis: ApiMaster<M, A>) { }

	private _schema() {
		const schema = new Schema(this._connainers);
		return schema.generate();
	}

	public getSchema() {
		return this._schema();
	}

	private _renderElement(b: Bin, f: any | undefined, _api: APIFunction | undefined, t: ThemeContextType | undefined) {
		//TODO: sholde be 1 object
		let el = (new ElementContext(b.element as TElement))
			.Form(f)
			.APIs(this._apis as unknown as ApiMaster<TModelMaster, TApiMaster<TModelMaster>>);

		if (t) {
			el = el.Theme(t);
		}

		// if (fns) {
		// 	console.log('fns', fns)
		// 	el = el.Fns(fns);
		// }

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
		// const ctx = useStord((state) => state.contextData)
		const {contextData: ctx} = useData()
		// const {contextData: ctx} = useContext(DataContext)
		// const defaultValues = selectedRow[this._connainers[0].name]
		// const defaultValues = useMemo(() => selectedRow[this._connainers[0].name] ?? {}, [selectedRow, this._connainers]) 

		//TODO: Fix code
		const defaultValues = useMemo(() => this._connainers.length > 0 ? ctx?.[this._connainers[0]?.contextData ?? ""] ?? {} : {}, [ctx, this._connainers])

		const F = new Form(this.getSchema(), defaultValues).setup().create();
		// const F = new Form(this.getSchema(), {}).setup().create();

		const theme = useTheme()

		// const  count = useCount((state) => state.count)
		// const  inc = useCount((state) => state.inc)

		return <F.Fn>
			{(f) => (
				<Provider isRoot={isRoot} withAuth={withAuth}>
					{this._connainers.map((c) => (
						<div
							key={c.id}
							className="grid grid-cols-12"
							style={getContainerGridStyle(c)}
						>
							{c.bins.map((b, binIndex) => {
								if (b.condition)
									if (!(new ConditionExpression(ctx).expression(b.condition))) return null;

								const api = b.element && 'api' in b.element && b.element.api && 'name' in b.element.api ? this._apis.api[b.element.api.name] as APIFunction : undefined;
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
										{this._renderElement(b, f, api, theme)}
									</div>
								);
							})}
						</div>
					))}
				</Provider>
			)}
		</F.Fn>
	}
}
