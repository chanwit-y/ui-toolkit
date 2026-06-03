import { createColumnHelper } from "@tanstack/react-table";
import type {
  IElement,
  DataTableElement,
  ColumnDef,
} from "../@types";
import { createElement, type JSX } from "react";
import { DataTable2 } from "../DataTable2";

import type { ApiMaster, TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import type { ElementContext } from "./elementBuilder";
import { ContainerBuilder } from "./containerBuilder";
import dayjs from "dayjs";
// import  DataContext  from "./dataContext";

export class DataTable<
  T extends Record<string, any>,
  M extends TModelMaster,
  A extends TApiMaster<M>,
> implements IElement {
  private _columnHelper = createColumnHelper<T>();

  constructor(private _context: ElementContext<M, A>) { }

  private align(columns: any[]) {
    return columns.reduce((acc, current) => {
      return { ...acc, [current.accessor]: current.align ?? 'center' }
    }, {})
  }

  private transformValue(value: any, useDateFormat?: string) {
    if (useDateFormat) {
      return dayjs(value).format(useDateFormat)
    }
    return value
  }

  public toColoumDefinition(columns: ColumnDef[]) {
    return columns.map((column) =>
      this._columnHelper.accessor(column.accessor as any, {
        header: column.header,
        enableSorting: column.enableSorting,
        enableColumnFilter: column.enableColumnFilter,
        cell: (props) =>
          createElement(
            "div",
            {},
            this.transformValue(props.row.original[column.accessor as keyof T], column.useDateFormat)
          ), //<>{props.row.original[column.accessor as keyof T]}</>,
        filterFn: (row, columnId, value) => {
          if (!value || value.length === 0) return true;
          return value.includes(String(row.getValue(columnId)));
        },
      })
    );
  }

  create(): JSX.Element {
    const props = this._context.props as DataTableElement;

    // props.editModalContainer
    const modalContainer =
      props.modalContainer && this._context.apis
        ? new ContainerBuilder(
          [props.modalContainer],
          this._context.apis as ApiMaster<M, A>
        ).draw()
        : undefined;


    return createElement(DataTable2, {
      name: props.name,
      columns: this.toColoumDefinition(props.columns),
      align: this.align(props.columns ?? []),
      apiDeleteInfo: props.apiDeleteInfo,
      api: this._context.api,
      apiDelete: this._context.apiDelete,
      apiInfo: props.api,
      canSearchAllColumns: true,
      title: props.title,
      modalContainer: modalContainer,
      modalMaxWidth: props.modalMaxWidth,
      modalMinWidth: props.modalMinWidth,
      modalMaxHeight: props.modalMaxHeight,
      canEdit: props.canEdit,
      canDelete: props.canDelete,
      // context: DataContext,
    });
  }
}
