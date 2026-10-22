import { createElement, type JSX } from "react";
import type { TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import type { CustomComponentElement, IElement } from "../@types";
import { CustomComponent as CustomComponentHost } from "../CustomComponent";
import type { ElementContext } from "./elementBuilder";

/** Builds the `custom` element: the name, props and binding go straight to the host. */
export class CustomComponent<M extends TModelMaster, A extends TApiMaster<M>> implements IElement {
  constructor(private _context: ElementContext<M, A>) {}

  create(): JSX.Element {
    const props = this._context.props as CustomComponentElement;
    return createElement(CustomComponentHost, {
      component: props.component,
      props: props.props,
      value: props.value,
      className: props.className,
      style: props.style,
    });
  }
}
