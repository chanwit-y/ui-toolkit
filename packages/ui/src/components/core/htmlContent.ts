import { createElement, type JSX } from "react";
import type { TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import type { HtmlContentElement, IElement } from "../@types";
import { HtmlContent as HtmlContentComponent } from "../HtmlContent";
import type { ElementContext } from "./elementBuilder";

/** Builds the `html` element: the template and its binding go straight to the component. */
export class HtmlContent<M extends TModelMaster, A extends TApiMaster<M>> implements IElement {
  constructor(private _context: ElementContext<M, A>) {}

  create(): JSX.Element {
    const props = this._context.props as HtmlContentElement;
    return createElement(HtmlContentComponent, {
      html: props.html,
      value: props.value,
      prose: props.prose,
      className: props.className,
      style: props.style,
    });
  }
}
