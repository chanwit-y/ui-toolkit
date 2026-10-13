import { createElement, type JSX } from "react";
import type { ApprovalLineElement, FormListReadApi, IElement } from "../@types";
import type { TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import { ApprovalLine as ApprovalLineComponent } from "../ApprovalLine";
import type { ElementContext } from "./elementBuilder";
import { resolveApiRef, urlParamNames } from "./readApi";

/**
 * `approvalline` Bin → the bound {@link ApprovalLineComponent}. An `api` ref
 * is resolved against the ApiMaster (function + declared segments + URL
 * `:param`s) like the repeater's; the rest of the config is the props.
 */
export class ApprovalLine<M extends TModelMaster, A extends TApiMaster<M>> implements IElement {
  constructor(private _context: ElementContext<M, A>) {}

  create(): JSX.Element {
    const { api, ...props } = this._context.props as ApprovalLineElement;
    let read: FormListReadApi | undefined;
    if (api) {
      const resolved = resolveApiRef(this._context, api.name);
      if (!resolved) throw new Error(`ApprovalLine "${props.name}": API "${api.name}" was not found in ApiMaster`);
      read = { ...api, api: resolved.api, segments: resolved.segments, urlParams: urlParamNames(resolved.url) };
    } else if (!props.items) {
      throw new Error(`ApprovalLine "${props.name}": set either \`api\` or \`items\``);
    }
    return createElement(ApprovalLineComponent, { ...props, api: read });
  }
}
