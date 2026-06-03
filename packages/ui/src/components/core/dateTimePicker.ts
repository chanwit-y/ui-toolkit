import type { ElementContext } from "./elementBuilder";
import type { DateTimePickerElement, IElement } from "../@types";

import { createElement, type JSX } from "react";
import { DateTimePicker as DateTimePickerComponent } from "../form/DateTimePicker";
import type { TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";

export class DateTimePicker<M extends TModelMaster, A extends TApiMaster<M>>
  implements IElement
{
  constructor(private _context: ElementContext<M, A>) {}

  create(): JSX.Element {
    const props = this._context.props as DateTimePickerElement;
    return createElement(DateTimePickerComponent, {
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
      minDateTime: props.minDateTime,
      maxDateTime: props.maxDateTime,
      weekStartsOn: props.weekStartsOn,
      clearable: props.clearable,
      disabled: props.disabled,
      minuteStep: props.minuteStep,
    });
  }
}
