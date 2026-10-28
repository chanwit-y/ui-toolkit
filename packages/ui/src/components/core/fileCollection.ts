import { createElement, type JSX } from "react";
import type {
  FileCollectionApi,
  FileCollectionApiConfig,
  FileCollectionElement,
  FormListDeleteApi,
  FormListDeleteApiRef,
  FormListMutationApi,
  FormListMutationApiRef,
  IElement,
} from "../@types";
import { FileCollection as FileCollectionComponent } from "../FileCollection";
import { resolveApiRef, urlParamNames } from "./readApi";

import type { TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import type { ElementContext } from "./elementBuilder";

/** The mutation slots of {@link FileCollectionApi}, in the order the panel lists them. */
export const FILE_COLLECTION_MUTATIONS = [
  "createCollection",
  "renameCollection",
  "deleteCollection",
  "createItem",
  "renameItem",
  "deleteItem",
  "moveItem",
  "duplicateItem",
] as const;

/**
 * Builds the `filecollection` element: resolves the `list` read and every
 * wired mutation slot against the ApiMaster (function + declared segments, so
 * the fixed bodies and the `:param` maps land in `ApiFactory`'s positional
 * order) and hands them to the real component. A slot naming an endpoint the
 * ApiMaster doesn't know is dropped with a warning, which hides its
 * affordance like an unwired one.
 */
export class FileCollection<M extends TModelMaster, A extends TApiMaster<M>> implements IElement {
  constructor(private _context: ElementContext<M, A>) {}

  private mutation(slot: string, ref: FormListMutationApiRef | FormListDeleteApiRef | undefined, name: string): FormListMutationApi | FormListDeleteApi | undefined {
    if (!ref) return undefined;
    const resolved = resolveApiRef(this._context, ref.name);
    if (!resolved) {
      console.warn(`[gummy-ui] FileCollection "${name}": ${slot} API "${ref.name}" was not found in ApiMaster; the affordance is hidden.`);
      return undefined;
    }
    return { ...ref, api: resolved.api, segments: resolved.segments };
  }

  create(): JSX.Element {
    const props = this._context.props as unknown as FileCollectionElement;
    const api: FileCollectionApi = props.api ?? ({} as FileCollectionApi);

    const read = resolveApiRef(this._context, api.list?.name);
    if (!read) {
      throw new Error(`FileCollection "${props.name}": list API "${api.list?.name}" was not found in ApiMaster`);
    }

    const config: FileCollectionApiConfig = {
      list: { ...api.list, api: read.api, segments: read.segments, urlParams: urlParamNames(read.url) },
    };
    for (const slot of FILE_COLLECTION_MUTATIONS) {
      const resolved = this.mutation(slot, api[slot], props.name);
      if (resolved) (config as Record<string, unknown>)[slot] = resolved;
    }

    return createElement(FileCollectionComponent, {
      name: props.name,
      title: props.title,
      collapsible: props.collapsible,
      readOnly: props.readOnly,
      height: props.height,
      api: config,
      newItems: props.newItems,
      kindIcons: props.kindIcons,
      selection: props.selection,
      selectNavigate: props.selectNavigate,
    });
  }
}
