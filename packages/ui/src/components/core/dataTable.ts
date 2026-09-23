import { createColumnHelper } from "@tanstack/react-table";
import type {
  IElement,
  DataTableElement,
  ColumnDef,
} from "../@types";
import { createElement, type JSX } from "react";
import { DataTable2 } from "../DataTable2";
import { HtmlCell } from "../HtmlCell";
import { groupColumns, type ColumnLayoutMeta } from "../dataTableLayout";

import type { ApiMaster, TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import type { ElementContext } from "./elementBuilder";
import { ContainerBuilder } from "./containerBuilder";
import { resolveApiRef, urlParamNames } from "./readApi";
import { ContainerGrid } from "./containerBuilder";
import type { Container } from "../@types";
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
    // Adjacent columns sharing a `group` label sit under one group header.
    return groupColumns(columns, this.toLeafDefinitions(columns))
  }

  private toLeafDefinitions(columns: ColumnDef[]) {
    return columns.map((column) =>
      this._columnHelper.accessor(column.accessor as any, {
        header: column.header,
        enableSorting: column.enableSorting,
        enableColumnFilter: column.enableColumnFilter,
        ...(column.size !== undefined ? { size: column.size } : {}),
        ...(column.minSize !== undefined ? { minSize: column.minSize } : {}),
        ...(column.maxSize !== undefined ? { maxSize: column.maxSize } : {}),
        ...(column.enableResizing === false ? { enableResizing: false } : {}),
        // Layout flags DataTable2 reads off `meta` (see `dataTableLayout.tsx`):
        // `html` skips the search highlight and the line clamp, `lines` is the
        // column's own clamp, the rest drive the row header / merged cells.
        meta: columnLayoutMeta(column),
        cell: (props) => {
          const value = this.transformValue(props.row.original[column.accessor as keyof T], column.useDateFormat)
          return column.html
            ? createElement(HtmlCell, { template: column.html, row: props.row.original, value })
            : createElement("div", {}, value)
        },
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


    const read = resolveApiRef(this._context, props.api?.name);
    const apis = this._context.apis as ApiMaster<M, A>;
    const theme = this._context.theme;
    // The filter form's fields, drawn against the table's own form instance.
    const renderFilterBins = (container: Container, form: unknown) =>
      createElement(ContainerGrid, {
        container,
        builder: new ContainerBuilder([container], apis) as never,
        form,
        theme,
        ctx: undefined,
      });
    // TanStack's column id is the accessor with dots flattened.
    const sortFields = (props.columns ?? []).reduce<Record<string, string>>(
      (acc, c) => (c.sortField ? { ...acc, [c.accessor.replace(/\./g, "_")]: c.sortField } : acc),
      {},
    );

    return createElement(DataTable2, {
      name: props.name,
      columns: this.toColoumDefinition(props.columns),
      align: this.align(props.columns ?? []),
      apiDeleteInfo: props.apiDeleteInfo,
      api: this._context.api,
      apiDelete: this._context.apiDelete,
      apiInfo: props.api,
      apiSegments: read?.segments,
      urlParams: urlParamNames(read?.url),
      sortFields,
      filterContainer: props.filterContainer,
      renderFilterBins: props.filterContainer && this._context.apis ? renderFilterBins : undefined,
      filterDefaults: props.filterDefaults,
      filterButton: props.filterButton,
      filterDisplay: props.filterDisplay,
      pinnedColumns: {
        // The row header leads (after the action column), then the config pins.
        left: [
          ...(props.columns ?? []).filter((c) => c.rowHeader).map((c) => c.accessor),
          ...(props.columns ?? []).filter((c) => c.pin === "left" && !c.rowHeader).map((c) => c.accessor),
        ],
        right: (props.columns ?? []).filter((c) => c.pin === "right").map((c) => c.accessor),
      },
      canSearchAllColumns: props.canSearch ?? true,
      title: props.title,
      modalContainer: modalContainer,
      modalMaxWidth: props.modalMaxWidth,
      modalMinWidth: props.modalMinWidth,
      modalMaxHeight: props.modalMaxHeight,
      canEdit: props.canEdit,
      canDelete: props.canDelete,
      canAdd: props.canAdd,
      addButton: props.addButton,
      headerGap: props.headerGap,
      rowNavigate: props.rowNavigate,
      canResizeColumns: props.canResizeColumns,
      cellLines: props.cellLines,
      // context: DataContext,
    });
  }
}

/** The TanStack column `meta` for a config column (only the keys that are set). */
export function columnLayoutMeta(column: ColumnDef): ColumnLayoutMeta | undefined {
  const meta: ColumnLayoutMeta = {
    ...(column.html ? { html: true } : {}),
    ...(column.lines !== undefined ? { lines: column.lines } : {}),
    ...(column.rowHeader ? { rowHeader: true } : {}),
    ...(column.mergeRows ? { mergeRows: true } : {}),
    ...(column.mergeColumns ? { mergeColumns: true } : {}),
  };
  return Object.keys(meta).length ? meta : undefined;
}
