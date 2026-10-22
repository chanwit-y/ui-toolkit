import { createElement, type JSX } from "react";
import type { FormListReadApi, IElement, SwitchProfileElement } from "../@types";
import type { TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import { SwitchProfile as SwitchProfileComponent } from "../SwitchProfile";
import type { ElementContext } from "./elementBuilder";
import { resolveApiRef, urlParamNames } from "./readApi";

/**
 * `switchprofile` Bin → the bound {@link SwitchProfileComponent}: the `api`
 * ref is resolved against the ApiMaster like the repeater's (function +
 * declared segments + URL `:param`s); the rest of the config is the props.
 */
export class SwitchProfile<M extends TModelMaster, A extends TApiMaster<M>> implements IElement {
  constructor(private _context: ElementContext<M, A>) {}

  create(): JSX.Element {
    const { api, ...props } = this._context.props as SwitchProfileElement;
    const resolved = resolveApiRef(this._context, api?.name);
    if (!resolved) throw new Error(`SwitchProfile "${props.name}": API "${api?.name}" was not found in ApiMaster`);
    const read: FormListReadApi = { ...api, api: resolved.api, segments: resolved.segments, urlParams: urlParamNames(resolved.url) };
    return createElement(SwitchProfileComponent, { ...props, api: read });
  }
}
