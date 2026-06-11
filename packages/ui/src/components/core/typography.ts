import { createElement, type JSX } from "react";
import { Typography as TypographyComponent } from "../Typography";
import type { IElement, TypographyElement } from "../@types";
import type { TApiMaster } from "../../api/APIMaster";
import type { ElementContext } from "./elementBuilder";
import type { TModelMaster } from "../../model/master";

export class Typography<M extends TModelMaster, A extends TApiMaster<M>>
  implements IElement
{
  constructor(private _context: ElementContext<M, A>) {}

  create(): JSX.Element {
    const props = this._context.props as TypographyElement;
    return createElement(TypographyComponent, {
      ...props,
      text: props.text,
    });
  }
}