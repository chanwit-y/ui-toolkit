import type { ElementContext } from "./elementBuilder";
import type { IElement, TextFieldElement } from "../@types";

import { createElement, type JSX } from "react";
import { TextField as TextFieldComponent } from "../form/TextField";
import type { TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";

export class TextField<M extends TModelMaster, A extends TApiMaster<M>>
  implements IElement
{
  constructor(private _context: ElementContext<M, A>) {}

  create(): JSX.Element {
    const props = this._context.props as TextFieldElement;
    return createElement(TextFieldComponent, {
      name: props.name,
      form: this._context.form,
      label: props.label,
      dataType: props.dataType,
    });
  }
}
