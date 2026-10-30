import { createElement, type JSX } from "react";
import type { ChartElement, FormListReadApi, IElement } from "../@types";
import { Chart as ChartComponent } from "../Chart";
import { resolveApiRef, urlParamNames } from "./readApi";

import type { TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import type { ElementContext } from "./elementBuilder";

/**
 * Builds the `chart` element: resolves the optional `api` ref against the
 * ApiMaster (function + declared segments + URL `:param`s, like a repeater's
 * read) and hands the element to the real component. `items` (page data)
 * needs no resolution.
 */
export class Chart<M extends TModelMaster, A extends TApiMaster<M>> implements IElement {
  constructor(private _context: ElementContext<M, A>) {}

  create(): JSX.Element {
    const props = this._context.props as unknown as ChartElement;

    let api: FormListReadApi | undefined;
    if (props.api) {
      const read = resolveApiRef(this._context, props.api.name);
      if (!read) {
        throw new Error(`Chart "${props.name}": API "${props.api.name}" was not found in ApiMaster`);
      }
      api = { ...props.api, api: read.api, segments: read.segments, urlParams: urlParamNames(read.url) };
    } else if (!props.items) {
      console.warn(`[gummy-ui] Chart "${props.name}": set either \`api\` or \`items\` — rendering the empty state.`);
    }

    return createElement(ChartComponent, { ...props, api });
  }
}
