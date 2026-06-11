import type { ElementContext } from "./elementBuilder";
import type { IElement, UploadFileElement } from "../@types";

import { createElement, type JSX } from "react";
import { UploadFile as UploadFileComponent } from "../form/UploadFile";
import type { TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";

export class UploadFile<M extends TModelMaster, A extends TApiMaster<M>>
  implements IElement
{
  constructor(private _context: ElementContext<M, A>) {}

  create(): JSX.Element {
    const props = this._context.props as UploadFileElement;
    return createElement(UploadFileComponent, {
      name: props.name,
      form: this._context.form,
      label: props.label,
      helperText: props.helperText,
      isRequired: props.isRequired,
      error: props.error,
      errorMessage: props.errorMessage,
      accept: props.accept,
      multiple: props.multiple,
      maxFiles: props.maxFiles,
      maxSizeMB: props.maxSizeMB,
      valueFormat: props.valueFormat,
      isFullWidth: props.isFullWidth,
      width: props.width,
      disabled: props.disabled,
    });
  }
}
