import type {
  ComponentPropsWithoutRef,
  Context,
  CSSProperties,
  ElementType,
  JSX,
} from "react";
import type { CellFormat } from "../../util/format";
import {
  TextField as RadixTextField,
  Button as RadixButton,
  Select as RadixSelect,
  Checkbox as RadixCheckbox,
  Switch as RadixSwitch,
  RadioGroup as RadixRadioGroup,
  Text as RadixText,
} from "@radix-ui/themes";
import { type ThemeProps } from "@radix-ui/themes";
import type { ComponentType, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import type { LucideIcon, LucideProps } from "lucide-react";
import type { IconData } from "../core/const/iconData";
import type {
  FieldArrayPath,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
} from "react-hook-form";
import type { SnackbarVariant } from "../Snackbar";
import type { UploadFileContent, UploadValueFormat } from "../../util/file";
import type { AcceptConfig } from "../../util/accept";
import { DataContextType } from "../context/DataProvider";
// import { DataState } from "../core/stord";
import { TApiMaster } from "../../api/APIMaster";

// export type Components = {
//   TextField?: TextFieldProps;
//   Hidden?: HiddenProps;
//   Button?: ButtonProps;
//   SelectField?: SelectFieldProps;
//   Autocomplete?: AutocompleteProps;
//   Textarea?: TextareaProps;
//   Checkbox?: CheckboxProps;
//   RadioButton?: RadioButtonProps;
//   Popover?: PopoverProps;
//   Icon?: IconProps;
// };

export type Appearance = "light" | "dark";

/**
 * How surfaces are painted (see the grilled design `glass-surface`):
 * `flat` is the solid panel; `glass` makes every surfaced component a
 * translucent, blurred panel over an accent-tinted backdrop. Orthogonal to
 * `appearance` — light-glass and dark-glass both exist.
 */
export type Surface = "flat" | "glass";

/**
 * The `ThemeProvider` `theme` prop: Radix's global tokens plus Gummy's own
 * `surface` / `background`, which the provider strips before Radix sees them.
 */
export type GummyThemeProps = ThemeProps & {
  /** Surface style; default `flat`. */
  surface?: Surface;
  /**
   * The backdrop glass is drawn over: any CSS `background` value (a colour, a
   * gradient, `url(...)`). Only read while `surface` is `glass`; default an
   * accent-tinted gradient.
   */
  background?: string;
};

export type ThemeContextType = {
  theme?: GummyThemeProps;
  components: ThemeComponents;
  /** Current resolved appearance (light/dark). */
  appearance?: Appearance;
  /** Set the appearance explicitly. */
  setAppearance?: (appearance: Appearance) => void;
  /** Flip between light and dark. */
  toggleAppearance?: () => void;
  /** Current resolved surface (flat/glass). */
  surface?: Surface;
  /** Runtime override of the surface — not persisted, the config stays the source of truth. */
  setSurface?: (surface: Surface) => void;
};

export type ThemeProviderProps = {
  children: React.ReactNode;
  theme?: GummyThemeProps;
  className?: string;
} & ThemeContextType;

export type BaseComponentProps<
  U extends ElementType = ElementType,
  T extends Record<string, any> = {}
> = T & ComponentPropsWithoutRef<U>;

/**
 * A button's visual weight: "contained" is the filled accent button,
 * "outlined" an accent border on a clear surface, "text" the bare label.
 */
export type ButtonVariant = "contained" | "outlined" | "text";

// Radix's own `variant` is omitted: ours names the same prop in its own vocabulary.
export type ButtonProps = Omit<ComponentPropsWithoutRef<typeof RadixButton>, "variant"> &
  {
    /** Visual weight. Defaults to "contained". */
    variant?: ButtonVariant;
    label: string;
    icon?: keyof typeof IconData;
    color?: ThemeProps["accentColor"];
    actions: ButtonAction[];
    api?: APIFunction;
    modalId?: string;
    snackbarSuccess?: SnackbarElement;
    snackbarError?: SnackbarElement | "$exception";
    confirmBox?: ConfirmBoxElement;
    reloadDataTable?: string;
    /** Target of the `"ExportTable"` action: a data table's `name`. */
    exportTable?: string;
    apiInfo?: TApiMaster<any>;
    /** Target of the `"Navigate"` action. */
    navigate?: NavigateTarget;
    // useCount: UseBoundStore<StoreApi<DataState>>
  };

export type DataType =
  | "date"
  | "datetime-local"
  | "email"
  | "hidden"
  | "month"
  | "number"
  | "password"
  | "search"
  | "tel"
  | "text"
  | "time"
  | "url"
  | "week";

export type TextFieldProps = BaseComponentProps<
  typeof RadixTextField.Root,
  {
    label?: string;
    placeholder?: string;
    helperText?: string;
    /** Marks the label with `*` and the input `aria-required` (the form's schema enforces it). */
    isRequired?: boolean;
    error?: boolean;
    dataType: DataType;
    errorMessage?: string;
    variant?: "classic" | "surface" | "soft";
    size?: "1" | "2" | "3";
    radius?: "none" | "small" | "medium" | "large" | "full";
    isFullWidth?: boolean;
    width?: number;
    isFixedHeight?: boolean;
    /**
     * Restrict input to values matching this regular expression. Provided as a
     * string (e.g. "^[A-Za-z]*$") or a RegExp. While typing, any change that
     * would produce a value not matching the pattern is rejected, so the field
     * never holds an invalid character. An empty value is always allowed so the
     * field can be cleared.
     */
    regex?: string | RegExp;
    /**
     * Message shown briefly when a keystroke is rejected by `regex`. The hint
     * auto-clears shortly after the user stops typing invalid characters.
     * Defaults to "Invalid character". Only used when `regex` is set.
     */
    regexErrorMessage?: string;
  }
>;

export type HiddenProps = BaseComponentProps<
  "input",
  {
    value?: string | number;
  }
>;

export type DatePickerProps = BaseComponentProps<
  "button",
  {
    label?: string;
    placeholder?: string;
    helperText?: string;
    isRequired?: boolean;
    error?: boolean;
    errorMessage?: string;
    variant?: "classic" | "surface" | "soft";
    size?: "1" | "2" | "3";
    radius?: "none" | "small" | "medium" | "large" | "full";
    isFullWidth?: boolean;
    width?: number;
    isFixedHeight?: boolean;
    /**
     * The currently selected date value as an ISO date string (YYYY-MM-DD)
     * or empty string when no date is selected.
     */
    value?: string;
    /**
     * Display format used inside the trigger input. Defaults to "DD/MM/YYYY".
     * Uses dayjs format tokens.
     */
    displayFormat?: string;
    /**
     * Earliest selectable date (inclusive) as an ISO date string (YYYY-MM-DD).
     */
    minDate?: string;
    /**
     * Latest selectable date (inclusive) as an ISO date string (YYYY-MM-DD).
     */
    maxDate?: string;
    /**
     * First day of the week (0 = Sunday, 1 = Monday). Defaults to 0.
     */
    weekStartsOn?: 0 | 1;
    /**
     * Whether the picker should allow clearing the selected value. Defaults to true.
     */
    clearable?: boolean;
    /**
     * Disable the input.
     */
    disabled?: boolean;
    onValueChange?: (value: string) => void;
    onBlur?: () => void;
  }
>;

export type SelectFieldProps = BaseComponentProps<
  typeof RadixSelect.Trigger,
  {
    label?: string;
    placeholder?: string;
    helperText?: string;
    error?: boolean;
    errorMessage?: string;
    variant?: "classic" | "surface" | "soft";
    size?: "1" | "2" | "3";
    radius?: "none" | "small" | "medium" | "large" | "full";
    options: Array<{ value: string; label: string; disabled?: boolean }>;
    value?: string;
    /** Disable the whole control (no opening, no selection). */
    disabled?: boolean;
    onValueChange?: (value: string) => void;
  }
>;

export type TextareaProps = BaseComponentProps<
  "textarea",
  {
    label?: string;
    placeholder?: string;
    helperText?: string;
    error?: boolean;
    errorMessage?: string;
    rows?: number;
    cols?: number;
    resize?: "none" | "both" | "horizontal" | "vertical";
    autoResize?: boolean;
    maxLength?: number;
    showCharCount?: boolean;
  }
>;

export type CheckboxProps = BaseComponentProps<
  typeof RadixCheckbox,
  {
    options?: Array<{
      value: string;
      label: string;
      disabled?: boolean;
      helperText?: string;
    }>;
    label?: string;
    helperText?: string;
    error?: boolean;
    errorMessage?: string;
    size?: "1" | "2" | "3";
    variant?: "classic" | "surface" | "soft";
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    onValueChange?: (values: string[]) => void;
    orientation?: "horizontal" | "vertical";
    indeterminate?: boolean;
  }
>;

export type RadioButtonProps = BaseComponentProps<
  typeof RadixRadioGroup.Root,
  {
    label?: string;
    helperText?: string;
    error?: boolean;
    errorMessage?: string;
    size?: "1" | "2" | "3";
    variant?: "classic" | "surface" | "soft";
    value?: string;
    onValueChange?: (value: string) => void;
    options: Array<{
      value: string;
      label: string;
      disabled?: boolean;
      helperText?: string;
    }>;
    orientation?: "horizontal" | "vertical";
  }
>;

/**
 * Props for the engine-aware radio (RadioButtonBase2): the static-options
 * RadioButtonProps plus API-driven options and observe/enabledWhen reactivity.
 * Mirrors AutocompleteProps2's data-field surface.
 */
export type RadioButtonProps2 = RadioButtonProps & {
  name?: string;
  dataType?: string;
  /** Bound API caller (provided by the engine). */
  api?: APIFunction;
  /** API config (name/paths/query/body/params) the caller was built from. */
  apiInfo?: API;
  /** Maps a fetched object onto an option: value/label keys. */
  keys?: { value: string; label: string };
  /** Fetch options once; don't refetch on observe changes. */
  isSingleLoad?: boolean;
  /** Publish this field's value so other fields can observe it. */
  canObserve?: boolean;
  /** Observe another field's value to feed this radio's API params. */
  observeTo?: string;
  /** Conditionally disable the group based on another field. */
  enabledWhen?: CondExpression;
  onChange?: (value: string) => void;
};

export type AutocompleteItem = {
  id: string;
  label: string;
  category: string;
  disabled?: boolean;
};

export type AutocompleteItem2 = {
  id: string;
  label: string;
};

export type AutocompleteProps = BaseComponentProps<
  "button",
  {
    label?: string;
    placeholder?: string;
    helperText?: string;
    error?: boolean;
    errorMessage?: string;
    variant?: "classic" | "surface" | "soft";
    size?: "1" | "2" | "3";
    radius?: "none" | "small" | "medium" | "large" | "full";
    items: AutocompleteItem[];
    value?: string;
    onValueChange?: (value: string) => void;
    onBlur?: () => void;
    maxResults?: number;
    isSingleLoad?: boolean;
  }
>;

export type APIFunction = (
  query?: Record<string, any>,
  params?: Record<string, any>,
  body?: Record<string, any>
) => Promise<any>;

export type AutocompleteProps2<T extends Record<string, any> = {}> =
  BaseComponentProps<
    "button",
    {
      // name?: string;
      label?: string;
      subtitle?: string;
      placeholder?: string;
      helperText?: string;
      error?: boolean;
      errorMessage?: string;
      variant?: "classic" | "surface" | "soft";
      size?: "1" | "2" | "3";
      radius?: "none" | "small" | "medium" | "large" | "full";
      inputIcon?: keyof typeof IconData | LucideIcon;
      itemIcon?: keyof typeof IconData | LucideIcon | ((item: T) => keyof typeof IconData | LucideIcon);
      itemSubtitle?: keyof T | ((item: T) => string);
      itemAvatar?: keyof T | ((item: T) => string | { src: string; alt?: string; fallback?: string });
      options: T[];
      searchKey: keyof T;
      idKey: keyof T;
      displayKey: keyof T;
      value?: string;
      onValueChange?: (value: string) => void;
      onBlur?: () => void;
      maxResults?: number;
      maxHeight?: number | string;
      canObserve?: boolean;
      observeTo?: string;
      // apiSubject?: Subject<string>;
      // api?: (params: Record<string, any>) => Observable<T[]>;
      // apiCanSearch?: boolean;
      api?: APIFunction;
      apiInfo?: API;
      /**
       * Which of (query, URL params, body) the endpoint declares — the order
       * its built caller takes them in. Set by the engine's builder; without it
       * the call falls back to `(query, params)`, which mis-slots the params of
       * an endpoint that declares no query.
       */
      apiSegments?: ApiSegments;
      // enabledWhen?: ConditionTerm;
      enabledWhen?: CondExpression;
      isSingleLoad?: boolean;
      // defaultData?: Record<string, unknown>;
      // apiObserveParam?: string;
    }
  >;

export type MultiAutocompleteProps<T extends Record<string, any> = {}> =
  BaseComponentProps<
    "button",
    {
      name?: string;
      label?: string;
      subtitle?: string;
      placeholder?: string;
      helperText?: string;
      error?: boolean;
      errorMessage?: string;
      variant?: "classic" | "surface" | "soft";
      size?: "1" | "2" | "3";
      radius?: "none" | "small" | "medium" | "large" | "full";
      inputIcon?: keyof typeof IconData | LucideIcon;
      itemIcon?: keyof typeof IconData | LucideIcon | ((item: T) => keyof typeof IconData | LucideIcon);
      itemSubtitle?: keyof T | ((item: T) => string);
      itemAvatar?: keyof T | ((item: T) => string | { src: string; alt?: string; fallback?: string });
      options: T[];
      searchKey: keyof T;
      idKey: keyof T;
      displayKey: keyof T;
      values?: string[];
      /** The form's value (`withForm` passes it): the selected ids. Wins over `values`. */
      value?: unknown;
      onValuesChange?: (values: string[]) => void;
      onChange?: (values: string[]) => void;
      onBlur?: () => void;
      maxResults?: number;
      maxHeight?: number | string;
      canObserve?: boolean;
      observeTo?: string;
      api?: APIFunction;
      apiInfo?: API;
      /** See `AutocompleteProps2.apiSegments`. */
      apiSegments?: ApiSegments;
      enabledWhen?: CondExpression;
      maxSelections?: number;
      showSelectedCount?: boolean;
      fields?: any[];
      append?: UseFieldArrayAppend<any, FieldArrayPath<any>>;
      remove?: UseFieldArrayRemove;
    }
  >;

export type DataTableProps = {
  name: string;
  columns?: any[];
  title?: string;
  canSearchAllColumns?: boolean;
  apiDeleteInfo?: APIDelete;
  api?: APIFunction;
  apiDelete?: APIFunction;
  apiInfo?: DataTableApi;
  /** Rows from a DataValue instead of the API (see {@link DataTableElement.items}). */
  items?: DataValue;
  /** Computed columns (`ColumnDef.value`): each row gets `accessor` = the formula's raw result. */
  computedColumns?: { accessor: string; value: DataValue }[];
  /**
   * The read endpoint's declared segments, so `query`/`body` maps and the
   * pagination keys land in the caller's positional (query, param, body)
   * slots. Omitted (hand-wired `api`) ⇒ one merged positional arg, as before.
   */
  apiSegments?: ApiSegments;
  /** Initial column pinning by accessor; the action column is pinned left regardless. */
  pinnedColumns?: DataTablePinnedColumns;
  modalContainer?: JSX.Element;
  modalMaxWidth?: string;
  modalMinWidth?: string;
  modalMaxHeight?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  /** Add button in the header (opens `modalContainer` with cleared context). */
  canAdd?: boolean;
  addButton?: DataTableAddButton;
  /** Spacing between the header's title, Add button and search box. */
  headerGap?: DataTableHeaderGap;
  /** Row click navigates; `{ type: "row", key }` params read the clicked row. */
  rowNavigate?: NavigateTarget;
  /** Column resizing by dragging the header edges. Default true. */
  canResizeColumns?: boolean;
  /**
   * Lines a plain cell may show before it is cut (CSS line clamp); a cut cell
   * shows its whole text in a tooltip on hover. Default 2; `0` = no clamp
   * (wrap freely). Per column: {@link ColumnDef.lines}. HTML columns and the
   * action column never clamp.
   */
  cellLines?: number;
  /** Row-action button size (see {@link DataTableElement.actionSize}). Default "2". */
  actionSize?: DataTableActionSize;
  /**
   * The filter form (see {@link DataTableElement.filterContainer}). The table
   * owns the form instance; `renderFilterBins` draws the container's bins
   * against it (the builder passes the engine's `ContainerGrid`).
   */
  filterContainer?: Container;
  renderFilterBins?: (container: Container, form: unknown) => ReactNode;
  filterDefaults?: Record<string, unknown>;
  filterButton?: DataTableFilterButton;
  filterDisplay?: DataTableFilterDisplay;
  /** `:param` names of the read endpoint's URL — the call is held until each resolves. */
  urlParams?: string[];
  /** Column id → the field name `api.sort` sends (see {@link ColumnDef.sortField}). */
  sortFields?: Record<string, string>;
  align?: Record<string, "start" | "center" | "end">;
  context?: Context<DataContextType>;
  /** Columns menu (see {@link DataTableElement.canChooseColumns}). Default true. */
  canChooseColumns?: boolean;
  columnsButton?: DataTableToolbarButton;
  columnState?: DataTableColumnState;
  /** Column ids that start hidden / can't be hidden (from `ColumnDef.hide` / `lockVisible`). */
  hiddenColumns?: string[];
  lockedColumns?: string[];
  selection?: DataTableSelection;
  rowStyles?: DataTableStyleRule[];
  grouping?: DataTableGrouping;
  canExport?: boolean;
  exportButton?: DataTableToolbarButton;
  exportOptions?: DataTableExportOptions;
  paging?: "pages" | "scroll";
  // isReload?: boolean;
  // apiEdit?: APIFunction;
};

export type DataTableEditableEditor =
  | "text"
  | "number"
  | "date"
  | "select"
  | "checkbox";

export type DataTableEditableValidation = {
  /** Error message shown when a required value is missing. */
  requiredMessage?: string;
  /** Minimum numeric value (editor "number"). */
  min?: number;
  /** Maximum numeric value (editor "number"). */
  max?: number;
  minLength?: number;
  maxLength?: number;
  /** Regex the value must match. */
  pattern?: string | RegExp;
  /** Error message shown when the pattern does not match. */
  patternMessage?: string;
  /** Custom validator. Return an error message, or null/undefined when valid. */
  validate?: (value: any, row: Record<string, any>) => string | null | undefined;
};

export type DataTableEditableColumn = {
  accessorKey: string;
  header: string;
  /** Whether the column can be edited inline. Defaults to true. */
  editable?: boolean;
  /** Editor rendered when the row is in edit mode. Defaults to "text". */
  editor?: DataTableEditableEditor;
  /** Options for the "select" editor. */
  options?: Array<{ value: string; label: string }>;
  isRequired?: boolean;
  /** Validation rules applied when saving the row. */
  validation?: DataTableEditableValidation;
  enableSorting?: boolean;
  enableColumnFilter?: boolean;
  /**
   * Starting width in px. Declaring one on any column puts the table in
   * exact-pixel mode from the first paint (spare width goes to a filler cell);
   * otherwise columns share the container until the first resize.
   */
  size?: number;
  /** Narrowest the column can be dragged (px). Default 60. */
  minSize?: number;
  /** Widest the column can be dragged (px). Default: no limit. */
  maxSize?: number;
  /** `false` locks this column's width (no resize handle). Default true. */
  enableResizing?: boolean;
  align?: "start" | "center" | "end";
  /** Display formatting of the cell while the row is not being edited. See {@link ColumnDef.format}. */
  format?: CellFormat;
  /** Conditional look of the cell in read mode. See {@link ColumnDef.cellStyles}. */
  cellStyles?: DataTableStyleRule[];
  /** The row's label column (`<th scope="row">`, header colours, pinned left). See {@link ColumnDef.rowHeader}. */
  rowHeader?: boolean;
  /** Group header label — adjacent columns with the same label share a band. See {@link ColumnDef.group}. */
  group?: string;
  /** Initial value used when creating a new row. */
  defaultValue?: any;
};

export type CrudReadApi = {
  api: APIFunction;
  /** Query object passed to the read API. */
  query?: Record<string, any>;
  /** Paths to drill into the API response to reach the row array. */
  paths?: string[];
};

export type CrudMutationApi = {
  api: APIFunction;
  /**
   * URL/path parameter mapping: API param name -> row field
   * (e.g. { id: "_id" }). When set, the API is called as
   * api(params, body) instead of api(body).
   */
  params?: Record<string, string>;
  snackbarSuccess?: SnackbarElement;
  snackbarError?: SnackbarElement | "$exception";
};

export type CrudDeleteApi = CrudMutationApi & {
  confirmBox?: Pick<ConfirmBoxElement, "title" | "description">;
};

export type DataTableEditableApiConfig = {
  read: CrudReadApi;
  create?: CrudMutationApi;
  update?: CrudMutationApi;
  delete?: CrudDeleteApi;
};

export type DataTableEditableProps = {
  name: string;
  title?: string;
  /** Row key used as the record id for update/delete calls. Defaults to "id". */
  idKey?: string;
  columns: DataTableEditableColumn[];
  /** CRUD API configuration. Create/update/delete actions appear only when their API is set. */
  apiCrud: DataTableEditableApiConfig;
  align?: Record<string, "start" | "center" | "end">;
  /** Column resizing by dragging the header edges. Default true. */
  canResizeColumns?: boolean;
  /** Row-action button size (see {@link DataTableElement.actionSize}). Default "2". */
  actionSize?: DataTableActionSize;
};

// Config-driven (container builder) variants: APIs are referenced by the name
// registered in ApiMaster and resolved when the element is built.
export type CrudReadApiRef = {
  /** API name registered in ApiMaster. */
  name: string;
  /** Request object passed as the first argument of the API (query or body, depending on the API). */
  query?: Record<string, any>;
  /** Paths to drill into the API response to reach the row array. */
  paths?: string[];
};

export type CrudMutationApiRef = {
  /** API name registered in ApiMaster. */
  name: string;
  /** URL/path parameter mapping: API param name -> row field (e.g. { id: "_id" }). */
  params?: Record<string, string>;
  snackbarSuccess?: SnackbarElement;
  snackbarError?: SnackbarElement | "$exception";
};

export type CrudDeleteApiRef = CrudMutationApiRef & {
  confirmBox?: Pick<ConfirmBoxElement, "title" | "description">;
};

export type DataTableEditableElement = {
  name: string;
  title?: string;
  /** Row key used as the record id for update/delete calls. Defaults to "id". */
  idKey?: string;
  columns: DataTableEditableColumn[];
  apiCrud: {
    read: CrudReadApiRef;
    create?: CrudMutationApiRef;
    update?: CrudMutationApiRef;
    delete?: CrudDeleteApiRef;
  };
  /**
   * Drag a header's right edge to resize its column (double-click resets;
   * the handle is keyboard-focusable: ← → resize, Enter resets). Widths last
   * for the session. Default true; lock single columns with `enableResizing`.
   */
  canResizeColumns?: boolean;
  /**
   * Size of the row-action buttons (Edit / Delete, and the editable table's
   * Save / Cancel): Radix IconButton steps `"1"` (24px, 12px glyph), `"2"`
   * (32px, 14px — the default) or `"3"` (40px, 18px). The ACTION column
   * widens to fit.
   */
  actionSize?: DataTableActionSize;
};


/* ------------------------------------------------------------ form list */

/**
 * `read` API of a {@link FormListElement}: the standard {@link API} shape —
 * `params`/`query`/`body` are {@link DataValue} maps resolved at render time
 * (`url` / `state` / `value`), so a list scoped to a parent record can read
 * the parent id off the route. `paths` drills into the response to reach the
 * row array. The list refetches when the resolved values change.
 */
export type FormListReadApiRef = API;

/**
 * `create` / `update` API of a {@link FormListElement}. `params` maps a URL
 * `:param` to a **row field** (e.g. `{ id: "_id" }`), like the editable table;
 * `extraParams` / `extraBody` / `query` are {@link DataValue} maps merged in
 * from the route / global state / literals (the parent id on a create, say).
 * The row's form values are the body; `extraBody` keys override them.
 */
export type FormListMutationApiRef = {
  /** API name registered in ApiMaster. */
  name: string;
  /** URL/path parameter mapping: API param name -> row field. */
  params?: Record<string, string>;
  /** Extra URL/path params resolved from the route / state / literals. */
  extraParams?: Record<string, DataValue>;
  /** Extra body fields resolved from the route / state / literals. */
  extraBody?: Record<string, DataValue>;
  /** Query-string values resolved from the route / state / literals. */
  query?: Record<string, DataValue>;
  snackbarSuccess?: SnackbarElement;
  snackbarError?: SnackbarElement | "$exception";
};

export type FormListDeleteApiRef = FormListMutationApiRef & {
  confirmBox?: Pick<ConfirmBoxElement, "title" | "description">;
};

/** What a chrome button shows: its icon and label, the icon only, or the label only. */
export type ButtonDisplay = "both" | "icon" | "label";

/**
 * Config-driven repeating form (Bin type `"formlist"`): `read` loads the rows,
 * each row renders `rowContainer` as its **own** form (fields only — the
 * component owns the Save / Remove / Add chrome), Save calls `create` for a
 * draft or `update` for a persisted row (by `idKey`), Remove confirms then
 * calls `delete` (a draft is just discarded). Every mutation refetches `read`,
 * whose refetch is also registered under `name` for `reloadDataTable`. Drafts
 * are local and render after the persisted rows, so a refetch never drops an
 * unsaved sibling. Add appears only with `create`, Remove only with `delete`,
 * and without `update` the persisted rows are read-only.
 */
export type FormListElement = {
  name: string;
  title?: string;
  /** Row key holding the record id (draft = missing). Defaults to "id". */
  idKey?: string;
  /** The per-row form: fields only, the chrome is the component's. */
  rowContainer: Container;
  apiCrud: {
    read: FormListReadApiRef;
    create?: FormListMutationApiRef;
    update?: FormListMutationApiRef;
    delete?: FormListDeleteApiRef;
  };
  /** Add button label. Defaults to "Add". */
  addLabel?: string;
  /** Add button icon. Defaults to "puls". */
  addIcon?: keyof typeof IconData;
  /** Where the Add button sits: above the rows or below them. Defaults to "bottom". */
  addPosition?: "top" | "bottom";
  /** Horizontal alignment of the Add button. Defaults to "start". */
  addAlign?: "start" | "center" | "end";
  /**
   * What the Add button shows. Defaults to "both". With "icon" the label
   * becomes the button's accessible name and tooltip.
   */
  addDisplay?: ButtonDisplay;
  /** Per-row save button label (tooltip). Defaults to "Save". */
  saveLabel?: string;
  /** Per-row remove button label. Defaults to "Remove". */
  removeLabel?: string;
  /** Per-row remove button icon. Defaults to "trash". */
  removeIcon?: keyof typeof IconData;
  /**
   * Where a row's controls (Save + Remove) sit: beside the fields at the end
   * (default) or start, or on their own line below the fields.
   */
  removePosition?: "start" | "end" | "below";
  /** What the Remove button shows. Defaults to "both" (see `addDisplay`). */
  removeDisplay?: ButtonDisplay;
  /** Shown when `read` returns no rows and no draft is open. */
  emptyText?: string;
};

/** Which caller segments an endpoint declares — the built API function takes
 * them positionally in this order (see `ApiFactory`). */
export type ApiSegments = { query: boolean; parameter: boolean; body: boolean };

/** Resolved `read` config for {@link FormListProps}. */
export type FormListReadApi = FormListReadApiRef & {
  api: APIFunction;
  /** Declared segments; omitted ⇒ `api(query? | params? | body?)` best effort. */
  segments?: ApiSegments;
  /** `:param` names in the endpoint URL; the read is held until all resolve. */
  urlParams?: string[];
};

/** Resolved mutation config for {@link FormListProps}. */
export type FormListMutationApi = FormListMutationApiRef & {
  api: APIFunction;
  segments?: ApiSegments;
};

export type FormListDeleteApi = FormListDeleteApiRef & FormListMutationApi;

export type FormListApiConfig = {
  read: FormListReadApi;
  create?: FormListMutationApi;
  update?: FormListMutationApi;
  delete?: FormListDeleteApi;
};

export type FormListProps = Omit<FormListElement, "apiCrud"> & {
  apiCrud: FormListApiConfig;
  /** Renders the row template's bins (the same builder the engine uses). */
  renderBins: (container: Container, form: any) => ReactNode;
};

/* -------------------------------------------------------------- repeater */

/** Breakpoint spans of one repeated item, in the Bin's 12-column vocabulary. */
export type RepeaterItemSpan = { sm: BoxRange; md: BoxRange; lg: BoxRange; xl: BoxRange };

/**
 * Config-driven read-only repeater (Bin type `"repeater"`): renders
 * `itemContainer` once per item of an array and puts that item in scope, so
 * the components inside bind to it through `type:"row"` {@link DataValue}s —
 * `typography`/`text` `value`, `avatar` `srcValue`/`fallbackValue`, a
 * `Navigate` button's params, and bin `condition`s (`{ key:"row", path }`,
 * `{ key:"index" }`). `{ type:"row", key:"none" }` is the item itself.
 *
 * The array comes from exactly one source: `api` (own fetch — the standard
 * {@link API} shape, `paths` drilling to the array, held until every URL
 * `:param` resolves, refetch registered under `name` for `reloadDataTable`)
 * or `items` (an array already in scope: a `state` slice, or a `row` field,
 * which nests a repeater inside another's item).
 *
 * Items lay out on a 12-column grid by `itemSpan`; `itemSurface` draws a card
 * around each and `itemNavigate` makes the whole item a link. Inputs inside
 * the template are not supported — editable rows are `formlist`'s job.
 */
export type RepeaterElement = {
  name: string;
  title?: string;
  /** Item key used as the React key. Defaults to "id"; falls back to the index. */
  idKey?: string;
  /** Own fetch. Exactly one of `api` / `items`. */
  api?: API;
  /** An array already in scope (`state` slice or `row` field). */
  items?: DataValue;
  /** The template rendered once per item. */
  itemContainer: Container;
  /** Per-breakpoint span of one item out of 12. Defaults to "12" everywhere (a list). */
  itemSpan?: Partial<RepeaterItemSpan>;
  /** Gap between items — Tailwind scale key or CSS length. Defaults to "4". */
  gap?: string | number;
  /** Card drawn around each item. Defaults to "none". */
  itemSurface?: "none" | "outlined" | "elevation";
  /** Padding inside the item surface — Tailwind scale key or CSS length. Defaults to "4" with a surface, else "0". */
  itemPadding?: string | number;
  /** Makes the whole item a link; `type:"row"` params read the item. */
  itemNavigate?: NavigateTarget;
  /** Shown when the source yields no items. */
  emptyText?: string;
};

export type RepeaterProps = Omit<RepeaterElement, "api"> & {
  /** `api` resolved against the ApiMaster. */
  api?: FormListReadApi;
  /** Renders the item template's bins with `ctx` as the bins' condition data. */
  renderBins: (container: Container, ctx: Record<string, unknown>) => ReactNode;
};

/* ---------------------------------------------------------------------------
 * File collection (`filecollection`, see the spec `spec/gummy-file-collection-spec.md`)
 * ------------------------------------------------------------------------- */

/** One node of a file collection: a folder (nesting `children`) or a file. */
export type FileCollectionNode = {
  id: string;
  collectionId: string;
  /** `null` at the collection root. Derived while walking the response when absent on the wire. */
  parentId: string | null;
  name: string;
  /** Decides structure (nesting, drop targets, duplicate, chevron). */
  type: "folder" | "file";
  /** Free text (`"markdown"`, `"invoice"`): drives the icon through `kindIcons` and is echoed on create. */
  kind?: string | null;
  /** An `IconData` key; wins over the kind → icon map. */
  icon?: string | null;
  createdAt?: number;
  updatedAt?: number;
  /** Folders only. */
  children?: FileCollectionNode[];
};

/** A top-level group of the tree. */
export type FileCollection = {
  id: string;
  name: string;
  /** Root-level nodes, nested via `children`. Sibling order is the response order. */
  directories: FileCollectionNode[];
};

/** What the selection state slice (`<name>Selected`) holds, or `null`. */
export type FileCollectionSelected = FileCollectionNode & {
  /** The collection name and every ancestor name joined by "/". */
  path: string;
};

/** One entry of the **New** menu. */
export type FileCollectionNewItem = {
  label: string;
  icon?: keyof typeof IconData;
  type: "folder" | "file";
  /** Sent as the new node's `kind`; absent ⇒ `null`. */
  kind?: string;
};

/**
 * The nine endpoint slots. `list` reads the nested collections; every
 * mutation's body is fixed by the engine (`{ name }`, `{ collectionId,
 * parentId, name, type, kind }`, `{ collectionId, parentId }`), its `params`
 * map a URL `:param` to a **node / collection field** (`id`, `collectionId`,
 * `parentId`, `name`, `kind`) and `extraParams` / `query` resolve from the
 * route / global state / literals. A mutation's response is ignored: after a
 * 2xx the tree is re-fetched. An absent slot hides the affordance it powers.
 */
export type FileCollectionApi = {
  list: FormListReadApiRef;
  createCollection?: FormListMutationApiRef;
  renameCollection?: FormListMutationApiRef;
  deleteCollection?: FormListDeleteApiRef;
  createItem?: FormListMutationApiRef;
  renameItem?: FormListMutationApiRef;
  deleteItem?: FormListDeleteApiRef;
  moveItem?: FormListMutationApiRef;
  duplicateItem?: FormListMutationApiRef;
};

/** {@link FileCollectionApi} resolved against the ApiMaster. */
export type FileCollectionApiConfig = {
  list: FormListReadApi;
  createCollection?: FormListMutationApi;
  renameCollection?: FormListMutationApi;
  deleteCollection?: FormListDeleteApi;
  createItem?: FormListMutationApi;
  renameItem?: FormListMutationApi;
  deleteItem?: FormListDeleteApi;
  moveItem?: FormListMutationApi;
  duplicateItem?: FormListMutationApi;
};

/**
 * A tree of collections → folders → files (Bin type `"filecollection"`) over
 * a `list` endpoint, with create / rename / move / duplicate / delete through
 * eight more slots (see {@link FileCollectionApi}). The selected node is
 * published as the global-state slice `selection.stateKey` (default
 * `<name>Selected`, a {@link FileCollectionSelected}); `selectNavigate` plays
 * on a **file** click with `type:"row"` params reading the node. Expand state
 * lives in memory by node id and survives the re-fetch every mutation
 * triggers; collections start open, folders closed. `readOnly` (or every
 * mutation slot absent) removes the menus, rename and drag while selection
 * and expand keep working.
 */
export type FileCollectionElement = {
  name: string;
  /** Header text; absent ⇒ no header text (the buttons still render). */
  title?: string;
  /** The header shows a collapse toggle; collapsed = a 48px icon rail. */
  collapsible?: boolean;
  readOnly?: boolean;
  /** CSS height of the item (`"480px"`). Absent ⇒ fills the grid cell. */
  height?: string;
  /** The **…** menu on rows and collection headers. `false` hides it (Remove, the header +, rename by double-click / F2 and drag stay). Defaults to true. */
  menu?: boolean;
  api: FileCollectionApi;
  /** The **New** menu. Defaults to "New folder" + "New file". */
  newItems?: FileCollectionNewItem[];
  /** `kind` → `IconData` key; a node's own `icon` wins. */
  kindIcons?: Record<string, string>;
  selection?: { stateKey: string };
  /** Played on a file click only. */
  selectNavigate?: NavigateTarget;
};

export type FileCollectionProps = Omit<FileCollectionElement, "api"> & {
  api: FileCollectionApiConfig;
};

/* ----------------------------------------------------------------------------
 * Chart (see `spec/gummy-chart-spec.md`)
 * ------------------------------------------------------------------------- */

/** The ten v1 chart types; modifiers (orientation, stacking, donut, bubble, …) live in `options`. */
export type ChartType =
  | "bar"
  | "line"
  | "area"
  | "barLine"
  | "pie"
  | "scatter"
  | "radar"
  | "gauge"
  | "heatmap"
  | "funnel";

/** One series: a value field across the rows, named and formatted. */
export type ChartSeriesDef = {
  /** Row accessor (dot path). */
  field: string;
  /** Legend / tooltip label; absent ⇒ the field name. */
  label?: string;
  /** A Radix hue name (`"blue"`); absent ⇒ the palette slot by position. */
  color?: string;
  /** `barLine` only: which y axis the series reads. */
  axis?: "left" | "right";
  /** `barLine` only: bars or a line. */
  shape?: "bar" | "line";
  /** `bar` with `options.mode: "stackGroup"`: series sharing an id stack together. */
  stack?: string;
  /** Value formatting (tooltip, direct labels, the series' axis). */
  format?: CellFormat;
};

/** One cartesian axis. */
export type ChartAxisDef = {
  title?: string;
  min?: number;
  max?: number;
  /** Tick-label format. */
  format?: CellFormat;
  showGrid?: boolean;
};

/** A gauge colour band up to `to` (absent on the last band ⇒ the gauge max). */
export type ChartGaugeBand = { to?: number; color?: string };

/** Per-type knobs; the type reads only the keys the spec lists for it. */
export type ChartOptionsDef = {
  /** bar, funnel */
  orientation?: "vertical" | "horizontal";
  /** bar */
  mode?: "grouped" | "stacked" | "stackGroup";
  /** bar, barLine — px */
  barMaxWidth?: number;
  /** line, area, barLine */
  smooth?: boolean;
  showMarkers?: boolean;
  /** area */
  stacked?: boolean;
  /** pie: `"60%"` ⇒ donut */
  innerRadius?: string;
  /** pie, funnel */
  labelPosition?: "outside" | "inside" | "none";
  /** donut: static text, or `"$total"` = the sum of the values */
  centerText?: string;
  /** scatter: a field whose value scales the marker (bubble) */
  sizeField?: string;
  /** scatter: a field drawn beside each point */
  labelField?: string;
  /** radar */
  radarShape?: "polygon" | "circle";
  radarMax?: number;
  /** gauge */
  gaugeShape?: "radial" | "linear";
  min?: number;
  max?: number;
  bands?: ChartGaugeBand[];
  /** heatmap: the hue of the sequential ramp; absent ⇒ the accent */
  hue?: string;
  showValues?: boolean;
  /** funnel */
  funnelShape?: "funnel" | "pyramid";
  sort?: "none" | "asc" | "desc";
};

/** A reference line: a fixed number, or a path into the **raw** response (before `api.paths`). */
export type ChartReferenceLine = {
  label?: string;
  value: number | { path: string[] };
  /** The axis the line crosses; default `y` (a horizontal line on a vertical bar). */
  axis?: "x" | "y";
  /** A Radix hue name; absent ⇒ the secondary text colour. */
  color?: string;
  dashed?: boolean;
};

export type ChartLegendPosition = "top" | "bottom" | "left" | "right";

/**
 * The engine `chart` element (see `spec/gummy-chart-spec.md` §4). Exactly one
 * of `api` (an endpoint, fetched like a repeater's read) / `items` (an array in
 * page data). `x.field` is the category / slice-label / indicator / numeric-x
 * (scatter) / column (heatmap) accessor; `y.field` + `value.field` are the
 * heatmap's row and cell accessors. The clicked datum reaches the page
 * through `clickState.stateKey` and `clickNavigate` (`row` params read it).
 */
export type ChartElement = {
  name: string;
  chart: ChartType;
  title?: string;
  subtitle?: string;
  footnote?: string;
  api?: API;
  items?: DataValue;
  x?: { field: string; format?: CellFormat };
  y?: { field: string };
  value?: { field: string };
  /** A field whose distinct values each become a series (one `series` entry = the value field). */
  splitBy?: string;
  series: ChartSeriesDef[];
  xAxis?: ChartAxisDef;
  yAxis?: ChartAxisDef;
  yAxisRight?: ChartAxisDef;
  options?: ChartOptionsDef;
  referenceLines?: ChartReferenceLine[];
  legend?: { show?: boolean; position?: ChartLegendPosition };
  showDataLabels?: boolean;
  /** CSS length of the plot; absent ⇒ 320px. */
  height?: string;
  emptyText?: string;
  clickNavigate?: NavigateTarget;
  clickState?: { stateKey: string };
};

/** `Chart` component props: the element with its `api` resolved by the builder. */
export type ChartProps = Omit<ChartElement, "api"> & {
  api?: FormListReadApi;
};

export type PopoverProps = BaseComponentProps<
  "div",
  {
    children: ReactNode;
    content: ReactNode;
    trigger?: "click" | "hover";
    placement?:
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "top-start"
    | "top-end"
    | "bottom-start"
    | "bottom-end";
    offset?: number;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    contentClassName?: string;
    disabled?: boolean;
  }
>;

export type IconProps = BaseComponentProps<
  "span",
  {
    icon: LucideIcon;
    size?: number | string;
    color?: string;
    strokeWidth?: number;
    className?: string;
  } & Omit<LucideProps, "size" | "color" | "strokeWidth">
>;

export type DataValue = {
  /**
   * `row` is only meaningful inside a {@link NavigateTarget} on a data table's
   * `rowNavigate`: it reads `key` off the clicked row. `filter` is only
   * meaningful in a data table's `api.params` / `api.query` / `api.body`: it
   * reads the field named `key` of the table's applied `filterContainer` form.
   */
  type: "variable" | "state" | "observe" | "value" | "selectedRow" | "url" | "row" | "filter" | "formula";
  key: "none" | string;
  /**
   * The literal for `type:"value"`. For `type:"filter"` it is the fallback sent
   * while that filter is blank (a URL `:param` needs one, e.g. `"all"`).
   */
  value?: any;
  /**
   * Lodash path into the source object. For `type:"state"` it drills into the
   * named global-state slice (e.g. "name", "address.city"); for `type:"value"`
   * it is ignored. Optional — omit to take the whole slice.
   */
  path?: string;
  /**
   * Only meaningful for `type:"url"`: read the value from the route path param
   * (default) or from the query string. `key` is the param/query name.
   */
  source?: "param" | "query";
  /**
   * `type:"formula"` only: a saved formula by name (`project.formulas`), or an
   * inline one in `expr` (with its own `format` / policies). Resolved by the
   * display bindings, a form field's `value` and a computed column — not by
   * request mapping (see `spec/gummy-logic-spec.md`).
   */
  formula?: string;
  expr?: Expr;
  format?: CellFormat;
  onEmpty?: FormulaBlankPolicy;
  onDivideByZero?: FormulaBlankPolicy;
};

export type API = {
  name: string;
  paths?: string[];
  query?: Record<string, DataValue>;
  params?: Record<string, DataValue>;
  body?: Record<string, DataValue>;
};

/**
 * Server-side pagination config for a DataTable. When present on the table's
 * `api`, the table switches from client-side paging (fetch-all + slice in
 * memory) to manual/server paging: it sends offset/limit (and optionally a
 * search term) on every page change and reads the total row count out of the
 * response. Absent ⇒ today's client-side behavior is unchanged.
 */
export type DataTablePagination = {
  /**
   * Where offset/limit/search go. Omitted ⇒ inferred from the endpoint
   * declaration: it declares a `body` model ⇒ `"body"`, else `"query"` (so a
   * GET endpoint pages through its query string with no extra config).
   */
  placement?: "query" | "body";
  /** Key that receives `pageIndex * pageSize`. */
  offsetKey: string;
  /** Key that receives `pageSize`. */
  limitKey: string;
  /** Key for the global search term. Present ⇒ server-side search enabled. */
  searchKey?: string;
  /** Path into the response for the total (unpaged) row count, e.g. ["total"]. */
  totalPath: string[];
  /** Initial page size. Defaults to 10. */
  defaultPageSize?: number;
  /** Page-size dropdown options. Defaults to [5, 10, 20, 30, 40, 50]. */
  pageSizeOptions?: number[];
};

/**
 * Server-side sorting for a DataTable. Present ⇒ a header's sort icon sends the
 * field and direction to the API (and refetches, back on page 1) instead of
 * sorting the fetched rows in memory. One column at a time. The field is the
 * column's `sortField`, else its `accessor`. Works with or without
 * `pagination`.
 */
export type DataTableSort = {
  /** Where the two keys go. Omitted ⇒ inferred like {@link DataTablePagination.placement}. */
  placement?: "query" | "body";
  /** Key that receives the field name. */
  sortKey: string;
  /** Key that receives the direction. */
  orderKey: string;
  /** What to send for each direction. Defaults to `"asc"` / `"desc"`. */
  orderValues?: { asc: string | number; desc: string | number };
  /** The sort the table opens with (`field` as sent to the API). */
  default?: { field: string; order: "asc" | "desc" };
};

/** {@link API} plus the optional server-pagination / server-sort blocks used by DataTable. */
export type DataTableApi = API & { pagination?: DataTablePagination; sort?: DataTableSort };

/**
 * Declarative API loader for a {@link Container}. When set, the container fires
 * `api` (the standard {@link API} config — params/query/body can be sourced from
 * the URL via `type:"url"` {@link DataValue}s) on mount, drills `api.paths` into
 * the response, and writes the result into the global state slice named `key`
 * (one zustand store per key). It refetches when the resolved URL params change
 * and clears the slice on unmount. Input elements can then read-bind their
 * initial value from that slice via `value:{ type:"state", key, path }`.
 */
export type ContainerLoad = {
  /** Unique global-state key the (path-drilled) response is stored under. */
  key: string;
  /** Standard API config used to fetch the data. */
  api: API;
};

/**
 * A page-level data load (see {@link PageElement.loads}): fetched once per
 * page, stored in the global-state slice `key`, read anywhere on the page
 * through `{ type: "state", key, path }` DataValues and `source: "state"`
 * condition refs. Its `api.params` / `query` / `body` may read other slices,
 * which chains loads: a load is held until every `state` value it reads and
 * every URL `:param` resolves, and refetches when they change.
 */
export type PageLoad = ContainerLoad & {
  /**
   * How the page waits for this load: `cycle` covers the page with the
   * loading overlay (a spinner) while the request is in flight; `skeleton`
   * shows nothing page-wide and every component bound to the slice draws a
   * placeholder in its own shape until the data lands (first load or held —
   * never over data it already has, a refetch keeps the previous result);
   * `none` is silent (read `$status`). Default `none`, or `cycle` when the
   * deprecated `blocking` is set. Resolved by `loadingMode`.
   */
  loading?: LoadingMode;
  /** @deprecated Use `loading: "cycle"`. Honoured when `loading` is absent. */
  blocking?: boolean;
  /**
   * Snackbar shown when the load fails. A `cycle` load without one shows a
   * generic message; the other modes stay silent (read `$status` instead).
   */
  errorMessage?: string;
};

/** See {@link PageLoad.loading}. */
export type LoadingMode = "cycle" | "skeleton" | "none";

export type Term = {
  type: "observe" | "value";
  name?: string;
  value?: unknown;
};

export type Operator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "and"
  | "or";

// export type ConditionTerm = {
//   left: Term;
//   operator: Operator;
//   right: Term;
// };

export type CheckboxElement = {
  name: string;
  dataType: string;
  isRequired: boolean;
  errorMessage: string;
  /** Read-only initial value bound from a global-state slice. */
  value?: DataValue;
} & CheckboxProps & FieldLogic;

/** Where a switch's label sits relative to the thumb. */
export type SwitchLabelPosition = "start" | "end";

export type SwitchProps = BaseComponentProps<
  typeof RadixSwitch,
  {
    label?: string;
    /** Label before (`start`) or after (`end`, default) the switch. */
    labelPosition?: SwitchLabelPosition;
    helperText?: string;
    error?: boolean;
    errorMessage?: string;
    size?: "1" | "2" | "3";
    variant?: "classic" | "surface" | "soft";
    /** Form value (boolean) — wins over `checked` when it is a boolean. */
    value?: boolean;
    /** Initial form value, read by `withForm`'s Controller (the builder maps `defaultChecked` here). */
    defaultValue?: boolean;
    /** Publishes the value on the observe Subject keyed by `name` (for `enabledWhen`). */
    canObserve?: boolean;
    /** Enabled while the condition holds — `left` is `{ key, type: "observe" }` naming a `canObserve` field. */
    enabledWhen?: CondExpression;
    onChange?: (value: boolean) => void;
  }
>;

/**
 * An on / off control after MUI's Switch: one boolean field (`dataType`
 * "boolean"; `isRequired` means it must be **on**). `defaultChecked` seeds the
 * form value, `disabled` locks it, `enabledWhen` enables it while another
 * `canObserve` switch / checkbox holds the given value.
 */
export type SwitchElement = {
  name: string;
  dataType: string;
  isRequired: boolean;
  errorMessage: string;
  defaultChecked?: boolean;
  /** Read-only initial value bound from a global-state slice. */
  value?: DataValue;
} & Omit<SwitchProps, "value" | "defaultChecked" | "enabledWhen"> & FieldLogic;

export type APIDelete = {
  name: string;
  params?: Record<string, string>;
  confirmBox?: ConfirmBoxElement;
  isReload?: boolean;
  snackbarSuccess?: SnackbarElement;
  snackbarError?: SnackbarElement | "$exception";
};

export type AutocompleteElement = {
  name: string;
  dataType: string;
  label: string;
  subtitle?: string;
  placeholder?: string;
  helperText?: string;
  canObserve: boolean;
  observeTo: string;
  /** Enabled while it holds: the observe form (`{ key, type: "observe" }`) or a `Cond` / `{ rule }`. */
  enabledWhen?: AnyCondition;
  valueMode?: FieldValueMode;
  isRequired: boolean;
  isSingleLoad: boolean;
  errorMessage: string;
  api?: API & {
    // observeParam: string;
    // canSearch: boolean;
  };
  keys: {
    id: any;
    search: any;
    display: any;
  };
  defaultData: Record<string, unknown>;
  options: any[];
  /**
   * The options from a DataValue instead of `options` / `api` — typically a
   * page load's slice (`{ type: "state", key: "lookups" }`), so several
   * fields share one fetched list. Read with the same `keys`; re-read when
   * the slice changes.
   */
  optionsValue?: DataValue;
  orientation?: "horizontal" | "vertical";
  maxHeight?: number | string;
  inputIcon?: keyof typeof IconData | LucideIcon;
  itemIcon?: keyof typeof IconData | LucideIcon | ((item: any) => keyof typeof IconData | LucideIcon);
  itemSubtitle?: keyof any | ((item: any) => string);
  itemAvatar?: keyof any | ((item: any) => string | { src: string; alt?: string; fallback?: string });
  /** `multiAutocomplete` only. */
  maxSelections?: number;
  /** `multiAutocomplete` only. */
  showSelectedCount?: boolean;
};

export type ColumnDef = {
  accessor: string;
  header: string;
  /**
   * A computed column: a `type:"formula"` value evaluated per row (`row`
   * refs read the row). The cell shows the formatted result; sort, filter
   * and search use the raw one.
   */
  value?: DataValue;
  enableSorting: boolean;
  /** Field name sent to the API by `api.sort` when it differs from `accessor`. */
  sortField?: string;
  enableColumnFilter: boolean;
  isEditable?: boolean;
  align?: "start" | "center" | "end";
  /** `{ type: "date", pattern }` the old way — `format` wins when both are set. */
  useDateFormat?: string;
  /**
   * How the cell shows its value: number / currency / percent / date /
   * datetime / boolean / text, resolved by `formatCell` with the app's locale
   * (`<LocaleProvider>`, default the browser's). Numeric formats align the
   * column to the end unless `align` says otherwise. Sorting, filtering and
   * the column filter keep the raw value; the search box matches raw and
   * formatted text; `{{value}}` in an `html` template is the formatted text.
   */
  format?: CellFormat;
  /**
   * Starting width in px. Declaring one on any column puts the table in
   * exact-pixel mode from the first paint (spare width goes to a filler cell);
   * otherwise columns share the container until the first resize.
   */
  size?: number;
  /** Narrowest the column can be dragged (px). Default 60. */
  minSize?: number;
  /** Widest the column can be dragged (px). Default: no limit. */
  maxSize?: number;
  /** `false` locks this column's width (no resize handle). Default true. */
  enableResizing?: boolean;
  /**
   * Keep the column in view while the table scrolls horizontally. The initial
   * state only — the header's pin toggle can pin/unpin (left) for the session.
   * The ACTION column is always pinned left.
   */
  pin?: "left" | "right";
  /**
   * Render the cell from an HTML template instead of the plain value.
   * `{{path}}` placeholders read the row (lodash `get` paths: `{{name}}`,
   * `{{region.name}}`), `{{value}}` is this column's own value after
   * `useDateFormat`; every interpolated value is HTML-escaped and the result
   * is sanitised (no scripts, handlers, `<style>` or form controls). Style with
   * the `style` attribute + Radix vars, or the `dt-strong` / `dt-muted` /
   * `dt-badge` / `dt-link` helper classes. Same-origin `<a href="/…">` links
   * navigate in-app. Sorting, filtering and search keep using the accessor
   * value; the search highlight skips HTML cells.
   */
  html?: string;
  /** Lines this column's cells may show before the clamp (`0` = none); overrides {@link DataTableElement.cellLines}. */
  lines?: number;
  /**
   * The row's label column: cells render as `<th scope="row">` in the header
   * colours and the column is pinned left (after the action column). One per
   * table.
   */
  rowHeader?: boolean;
  /** Consecutive rows with the same value share one cell (`rowSpan`). Blank values never merge. */
  mergeRows?: boolean;
  /**
   * Adjacent columns that both set this and hold the same value in a row
   * share one cell (`colSpan`). A cell already merged down stays as is.
   */
  mergeColumns?: boolean;
  /**
   * Group header: adjacent columns with the same label sit under one header
   * cell spanning them, in a header row above the column headers.
   */
  group?: string;
  /** Starts hidden; the Columns menu can show it (see {@link DataTableElement.canChooseColumns}). */
  hide?: boolean;
  /** Always shown: the Columns menu can't hide it. */
  lockVisible?: boolean;
  /**
   * Conditional look of this column's cells: the **first** rule whose `when`
   * holds gives the tone, every matching rule adds its weight / italic /
   * strike / class. `when` sees `{ value, row, index }` — `{ key: "value" }`,
   * `{ key: "row", path: "stock" }`. Layers over the table's `rowStyles`.
   */
  cellStyles?: DataTableStyleRule[];
  /**
   * How a group row and the total row summarise this column (see
   * {@link DataTableElement.grouping}); formatted with the column's `format`.
   */
  aggregate?: DataTableAggregate;
};

/**
 * A conditional style (`ColumnDef.cellStyles`, `DataTableElement.rowStyles`).
 * `tone` is a Radix colour name: text in its step 11, and with `fill` a
 * step-3 background — so a rule reads right in light, dark and glass.
 * Pinned, row-header and merged cells keep their surface and take the text
 * tone only.
 */
export type DataTableStyleRule = {
  when: AnyCondition;
  tone?: ThemeProps["accentColor"];
  fill?: boolean;
  weight?: "bold";
  italic?: boolean;
  strike?: boolean;
  /** Consumer CSS classes, added when the rule matches. */
  class?: string;
};

/** Group-row / total-row summaries of a column. */
export type DataTableAggregate = "sum" | "avg" | "min" | "max" | "count";

/**
 * Row selection (`DataTableElement.selection`): a checkbox column published
 * as the global-state slice `stateKey` = `{ ids, rows, count }`, so a bulk
 * button binds `{ type: "state", key, path: "ids" }`.
 */
export type DataTableSelection = {
  mode: "single" | "multi";
  /** The row's id field. Default `_id`, else `id`. */
  idKey?: string;
  /** The slice the selection is published as. Default `<name>Selected`. */
  stateKey?: string;
  /** Multi only: the header checkbox selects the page, every filtered row, or isn't there. Default `page`. */
  headerCheckbox?: "page" | "all" | "none";
  /** Keep picks when the page changes (server paging). Default true. */
  keepAcrossPages?: boolean;
};

/**
 * Client-side row grouping (`DataTableElement.grouping`): groups by `by`
 * (outer → inner), group rows summarise columns that set `aggregate`. Ignored
 * with a warning under `api.pagination` / `api.sort`.
 */
export type DataTableGrouping = {
  /** Accessors to group by, outer first. Empty = no groups (a total row alone). */
  by: string[];
  /** Depth expanded at first paint: `0` = all collapsed, `"all"`. Default 0. */
  expanded?: number | "all";
  /** A "Group by" list in the Columns menu. Default true. */
  userCanGroup?: boolean;
  /** "(12)" after the group label. Default true. */
  showCount?: boolean;
  /** A row summarising every filtered row. Default `none`. */
  totalRow?: "none" | "top" | "bottom";
};

/** What the Export button writes (see {@link DataTableElement.canExport}). */
export type DataTableExportOptions = {
  /** Default `<name>.csv`; `{{date}}` becomes today's date (YYYY-MM-DD). */
  fileName?: string;
  /** The visible columns in their current order (default), or every column. */
  columns?: "visible" | "all";
  /** The text on screen (default) or the raw values. */
  values?: "formatted" | "raw";
  /** Every row after search / filters / sort (default), or the page shown. Server mode is always the page. */
  rows?: "all" | "page";
};

/** Where a table's column layout (order, visibility, widths, pins, grouping) is remembered. */
export type DataTableColumnState = {
  /** `local` (default) survives a reload, `session` the tab, `none` forgets on unmount. */
  persist?: "local" | "session" | "none";
  /** Storage key. Default `gummy.table.<page key>.<name>`. */
  key?: string;
};

/** Column ids (accessors) pinned to each side, in order (see {@link ColumnDef.pin}). */
export type DataTablePinnedColumns = { left: string[]; right: string[] };

/**
 * The table's Add button (see {@link DataTableElement.canAdd}). Defaults:
 * "Add", the `puls` icon, `contained`. An empty `label` renders icon-only.
 */
export type DataTableAddButton = {
  label?: string;
  icon?: keyof typeof IconData;
  variant?: ButtonVariant;
};

/**
 * The table's Filter button (see {@link DataTableElement.filterContainer}).
 * Defaults: "Filter", the `filter` icon, `outlined`. An empty `label` renders
 * icon-only. It carries a badge counting the filters that differ from their
 * default.
 */
export type DataTableFilterButton = {
  label?: string;
  icon?: keyof typeof IconData;
  variant?: ButtonVariant;
};

/** `popover` — behind the header's Filter button; `inline` — a bar above the table. */
export type DataTableFilterDisplay = "popover" | "inline";

/** Header spacing steps (Tailwind `gap-*`), see {@link DataTableElement.headerGap}. */
export type DataTableHeaderGap = "0" | "1" | "2" | "3" | "4" | "6" | "8";

/** Row-action button steps (Radix IconButton sizes), see {@link DataTableElement.actionSize}. */
export type DataTableActionSize = "1" | "2" | "3";

export type DataTableElement = {
  name: string;
  title: string;
  columns: ColumnDef[];
  /** The read endpoint. Omit it when the rows come from {@link DataTableElement.items}. */
  api?: DataTableApi;
  /**
   * Rows from a DataValue instead of `api` — typically a page load's slice
   * (`{ type: "state", key: "regionCountries" }`), re-read when it changes.
   * In-memory only: client paging, sorting and search work; `api.pagination`,
   * `api.sort` and `filterContainer` need an API and are ignored (warned).
   * Edit / delete still use their own API refs; reload the rows through the
   * load's key (`reloadDataTable: "<load key>"`).
   */
  items?: DataValue;
  apiDeleteInfo?: APIDelete;
  modalContainer?: Container;
  modalMaxWidth?: string;
  modalMinWidth?: string;
  modalMaxHeight?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  /**
   * The "Search all columns" box in the header (default true). In server
   * paging it also needs `api.pagination.searchKey`; `false` hides it either
   * way.
   */
  canSearch?: boolean;
  /**
   * Spacing between the header's title, Add button and search box, as a
   * Tailwind gap step (`"0" | "1" | "2" | "3" | "4" | "6" | "8"`). Default "2".
   */
  headerGap?: DataTableHeaderGap;
  /**
   * An Add button in the table header. It clears `contextData[name]` and
   * opens the same `modalContainer` as Edit; the form inside tells adding
   * from editing with a `condition` on `<name>._id` (undefined ⇒ adding).
   */
  canAdd?: boolean;
  addButton?: DataTableAddButton;
  /**
   * Server-side custom filters: a container of ordinary input bins (fields
   * only) the table renders as its filter form, with its own **Apply** and
   * **Clear**. Map the fields into the request with `{ type: "filter", key:
   * "<field name>" }` {@link DataValue}s in `api.params` / `api.query` /
   * `api.body`. Apply validates the form, stores the values, returns to page 1
   * and calls the API; blank filters are left out of the request (a DataValue's
   * `value` is the fallback — needed when the filter feeds a URL `:param`, which
   * otherwise holds the call). Works with or without `api.pagination`.
   */
  filterContainer?: Container;
  /**
   * The filters the table opens with (field name → value): the first fetch is
   * already filtered by them, and **Clear** returns to them.
   */
  filterDefaults?: Record<string, unknown>;
  filterButton?: DataTableFilterButton;
  /** Default `"popover"`. */
  filterDisplay?: DataTableFilterDisplay;
  /** Clicking a row navigates; `{ type: "row", key }` params read the clicked row. */
  rowNavigate?: NavigateTarget;
  /**
   * Drag a header's right edge to resize its column (double-click resets;
   * the handle is keyboard-focusable: ← → resize, Enter resets). Widths last
   * for the session. Default true; lock single columns with `enableResizing`.
   */
  canResizeColumns?: boolean;
  /**
   * Line clamp for plain cells (see {@link DataTableElement.cellLines}):
   * default 2, `0` = none. A column's `meta.lines` overrides it; a cut cell
   * shows its full text in a tooltip.
   */
  cellLines?: number;
  /**
   * Size of the row-action buttons (Edit / Delete, and the editable table's
   * Save / Cancel): Radix IconButton steps `"1"` (24px, 12px glyph), `"2"`
   * (32px, 14px — the default) or `"3"` (40px, 18px). The ACTION column
   * widens to fit.
   */
  actionSize?: DataTableActionSize;
  /**
   * A **Columns** button in the header: show / hide columns (`hide`,
   * `lockVisible`), drag them into another order, group by them
   * (`grouping.userCanGroup`), Reset to the config. Default true.
   */
  canChooseColumns?: boolean;
  /** The Columns button. Defaults: "Columns", the `columns` icon, `outlined`. */
  columnsButton?: DataTableToolbarButton;
  /** Where the column layout is remembered (default: localStorage). */
  columnState?: DataTableColumnState;
  /** Row selection, published as a state slice. */
  selection?: DataTableSelection;
  /** Conditional look of whole rows (`when` sees `{ row, index }`); `ColumnDef.cellStyles` layer on top. */
  rowStyles?: DataTableStyleRule[];
  /** Client-side row grouping + aggregation. */
  grouping?: DataTableGrouping;
  /** An **Export** button writing the table as CSV. Default false. */
  canExport?: boolean;
  /** The Export button. Defaults: "Export", the `download` icon, `outlined`. */
  exportButton?: DataTableToolbarButton;
  exportOptions?: DataTableExportOptions;
  /**
   * `pages` (default) — a pager; `scroll` — every row in the scroller, no
   * pager (client-side only; ignored with a warning under `api.pagination`).
   * Either way, more than ~60 rendered rows are virtualised (unless cells merge).
   */
  paging?: "pages" | "scroll";
  // Editing: {}
};

/** A header toolbar button (Columns, Export). An empty `label` renders icon-only. */
export type DataTableToolbarButton = {
  label?: string;
  icon?: keyof typeof IconData;
  variant?: ButtonVariant;
};

// export type TextFieldElement = {};

export type TextFieldElement = {
  name: string;
  dataType: string;
  isRequired: boolean;
  errorMessage: string;
  /** Read-only initial value bound from a global-state slice. */
  value?: DataValue;
} & TextFieldProps & FieldLogic;

export type TextareaElement = {
  name: string;
  dataType: string;
  isRequired: boolean;
  errorMessage: string;
  /** Read-only initial value bound from a global-state slice. */
  value?: DataValue;
} & TextareaProps & FieldLogic;

export type HiddenElement = {
  name: string;
  dataType: string;
};

export type DatePickerElement = {
  name: string;
  dataType: string;
  isRequired?: boolean;
  errorMessage?: string;
  /** Read-only initial value bound from a global-state slice. */
  value?: DataValue;
} & DatePickerProps & FieldLogic;

export type DateRange = {
  start: string | null;
  end: string | null;
};

export type DateRangePickerProps = BaseComponentProps<
  "button",
  {
    label?: string;
    placeholder?: string;
    helperText?: string;
    isRequired?: boolean;
    error?: boolean;
    errorMessage?: string;
    variant?: "classic" | "surface" | "soft";
    size?: "1" | "2" | "3";
    radius?: "none" | "small" | "medium" | "large" | "full";
    isFullWidth?: boolean;
    width?: number;
    isFixedHeight?: boolean;
    /**
     * The currently selected date range value.
     */
    value?: DateRange | null;
    defaultValue?: DateRange | null;
    /**
     * Display format used inside the trigger. Defaults to "yyyy-MM-dd".
     */
    displayFormat?: "yyyy-MM-dd" | "MM/dd/yyyy" | "dd/MM/yyyy";
    /**
     * Earliest selectable date (inclusive) as an ISO date string (YYYY-MM-DD).
     */
    minDate?: string;
    /**
     * Latest selectable date (inclusive) as an ISO date string (YYYY-MM-DD).
     */
    maxDate?: string;
    /**
     * Whether the picker should allow clearing the selected value. Defaults to true.
     */
    clearable?: boolean;
    /**
     * Disable the input.
     */
    disabled?: boolean;
    onChange?: (value: DateRange | null) => void;
    onBlur?: () => void;
  }
>;

export type DateRangePickerElement = {
  name: string;
  dataType: string;
  isRequired?: boolean;
  errorMessage?: string;
} & DateRangePickerProps & FieldLogic;

export type DateTimePickerProps = BaseComponentProps<
  "button",
  {
    label?: string;
    placeholder?: string;
    helperText?: string;
    error?: boolean;
    errorMessage?: string;
    variant?: "classic" | "surface" | "soft";
    size?: "1" | "2" | "3";
    radius?: "none" | "small" | "medium" | "large" | "full";
    isFullWidth?: boolean;
    width?: number;
    isFixedHeight?: boolean;
    /**
     * The currently selected datetime value as an ISO datetime string (YYYY-MM-DDTHH:mm)
     * or empty string when no datetime is selected.
     */
    value?: string;
    /**
     * Display format used inside the trigger input. Defaults to "DD/MM/YYYY HH:mm".
     * Uses dayjs format tokens.
     */
    displayFormat?: string;
    /**
     * Earliest selectable datetime (inclusive) as an ISO datetime string.
     */
    minDateTime?: string;
    /**
     * Latest selectable datetime (inclusive) as an ISO datetime string.
     */
    maxDateTime?: string;
    /**
     * First day of the week (0 = Sunday, 1 = Monday). Defaults to 0.
     */
    weekStartsOn?: 0 | 1;
    /**
     * Whether the picker should allow clearing the selected value. Defaults to true.
     */
    clearable?: boolean;
    /**
     * Disable the input.
     */
    disabled?: boolean;
    /**
     * Time step in minutes for the time picker. Defaults to 1.
     */
    minuteStep?: number;
    onValueChange?: (value: string) => void;
    onBlur?: () => void;
  }
>;

export type DateTimePickerElement = {
  name: string;
  dataType: string;
  isRequired?: boolean;
  errorMessage?: string;
} & DateTimePickerProps & FieldLogic;

export type TextElement = BaseComponentProps<
  typeof RadixText,
  {
    text?: ReactNode;
    isLabel?: boolean;
    /** Bound text (`row` / `state` / `url` / `value`); `text` is the fallback when it resolves empty. */
    value?: DataValue;
  }
>;

export type TypographyElement = BaseComponentProps<
  "div",
  {
    text?: ReactNode;
    /** Bound text (`row` / `state` / `url` / `value`); `text` is the fallback when it resolves empty. */
    value?: DataValue;
    variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body1' | 'body2' | 'subtitle1' | 'subtitle2' | 'caption' | 'overline' | 'button' | 'display1' | 'display2';
    component?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div' | 'label';
    size?: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
    weight?: 'light' | 'regular' | 'medium' | 'bold';
    color?: 'gray' | 'gold' | 'bronze' | 'brown' | 'yellow' | 'amber' | 'orange' | 'tomato' | 'red' | 'ruby' | 'crimson' | 'pink' | 'plum' | 'purple' | 'violet' | 'iris' | 'indigo' | 'blue' | 'cyan' | 'teal' | 'jade' | 'green' | 'grass' | 'lime' | 'mint' | 'sky';
    align?: 'left' | 'center' | 'right' | 'justify';
    transform?: 'none' | 'capitalize' | 'uppercase' | 'lowercase';
    decoration?: 'none' | 'underline' | 'line-through';
    truncate?: boolean;
    noWrap?: boolean;
    href?: string;
    target?: '_blank' | '_self' | '_parent' | '_top';
    rel?: string;
    tooltip?: string;
    tooltipSide?: 'top' | 'right' | 'bottom' | 'left';
    tooltipDelay?: number;
  }
>;

export type AvatarProps = BaseComponentProps<
  "div",
  {
    src?: string;
    alt?: string;
    size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
    fallback?: ReactNode;
    className?: string;
    loading?: "lazy" | "eager";
    onError?: () => void;
  }
>;

export type AvatarElement = {
  name?: string;
  /** Bound image URL — a string, or an object with a `src`/`url` field; `src` is the fallback. */
  srcValue?: DataValue;
  /** Bound fallback text (shown as initials when there is no image); `fallback` is the fallback. */
  fallbackValue?: DataValue;
} & AvatarProps;

export type UploadApiConfig = {
  /** URL to POST the file to (e.g. "/upload/single"). */
  uploadUrl: string;
  /** URL to DELETE the file from, with :filename placeholder (e.g. "/upload/:filename"). */
  deleteUrl?: string;
  /** FormData field name expected by the server. Defaults to "image" for UploadImage, "file" for UploadFile. */
  fieldName?: string;
  /** Dot-path to extract the file URL from the upload response (e.g. "data.url"). */
  responsePath?: string;
};

export type UploadImageProps = BaseComponentProps<
  "div",
  {
    label?: string;
    helperText?: string;
    isRequired?: boolean;
    error?: boolean;
    errorMessage?: string;
    /** Accepted mime types passed to the file input. Defaults to "image/*". */
    accept?: string;
    /** Maximum file size in megabytes. */
    maxSizeMB?: number;
    /** Shape of the image preview. Defaults to "square". */
    shape?: "square" | "circle";
    /** Height of the drop zone / preview in pixels. Defaults to 160. */
    previewHeight?: number;
    isFullWidth?: boolean;
    width?: number;
    disabled?: boolean;
    /**
     * Format of the value stored in the form (and sent to the API):
     * "dataUrl" (default), "base64" (raw base64 string),
     * "bytes" (raw byte number array), or "api" (upload via API, store URL).
     */
    valueFormat?: UploadValueFormat;
    /** API upload configuration. Required when valueFormat is "api". */
    uploadApi?: UploadApiConfig;
    /**
     * The uploaded image content. A data URL / base64 / remote URL string,
     * or a byte array when valueFormat is "bytes". Empty when nothing is
     * uploaded.
     */
    value?: UploadFileContent;
    onValueChange?: (value: UploadFileContent) => void;
    onBlur?: () => void;
  }
>;

export type UploadImageElement = {
  name: string;
  dataType: string;
  isRequired?: boolean;
  errorMessage?: string;
} & UploadImageProps & FieldLogic;

export type UploadedFile = {
  name: string;
  size: number;
  type: string;
  /**
   * File content. Format depends on the component's valueFormat:
   * data URL string, raw base64 string, or raw byte number array.
   */
  data: UploadFileContent;
};

export type UploadFileProps = BaseComponentProps<
  "div",
  {
    label?: string;
    helperText?: string;
    isRequired?: boolean;
    error?: boolean;
    errorMessage?: string;
    /**
     * Accepted file types: a comma list or an array mixing presets ("image",
     * "pdf", "document", "spreadsheet", "presentation", "text", "archive",
     * "audio", "video") with raw tokens (".dwg", "image/png"). Filters the
     * file dialog and is enforced on pick / drop; files that don't match are
     * skipped and reported.
     */
    accept?: AcceptConfig;
    /**
     * Allow selecting multiple files. Defaults to false: a single file, which
     * replaces the dropzone once picked (Replace / Remove on the file itself).
     * The value is an array in both modes.
     */
    multiple?: boolean;
    /** Maximum number of files when multiple is enabled. */
    maxFiles?: number;
    /** Maximum file size in megabytes (per file). */
    maxSizeMB?: number;
    /**
     * Image thumbnails, file-type icons and a click-to-open viewer (images,
     * PDF, video, audio, text). Defaults to true; false lists plain rows.
     */
    preview?: boolean;
    /** "list" (default): rows with a thumbnail. "grid": square cards. */
    previewLayout?: "list" | "grid";
    isFullWidth?: boolean;
    width?: number;
    disabled?: boolean;
    /**
     * Format of each file's `data` field stored in the form (and sent to
     * the API): "dataUrl" (default), "base64", "bytes", or "api" (upload
     * via API, store URL).
     */
    valueFormat?: UploadValueFormat;
    /** API upload configuration. Required when valueFormat is "api". */
    uploadApi?: UploadApiConfig;
    /** The uploaded files. */
    value?: UploadedFile[];
    onValueChange?: (value: UploadedFile[]) => void;
    onBlur?: () => void;
  }
>;

export type UploadFileElement = {
  name: string;
  dataType: string;
  isRequired?: boolean;
  errorMessage?: string;
} & UploadFileProps & FieldLogic;

/**
 * Declarative radio config. Like AutocompleteElement: options can be static
 * (`options`) or API-driven (`api` + `keys`), with optional observe/enabledWhen
 * reactivity. Rendered by core/radio.ts.
 */
export type RadioElement = {
  name: string;
  dataType: string;
  label?: string;
  helperText?: string;
  isRequired: boolean;
  errorMessage?: string;
  size?: "1" | "2" | "3";
  variant?: "classic" | "surface" | "soft";
  orientation?: "horizontal" | "vertical";
  defaultValue?: string;
  /** Read-only initial value bound from a global-state slice. */
  value?: DataValue;
  /** Static options. Used when no `api` is provided. */
  options?: Array<{
    value: string;
    label: string;
    disabled?: boolean;
    helperText?: string;
  }>;
  /** API-driven options. When present, fetched rows are mapped via `keys`. */
  api?: API;
  /** Maps a fetched object onto an option. */
  keys?: { value: string; label: string };
  /** Fetch options once; don't refetch on observe changes. */
  isSingleLoad?: boolean;
  /** Publish this field's value so other fields can observe it. */
  canObserve?: boolean;
  /** Observe another field's value to feed this radio's API params. */
  observeTo?: string;
  /** Conditionally disable the group based on another field. */
  enabledWhen?: AnyCondition;
  valueMode?: FieldValueMode;
};

export type TElement =
  | HiddenElement
  | RadioElement
  | AutocompleteElement
  | TextFieldElement
  | TextareaElement
  | CheckboxElement
  | SwitchElement
  | DataTableElement
  | DataTableEditableElement
  | FormListElement
  | RepeaterElement
  | FileCollectionElement
  | ChartElement
  | DatePickerElement
  | DateRangePickerElement
  | DateTimePickerElement
  | TextElement
  | TypographyElement
  | AvatarElement
  | UploadImageElement
  | UploadFileElement
  | ModalElement
  | ButtonElement
  | TabElement
  | PaperElement
  | CardElement
  | HtmlContentElement
  | CustomComponentElement
  | ApprovalLineElement
  | SwitchProfileElement
  | ReplaceProfileElement
  | WorkflowEditorElement
  | PopoverElement
  | DrawerElement
  | DividerElement;

/**
 * Paths into one profile record — each a lodash path or a list of fallback
 * paths (see {@link ApprovalKeyPath}). The defaults fit a common
 * user-profile shape (`personId`, `userId`, `firstNameEn` + `lastNameEN`,
 * `jobTitle`, `companyModel.name`, `businessUnitModel.name`).
 */
export type ProfileKeys = {
  personId?: ApprovalKeyPath;
  /** Unique per profile — one person holds several. Falls back to `personId`. */
  userId?: ApprovalKeyPath;
  name?: ApprovalKeyPath;
  /** A `{{path}}` template for the display name; wins over `name` when it renders non-blank. */
  nameTemplate?: string;
  jobTitle?: ApprovalKeyPath;
  company?: ApprovalKeyPath;
  department?: ApprovalKeyPath;
  email?: ApprovalKeyPath;
  /** An image URL on the record. */
  avatar?: ApprovalKeyPath;
  /**
   * The primary-assignment flag (default `isPrimaryAssignment`): `true`, `1`,
   * `"1"`, `"Y"` or `"true"` mark the profile picked when nobody chose one —
   * the replaced person's starting profile, the fallback of a restore.
   */
  primary?: ApprovalKeyPath;
};

/** What the two profile elements share (see the grilled design). */
export type ProfileSessionElement = {
  name?: string;
  /**
   * The global-state slice holding the active profile (default `"profile"`) —
   * bind anything to it with `{ type: "state", key: "profile", path }`. While
   * impersonating, the admin's own profile sits in `<stateKey>Original`.
   */
  stateKey?: string;
  /** The logged-in profile (a page / global load slice, say): seeds the active slice while it is empty. */
  initial?: DataValue;
  keys?: ProfileKeys;
  /** Remember the choice — a switch in localStorage, a replacement in sessionStorage. Default true. */
  persist?: boolean;
  /** Names registered for `ReloadDataTable` (tables, lists, page loads) refetched after the profile changes. */
  reload?: string[];
  /** Where to go after the profile changes (home, say). */
  navigate?: NavigateTarget;
  className?: string;
};

/**
 * Switch Profile: the active person's profiles as a list, the active one
 * checked; picking one makes it the active profile. On load the saved choice
 * is restored when still in the list, else the first profile.
 */
export type SwitchProfileElement = ProfileSessionElement & {
  /** The person's profiles; `personParam` (default: the URL's only `:param`) receives the active profile's personId. */
  api: API;
  personParam?: string;
  title?: string;
  emptyText?: string;
  /** Render nothing while the person has at most one profile (default true). */
  hideWhenSingle?: boolean;
  /** A vertical list with the active row checked (default), or a dropdown whose value is the `userId` and label the job title. */
  display?: "list" | "dropdown";
  /** Show "company · department" after the job title (default true). */
  showSubtitle?: boolean;
};

/**
 * Replace Profile: a trigger opening a search-and-confirm dialog; Confirm
 * fetches the picked person's profiles and makes the first one active,
 * keeping the current profile as the original — shown in a banner with
 * "Return to my profile". Nothing changes before Confirm, nor on an empty
 * list or a failed request (the dialog stays open and says so).
 */
export type ReplaceProfileElement = ProfileSessionElement & {
  /** People search: the typed text goes to `searchParam` (default `"search"`) of its query, debounced `debounceMs` (300), never sent blank. */
  searchApi: API;
  searchParam?: string;
  debounceMs?: number;
  /** The picked person's profiles (the same shape as {@link SwitchProfileElement.api}). */
  profilesApi: API;
  personParam?: string;
  /**
   * Who may replace: a condition over global state, e.g.
   * `{ left: { source: "state", key: "me", path: "isAdmin" }, operator: "eq", right: { val: true } }`
   * (the *logged-in* user's slice, so it holds while impersonating). Absent ⇒ everyone.
   */
  canReplace?: CondExpression;
  trigger?: { label?: string; icon?: keyof typeof IconData; variant?: ButtonVariant };
  title?: string;
  description?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  returnLabel?: string;
  /** Shown when the search matched nobody / the picked person has no profile. */
  emptyText?: string;
  /** "Viewing as … — Return to my profile" while impersonating (default true). */
  showBanner?: boolean;
};

export type BinType =
  | "hidden"
  | "multiAutocomplete"
  | "modal"
  | "button"
  | "datatable"
  | "datatableeditable"
  | "formlist"
  | "repeater"
  | "filecollection"
  | "chart"
  | "autocomplete"
  | "textfield"
  | "select"
  | "checkbox"
  | "switch"
  | "radio"
  | "textarea"
  | "datepicker"
  | "daterangepicker"
  | "datetimepicker"
  | "text"
  | "typography"
  | "avatar"
  | "uploadimage"
  | "uploadfile"
  | "container"
  | "tab"
  | "paper"
  | "card"
  | "html"
  | "custom"
  | "approvalline"
  | "switchprofile"
  | "replaceprofile"
  | "workfloweditor"
  | "popover"
  | "drawer"
  | "divider"
  | "empty";

type BoxRange =
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "11"
  | "12";
export type Bin = {
  sm: BoxRange;
  md: BoxRange;
  lg: BoxRange;
  xl: BoxRange;
  type: BinType;
  /** Shown while it holds. A hidden field is out of the form: not validated, not submitted. */
  condition?: AnyCondition;
  element?: TElement;
  container?: Container;
  align?: "start" | "center" | "end";
  justifySelf?: ContainerGridJustifySelf;
  alignSelf?: ContainerGridAlignSelf;
};

export type ContainerGridJustifyItems =
  | "start"
  | "end"
  | "center"
  | "stretch";

export type ContainerGridAlignItems =
  | "start"
  | "end"
  | "center"
  | "stretch"
  | "baseline";

export type ContainerGridJustifySelf =
  | "auto"
  | "start"
  | "end"
  | "center"
  | "stretch";

export type ContainerGridAlignSelf =
  | "auto"
  | "start"
  | "end"
  | "center"
  | "stretch"
  | "baseline";

export type ContainerGridContent =
  | "start"
  | "end"
  | "center"
  | "stretch"
  | "space-between"
  | "space-around"
  | "space-evenly";

export type ContainerGridAutoFlow =
  | "row"
  | "column"
  | "dense"
  | "row dense"
  | "column dense";

/**
 * Optional themed surface for a container. When set, the container's grid is
 * wrapped in a panel that flips light/dark automatically and can opt into the
 * theme accent color. Omit (or set `false`) to keep the container transparent.
 */
export type ContainerSurface = {
  /** Paint a panel background (white in light, gray-900 in dark). Default: true. */
  background?: boolean;
  /** Draw a border. Default: true. */
  border?: boolean;
  /** Tint the border with the theme accent instead of neutral gray. Default: false. */
  accentBorder?: boolean;
  /** Corner radius. Default: "md". */
  radius?: "none" | "sm" | "md" | "lg" | "xl";
  /** Inner padding (Tailwind spacing key). Default: "4". */
  padding?: "0" | "2" | "3" | "4" | "5" | "6" | "8";
  /** Drop shadow. Default: "sm". */
  shadow?: "none" | "sm" | "md" | "lg";
  /** Optional heading rendered at the top of the surface. */
  title?: string;
  /** Tint the title with the theme accent color. Default: false. */
  accentTitle?: boolean;
};

export type Container = {
  id: string;
  name: string;
  contextData?: string;
  /** Fetch an API on mount and store the result into a global-state key. */
  load?: ContainerLoad;
  isArray: boolean;
  bins: Bin[];
  /** Grid gap — Tailwind scale key (e.g. "2") or CSS length (e.g. "1rem", "8px"). Default: "2" */
  gap?: string | number;
  justifyItems?: ContainerGridJustifyItems;
  alignItems?: ContainerGridAlignItems;
  justifyContent?: ContainerGridContent;
  alignContent?: ContainerGridContent;
  gridAutoFlow?: ContainerGridAutoFlow;
  /** Themed panel wrapping the grid. `true` uses defaults; an object customizes it. */
  surface?: boolean | ContainerSurface;
};

export type ConfirmBoxElement = {
  title: string;
  description: string;
  True: ButtonAction[];
  False: ButtonAction[];
};

export type ButtonAction =
  | "StartLoading"
  | "StopLoading"
  | "OpenModal"
  | "ClearCurrentFormSelected"
  | "SubmitFormToPostAPI"
  | "SubmitFormToPatchAPI"
  | "SubmitFormToDeleteAPI"
  /**
   * Call what is registered under `reloadDataTable`: a data table's, form
   * list's or repeater's refetch (by its `name`), or a page / container
   * load's (by its `key`).
   */
  | "ReloadDataTable"
  /** Download the data table named by `exportTable` as CSV (its Export button, from anywhere on the page). */
  | "ExportTable"
  | "ConfirmBox"
  | "CloseModal"
  /** Go to the page named by the element's `navigate` target (see {@link NavigateTarget}). */
  | "Navigate"
  /** Azure SSO (see `AzureAuth`): start the sign-in / sign out. Warn and skip without a mounted provider. */
  | "SignIn"
  | "SignOut"
| "Navigate"
  /**
   * A consumer-coded function, by registry name (see {@link CustomActionName}):
   * `"fn:increase"` calls `actions.increase(ctx)` from the enclosing
   * `ActionsProvider`. Unknown names warn and are skipped.
   */
  | CustomActionName;

/**
 * The `actions` entry that names a function of the consumer's registry
 * (`<ActionsProvider actions={{ increase, … }}>`): the name with the `fn:`
 * prefix, so it can never collide with a built-in {@link ButtonAction} and
 * reads as "code, not engine" in a config.
 */
export type CustomActionName = `fn:${string}`;

/**
 * What a custom action receives — the same services the built-in actions
 * use, as one named object so the shape can grow without breaking a
 * registered function. See the custom-actions design: the function may be
 * `async`, `return false` ends the chain (the loader is stopped), a throw
 * surfaces through `snackbarError: "$exception"` like an API failure.
 */
export type ActionContext = {
  /** The enclosing react-hook-form (the page's, or the modal / drawer / popover's own). */
  form: {
    getValues: () => Record<string, any>;
    setValue: (name: string, value: unknown) => void;
    /** Run validation; `false` when the form has errors. */
    trigger: () => Promise<boolean>;
    errors: Record<string, any>;
  };
  /** The nearest enclosing `repeater` item, `undefined` outside one. */
  row: unknown;
  /** The `DataProvider` map — a data table's selected row under its `name`, etc. */
  contextData: Record<string, any>;
  /** The page / global data slices (`PageElement.loads`, `GlobalLoads`). */
  state: {
    get: (key: string, path?: string) => unknown;
    set: (key: string, data: unknown) => void;
  };
  /** The button's own wired endpoint (`ButtonElement.api`), if any. */
  api?: (...args: any[]) => Promise<any>;
  /** The engine's function registry: refetch by name / load key, open or close a modal / drawer by id. */
  fns: {
    reload: (name: string) => Promise<void>;
    openModal: (id: string) => void;
    closeModal: (id: string) => void;
  };
  snackbar: (variant: SnackbarVariant, message: string) => void;
  startLoading: () => string;
  stopLoading: (id: string) => void;
  navigate: (target: NavigateTarget) => void;
  /** The mounted Azure SSO (`AzureAuth` / `GummyApp` with `project.auth`), `undefined` without one. */
  auth?: AuthActionContext;
  /** The button's config, as authored. */
  element: Pick<ButtonElement, "label" | "actions" | "modalId" | "reloadDataTable" | "navigate" | "confirmBox">;
  /** The click that started the chain, when there was one (a confirm branch has none). */
  event?: ReactMouseEvent<HTMLButtonElement>;
};

/** What a custom action gets of the signed-in session (see `AzureAuth`). */
export type AuthActionContext = {
  status: "signedOut" | "signingIn" | "signedIn" | "denied";
  email?: string;
  name?: string;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** The bearer token for the configured API scope (`""` in mock mode). */
  getToken: () => Promise<string>;
};

/** One consumer-coded button action. `false` ends the action chain. */
export type ActionFn = (ctx: ActionContext) => void | boolean | Promise<void | boolean>;

/**
 * The consumer's registry of custom actions, keyed by the name a config
 * references as `"fn:<name>"` — the routing counterpart of
 * `TModelMaster` / `TApiMaster` for behaviour that lives in code.
 */
export type TActionMaster = Record<string, ActionFn>;

/**
 * A config-driven page change, shared by every navigating element
 * (`ButtonElement.navigate`, `DataTableElement.rowNavigate`). `page` is a key
 * of the {@link TPageMaster} record the enclosing `PageRouter` was given; its
 * `path` template is filled from `params` (react-router `generatePath`) and
 * `query` is appended as a query string. Unknown page keys, unresolved
 * required params, or no enclosing `PageRouter` warn and do nothing.
 */
export type NavigateTarget = {
  page: string;
  /** `:param` name → value source (`value` | `url` | `state` | `row`). */
  params?: Record<string, DataValue>;
  query?: Record<string, DataValue>;
  /** Replace the current history entry instead of pushing. */
  replace?: boolean;
};

/**
 * One routed page for `PageRouter`: a react-router `path` template and the
 * containers `Core` renders when it matches. `title` sets `document.title`
 * and labels the page's breadcrumb; a {@link DataValue} title (`state` /
 * `url` / `value`) resolves at render time, so a detail page can read its
 * label from the slice its container `load` fills. `parent` (a page key)
 * places the page in the breadcrumb hierarchy: the trail walks up parents,
 * and each ancestor link fills its `:params` by name from the current route.
 */
export type PageElement = {
  path: string;
  containers: Container[];
  title?: string | DataValue;
  /** Key of the page above this one in the breadcrumb trail. */
  parent?: string;
  /** `false` hides the `AppShell` breadcrumb strip on this page. */
  breadcrumb?: boolean;
  /**
   * Data loaded for the whole page — every container, modal and drawer on it
   * reads the slices. Order doesn't matter: loads that read another slice wait
   * for it, the rest fire in parallel. Cleared when the route leaves the page.
   */
  loads?: PageLoad[];
};

/** Pages keyed by name — the routing counterpart of `TModelMaster` / `TApiMaster`. */
export type TPageMaster = { [K: string]: PageElement };

/**
 * A page as a project document lists it (see the grilled design
 * `split-pages-lazy-load`): the route meta, and either the body inline
 * (`containers` / `loads`, a {@link PageElement}) or `src`, the page file the
 * body is loaded from on the first visit (`PageRouter`'s `loadPage`). Anything
 * that only routes — the shell, the menu, breadcrumbs, `Navigate` — reads the
 * meta and takes either kind.
 */
export type PageEntry = Omit<PageElement, "containers" | "loads"> & {
  containers?: Container[];
  loads?: PageLoad[];
  /** The page body file, relative to the project document (`pages/<key>.json`). */
  src?: string;
};

/** Pages as a project lists them: inline, split into page files, or a mix. A {@link TPageMaster} is one. */
export type TPageEntries = { [K: string]: PageEntry };

/** A page file's content: the part of a {@link PageElement} the route meta leaves out. */
export type GummyPageBody = { containers: Container[]; loads?: PageLoad[] };

/**
 * One entry of an `AppShell` menu. The kind is read off the fields present:
 * a page link (`navigate`, active when its page — and any fixed `value`
 * params — match the current route), an external link (`href`), a group
 * (`items`, open while it contains the active link) or a divider.
 */
export type MenuItem =
  | { label: string; icon?: keyof typeof IconData; navigate: NavigateTarget }
  | { label: string; icon?: keyof typeof IconData; href: string; newTab?: boolean }
  | { label: string; icon?: keyof typeof IconData; items: MenuItem[]; collapsed?: boolean }
  | { divider: true };

/** The sidebar menu `AppShell` renders, top to bottom. */
export type TMenu = MenuItem[];

/** The enter animations a page change can play (see {@link PageTransition}). */
export type PageTransitionType = "none" | "fade" | "fade-up" | "slide" | "scale";

/**
 * How a page enters when the route's pathname changes (see the grilled design
 * `page-transition`): enter-only, transform / opacity, replayed on the page's
 * wrapper without remounting it, off under `prefers-reduced-motion`.
 */
export type PageTransition = {
  type: PageTransitionType;
  /** Milliseconds. Default 250. */
  duration?: number;
  /** Default `ease-out`. */
  easing?: "ease-out" | "ease-in-out" | "linear";
};

/**
 * The `AppShell` top bar, as plain config (so a studio export can author it).
 * `brand` on the shell, when given, replaces the title/icon/logo mark.
 */
export type AppBarConfig = {
  /** App name at the left of the bar. */
  title?: string;
  /** Glyph before the title (`IconData` key). */
  icon?: keyof typeof IconData;
  /** Logo image URL (or a `data:` URL of an uploaded image) before the title (wins over `icon`). */
  logo?: string;
  /** CSS height of the logo image; the width follows its aspect ratio. Default `1.5rem`. */
  logoSize?: string;
  /**
   * `"panel"` (default): the neutral panel surface. `"accent"`: painted in the
   * accent colour. `"custom"`: painted with `background` / `gradient`, text in
   * `foreground` (implied when either is set and `variant` is absent).
   */
  variant?: "panel" | "accent" | "custom";
  /** Accent for `variant: "accent"`. Unset → the theme accent. */
  color?: ThemeProps["accentColor"];
  /** Any CSS colour painting a `custom` bar (`#0f766e`, `rgb(…)`, `var(--teal-9)`). */
  background?: string;
  /**
   * A linear gradient painting a `custom` bar (wins over `background`):
   * `from` → `to` at `angle` degrees (default `90`, left to right).
   */
  gradient?: { from: string; to: string; angle?: number };
  /**
   * Text / icon colour on a `custom` bar: `"light"` (white), `"dark"` (near
   * black) or any CSS colour. Default: chosen from the luminance of
   * `background` / `gradient.from` when it is a hex / rgb value, else light.
   */
  foreground?: "light" | "dark" | (string & {});
  /** CSS padding of the bar (the inset of its content). Default `0 0.75rem`. */
  padding?: string;
  /** CSS height. Default `3rem`. */
  height?: string;
  /**
   * Glyphs of the desktop collapse/expand button (sidebar placement, when
   * `collapsible`): `hide` while the sidebar is open, `show` while it is the
   * icon rail. Defaults `chevronLeft` / `chevronRight`.
   */
  sidebarToggle?: { hide?: keyof typeof IconData; show?: keyof typeof IconData };
};

/**
 * The `AppShell` sidebar's look, as plain config. `variant: "plain"` (default)
 * is the flat list; `"pill"` draws every item as a tinted card, the active one
 * in a gradient beside an indicator bar at the sidebar's edge. The colours
 * follow the Radix accent unless overridden (any CSS colour).
 */
export type SidebarConfig = {
  variant?: "plain" | "pill";
  /**
   * Where the collapse-to-rail toggle sits: `"header"` (default) — the top
   * bar's button; `"footer"` — an icon + label row at the bottom of the
   * sidebar (icon only on the rail). Glyphs: `AppBarConfig.sidebarToggle`.
   */
  toggle?: "header" | "footer";
  /** Label of the footer toggle while expanded. Default `Hide Menu`. */
  toggleLabel?: string;
  /** CSS width of the icon rail. Default `3.5rem` (plain) / `4.5rem` (pill). */
  railWidth?: string;
  /** Idle item card colour (pill). Default `--accent-2`. */
  itemBackground?: string;
  /** Active item colour (pill); `activeGradient` wins. Default: a `--accent-3` → `--accent-5` gradient. */
  activeBackground?: string;
  /** Active item gradient (pill): `from` → `to` at `angle` degrees (default `90`). */
  activeGradient?: { from: string; to: string; angle?: number };
  /** The bar at the sidebar's edge beside the active item. Default `true` for pill, `false` for plain. */
  indicator?: boolean;
  /** Indicator colour. Default `--accent-11`. */
  indicatorColor?: string;
};

export type SnackbarElement = {
  type: SnackbarVariant;
  message: string;
};
export type ButtonElement = {
  label: string;
  icon?: keyof typeof IconData;
  /** Visual weight: "contained" (default), "outlined" or "text". */
  variant?: ButtonVariant;
  /** A Radix colour for this button. Unset: the theme's button colour, else the theme accent. */
  color?: ThemeProps["accentColor"];
  confirmBox?: ConfirmBoxElement;
  reloadDataTable?: string;
  /** Target of the `"ExportTable"` action: a data table's `name`. */
  exportTable?: string;
  actions: ButtonAction[];
  api?: API & {};
  modalId?: string;
  snackbarSuccess?: SnackbarElement;
  snackbarError?: SnackbarElement | "$exception";
  /** Target of the `"Navigate"` action. */
  navigate?: NavigateTarget;
  /** Clickable only while it holds (fails closed). */
  enabledWhen?: AnyCondition;
};

export type ModalElement = {
  id: string;
  title: string;
  description?: string;
  container: Container;
  trigger: ButtonElement;
  maxWidth?: string;
  minWidth?: string;
  maxHeight?: string;
};

/**
 * A popover trigger described as a mini-Bin: its `type` selects the element
 * builder and `element` is that builder's config. Lets any element (button,
 * icon, avatar, text, …) open the popover — not just a button.
 */
export type PopoverTrigger = {
  type: BinType;
  element: TElement;
};

/**
 * Config-driven Popover. The content is a self-contained {@link Container}
 * (its own form + DataProvider, like a modal), opened by an arbitrary
 * `trigger` element. Any panel chrome comes from the container's own
 * `surface`; the popover itself supplies the floating card.
 */
export type PopoverElement = {
  id?: string;
  container: Container;
  trigger: PopoverTrigger;
  placement?:
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "top-start"
    | "top-end"
    | "bottom-start"
    | "bottom-end";
  /** Open on click (default) or hover. Maps to the Popover `trigger` prop. */
  triggerMode?: "click" | "hover";
  /** Gap in px between trigger and content. Default: 8. */
  offset?: number;
};

/** Which viewport edge a drawer slides in from. */
export type DrawerAnchor = "left" | "right" | "top" | "bottom";

/**
 * Config-driven Drawer (MUI's *temporary* drawer): a panel that slides in
 * over the page from `anchor` behind a scrim, holding a self-contained
 * {@link Container} (its own form, like a modal), opened by any `trigger`
 * element (a mini-Bin like the popover's) and closed by the scrim, Esc, its
 * close button or a `CloseModal` button inside it whose `modalId` is this
 * `id` (the drawer registers under `id` like a modal, so `OpenModal` works
 * from any button too). `size` is the width of a left / right drawer or the
 * height of a top / bottom one (any CSS length; the drawer never exceeds the
 * viewport). The persistent / permanent variants are app chrome — that is the
 * AppShell sidebar.
 */
export type DrawerElement = {
  id: string;
  title?: string;
  description?: string;
  container: Container;
  trigger: PopoverTrigger;
  /** Default `"right"`. */
  anchor?: DrawerAnchor;
  /** Default `"360px"` for left / right, `"50vh"` for top / bottom. */
  size?: string;
  /** Hide the title row (title, description and the close button). */
  hideHeader?: boolean;
};

export type TabItem = {
  label: string;
  value: string;
  container: Container;
};

export type TabElement = {
  defaultValue?: string;
  className?: string;
  tabs: TabItem[];
  /** Themed panel wrapping the whole tab widget. `true` uses defaults; an object customizes it. */
  surface?: boolean | ContainerSurface;
};

export type DividerElement = {
  /** "fullWidth" spans edge to edge, "inset" indents the left edge, "middle" indents both edges. */
  variant?: "fullWidth" | "inset" | "middle";
  /** Margin above and below the line. Number → px, or any CSS length. */
  spacing?: number | string;
  className?: string;
  style?: CSSProperties;
};

export type PaperElement = {
  /** Nested content rendered inside the elevated surface. */
  container: Container;
  /** Shadow depth on the elevation scale (0–24). Ignored when variant is "outlined". */
  elevation?: number;
  /** "elevation" draws a shadow; "outlined" draws a 1px border and no shadow. */
  variant?: "elevation" | "outlined";
  /** When true, corners are not rounded. */
  square?: boolean;
  className?: string;
  style?: CSSProperties;
};

/** The `card` header: avatar · title / subheader · action (MUI `CardHeader`). */
export type CardHeaderElement = {
  title?: string;
  /** Bound title (`row` / `state` / `url` / `value`); `title` is the fallback. */
  titleValue?: DataValue;
  subheader?: string;
  /** Bound subheader; `subheader` is the fallback. */
  subheaderValue?: DataValue;
  /** The avatar at the header's start (the usual `avatar` element: `src`/`srcValue`, `fallback`/`fallbackValue`). */
  avatar?: AvatarElement;
  /** A button at the header's end — `label: ""` + `icon` for MUI's ⋮ icon button; opens a popover / modal or navigates. */
  action?: ButtonElement;
};

/** The `card` image band (MUI `CardMedia`). */
export type CardMediaElement = {
  src?: string;
  /** Bound image URL — a string, or an object with a `src`/`url` field; `src` is the fallback. */
  srcValue?: DataValue;
  alt?: string;
  /** Height in px (default 180). */
  height?: number;
};

/**
 * A card: a `Paper` with MUI's slots in MUI's order — header, media, content,
 * actions, expandable section. Every slot is optional; a card inside a
 * `repeater` binds its header / media to the item with `type: "row"` values.
 */
export type CardElement = {
  name?: string;
  header?: CardHeaderElement;
  media?: CardMediaElement;
  /** Nested bins in the body (drawn like a repeater's item template — `row` bindings and conditions see the item). */
  content?: Container;
  /** The footer button row. */
  actions?: ButtonElement[];
  /** Where the footer buttons sit (default "start"). */
  actionsAlign?: "start" | "end";
  /** Bins behind an expand toggle at the footer's end (MUI's "complex interaction"). */
  collapse?: Container;
  /** The toggle's accessible name / tooltip (default "Show more"). */
  collapseLabel?: string;
  defaultExpanded?: boolean;
  /** Makes the whole card a link (MUI `CardActionArea`); inner buttons keep their own click. */
  navigate?: NavigateTarget;
  /** "elevation" (default) draws a shadow; "outlined" a 1px border. */
  variant?: "elevation" | "outlined";
  /** Shadow depth (0–24, default 1). Ignored when outlined. */
  elevation?: number;
  square?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * A block of HTML on the page (`html` Bin): a `{{path}}` template rendered
 * against `value` — the enclosing repeater item, a `state` slice, a URL param
 * or nothing (plain static markup) — with every placeholder escaped and the
 * result sanitised (the data table's HTML-column profile: no scripts, no
 * `<style>`, no form controls; `class` / `style` / links kept). Same-origin
 * links navigate in-app; the `dt-*` helper classes are available.
 */
/** Where a step is in the workflow (see {@link ApprovalLineElement.statusMap}). */
export type ApprovalStepState = "done" | "current" | "pending" | "rejected" | "revised" | "skipped";

/** One lodash path into a raw step row, or several tried in order (reviewer rows vs approver rows). */
export type ApprovalKeyPath = string | string[];

/**
 * Paths into one raw step row of an approval line. Every key is optional but
 * `name` and `status`; each accepts a list of fallback paths because the rows
 * are heterogeneous (`ReviewerUser.FullNameEN` on a reviewer row,
 * `ApproverUser.FullNameEN` on an approver row).
 */
export type ApprovalLineKeys = {
  name: ApprovalKeyPath;
  status: ApprovalKeyPath;
  jobTitle?: ApprovalKeyPath;
  /** A person id, for the `avatarUrl` template. */
  personId?: ApprovalKeyPath;
  /** An image URL on the row (wins over `avatarUrl`). */
  avatar?: ApprovalKeyPath;
  /** A role label on the row (wins over `roleRules`). */
  role?: ApprovalKeyPath;
  remark?: ApprovalKeyPath;
  date?: ApprovalKeyPath;
  /** Steps are sorted by it when present (stable: rows without one keep their order, first). */
  sequence?: ApprovalKeyPath;
};

/**
 * How a raw row gets its role label when the data carries none: the first
 * rule whose `path` exists on the row (and whose `sequence`, when given,
 * matches) wins. `{ path: "ReviewerUser", role: "Reviewer" }`,
 * `{ path: "ApproverUser", sequence: 1, role: "Acknowledge" }`,
 * `{ path: "ApproverUser", role: "Approver" }`.
 */
export type ApprovalRoleRule = {
  path: string;
  sequence?: number | string;
  role: string;
};

/** One normalized step of an approval line, what the view renders. */
export type ApprovalStep = {
  name: string;
  role?: string;
  jobTitle?: string;
  avatar?: string;
  state: ApprovalStepState;
  /** The raw status code, and its label from `statusLabels`. */
  status?: string;
  statusLabel?: string;
  remark?: string;
  date?: string;
  personId?: string;
};

/**
 * An approval workflow tracker (see the grilled design): the people a request
 * passes through, left to right (or top to bottom), each an avatar with a
 * state badge, the connector between them solid up to the current step. Fed
 * by a raw step array — `items` — read through `keys` with fallback paths, an
 * optional fixed `requester` first step, `roleRules` for the labels, and a
 * `statusMap` turning the backend's status codes into step states.
 */
export type ApprovalLineElement = {
  name?: string;
  /**
   * The raw step rows already in scope (a page-data slice, a repeater item
   * field, a literal array). Exactly one of `items` / `api`.
   */
  items?: DataValue;
  /**
   * Own fetch (the repeater's read plumbing): `paths` drills to the request
   * **record**, `stepsPath` to the row array inside it, so the requester can
   * read the same record. Held until every URL `:param` resolves; the refetch
   * is registered under `name` for `ReloadDataTable`.
   */
  api?: API;
  /** Lodash path from the fetched record to the rows (`"steps"`); empty ⇒ the record is the array. */
  stepsPath?: string;
  keys: ApprovalLineKeys;
  /**
   * A fixed first step (the person who submitted the request), bound
   * separately: `*Value` DataValues in the bound modes, `*Path` paths into the
   * fetched record with `api`; the static text is the fallback.
   */
  requester?: {
    name?: string;
    nameValue?: DataValue;
    namePath?: ApprovalKeyPath;
    jobTitle?: string;
    jobTitleValue?: DataValue;
    jobTitlePath?: ApprovalKeyPath;
    avatar?: string;
    avatarValue?: DataValue;
    avatarPath?: ApprovalKeyPath;
    personIdPath?: ApprovalKeyPath;
    role?: string;
    /** Its state; default `done` (they submitted it). */
    state?: ApprovalStepState;
  };
  roleRules?: ApprovalRoleRule[];
  /**
   * Status code → step state. Default: the document statuses 0 Draft→pending,
   * 1 Reviewing→current, 2 Approving→current, 3 Rejected→rejected,
   * 4 Revised→revised, 5 Approved→done, 6 Completed→done, 7 Canceled→skipped,
   * 8 Expired→skipped, 9 Renewed→done. Unknown codes are `pending`.
   */
  statusMap?: Record<string, ApprovalStepState>;
  /** Status code → label shown in the tooltip (default: the names above). */
  statusLabels?: Record<string, string>;
  /** Avatar URL template over the normalized step: `"/api/profile/{{personId}}/photo"`. */
  avatarUrl?: string;
  orientation?: "horizontal" | "vertical";
  /** Avatar 32 / 40 / 48 px. Default `md`. */
  size?: "sm" | "md" | "lg";
  /** Job title under the role. Default false. */
  showJobTitle?: boolean;
  /** "1." … before each name. Default true. */
  showIndex?: boolean;
  /** Narrowest a horizontal step gets before the line scrolls (px). Default 96. */
  stepMinWidth?: number;
  /** Flip a horizontal line to vertical under this breakpoint. */
  verticalBelow?: "sm" | "md";
  emptyText?: string;
  className?: string;
};

/** One role a workflow step can have (see {@link WorkflowEditorElement.roles}). */
export type WorkflowRole = {
  /** What is stored in the step's role field. */
  value: string;
  label: string;
  /** At most this many steps of the role per line (the Inputter: 1 — "(Already assigned.)"). */
  max?: number;
  /** Pin the role's steps to the start or the end of the line (no "+" across it). */
  position?: "first" | "last";
};

/** Field names of one saved step (the backend's shape; defaults are camelCase). */
export type WorkflowStepKeys = {
  role: string;
  sequence: string;
  incharge: string;
  cc: string;
};

/** How the dialog's user pickers read an option row. */
export type WorkflowUserKeys = {
  id: string;
  display: string;
  subtitle?: string;
  avatar?: string;
  search?: string;
};

export type WorkflowEditorLabels = Partial<{
  add: string;
  save: string;
  remove: string;
  cancel: string;
  dialogTitle: string;
  editTitle: string;
  roleField: string;
  incharge: string;
  cc: string;
  userPlaceholder: string;
  alreadyAssigned: string;
  confirmTitle: string;
  confirmDescription: string;
  empty: string;
}>;

export type WorkflowEditorProps = {
  name?: string;
  label?: string;
  helperText?: string;
  error?: boolean;
  errorMessage?: string;
  /** The line (the field value); each step holds `stepKeys` fields plus whatever the backend sent. */
  value?: Record<string, unknown>[];
  /** Seeded into the form by `withForm` (the builder passes `[]`). */
  defaultValue?: Record<string, unknown>[];
  onChange?: (value: Record<string, unknown>[]) => void;
  onBlur?: () => void;
  roles: WorkflowRole[];
  stepKeys?: Partial<WorkflowStepKeys>;
  /** The user options of the dialog's pickers — loaded once when it opens (resolved `api` + row keys). */
  users: { api?: FormListReadApi; options?: Record<string, unknown>[]; keys: WorkflowUserKeys };
  /** Default 1 — Add / Save disabled until this many people are in charge. */
  minInchargeUsers?: number;
  /** Default false — a person in charge of one step is hidden from the others' pickers. */
  allowDuplicateUsers?: boolean;
  labels?: WorkflowEditorLabels;
  /** Cards and connectors only: no "+", no dialog. */
  disabled?: boolean;
  className?: string;
};

/**
 * A form-bound editor for one approval line (see the grilled design): a
 * vertical chain of step cards — role + the people in charge — with a "+"
 * on every connector to insert a step there, an add button at the end, and
 * a dialog (role radios, in-charge and CC user pickers) to add / edit /
 * remove one. The field value is the step array, saved with the page's form;
 * only the dialog's user list is fetched (`users.api`, the select family's
 * `api` block, loaded once).
 */
export type WorkflowEditorElement = {
  name: string;
  dataType: "array" | string;
  isRequired?: boolean;
  errorMessage?: string;
  label?: string;
  helperText?: string;
  roles: WorkflowRole[];
  stepKeys?: Partial<WorkflowStepKeys>;
  users: { api?: API; options?: Record<string, unknown>[]; keys: WorkflowUserKeys };
  minInchargeUsers?: number;
  allowDuplicateUsers?: boolean;
  labels?: WorkflowEditorLabels;
  disabled?: boolean;
  /** Read-only initial value bound from a global-state slice. */
  value?: DataValue;
} & FieldLogic;

export type HtmlContentElement = {
  name?: string;
  /** The markup, with `{{path}}` placeholders into `value` (`{{value}}` = the value itself). */
  html: string;
  /** What the placeholders read (`{ type: "row" }` inside a repeater, `state`, `url`, `value`). */
  value?: DataValue;
  /** Typographic defaults for headings / paragraphs / lists / tables (default true). */
  prose?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * The `custom` element (see the grilled custom-components design): a React
 * component the consumer coded in the app and registered under `component`
 * in `<ComponentsProvider components={…}>`. Display-only — not a field of the
 * enclosing form (`schema.ts` skips it), allowed inside a repeater.
 */
export type CustomComponentElement = {
  name?: string;
  /** The registry key (`components[component]`). */
  component: string;
  /** Static configuration, passed through verbatim as `props`. */
  props?: Record<string, unknown>;
  /** The one bound value (`{ type: "row" }` inside a repeater, `state`, `url`, `value`). */
  value?: DataValue;
  className?: string;
  style?: CSSProperties;
};

/** What the engine hands a custom component (see {@link CustomComponentElement}). */
export type CustomComponentProps<P = Record<string, unknown>, V = unknown> = {
  /** The element's `props` object, untouched. */
  props: P;
  /** The resolved `value` binding; `undefined` when unbound or not loaded yet. */
  value: V | undefined;
  /** `true` while a `skeleton`-mode page load the binding reads has no data yet — draw your own placeholder. */
  loading: boolean;
  /** The nearest enclosing `repeater` item, `undefined` outside one. */
  row: unknown;
  /** Config-driven page change through the enclosing `PageRouter`. */
  navigate: (target: NavigateTarget) => void;
  /** Read-only access to the page / global data slices. */
  state: { get: (key: string, path?: string) => unknown };
};

/**
 * The consumer's registry of custom components, keyed by the name a config
 * references as `element.component` — the rendering counterpart of
 * `TActionMaster`.
 */
export type TComponentMaster = Record<string, ComponentType<CustomComponentProps<any, any>>>;

export type Modals = Record<string, ModalElement>;

export type Page = {
  name: string;
  containers: Container[];
};

export type FnAPI = FnAPI1 | FnAPI2 | FnAPI3 | FnAPI4;

export type FnAPI1 = () => Promise<any>;

export type FnAPI2 = (query: Record<string, any>) => Promise<any>;

export type FnAPI3 = (params: Record<string, any>) => Promise<any>;

export type FnAPI4 = (
  query: Record<string, any>,
  params: Record<string, any>
) => Promise<any>;
export interface IElement {
  // setAPI(api: APIFunction): void;
  // setForm(form: any): void;
  create(): JSX.Element;
}

//Expression
export type Primitive = string | number | boolean;

export type Ref = {
  key?: string;
  path?: string;
  /**
   * Where `key` is looked up: `context` (default) — the container's context
   * data (a table's edit record, a repeater's `{ row, index }`); `state` — the
   * global-state slice `key`, where `path` drills its data, or reads
   * `$status` / `$error` / `$error.message` off the slice itself.
   */
  source?: "context" | "state";
};

export type Val = {
  val?: any;
};

export type Obs = {
  key: string;
};

export type CondValue = Ref | Val | Obs;

export type ExpressionOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "and"
  | "or";

export type CondExpression = {
  right: CondValue | CondExpression;
  left: CondValue | CondExpression;
  operator: ExpressionOperator;
};

// Logic: formulas and rules (spec/gummy-logic-spec.md)

/**
 * Where an `Expr` reference reads: the nearest form's field `key`, the
 * global-state slice `key`, the nearest item (`row`: a repeater item, a
 * table's edit record by table name, the row of a style rule / computed
 * column — `key: "none"` the row itself, `"value"` the cell value, `"index"`
 * its position) or a URL param / query.
 */
export type ExprRefSource = "field" | "state" | "row" | "url";

export type ExprFunction =
  | "ROUND"
  | "MIN"
  | "MAX"
  | "ABS"
  | "LEN"
  | "TODAY"
  | "DAYS"
  | "COUNT"
  | "SUM";

/** A formula: a literal, a reference, an operation, a function call or a library reference. */
export type Expr =
  | { lit: number | string | boolean | null }
  | { ref: ExprRefSource; key: string; path?: string; source?: "param" | "query" }
  | { op: "+" | "-" | "*" | "/" | "&"; args: [Expr, Expr] }
  | { fn: ExprFunction; args: Expr[] }
  | { formula: string }
  | { rule: string };

export type CondOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "empty"
  | "notEmpty"
  | "contains"
  | "in"
  | "between";

/**
 * A condition: AND (`all`) / OR (`any`) groups of comparisons. `right` is
 * absent for `empty` / `notEmpty`, a list for `in` and `[low, high]` for
 * `between`.
 */
export type Cond =
  | { all: Cond[] }
  | { any: Cond[] }
  | { cmp: CondOperator; left: Expr; right?: Expr | Expr[] };

export type LogicResultType = "number" | "text" | "boolean" | "date";

/** IF / ELSE IF / ELSE: the first branch whose `when` holds gives the result, else `else`. */
export type Rule = {
  branches: { when: Cond; then: Expr | Rule }[];
  else: Expr;
};

/** What a formula gives for a blank input / a division by zero. Default `"empty"`. */
export type FormulaBlankPolicy = "empty" | "zero" | "error";

export type FormulaDef = {
  expr: Expr;
  /** Applied only where the result is displayed. */
  format?: CellFormat;
  onEmpty?: FormulaBlankPolicy;
  onDivideByZero?: FormulaBlankPolicy;
};

export type RuleDef = {
  resultType: LogicResultType;
  rule: Rule;
  format?: CellFormat;
};

/** The saved formulas and rules of a project, by name. */
export type LogicLibrary = {
  formulas?: Record<string, FormulaDef>;
  rules?: Record<string, RuleDef>;
};

/** Anything a condition slot takes: the old expression, a `Cond`, or a saved boolean rule. */
export type AnyCondition = CondExpression | Cond | { rule: string };

/** `initial`: the value seeds the field once; `computed`: locked, recalculated live, still submitted. */
export type FieldValueMode = "initial" | "computed";

/** The logic keys every input takes (evaluated by the grid cell, not the component). */
export type FieldLogic = {
  /** Enabled while it holds; a disabled field is not validated but is submitted. */
  enabledWhen?: AnyCondition;
  /** How a `value` formula feeds the field (default `initial`). */
  valueMode?: FieldValueMode;
};

export type ThemeComponents = {
  button?: {
    color: ThemeProps["accentColor"];
  };
  /**
   * Per-role color overrides for the DataTable. Every field is optional: any
   * role left unset follows the theme accent (`--accent-*`) and flips with dark
   * mode automatically. Set a field to pin a specific named color for that role.
   */
  dataTable?: {
    /** Header background color. Unset → solid theme accent (auto dark-flip). */
    headerColor?: ThemeProps["accentColor"];
    /** Header label color. Unset → accent contrast (or neutral on a named bg). */
    headerTextColor?: ThemeProps["accentColor"];
    /** Header font size. Unset → default `text-xs`. */
    headerFontSize?: "xs" | "sm" | "base" | "lg" | "xl";
    /** Header font weight. Unset → default `font-bold`. */
    headerFontWeight?: "normal" | "medium" | "semibold" | "bold";
    headerHoverColor?: ThemeProps["accentColor"];
    paginationButtonColor?: ThemeProps["accentColor"];
    paginationButtonHoverColor?: ThemeProps["accentColor"];
    rowHoverColor?: ThemeProps["accentColor"];
    /**
     * Row edit button (DataTable + DataTableEditable), a Radix soft IconButton.
     * Unset → the buttons' colour (`button.color`, else the theme accent).
     */
    editButtonColor?: ThemeProps["accentColor"];
    /**
     * Row delete button (both tables) and the form list's Remove. Unset → red.
     */
    deleteButtonColor?: ThemeProps["accentColor"];
  };
  /** Sidebar (AppShell) overrides. Unset → the theme accent. */
  sidebar?: {
    /** Accent used for the active menu item. */
    color?: ThemeProps["accentColor"];
  };
  textField?: {};
};
