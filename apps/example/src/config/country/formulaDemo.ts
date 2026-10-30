import type { Bin, CellFormat, Container, DataValue, Expr, PageLoad } from "@gummy-ui/ui";
import { DEFAULT_CONTAINER_GRID } from "@gummy-ui/ui";

/**
 * Formula demo page (`/formula`): the example-app twin of the studio's
 * seeded Formula page — what the palette's Formula tile produces, a
 * typography whose `value` is an inline formula (`type: "formula"` + `expr`,
 * see `spec/gummy-logic-spec.md`) over the page's form, one per operator,
 * function and output format. No saved items: every formula is written where
 * it is shown.
 *
 * 1. **Arithmetic** — `+ − × ÷`, `ROUND`, a currency format; blank inputs and
 *    a division by zero give a blank result.
 * 2. **Text** — `&` joins text, `LEN` counts characters.
 * 3. **Functions** — `MIN`, `MAX`, `ABS`, `DAYS(date, TODAY())`, `TODAY()`
 *    with a date pattern.
 * 4. **Lists** — `COUNT` and `SUM` over a page load (`sales`, twelve months).
 * 5. **Blanks and errors** — the other policies: `onEmpty: "zero"` and
 *    `onDivideByZero: "error"` (a dash with the reason as a tooltip).
 */
const full = { sm: "12", md: "12", lg: "12", xl: "12" } as const;
const half = { sm: "12", md: "6", lg: "6", xl: "6" } as const;
const third = { sm: "12", md: "4", lg: "4", xl: "4" } as const;
const quarter = { sm: "6", md: "3", lg: "3", xl: "3" } as const;
type Span = typeof full | typeof half | typeof third | typeof quarter;

const field = (key: string): Expr => ({ ref: "field", key });
const lit = (v: number | string | boolean): Expr => ({ lit: v });
const op = (o: "+" | "-" | "*" | "/" | "&", a: Expr, b: Expr): Expr => ({ op: o, args: [a, b] });
const fn = (name: "ROUND" | "MIN" | "MAX" | "ABS" | "LEN" | "TODAY" | "DAYS" | "COUNT" | "SUM", ...args: Expr[]): Expr => ({ fn: name, args });
const sales: Expr = { ref: "state", key: "sales" };
const thb: CellFormat = { type: "currency", currency: "THB", decimals: 2 };
const integer: CellFormat = { type: "number", decimals: 0 };

const section = (text: string, caption: string): Bin[] => [
  { ...full, type: "typography", element: { text, variant: "subtitle1", weight: "medium" } },
  { ...full, type: "typography", element: { text: caption, variant: "body2", color: "gray" } },
];

const textField = (name: string, label: string, extra: Record<string, unknown> = {}, span: Span = third): Bin => ({
  ...span,
  type: "textfield",
  element: { name, label, dataType: "string", isRequired: false, errorMessage: "", ...extra } as Bin["element"],
});

const numberField = (name: string, label: string, extra: Record<string, unknown> = {}): Bin =>
  textField(name, label, { dataType: "number", type: "number", ...extra });

/** An inline formula as a bound value: the expression plus how to show it. */
const formula = (expr: Expr, format?: CellFormat, extra: Partial<Pick<DataValue, "onEmpty" | "onDivideByZero">> = {}): DataValue => ({
  type: "formula",
  key: "none",
  expr,
  ...(format ? { format } : {}),
  ...extra,
});

type Metric = { caption: string; value: DataValue; weight?: "bold" };

/** A row of captions over a row of results, so each result sits under its caption. */
const metrics = (list: Metric[], span: Span): Bin[] => [
  ...list.map((m): Bin => ({ ...span, type: "typography", element: { text: m.caption, variant: "body2", color: "gray" } })),
  ...list.map((m): Bin => ({ ...span, type: "typography", element: { text: "", variant: "h5", weight: m.weight, value: m.value } })),
];

const subtotal = op("*", field("quantity"), field("price"));
const discount = op("/", op("*", subtotal, field("discountPct")), lit(100));
const total = fn("ROUND", op("-", subtotal, discount), lit(2));

export const formulaDemoLoads: PageLoad[] = [{ key: "sales", api: { name: "salesByMonth", paths: ["data"] } }];

