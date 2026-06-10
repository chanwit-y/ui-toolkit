import type { ElementContext } from "./elementBuilder";
import type { DateRangePickerElement, IElement } from "../@types";

import { createElement, type JSX } from "react";
import { DateRangePicker as DateRangePickerComponent } from "../form/DateRangePicker";
import type { TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";

export class DateRangePicker<M extends TModelMaster, A extends TApiMaster<M>>
  implements IElement
{
  constructor(private _context: ElementContext<M, A>) {}

  create(): JSX.Element {
    const props = this._context.props as DateRangePickerElement;
    return createElement(DateRangePickerComponent, {
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
      clearable: props.clearable,
      disabled: props.disabled,
      isRequired: props.isRequired,
    });
  }
}
