import type { ElementContext } from "./elementBuilder";
import type { DatePickerElement, IElement } from "../@types";

import { createElement, type JSX } from "react";
import { DatePicker as DatePickerComponent } from "../form/DatePicker";
import type { TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";

export class DatePicker<M extends TModelMaster, A extends TApiMaster<M>>
  implements IElement
{
  constructor(private _context: ElementContext<M, A>) {}

  create(): JSX.Element {
    const props = this._context.props as DatePickerElement;
    return createElement(DatePickerComponent, {
      name: props.name,
      form: this._context.form,
      label: props.label,
      placeholder: props.placeholder,
      helperText: props.helperText,
      error: props.error,
      errorMessage: props.errorMessage,
      size: props.size,
      radius: props.radius,
      variant: props.variant,
      isFullWidth: props.isFullWidth,
      isFixedHeight: props.isFixedHeight,
      width: props.width,
      displayFormat: props.displayFormat,
      minDate: props.minDate,
      maxDate: props.maxDate,
      weekStartsOn: props.weekStartsOn,
      clearable: props.clearable,
      disabled: props.disabled,
    });
  }
}
