import { createElement, type JSX } from "react";
import type { ApiMaster, TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import type { IElement, TabElement } from "../@types";
import { Tab as TabComponent } from "../Tab";
import { ContainerBuilder } from "./containerBuilder";
import { resolveSurface } from "./containerSurface";
import type { ElementContext } from "./elementBuilder";

export class Tab<M extends TModelMaster, A extends TApiMaster<M>>
	implements IElement
{
	constructor(private _context: ElementContext<M, A>) {}

	create(): JSX.Element {
		const props = this._context.props as TabElement;
		if (!this._context.apis) throw new Error("API is required for tab");

		const items = props.tabs.map((tab) => ({
			value: tab.value,
			label: tab.label,
			content: new ContainerBuilder(
				[tab.container],
				this._context.apis as ApiMaster<M, A>
			).draw(false, false, this._context.theme),
		}));

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
