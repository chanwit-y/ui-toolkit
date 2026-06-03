import { createElement, type JSX } from "react";
import type { TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import type { ElementContext } from "./elementBuilder";
import { Checkbox as CheckboxComponent } from "../form/Checkbox";
import type { CheckboxElement, IElement } from "../@types";

export class Checkbox<M extends TModelMaster, A extends TApiMaster<M>>
	implements IElement {
	constructor(private _context: ElementContext<M, A>) { }

	create(): JSX.Element {
		const props = this._context.props as CheckboxElement;
		return createElement(CheckboxComponent, {
			name: props.name,
			form: this._context.form,
			label: props.label,
			helperText: props.helperText,
			error: props.error,
			errorMessage: props.errorMessage,
			size: props.size,
			variant: props.variant,
			checked: props.checked,
			indeterminate: props.indeterminate,
			options: props.options,
			orientation: props.orientation,
			onValueChange: props.onValueChange,
		});
	}
}
