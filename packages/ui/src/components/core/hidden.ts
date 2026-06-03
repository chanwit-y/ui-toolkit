import { createElement, type JSX } from "react";
import { Hidden as HiddenComponent } from "../form";
import type { HiddenElement, IElement } from "../@types";
import type { TApiMaster } from "../../api/APIMaster";
import type { ElementContext } from "./elementBuilder";
import type { TModelMaster } from "../../model/master";

export class Hidden<M extends TModelMaster, A extends TApiMaster<M>>
  implements IElement
{
  constructor(private _context: ElementContext<M, A>) {}

  create(): JSX.Element {
    const props = this._context.props as unknown as HiddenElement;
    return createElement(HiddenComponent, {
      form: this._context.form,
      name: props.name,
    });
  }
}
