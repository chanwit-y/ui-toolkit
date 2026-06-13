import { createElement, type JSX } from "react";
import { Divider as DividerComponent } from "../Divider";
import type { IElement, DividerElement } from "../@types";
import type { TApiMaster } from "../../api/APIMaster";
import type { ElementContext } from "./elementBuilder";
import type { TModelMaster } from "../../model/master";

export class Divider<M extends TModelMaster, A extends TApiMaster<M>>
  implements IElement
{
  constructor(private _context: ElementContext<M, A>) {}

  create(): JSX.Element {
    const props = this._context.props as DividerElement;
    return createElement(DividerComponent, {
      variant: props.variant,
      spacing: props.spacing,
      className: props.className,
      style: props.style,
    });
  }
}
