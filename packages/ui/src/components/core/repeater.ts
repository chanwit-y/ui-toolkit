import { createElement, type JSX } from "react";
import type { Container, FormListReadApi, IElement, RepeaterElement } from "../@types";
import { Repeater as RepeaterComponent } from "../Repeater";
import { ContainerBuilder, ContainerGrid } from "./containerBuilder";
import { resolveApiRef, urlParamNames } from "./readApi";

import type { ApiMaster, TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import type { ElementContext } from "./elementBuilder";

/**
 * Builds the `repeater` element: resolves the optional `api` ref against the
 * ApiMaster (function + declared segments + URL `:param`s) and hands the item
 * template to the real component together with a bin renderer that reuses the
 * engine's builder — the per-item `ctx` (`{ row, index }`) is what the bins'
 * `condition`s evaluate against. The enclosing form is passed through only so
 * a button inside an item finds it; inputs in the template are unsupported.
 */
export class Repeater<M extends TModelMaster, A extends TApiMaster<M>> implements IElement {
  constructor(private _context: ElementContext<M, A>) {}

  create(): JSX.Element {
    const props = this._context.props as unknown as RepeaterElement;

    let api: FormListReadApi | undefined;
    if (props.api) {
      const read = resolveApiRef(this._context, props.api.name);
      if (!read) {
        throw new Error(
          `Repeater "${props.name}": API "${props.api.name}" was not found in ApiMaster`
        );
      }
      api = { ...props.api, api: read.api, segments: read.segments, urlParams: urlParamNames(read.url) };
    } else if (!props.items) {
      throw new Error(`Repeater "${props.name}": set either \`api\` or \`items\``);
    }

    const apis = this._context.apis as unknown as ApiMaster<TModelMaster, TApiMaster<TModelMaster>>;
    const theme = this._context.theme;
    const form = this._context.form;
    const builder = new ContainerBuilder([props.itemContainer], apis);
    const renderBins = (container: Container, ctx: Record<string, unknown>) =>
      createElement(ContainerGrid, { container, builder, form, theme, ctx });

    return createElement(RepeaterComponent, {
      name: props.name,
      title: props.title,
      idKey: props.idKey,
      api,
      items: props.items,
      itemContainer: props.itemContainer,
      itemSpan: props.itemSpan,
      gap: props.gap,
      itemSurface: props.itemSurface,
      itemPadding: props.itemPadding,
      itemNavigate: props.itemNavigate,
      emptyText: props.emptyText,
      renderBins,
    });
  }
}
