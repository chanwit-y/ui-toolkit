import { createElement, type JSX } from "react";
import type { TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import type { FormulaWidgetElement, IElement } from "../@types";
import { FormulaWidget as FormulaWidgetComponent } from "../FormulaWidget";
import type { ElementContext } from "./elementBuilder";

/** Builds the `formula` element: the config goes straight to the component. */
export class FormulaWidget<M extends TModelMaster, A extends TApiMaster<M>> implements IElement {
  constructor(private _context: ElementContext<M, A>) {}

  create(): JSX.Element {
    return createElement(FormulaWidgetComponent, this._context.props as FormulaWidgetElement);
  }
}
