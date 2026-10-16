import type { Bin, Container } from "@gummy-ui/ui";
import { DEFAULT_CONTAINER_GRID } from "@gummy-ui/ui";

/**
 * Custom actions demo page (`/custom-actions`): button action chains that
 * call functions coded in this app (`src/actions.ts`, mounted through
 * `<ActionsProvider>` in App.tsx) by name — `"fn:<name>"` inline in `actions`,
 * at any position, beside the built-in actions.
 *
 * Sections: a counter (`fn:increase` / `fn:increaseBy5` / `fn:reset` writing
 * the form), a guarded submit (`fn:checkStock` returns `false` and vetoes
 * the `SubmitFormToPostAPI` after it), a repeater whose per-item button gets
 * the item as `ctx.row`, the page-data / contextData readers, an async step,
 * a throwing step surfaced by `snackbarError: "$exception"`, a confirm box
 * whose branches are custom actions, and an unregistered name that warns and
 * is skipped while the rest of the chain still runs.
 */
const full = { sm: "12", md: "12", lg: "12", xl: "12" } as const;
const third = { sm: "12", md: "4", lg: "4", xl: "4" } as const;
const quarter = { sm: "6", md: "3", lg: "3", xl: "3" } as const;

const section = (text: string, caption: string): Bin[] => [
  { ...full, type: "typography", element: { text, variant: "subtitle1", weight: "medium" } },
  { ...full, type: "typography", element: { text: caption, variant: "body2", color: "gray" } },
];

const button = (label: string, element: Record<string, unknown>, span: Record<string, string> = quarter): Bin => ({
  ...(span as typeof quarter),
  type: "button",
  justifySelf: "start",
  alignSelf: "end",
  element: { label, variant: "outlined", ...element } as Bin["element"],
});

/** One region card: the item's name and a button whose action reads it as `ctx.row`. */
const regionCard: Container = {
  id: "custom-actions-region",
  name: "CustomActionsRegion",
  isArray: false,
  bins: [
    { sm: "12", md: "8", lg: "8", xl: "8", type: "typography", element: { text: "Region", value: { type: "row", key: "name" }, variant: "subtitle2", weight: "medium" } },
    {
      sm: "12", md: "4", lg: "4", xl: "4",
      type: "button",
      justifySelf: "end",
      element: { label: "Log this region", icon: "terminal", variant: "text", actions: ["fn:logRow"] },
    },
  ],
  ...DEFAULT_CONTAINER_GRID,
  gap: "2",
};

export const containerCustomActionsDemo: Container[] = [
  {
    id: "1",
    name: "CustomActionsDemo",
    isArray: false,
    bins: [
      { ...full, type: "typography", element: { text: "Custom actions", variant: "h3" } },
      {
        ...full,
        type: "typography",
        element: {
          variant: "body2",
          color: "gray",
          text: "Behaviour coded in the app (src/actions.ts), registered once through <ActionsProvider actions={…}> and named inline in a button's action chain as \"fn:<name>\". Each function receives one ActionContext: the form, the repeater item, the page-data slices, snackbar, loading, navigation and the fn registry.",
        },
      },

      ...section("Counter", "fn:increase / fn:increaseBy5 / fn:reset write the form through ctx.form.setValue. A variation is another registered name — no config-side arguments in v1."),
      {
        ...third,
        type: "textfield",
        element: { name: "count", label: "Count", dataType: "number", isRequired: false, errorMessage: "" },
      },
      button("Increase", { icon: "puls", actions: ["fn:increase"] }, { sm: "4", md: "2", lg: "2", xl: "2" }),
      button("+5", { actions: ["fn:increaseBy5"] }, { sm: "4", md: "2", lg: "2", xl: "2" }),
      button("Reset", { icon: "refresh", variant: "text", actions: ["fn:reset"] }, { sm: "4", md: "2", lg: "2", xl: "2" }),

      ...section("Guard a submit", "Save runs [StartLoading, fn:checkStock, SubmitFormToPostAPI, StopLoading]. With stock at 0 the guard returns false: the chain ends there (loader stopped, nothing submitted). Set a positive stock and Save validates and reports."),
      {
        ...third,
        type: "textfield",
        element: { name: "stock", label: "Stock", dataType: "number", isRequired: true, errorMessage: "Stock is required" },
      },
      button("Save", {
        icon: "save",
        variant: "contained",
        // No `api`: the submit validates and reports; nothing is sent.
        actions: ["StartLoading", "fn:checkStock", "SubmitFormToPostAPI", "StopLoading"],
        snackbarSuccess: { type: "success", message: "Saved — fn:checkStock let the submit through" },
      }),

      ...section("The item in a repeater", "A button inside a repeater's template gets the enclosing item as ctx.row — fn:logRow shows the region's name and country count, and logs the whole item to the console."),
      {
        ...full,
        type: "repeater",
        element: {
          name: "customActionRegions",
          idKey: "_id",
          api: { name: "regions", paths: ["data"] },
          itemContainer: regionCard,
          itemSpan: { sm: "12", md: "6", lg: "4", xl: "4" },
          gap: "3",
          itemSurface: "outlined",
          itemPadding: "3",
          emptyText: "No regions",
        },
      },

      ...section("State, async, errors", "fn:describeState reads the global lookups slice (ctx.state.get) and the DataProvider map; fn:wait is async and the chain waits; fn:fail throws, and snackbarError: \"$exception\" shows the message like an API failure."),
      button("Describe state", { icon: "database", actions: ["fn:describeState"] }),
      button("Wait, then reset", { icon: "refresh", actions: ["StartLoading", "fn:wait", "fn:reset", "StopLoading"] }),
      button("Fail", { icon: "x", actions: ["StartLoading", "fn:fail", "StopLoading"], snackbarError: "$exception" }),

      ...section("Confirm branches", "Both ConfirmBox branches take custom actions: Yes runs fn:reset, No runs fn:increase."),
      button("Reset with confirm", {
        icon: "trash",
        actions: ["ConfirmBox"],
        confirmBox: { title: "Reset the counter?", description: "Yes resets it (fn:reset); No bumps it instead (fn:increase).", True: ["fn:reset"], False: ["fn:increase"] },
      }),

      ...section("Unregistered name", "[fn:notRegistered, fn:increase] — the first name isn't in the registry: the engine warns in the console and skips it, and the counter still increases."),
      button("Skip missing, then increase", { icon: "puls", actions: ["fn:notRegistered", "fn:increase"] }),
    ],
    ...DEFAULT_CONTAINER_GRID,
    gap: "4",
  },
];
