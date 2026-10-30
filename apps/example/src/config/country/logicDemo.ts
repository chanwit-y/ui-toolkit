import type { Bin, Container, DataTableColumnDef } from "@gummy-ui/ui";
import { DEFAULT_CONTAINER_GRID } from "@gummy-ui/ui";

/**
 * Logic demo page (`/logic`): formulas and rules in the config (see
 * `spec/gummy-logic-spec.md`; the saved items are in ./logic.ts).
 *
 * 1. **Order line** — `Subtotal` and `Total` are computed fields
 *    (`valueMode: "computed"`: locked, recalculated as Qty / Unit price
 *    change, submitted); the discount rate is a tiered rule; a typography
 *    joins text with `&`.
 * 2. **Show when** — *Company name* only for a Business customer (a saved
 *    boolean rule as the bin's `condition`). Hidden, it is neither validated
 *    nor sent: Save goes through with it blank while Personal is picked.
 * 3. **Enabled when** — *Discount code* only once the subtotal reaches 5,000;
 *    Save only while *Accept the terms* is on.
 * 4. **Table** — a computed *Density* column (a saved formula over `row`
 *    refs), *Member for* in days (`DAYS(joined_at, TODAY())`), and a row tone
 *    from a nested AND / OR condition.
 */
const full = { sm: "12", md: "12", lg: "12", xl: "12" } as const;
const half = { sm: "12", md: "6", lg: "6", xl: "6" } as const;
const third = { sm: "12", md: "4", lg: "4", xl: "4" } as const;

const section = (text: string, caption: string): Bin[] => [
  { ...full, type: "typography", element: { text, variant: "subtitle1", weight: "medium" } },
  { ...full, type: "typography", element: { text: caption, variant: "body2", color: "gray" } },
];

const textField = (name: string, label: string, extra: Record<string, unknown> = {}, span: Record<string, string> = third): Bin => ({
  ...(span as typeof third),
  type: "textfield",
  element: { name, label, dataType: "string", isRequired: false, errorMessage: `${label} is required`, ...extra } as Bin["element"],
});

const numberField = (name: string, label: string, extra: Record<string, unknown> = {}): Bin =>
  textField(name, label, { dataType: "number", type: "number", ...extra });

const countriesApi = {
  name: "countries",
  paths: ["data"],
  body: {
    collectionId: { type: "value", key: "collectionId", value: "691e9963992636eb1560eadb" },
    offset: { type: "value", key: "offset", value: 0 },
    limit: { type: "value", key: "limit", value: 100 },
  },
};

const column = (accessor: string, header: string, extra: Partial<DataTableColumnDef> = {}): DataTableColumnDef => ({
  accessor,
  header,
  enableSorting: true,
  enableColumnFilter: false,
  ...extra,
});

