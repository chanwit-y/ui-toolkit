import { createElement, type JSX } from "react";
import type { FilePreviewElement, FormListReadApi, IElement } from "../@types";
import type { TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import { FilePreview as FilePreviewComponent } from "../FilePreview";
import type { ElementContext } from "./elementBuilder";
import { resolveApiRef, urlParamNames } from "./readApi";

/**
 * `filepreview` Bin → the bound {@link FilePreviewComponent}. An `api` ref is
 * resolved against the ApiMaster like the repeater's; with neither `api` nor
 * `value` it shows its empty text. The HTTP client's base URL goes along:
 * the browser loads a file's URL itself, so nothing else would join it.
 */
export class FilePreview<M extends TModelMaster, A extends TApiMaster<M>> implements IElement {
  constructor(private _context: ElementContext<M, A>) {}

  create(): JSX.Element {
    const { api, ...props } = this._context.props as FilePreviewElement;
    let read: FormListReadApi | undefined;
    if (api) {
      const resolved = resolveApiRef(this._context, api.name);
      if (!resolved) throw new Error(`FilePreview "${props.name}": API "${api.name}" was not found in ApiMaster`);
      read = { ...api, api: resolved.api, segments: resolved.segments, urlParams: urlParamNames(resolved.url) };
    }
    return createElement(FilePreviewComponent, { ...props, api: read, baseUrl: this._context.apis?.baseUrl });
  }
}
