import { createElement, type JSX } from "react";
import { Avatar as AvatarComponent } from "../Avatar";
import type { IElement, AvatarElement } from "../@types";
import type { TApiMaster } from "../../api/APIMaster";
import type { ElementContext } from "./elementBuilder";
import type { TModelMaster } from "../../model/master";

export class Avatar<M extends TModelMaster, A extends TApiMaster<M>>
  implements IElement
{
  constructor(private _context: ElementContext<M, A>) {}

  create(): JSX.Element {
    const props = this._context.props as AvatarElement;
    return createElement(AvatarComponent, {
      src: props.src,
      alt: props.alt,
      size: props.size,
      fallback: props.fallback,
      className: props.className,
      loading: props.loading,
      onError: props.onError,
    });
  }
}