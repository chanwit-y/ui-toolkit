import { createColumnHelper } from "@tanstack/react-table";
import type {
  IElement,
  DataTableElement,
  ColumnDef,
} from "../@types";
import { createElement, type JSX } from "react";
import { DataTable2 } from "../DataTable2";
import { FormattedHtmlCell } from "../FormattedCell";
import { NUMERIC_FORMATS, columnFormat } from "../../util/format";
import { groupColumns, type ColumnLayoutMeta } from "../dataTableLayout";

import type { ApiMaster, TApiMaster } from "../../api/APIMaster";
import type { TModelMaster } from "../../model/master";
import type { ElementContext } from "./elementBuilder";
import { ContainerBuilder } from "./containerBuilder";
import { resolveApiRef, urlParamNames } from "./readApi";
import { ContainerGrid } from "./containerBuilder";
import type { Container } from "../@types";
// import  DataContext  from "./dataContext";

export class DataTable<
  T extends Record<string, any>,
  M extends TModelMaster,
  A extends TApiMaster<M>,
> implements IElement {
  private _columnHelper = createColumnHelper<T>();

  constructor(private _context: ElementContext<M, A>) { }

  // A numeric format aligns to the end unless the column says otherwise.
  private align(columns: ColumnDef[]) {
    return columns.reduce<Record<string, "start" | "center" | "end">>((acc, current) => {
      const format = cellFormatOf(current)
      return { ...acc, [current.accessor]: current.align ?? (format && NUMERIC_FORMATS.has(format.type) ? 'end' : 'center') }
    }, {})
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
        // The raw value: DataTable2 formats it through `meta.format` (and
        // highlights the search); an HTML template gets the formatted text as `{{value}}`.
        cell: (props) => {
          const value = props.row.original[column.accessor as keyof T]
          return column.html
            ? createElement(FormattedHtmlCell, { template: column.html, row: props.row.original, value, format: cellFormatOf(column) })
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
    const bound = !!props.items;
    if (bound && (props.api?.pagination || props.api?.sort || props.filterContainer))
      console.warn(`[gummy-ui] DataTable "${props.name}": rows come from \`items\`, so api.pagination / api.sort / filterContainer are ignored.`);
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
      items: props.items,
      computedColumns: (props.columns ?? [])
        .filter((c) => c.value?.type === "formula")
        .map((c) => ({ accessor: c.accessor, value: c.value! })),
      filterContainer: bound ? undefined : props.filterContainer,
      renderFilterBins: !bound && props.filterContainer && this._context.apis ? renderFilterBins : undefined,
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
      actionSize: props.actionSize,
      // AG Grid-style features (see the grilled design `datatable-ag-grid-features`).
      canChooseColumns: props.canChooseColumns,
      columnsButton: props.columnsButton,
      columnState: props.columnState,
      hiddenColumns: (props.columns ?? []).filter((c) => c.hide).map((c) => c.accessor.replace(/\./g, "_")),
      lockedColumns: (props.columns ?? []).filter((c) => c.lockVisible || c.rowHeader).map((c) => c.accessor.replace(/\./g, "_")),
      selection: props.selection,
      rowStyles: props.rowStyles,
      grouping: props.grouping,
      canExport: props.canExport,
      exportButton: props.exportButton,
      exportOptions: props.exportOptions,
      paging: props.paging,
      // context: DataContext,
    });
  }
}

/** The TanStack column `meta` for a config column (only the keys that are set). */
/** The column's format; a computed column without one takes its inline formula's. */
function cellFormatOf(column: ColumnDef) {
  return columnFormat(column) ?? (column.value?.type === "formula" ? column.value.format : undefined);
}

export function columnLayoutMeta(column: ColumnDef): ColumnLayoutMeta | undefined {
  const format = cellFormatOf(column);
  const meta: ColumnLayoutMeta = {
    ...(column.html ? { html: true, template: column.html } : {}),
    ...(format ? { format } : {}),
    ...(column.cellStyles?.length ? { styles: column.cellStyles } : {}),
    ...(column.aggregate ? { aggregate: column.aggregate } : {}),
    ...(column.lines !== undefined ? { lines: column.lines } : {}),
    ...(column.rowHeader ? { rowHeader: true } : {}),
    ...(column.mergeRows ? { mergeRows: true } : {}),
    ...(column.mergeColumns ? { mergeColumns: true } : {}),
  };
  return Object.keys(meta).length ? meta : undefined;
}
