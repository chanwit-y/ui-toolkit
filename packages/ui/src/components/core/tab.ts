import { createElement, Fragment, type JSX } from "react";
import type { ApiMaster, TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import type { Container, IElement, TabElement, ThemeContextType } from "../@types";
import { Tab as TabComponent } from "../Tab";
import { useData } from "../context/DataProvider";
import { ContainerBuilder, ContainerSection } from "./containerBuilder";
import { resolveSurface } from "./containerSurface";
import type { ElementContext } from "./elementBuilder";
import { StateLoader } from "./stateLoader";

type Apis = ApiMaster<TModelMaster, TApiMaster<TModelMaster>>;

type TabPanelProps = {
	container: Container;
	builder: ContainerBuilder<TModelMaster, TApiMaster<TModelMaster>>;
	form: unknown;
	theme: ThemeContextType | undefined;
};

/**
 * A tab's panel, drawn on the enclosing form like a card's bins (`schema.ts`
 * already counts its fields there). A panel with a form of its own kept what
 * the user typed away from the form that submits: a datatable edit modal saved
 * the row as it was.
 */
function TabPanel({ container, builder, form, theme }: TabPanelProps) {
	const { contextData } = useData();
	return createElement(
		Fragment,
		null,
		container.load ? createElement(StateLoader, { load: container.load, apis: builder.apis as unknown as Apis }) : null,
		createElement(ContainerSection, { container, builder, form, theme, ctx: contextData }),
	);
}

export class Tab<M extends TModelMaster, A extends TApiMaster<M>>
	implements IElement
{
	constructor(private _context: ElementContext<M, A>) {}

	create(): JSX.Element {
		const props = this._context.props as TabElement;
		if (!this._context.apis) throw new Error("API is required for tab");

		const items = props.tabs.map((tab) => {
			const builder = new ContainerBuilder([tab.container], this._context.apis as ApiMaster<M, A>);
			return {
				value: tab.value,
				label: tab.label,
				content: this._context.form
					? createElement(TabPanel, {
						container: tab.container,
						builder: builder as unknown as TabPanelProps["builder"],
						form: this._context.form,
						theme: this._context.theme,
					})
					: builder.draw(false, false, this._context.theme),
			};
		});

		const tab = createElement(TabComponent, {
			defaultValue: props.defaultValue,
			items,
			className: props.className,
		});

		const surface = resolveSurface(props.surface);
		if (!surface) return tab;

		return createElement(
			"div",
			{ className: surface.wrapperClass },
			surface.title
				? createElement("h3", { className: surface.titleClass }, surface.title)
				: null,
			tab
		);
	}
}
