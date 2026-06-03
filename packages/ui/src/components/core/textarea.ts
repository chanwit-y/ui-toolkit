import type { ElementContext } from "./elementBuilder";
import type { IElement, TextareaElement } from "../@types";

import { createElement, type JSX } from "react";
import { Textarea as TextareaComponent } from "../form/Textarea";
import type { TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";

export class Textarea<M extends TModelMaster, A extends TApiMaster<M>>
  implements IElement
{
  constructor(private _context: ElementContext<M, A>) {}

  create(): JSX.Element {
    const props = this._context.props as TextareaElement;
    return createElement(TextareaComponent, {
      name: props.name,
      form: this._context.form,
      label: props.label,
      placeholder: props.placeholder,
      helperText: props.helperText,
      error: props.error,
      errorMessage: props.errorMessage,
      rows: props.rows,
      cols: props.cols,
      resize: props.resize,
      autoResize: props.autoResize,
      maxLength: props.maxLength,
      showCharCount: props.showCharCount,
    });
  }
}