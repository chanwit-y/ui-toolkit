import { createElement, type JSX } from "react";
import type { TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import type { ElementContext } from "./elementBuilder";
import { Switch as SwitchComponent } from "../form/Switch";
import type { IElement, SwitchElement } from "../@types";

/**
 * Builds a form-bound Switch. `defaultChecked` seeds the form value through
 * `withForm`'s Controller (`defaultValue`), so a required switch that was
 * never touched validates against `false`, not `undefined`.
 */
export class Switch<M extends TModelMaster, A extends TApiMaster<M>>
	implements IElement {
	constructor(private _context: ElementContext<M, A>) { }

	create(): JSX.Element {
		const props = this._context.props as SwitchElement;
		return createElement(SwitchComponent, {
			name: props.name,
			form: this._context.form,
			defaultValue: props.defaultChecked ?? false,
			label: props.label,
			labelPosition: props.labelPosition,
			helperText: props.helperText,
			errorMessage: props.errorMessage,
			size: props.size,
			variant: props.variant,
			disabled: props.disabled,
			canObserve: props.canObserve,
			enabledWhen: props.enabledWhen,
		});
	}
}
