import { createElement, type JSX } from "react";
import type {
  APIFunction,
  CrudDeleteApi,
  CrudMutationApi,
  CrudMutationApiRef,
  DataTableEditableApiConfig,
  DataTableEditableColumn,
  DataTableEditableElement,
  IElement,
} from "../@types";
import { DataTableEditable as DataTableEditableComponent } from "../DataTableEditable";
import { NUMERIC_FORMATS } from "../../util/format";

import type { TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import type { ElementContext } from "./elementBuilder";

export class DataTableEditable<
  M extends TModelMaster,
  A extends TApiMaster<M>,
> implements IElement {

  constructor(private _context: ElementContext<M, A>) { }

  private resolveApi(name: string | undefined): APIFunction | undefined {
    if (!name) return undefined;
    return this._context.apis?.api?.[name] as APIFunction | undefined;
  }

  private toMutation(ref: CrudMutationApiRef | undefined): CrudMutationApi | undefined {
    const api = this.resolveApi(ref?.name);
    if (!ref || !api) return undefined;
    return {
      api,
      params: ref.params,
      snackbarSuccess: ref.snackbarSuccess,
      snackbarError: ref.snackbarError,
    };
  }

  private align(columns: DataTableEditableColumn[]) {
    return columns.reduce<Record<string, "start" | "center" | "end">>((acc, current) => {
      // A numeric format aligns to the end unless the column says otherwise.
      const align = current.align ?? (current.format && NUMERIC_FORMATS.has(current.format.type) ? "end" : undefined);
      return align ? { ...acc, [current.accessorKey]: align } : acc;
    }, {});
  }

  create(): JSX.Element {
    const props = this._context.props as unknown as DataTableEditableElement;

    const readApi = this.resolveApi(props.apiCrud?.read?.name);
    if (!readApi) {
      throw new Error(
        `DataTableEditable "${props.name}": read API "${props.apiCrud?.read?.name}" was not found in ApiMaster`
      );
    }

    const deleteMutation = this.toMutation(props.apiCrud.delete);
    const apiCrud: DataTableEditableApiConfig = {
      read: {
        api: readApi,
        query: props.apiCrud.read.query,
        paths: props.apiCrud.read.paths,
      },
      create: this.toMutation(props.apiCrud.create),
      update: this.toMutation(props.apiCrud.update),
      delete: deleteMutation
        ? ({ ...deleteMutation, confirmBox: props.apiCrud.delete?.confirmBox } as CrudDeleteApi)
        : undefined,
    };

    return createElement(DataTableEditableComponent, {
      name: props.name,
      title: props.title,
      idKey: props.idKey,
      columns: props.columns,
      align: this.align(props.columns ?? []),
      apiCrud,
      canResizeColumns: props.canResizeColumns,
      actionSize: props.actionSize,
    });
  }
}
