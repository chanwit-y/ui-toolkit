import { createElement, type JSX } from "react";
import { Drawer as DrawerComponent, type DrawerProps } from "../Drawer";
import type { DrawerElement, IElement, TElement } from "../@types";
import { ElementContext } from "./elementBuilder";
import { ContainerBuilder } from "./containerBuilder";
import type { TModelMaster } from "../../model/master";
import type { ApiMaster, TApiMaster } from "../../api/APIMaster";

/**
 * Builds a config-driven Drawer. Like {@link Modal}, the `container` is drawn
 * through its own {@link ContainerBuilder} (own form + DataProvider — an
 * overlay's fields are not the page form's); like {@link Popover}, the
 * `trigger` is any element, dispatched through the element registry with the
 * theme and fns but not the drawer's form context.
 */
export class Drawer<M extends TModelMaster, A extends TApiMaster<M>>
  implements IElement {
  constructor(private _context: ElementContext<M, A>) { }

  create(): JSX.Element {
    const props = this._context.props as DrawerElement;
    if (!this._context.apis) throw new Error("API is required for drawer");

    const content = new ContainerBuilder(
      [props.container],
      this._context.apis as ApiMaster<M, A>
    ).draw(false, false, this._context.theme);

    const triggerEl = new ElementContext(props.trigger.element as TElement)
      .Fns(this._context.fns)
      .Theme(this._context.theme)
      .build(props.trigger.type);
    // Radix's Trigger (asChild) hands its ref + onClick to the child, which a
    // Button forwards to its <button>; other elements (card, avatar, text)
    // don't, so they get a `display: contents` wrapper the click bubbles to.
    const built = triggerEl ? triggerEl.create() : undefined;
    const trigger =
      built && props.trigger.type !== "button"
        ? createElement("span", { className: "contents" }, built)
        : built;

    return createElement<DrawerProps>(
      DrawerComponent,
      {
        id: props.id,
        trigger,
        title: props.title,
        description: props.description,
        anchor: props.anchor,
        size: props.size,
        hideHeader: props.hideHeader,
      },
      content
    );
  }
}
