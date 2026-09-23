import type {
  ComponentPropsWithoutRef,
  Context,
  CSSProperties,
  ElementType,
  JSX,
} from "react";
import {
  TextField as RadixTextField,
  Button as RadixButton,
  Select as RadixSelect,
  Checkbox as RadixCheckbox,
  RadioGroup as RadixRadioGroup,
  Text as RadixText,
} from "@radix-ui/themes";
import { type ThemeProps } from "@radix-ui/themes";
import type { ReactNode } from "react";
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

export type ThemeContextType = {
  theme?: ThemeProps;
  components: ThemeComponents;
  /** Current resolved appearance (light/dark). */
  appearance?: Appearance;
  /** Set the appearance explicitly. */
  setAppearance?: (appearance: Appearance) => void;
  /** Flip between light and dark. */
  toggleAppearance?: () => void;
};

export type ThemeProviderProps = {
  children: React.ReactNode;
  theme?: ThemeProps;
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
      onValuesChange?: (values: string[]) => void;
      onChange?: (values: string[]) => void;
      onBlur?: () => void;
      maxResults?: number;
      maxHeight?: number | string;
      canObserve?: boolean;
      observeTo?: string;
      api?: APIFunction;
      apiInfo?: API;
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
  type: "variable" | "state" | "observe" | "value" | "selectedRow" | "url" | "row" | "filter";
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
} & CheckboxProps;

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
  // enabledWhen: ConditionTerm;
  enabledWhen: CondExpression;
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
  enableSorting: boolean;
  /** Field name sent to the API by `api.sort` when it differs from `accessor`. */
  sortField?: string;
  enableColumnFilter: boolean;
  isEditable?: boolean;
  align?: "start" | "center" | "end";
  useDateFormat?: string;
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

export type DataTableElement = {
  name: string;
  title: string;
  columns: ColumnDef[];
  api: DataTableApi;
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
  // Editing: {}
};

// export type TextFieldElement = {};

export type TextFieldElement = {
  name: string;
  dataType: string;
  isRequired: boolean;
  errorMessage: string;
  /** Read-only initial value bound from a global-state slice. */
  value?: DataValue;
} & TextFieldProps;

export type TextareaElement = {
  name: string;
  dataType: string;
  isRequired: boolean;
  errorMessage: string;
  /** Read-only initial value bound from a global-state slice. */
  value?: DataValue;
} & TextareaProps;

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
} & DatePickerProps;

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
} & DateRangePickerProps;

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
} & DateTimePickerProps;

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
} & UploadImageProps;

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
} & UploadFileProps;

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
  enabledWhen?: CondExpression;
};

export type TElement =
  | HiddenElement
  | RadioElement
  | AutocompleteElement
  | TextFieldElement
  | TextareaElement
  | CheckboxElement
  | DataTableElement
  | DataTableEditableElement
  | FormListElement
  | RepeaterElement
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
  | PopoverElement
  | DividerElement;

export type BinType =
  | "hidden"
  | "multiAutocomplete"
  | "modal"
  | "button"
  | "datatable"
  | "datatableeditable"
  | "formlist"
  | "repeater"
  | "autocomplete"
  | "textfield"
  | "select"
  | "checkbox"
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
  | "popover"
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
  condition?: CondExpression;
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
  // | "ReloadDataTable"
  | "ConfirmBox"
  | "CloseModal"
  /** Go to the page named by the element's `navigate` target (see {@link NavigateTarget}). */
  | "Navigate";

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
};

/** Pages keyed by name — the routing counterpart of `TModelMaster` / `TApiMaster`. */
export type TPageMaster = { [K: string]: PageElement };

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

/**
 * The `AppShell` top bar, as plain config (so a studio export can author it).
 * `brand` on the shell, when given, replaces the title/icon/logo mark.
 */
export type AppBarConfig = {
  /** App name at the left of the bar. */
  title?: string;
  /** Glyph before the title (`IconData` key). */
  icon?: keyof typeof IconData;
  /** Logo image URL before the title (wins over `icon`). */
  logo?: string;
  /** `"panel"` (default): the neutral panel surface. `"accent"`: painted in the accent colour. */
  variant?: "panel" | "accent";
  /** Accent for `variant: "accent"`. Unset → the theme accent. */
  color?: ThemeProps["accentColor"];
  /** CSS height. Default `3rem`. */
  height?: string;
  /**
   * Glyphs of the desktop collapse/expand button (sidebar placement, when
   * `collapsible`): `hide` while the sidebar is open, `show` while it is the
   * icon rail. Defaults `chevronLeft` / `chevronRight`.
   */
  sidebarToggle?: { hide?: keyof typeof IconData; show?: keyof typeof IconData };
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
  confirmBox?: ConfirmBoxElement;
  reloadDataTable?: string;
  actions: ButtonAction[];
  api?: API & {};
  modalId?: string;
  snackbarSuccess?: SnackbarElement;
  snackbarError?: SnackbarElement | "$exception";
  /** Target of the `"Navigate"` action. */
  navigate?: NavigateTarget;
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
