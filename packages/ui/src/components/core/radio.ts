import type { ElementContext } from "./elementBuilder";
import type { IElement, RadioElement } from "../@types";

import { createElement, type JSX } from "react";
import { RadioButtonF2 } from "../form/RadioButton";
import type { TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";

export class Radio<M extends TModelMaster, A extends TApiMaster<M>>
  implements IElement
{
  constructor(private _context: ElementContext<M, A>) {}

  create(): JSX.Element {
    const props = this._context.props as RadioElement;
    return createElement(RadioButtonF2 as any, {
      name: props.name,
      dataType: props.dataType,
      form: this._context.form,
      label: props.label,
      helperText: props.helperText,
      errorMessage: props.errorMessage,
      size: props.size,
      variant: props.variant,
      defaultValue: props.defaultValue,
      orientation: props.orientation,
      options: props.options,
      // API-driven options (caller bound by the engine + its config)
      api: this._context.api,
      apiInfo: props.api,
      keys: props.keys,
      isSingleLoad: props.isSingleLoad,
      // reactivity
      canObserve: props.canObserve,
      observeTo: props.observeTo,
      enabledWhen: props.enabledWhen,
    });
  }
}
