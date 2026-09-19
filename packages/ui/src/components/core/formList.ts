import { createElement, type JSX } from "react";
import type {
  Container,
  FormListApiConfig,
  FormListDeleteApi,
  FormListDeleteApiRef,
  FormListElement,
  FormListMutationApi,
  FormListMutationApiRef,
  IElement,
} from "../@types";
import { FormList as FormListComponent } from "../FormList";
import { ContainerBuilder, ContainerGrid } from "./containerBuilder";
import { resolveApiRef, urlParamNames } from "./readApi";

import type { ApiMaster, TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import type { ElementContext } from "./elementBuilder";

/**
 * Builds the `formlist` element: resolves the four `apiCrud` refs against the
 * ApiMaster (function + declared segments, so the caller args line up with
 * `ApiFactory`'s positional order) and hands the row template to the real
 * component together with a bin renderer that reuses the engine's builder —
 * so a row's fields are built exactly like any container's.
 */
export class FormList<M extends TModelMaster, A extends TApiMaster<M>> implements IElement {
  constructor(private _context: ElementContext<M, A>) {}

  private resolve(name: string | undefined) {
    return resolveApiRef(this._context, name);
  }

  private mutation(ref: FormListMutationApiRef | undefined): FormListMutationApi | undefined {
    const resolved = this.resolve(ref?.name);
    if (!ref || !resolved) return undefined;
    return { ...ref, api: resolved.api, segments: resolved.segments };
  }

  create(): JSX.Element {
    const props = this._context.props as unknown as FormListElement;

    const read = this.resolve(props.apiCrud?.read?.name);
    if (!read) {
      throw new Error(
        `FormList "${props.name}": read API "${props.apiCrud?.read?.name}" was not found in ApiMaster`
      );
    }

    const del = this.mutation(props.apiCrud.delete) as FormListDeleteApi | undefined;
    const apiCrud: FormListApiConfig = {
      read: {
        ...props.apiCrud.read,
        api: read.api,
        segments: read.segments,
        urlParams: urlParamNames(read.url),
      },
      create: this.mutation(props.apiCrud.create),
      update: this.mutation(props.apiCrud.update),
      delete: del
        ? { ...del, confirmBox: (props.apiCrud.delete as FormListDeleteApiRef).confirmBox }
        : undefined,
    };

    const apis = this._context.apis as unknown as ApiMaster<TModelMaster, TApiMaster<TModelMaster>>;
    const theme = this._context.theme;
    const renderBins = (container: Container, form: unknown) =>
      createElement(ContainerGrid, {
        container,
        builder: new ContainerBuilder([container], apis),
        form,
        theme,
        ctx: undefined,
      });

    return createElement(FormListComponent, {
      name: props.name,
      title: props.title,
      idKey: props.idKey,
      rowContainer: props.rowContainer,
      apiCrud,
      renderBins,
      addLabel: props.addLabel,
      addIcon: props.addIcon,
      addPosition: props.addPosition,
      addAlign: props.addAlign,
      addDisplay: props.addDisplay,
      saveLabel: props.saveLabel,
      removeLabel: props.removeLabel,
      removeIcon: props.removeIcon,
      removePosition: props.removePosition,
      removeDisplay: props.removeDisplay,
      emptyText: props.emptyText,
    });
  }
}
