import { createElement, type JSX } from "react";
import { Button as ElementButton } from "../Button";
import type { ButtonElement, IElement } from "../@types";
import type { TApiMaster } from "../../api/APIMaster";
import type { ElementContext } from "./elementBuilder";
import type { TModelMaster } from "../../model/master";
// import { IconData } from "./const/iconData";
import type { ThemeProps } from "@radix-ui/themes";

export class Button<M extends TModelMaster, A extends TApiMaster<M>>
  implements IElement
{
  constructor(private _context: ElementContext<M, A>) {}

  create(): JSX.Element {
    const props = this._context.props as unknown as ButtonElement;

    const apiInfo =
      props.api &&
      (this._context.apiList?.[props.api.name] as unknown as TApiMaster<any>);

    return createElement(ElementButton, {
      label: props.label,
      icon: props.icon,
      actions: props.actions,
      api: this._context.api,
      snackbarSuccess: props.snackbarSuccess,
      snackbarError: props.snackbarError,
      confirmBox: props.confirmBox,
      reloadDataTable: props.reloadDataTable,
      apiInfo: apiInfo,
      modalId: props.modalId,
      color:
        (this._context.theme?.components.button
          ?.color as ThemeProps["accentColor"]) || "blue",
    });
  }
}
