import { createElement, type JSX } from "react";
import { Text as TextComponent } from "../Text";
import type { IElement, TextElement } from "../@types";
import type { TApiMaster } from "../../api/APIMaster";
import type { ElementContext } from "./elementBuilder";
import type { TModelMaster } from "../../model/master";

export class Text<M extends TModelMaster, A extends TApiMaster<M>>
  implements IElement
{
  constructor(private _context: ElementContext<M, A>) {}

  create(): JSX.Element {
    const props = this._context.props as TextElement;
    return createElement(TextComponent, {
      ...props,
      text: props.text,
    });
  }
}
