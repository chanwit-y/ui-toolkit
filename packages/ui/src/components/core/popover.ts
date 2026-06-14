import { createElement, type JSX } from "react";
import { Popover as PopoverComponent, type PopoverProps } from "../Popover";
import type { IElement, PopoverElement, TElement } from "../@types";
import { ElementContext } from "./elementBuilder";
import { ContainerBuilder } from "./containerBuilder";
import type { TModelMaster } from "../../model/master";
import type { ApiMaster, TApiMaster } from "../../api/APIMaster";

/**
 * Builds a config-driven Popover. Mirrors {@link Modal}: the `container` is
 * rendered through its own {@link ContainerBuilder} (own form + DataProvider),
 * and the `trigger` — any element type — is built via its own ElementContext
 * and passed as the popover's clickable child.
 */
export class Popover<M extends TModelMaster, A extends TApiMaster<M>>
  implements IElement {
  constructor(private _context: ElementContext<M, A>) { }

  create(): JSX.Element {
    const props = this._context.props as PopoverElement;
    if (!this._context.apis) throw new Error("API is required for popover");

    const content = new ContainerBuilder(
      [props.container],
      this._context.apis as ApiMaster<M, A>
    ).draw(false, false, this._context.theme);

    // Trigger can be any element type — dispatch through the element registry.
    // Like Modal's trigger, it gets theme + fns but not the popover's form/api
    // context (a trigger only needs to open the popover).
    const triggerEl = new ElementContext(props.trigger.element as TElement)
      .Fns(this._context.fns)
      .Theme(this._context.theme)
      .build(props.trigger.type);
    const trigger = triggerEl ? triggerEl.create() : null;

    return createElement<PopoverProps>(
      PopoverComponent,
      {
        children: trigger,
        content,
        trigger: props.triggerMode ?? "click",
        placement: props.placement ?? "bottom-start",
        offset: props.offset,
      }
    );
  }
}
