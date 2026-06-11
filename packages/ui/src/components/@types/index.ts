import type {
  ComponentPropsWithoutRef,
  Context,
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

export type ThemeContextType = {
  theme?: ThemeProps;
  components: ThemeComponents;
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

export type ButtonProps = BaseComponentProps<
  typeof RadixButton,
  {
    variant?: "solid" | "outline" | "ghost" | "link";
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
    // useCount: UseBoundStore<StoreApi<DataState>>
  }
>;

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
      placeholder?: string;
      helperText?: string;
      error?: boolean;
      errorMessage?: string;
      variant?: "classic" | "surface" | "soft";
      size?: "1" | "2" | "3";
      radius?: "none" | "small" | "medium" | "large" | "full";
      inputIcon?: keyof typeof IconData | LucideIcon;
      options: T[];
      searchKey: keyof T;
      idKey: keyof T;
      displayKey: keyof T;
      values?: string[];
      onValuesChange?: (values: string[]) => void;
      onChange?: (values: string[]) => void;
      onBlur?: () => void;
      maxResults?: number;
      canObserve?: boolean;
      observeTo?: string;
      api?: APIFunction;
      apiInfo?: API;
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
  apiInfo?: API;
  modalContainer?: JSX.Element;
  modalMaxWidth?: string;
  modalMinWidth?: string;
  modalMaxHeight?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  align?: Record<string, "start" | "center" | "end">;
  context?: Context<DataContextType>;
  // isReload?: boolean;
  // apiEdit?: APIFunction;
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
  type: "variable" | "state" | "observe" | "value" | "selectedRow";
  key: "none" | string;
  value?: any;
};

export type API = {
  name: string;
  paths?: string[];
  query?: Record<string, DataValue>;
  params?: Record<string, DataValue>;
  body?: Record<string, DataValue>;
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
};

export type ColumnDef = {
  accessor: string;
  header: string;
  enableSorting: boolean;
  enableColumnFilter: boolean;
  isEditable?: boolean;
  align?: "start" | "center" | "end";
  useDateFormat?: string;
};

export type DataTableElement = {
  name: string;
  title: string;
  columns: ColumnDef[];
  api: API & {};
  apiDeleteInfo?: APIDelete;
  modalContainer?: Container;
  modalMaxWidth?: string;
  modalMinWidth?: string;
  modalMaxHeight?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  // Editing: {}
};

// export type TextFieldElement = {};

export type TextFieldElement = {
  name: string;
  dataType: string;
  isRequired: boolean;
  errorMessage: string;
} & TextFieldProps;

export type TextareaElement = {
  name: string;
  dataType: string;
  isRequired: boolean;
  errorMessage: string;
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
} & AvatarProps;

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
     * "dataUrl" (default), "base64" (raw base64 string), or
     * "bytes" (raw byte number array).
     */
    valueFormat?: UploadValueFormat;
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
    /** Accepted file types passed to the file input (e.g. ".pdf,.docx"). */
    accept?: string;
    /** Allow selecting multiple files. Defaults to false. */
    multiple?: boolean;
    /** Maximum number of files when multiple is enabled. */
    maxFiles?: number;
    /** Maximum file size in megabytes (per file). */
    maxSizeMB?: number;
    isFullWidth?: boolean;
    width?: number;
    disabled?: boolean;
    /**
     * Format of each file's `data` field stored in the form (and sent to
     * the API): "dataUrl" (default), "base64", or "bytes".
     */
    valueFormat?: UploadValueFormat;
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

export type TElement =
  | HiddenElement
  | AutocompleteElement
  | TextFieldElement
  | TextareaElement
  | CheckboxElement
  | DataTableElement
  | DatePickerElement
  | DateRangePickerElement
  | DateTimePickerElement
  | TextElement
  | AvatarElement
  | UploadImageElement
  | UploadFileElement
  | ModalElement
  | ButtonElement
  | TabElement;

export type BinType =
  | "hidden"
  | "multiAutocomplete"
  | "modal"
  | "button"
  | "datatable"
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
  | "avatar"
  | "uploadimage"
  | "uploadfile"
  | "container"
  | "tab"
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

export type Container = {
  id: string;
  name: string;
  contextData?: string;
  isArray: boolean;
  bins: Bin[];
  /** Grid gap — Tailwind scale key (e.g. "2") or CSS length (e.g. "1rem", "8px"). Default: "2" */
  gap?: string | number;
  justifyItems?: ContainerGridJustifyItems;
  alignItems?: ContainerGridAlignItems;
  justifyContent?: ContainerGridContent;
  alignContent?: ContainerGridContent;
  gridAutoFlow?: ContainerGridAutoFlow;
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
  | "CloseModal";

export type SnackbarElement = {
  type: SnackbarVariant;
  message: string;
};
export type ButtonElement = {
  label: string;
  icon?: keyof typeof IconData;
  confirmBox?: ConfirmBoxElement;
  reloadDataTable?: string;
  actions: ButtonAction[];
  api?: API & {};
  modalId?: string;
  snackbarSuccess?: SnackbarElement;
  snackbarError?: SnackbarElement | "$exception";
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

export type TabItem = {
  label: string;
  value: string;
  container: Container;
};

export type TabElement = {
  defaultValue?: string;
  className?: string;
  tabs: TabItem[];
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
  dataTable?: {
    headerColor: ThemeProps["accentColor"];
    headerHoverColor: ThemeProps["accentColor"];
    paginationButtonColor: ThemeProps["accentColor"];
    paginationButtonHoverColor: ThemeProps["accentColor"];
    rowHoverColor: ThemeProps["accentColor"];
    editButtonColor: ThemeProps["accentColor"];
    deleteButtonColor: ThemeProps["accentColor"];
  };
  textField?: {};
};
