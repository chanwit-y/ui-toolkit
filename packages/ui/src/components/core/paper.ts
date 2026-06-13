import { createElement, type JSX } from "react";
import type { ApiMaster, TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import type { IElement, PaperElement } from "../@types";
import { Paper as PaperComponent } from "../Paper";
import { ContainerBuilder } from "./containerBuilder";
import type { ElementContext } from "./elementBuilder";

export class Paper<M extends TModelMaster, A extends TApiMaster<M>>
	implements IElement
{
	constructor(private _context: ElementContext<M, A>) {}

	create(): JSX.Element {
		const props = this._context.props as PaperElement;
		if (!this._context.apis) throw new Error("API is required for paper");

		const content = new ContainerBuilder(
			[props.container],
			this._context.apis as ApiMaster<M, A>
		).draw(false, false, this._context.theme);

		return createElement(
			PaperComponent,
			{
				elevation: props.elevation,
				variant: props.variant,
				square: props.square,
				className: props.className,
				style: props.style,
			},
			content
		);
	}
}