export const containerLogicDemo: Container[] = [
  {
    id: "1",
    name: "LogicDemo",
    isArray: false,
    bins: [
      { ...full, type: "typography", element: { text: "Logic", variant: "h3" } },
      {
        ...full,
        type: "typography",
        element: {
          variant: "body2",
          color: "gray",
          text: "Formulas compute a value, rules pick one (IF / ELSE IF / ELSE), conditions show, hide, enable or style — all in the config, reading the form as you type.",
        },
      },

      ...section("Order line", "Subtotal and Total are computed fields: locked, recalculated as you type, sent with the form. The discount is a tiered rule (5 % from 5,000, 10 % from 10,000); Total adds 7 % VAT. Below the inputs: the discount rate (a rule shown with its percent format), the formatted total, and a line joining text with &."),
      numberField("qty", "Qty", { isRequired: true }),
      numberField("unitPrice", "Unit price", { isRequired: true }),
      numberField("subtotal", "Subtotal", { valueMode: "computed", value: { type: "formula", key: "none", formula: "subtotal" } }),
      {
        ...third,
        type: "typography",
        // A rule as a value: its result through the rule's own percent format.
        element: { text: "", variant: "h5", value: { type: "formula", key: "none", formula: "discountRate" } },
      },
      {
        ...third,
        type: "typography",
        element: { text: "", variant: "h5", weight: "bold", value: { type: "formula", key: "none", formula: "total" } },
      },
      {
        ...full,
        type: "typography",
        element: {
          text: "",
          variant: "body2",
          color: "gray",
          value: {
            type: "formula",
            key: "none",
            expr: { op: "&", args: [{ op: "&", args: [{ lit: "Qty " }, { ref: "field", key: "qty" }] }, { op: "&", args: [{ lit: " × " }, { ref: "field", key: "unitPrice" }] }] },
          },
        },
      },
      numberField("total", "Total (raw, submitted)", {
        valueMode: "computed",
        value: { type: "formula", key: "none", expr: { fn: "ROUND", args: [{ formula: "total" }, { lit: 2 }] } },
      }),

      ...section("Show when", "Company name shows only for a Business customer — the bin's condition is the saved boolean rule isBusiness. While hidden it is neither validated nor sent, so Save goes through with it blank."),
      {
        ...half,
        type: "radio",
        element: {
          name: "customerType",
          label: "Customer",
          dataType: "string",
          isRequired: true,
          orientation: "horizontal",
          defaultValue: "Personal",
          options: [
            { value: "Personal", label: "Personal" },
            { value: "Business", label: "Business" },
          ],
        } as Bin["element"],
      },
      { ...textField("company", "Company name", { isRequired: true }, half), condition: { rule: "isBusiness" } },

      ...section("Enabled when", "Discount code unlocks once the subtotal reaches 5,000. Save is clickable only while Accept the terms is on; a disabled field is not validated but is still sent."),
      textField("discountCode", "Discount code", {
        helperText: "Needs a subtotal of 5,000",
        enabledWhen: { cmp: "gte", left: { formula: "subtotal" }, right: { lit: 5000 } },
      }, half),
      {
        ...half,
        type: "switch",
        element: { name: "accept", label: "Accept the terms", dataType: "boolean", isRequired: false, errorMessage: "" } as Bin["element"],
      },
      {
        ...half,
        type: "button",
        justifySelf: "start",
        element: {
          label: "Save order",
          icon: "save",
          actions: ["SubmitFormToPostAPI"],
          api: { name: "createLogicOrder" },
          enabledWhen: { cmp: "eq", left: { ref: "field", key: "accept" }, right: { lit: true } },
          snackbarSuccess: { type: "success", message: "Order saved — see the request payload" },
          snackbarError: "$exception",
        },
      },

      ...section("Table", "Density is a computed column (population ÷ area, a saved formula over row refs); Member for counts days since joined_at with DAYS(…, TODAY()). Rows are tinted green when growth > 2 % and density > 100, or the country is landlocked."),
      {
        ...full,
        type: "datatable",
        justifySelf: "stretch",
        alignSelf: "start",
        element: {
          name: "logicCountries",
          title: "Countries",
          api: countriesApi,
          canSearch: true,
          columns: [
            column("name", "Country"),
            column("population", "Population", { format: { type: "number" } }),
            column("area_km2", "Area (km²)", { format: { type: "number" } }),
            column("density", "Density", { value: { type: "formula", key: "none", formula: "density" }, format: { type: "number", decimals: 1 } }),
            column("growth", "Growth", { format: { type: "percent", decimals: 1 } }),
            column("memberDays", "Member for (days)", {
              value: { type: "formula", key: "none", expr: { fn: "DAYS", args: [{ ref: "row", key: "joined_at" }, { fn: "TODAY", args: [] }] } },
              format: { type: "number" },
            }),
            column("landlocked", "Landlocked", { format: { type: "boolean", trueLabel: "Yes", falseLabel: "No" } }),
          ],
          rowStyles: [
            {
              when: {
                any: [
                  {
                    all: [
                      { cmp: "gt", left: { ref: "row", key: "growth" }, right: { lit: 0.02 } },
                      { cmp: "gt", left: { formula: "density" }, right: { lit: 100 } },
                    ],
                  },
                  { cmp: "eq", left: { ref: "row", key: "landlocked" }, right: { lit: true } },
                ],
              },
              tone: "grass",
              fill: true,
            },
          ],
        } as Bin["element"],
      },
    ],
    ...DEFAULT_CONTAINER_GRID,
    gap: "4",
  },
];
