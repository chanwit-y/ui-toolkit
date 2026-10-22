import { createElement, type JSX } from "react";
import type { FormListReadApi, IElement, ReplaceProfileElement } from "../@types";
import type { TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import { ReplaceProfile as ReplaceProfileComponent } from "../ReplaceProfile";
import type { ElementContext } from "./elementBuilder";
import { resolveApiRef, urlParamNames } from "./readApi";

/**
 * `replaceprofile` Bin → the bound {@link ReplaceProfileComponent}: both API
 * refs (`searchApi`, `profilesApi`) are resolved against the ApiMaster like
 * the repeater's read; the rest of the config is the props.
 */
export class ReplaceProfile<M extends TModelMaster, A extends TApiMaster<M>> implements IElement {
  constructor(private _context: ElementContext<M, A>) {}

  private resolve(label: string, api: ReplaceProfileElement["searchApi"] | undefined, name: string | undefined): FormListReadApi {
    const resolved = resolveApiRef(this._context, api?.name);
    if (!resolved || !api) throw new Error(`ReplaceProfile "${name}": ${label} API "${api?.name}" was not found in ApiMaster`);
    return { ...api, api: resolved.api, segments: resolved.segments, urlParams: urlParamNames(resolved.url) };
  }

  create(): JSX.Element {
    const { searchApi, profilesApi, ...props } = this._context.props as ReplaceProfileElement;
    return createElement(ReplaceProfileComponent, {
      ...props,
      searchApi: this.resolve("search", searchApi, props.name),
      profilesApi: this.resolve("profiles", profilesApi, props.name),
    });
  }
}
