import { createElement, type JSX } from "react";
import { Modal as ModalComponent, type ModalProps } from "../Modal";
import type {
  IElement,
  ModalElement,
} from "../@types";
import { ElementContext } from "./elementBuilder";
import { ContainerBuilder } from "./containerBuilder";
import type { TModelMaster } from "../../model/master";
import type { ApiMaster, TApiMaster } from "../../api/APIMaster";
import { Button } from "./button";

export class Modal<M extends TModelMaster, A extends TApiMaster<M>>
  implements IElement {
  constructor(private _context: ElementContext<M, A>) { }

  create(): JSX.Element {
    const props = this._context.props as ModalElement;
    if (!this._context.apis) throw new Error("API is required for modal");
    const container = new ContainerBuilder(
      [props.container],
      this._context.apis as ApiMaster<M, A>
    );

    // const trigger = new ElementContext(props.trigger as TElement);

    // const trigger = new ElementContext(props.trigger).build("button");



    const triggerCtx = new ElementContext(props.trigger).Fns(this._context.fns)
    const trigger = new Button(triggerCtx).create();




    return createElement<ModalProps>(
      ModalComponent,
      {
        trigger: trigger,
        id: props.id,
        // context: DataContext,
        // trigger: trigger?.create(),
        // trigger: props.trigger,
        title: props.title,
        minWidth: props.minWidth,
        // description: props.description,
        maxWidth: props.maxWidth,
        maxHeight: props.maxHeight,
      },
      container.draw(false, false, this._context.theme)
    );
  }
}
