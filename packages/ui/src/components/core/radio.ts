import type { ElementContext } from "./elementBuilder";
import type { IElement, RadioButtonProps } from "../@types";

import { createElement, type JSX } from "react";
import { RadioButton as RadioButtonComponent } from "../form/RadioButton";
import type { TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";

export class Radio<M extends TModelMaster, A extends TApiMaster<M>>
  implements IElement
{
  constructor(private _context: ElementContext<M, A>) {}

  create(): JSX.Element {
    const props = this._context.props as RadioButtonProps & { name: string };
    return createElement(RadioButtonComponent, {
      name: props.name,
      form: this._context.form,
      label: props.label,
      helperText: props.helperText,
      error: props.error,
      errorMessage: props.errorMessage,
      size: props.size,
      variant: props.variant,
      defaultValue: props.defaultValue,
      options: props.options,
      orientation: props.orientation,
    });
  }
}
