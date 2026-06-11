import type { ElementContext } from "./elementBuilder";
import type { IElement, UploadImageElement } from "../@types";

import { createElement, type JSX } from "react";
import { UploadImage as UploadImageComponent } from "../form/UploadImage";
import type { TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";

export class UploadImage<M extends TModelMaster, A extends TApiMaster<M>>
  implements IElement
{
  constructor(private _context: ElementContext<M, A>) {}

  create(): JSX.Element {
    const props = this._context.props as UploadImageElement;
    return createElement(UploadImageComponent, {
      name: props.name,
      form: this._context.form,
      label: props.label,
      helperText: props.helperText,
      isRequired: props.isRequired,
      error: props.error,
      errorMessage: props.errorMessage,
      accept: props.accept,
      maxSizeMB: props.maxSizeMB,
      valueFormat: props.valueFormat,
      uploadApi: props.uploadApi,
      shape: props.shape,
      previewHeight: props.previewHeight,
      isFullWidth: props.isFullWidth,
      width: props.width,
      disabled: props.disabled,
    });
  }
}