export const containerFormulaDemo: Container[] = [
  {
    id: "1",
    name: "FormulaDemo",
    isArray: false,
    bins: [
      { ...full, type: "typography", element: { text: "Formula", variant: "h3" } },
      {
        ...full,
        type: "typography",
        element: {
          variant: "body2",
          color: "gray",
          text: "Every value on this page is a typography whose value is an inline formula — what the studio's Formula tile drops — reading the form as you type and shown through its output format.",
        },
      },

      ...section("Arithmetic", "+ − × ÷ with parentheses, ROUND, and a currency format. Blank inputs give a blank result, and so does dividing by zero (Per unit with no quantity)."),
      numberField("quantity", "Quantity"),
      numberField("price", "Unit price"),
      numberField("discountPct", "Discount %", { helperText: "0 – 100" }),
      ...metrics(
        [
          { caption: "Subtotal = Quantity × Unit price", value: formula(subtotal, thb) },
          { caption: "Discount = Subtotal × Discount % ÷ 100", value: formula(discount, thb) },
          { caption: "Total = ROUND(Subtotal − Discount, 2)", value: formula(total, thb), weight: "bold" },
          { caption: "Per unit = Total ÷ Quantity", value: formula(op("/", total, field("quantity")), thb) },
        ],
        quarter,
      ),

      ...section("Text", "& joins text; LEN counts characters. A number format on text is ignored, so these keep the default format."),
      textField("firstName", "First name", {}, half),
      textField("lastName", "Last name", {}, half),
      ...metrics(
        [
          { caption: 'First name & " " & Last name', value: formula(op("&", op("&", field("firstName"), lit(" ")), field("lastName"))) },
          { caption: '"Hello, " & First name & "!"', value: formula(op("&", op("&", lit("Hello, "), field("firstName")), lit("!"))) },
          { caption: "LEN(First name) + LEN(Last name)", value: formula(op("+", fn("LEN", field("firstName")), fn("LEN", field("lastName"))), integer) },
        ],
        third,
      ),

      ...section("Functions", "MIN, MAX and ABS over two numbers; DAYS between a date field and TODAY(); TODAY() alone with a date format."),
      numberField("low", "Low"),
      numberField("high", "High"),
      {
        ...third,
        type: "datepicker",
        element: { name: "startDate", label: "Start date", dataType: "date", placeholder: "Pick a date" } as Bin["element"],
      },
      ...metrics(
        [
          { caption: "MIN(Low, High)", value: formula(fn("MIN", field("low"), field("high"))) },
          { caption: "MAX(Low, High)", value: formula(fn("MAX", field("low"), field("high"))) },
          { caption: "ABS(Low − High)", value: formula(fn("ABS", op("-", field("low"), field("high")))) },
        ],
        third,
      ),
      ...metrics(
        [
          { caption: "DAYS(Start date, TODAY())", value: formula(fn("DAYS", field("startDate"), fn("TODAY")), integer) },
          { caption: "TODAY()", value: formula(fn("TODAY"), { type: "date", pattern: "DD MMM YYYY" }) },
        ],
        half,
      ),

      ...section("Lists", "COUNT and SUM read a list: here the page load $sales, twelve months of orders and revenue. SUM takes the list and the field to add up."),
      ...metrics(
        [
          { caption: "COUNT($sales)", value: formula(fn("COUNT", sales), integer) },
          { caption: "SUM($sales, 'orders')", value: formula(fn("SUM", sales, lit("orders")), integer) },
          { caption: "SUM($sales, 'revenue')", value: formula(fn("SUM", sales, lit("revenue")), thb) },
          { caption: "SUM($sales, 'revenue') ÷ COUNT($sales)", value: formula(op("/", fn("SUM", sales, lit("revenue")), fn("COUNT", sales)), thb), weight: "bold" },
        ],
        quarter,
      ),

      ...section("Blanks and errors", "The same arithmetic with the other policies: blanks counted as 0, and an error (a dash with the reason as a tooltip) on dividing by zero."),
      ...metrics(
        [
          { caption: "Quantity × Unit price, blanks as 0", value: formula(subtotal, thb, { onEmpty: "zero" }) },
          { caption: "Unit price ÷ Discount %, error on ÷ 0", value: formula(op("/", field("price"), field("discountPct")), { type: "number", decimals: 2 }, { onDivideByZero: "error" }) },
        ],
        half,
      ),

      ...section("Your own formula", "The formula element: click the value (or the pencil) to write a formula over this page in the studio's editor — the Insert list, a formula bar that completes what you type, Show as, and Try it with sample values. It is kept in this browser (localStorage) per page and element; Reset returns to the configured one. The second starts empty and forgets on reload."),
      {
        ...half,
        type: "formula",
        element: { name: "myTotal", label: "Total with 7 % VAT", formula: op("*", total, lit(1.07)), format: thb },
      },
      {
        ...half,
        type: "formula",
        element: { name: "scratch", label: "Scratch", placeholder: "Click to write a formula", persist: "session", variant: "h4" },
      },
    ],
    ...DEFAULT_CONTAINER_GRID,
    gap: "4",
  },
];
