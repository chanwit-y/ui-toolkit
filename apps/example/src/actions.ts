import type { TActionMaster } from "@gummy-ui/ui";

/**
 * Custom button actions: behaviour that lives in this app's code, not in a
 * config. The registry is handed to `<ActionsProvider actions={actions}>` in
 * App.tsx (once, above the routes, like `model` / `api` / `http`), and a
 * config references an entry inline in a button's action chain as
 * `"fn:<name>"` — at any position, as many as it likes:
 *
 *   actions: ["StartLoading", "fn:checkStock", "SubmitFormToPostAPI", "StopLoading"]
 *
 * Every function gets one `ActionContext`: the enclosing form, the nearest
 * repeater item, the DataProvider map, the page-data slices, the button's own
 * endpoint, the fn registry helpers, snackbar / loading / navigate. It may be
 * async; `return false` ends the chain (the loader is stopped); a throw shows
 * through `snackbarError: "$exception"`. An unregistered name warns and is
 * skipped. Exercised on the Custom actions page (config/country/customActionsDemo.ts).
 */
export const actions: TActionMaster = {
  /**
   * The Charts page's grouped / stacked switch: bin `condition`s can read a
   * page-data slice (`source: "state"`) but not a form field, so two buttons
   * write `chartMode` and the two bar charts show by it.
   */
  barGrouped: ({ state }) => state.set("chartMode", "grouped"),
  barStacked: ({ state }) => state.set("chartMode", "stacked"),
  /** Bump the `count` field of the enclosing form. */
  increase: ({ form }) => {
    form.setValue("count", Number(form.getValues().count ?? 0) + 1);
  },
  /** The same, by five — a variation is just another name (no config-side args in v1). */
  increaseBy5: ({ form }) => {
    form.setValue("count", Number(form.getValues().count ?? 0) + 5);
  },
  reset: ({ form, snackbar }) => {
    form.setValue("count", 0);
    snackbar("info", "Counter reset");
  },

  /** A guard in front of a submit: `false` ends the chain, so nothing after it runs. */
  checkStock: ({ form, snackbar }) => {
    const stock = Number(form.getValues().stock ?? 0);
    if (stock <= 0) {
      snackbar("warning", "Out of stock — the submit was vetoed by fn:checkStock");
      return false;
    }
  },

  /** Inside a repeater, `row` is the enclosing item. */
  logRow: ({ row, snackbar }) => {
    const region = row as { name?: string; countries?: unknown[] } | undefined;
    console.log("[example] fn:logRow", row);
    snackbar("info", `${region?.name ?? "?"} — ${region?.countries?.length ?? 0} countries (see the console)`);
  },

  /** Reads the global `lookups` slice (`<GlobalLoads>` in App.tsx) and the DataProvider map. */
  describeState: ({ state, contextData, snackbar }) => {
    const lookups = state.get("lookups") as unknown[] | undefined;
    const status = state.get("lookups", "$status");
    snackbar(
      "info",
      `lookups: ${status} (${lookups?.length ?? 0} regions) · contextData keys: ${Object.keys(contextData).join(", ") || "none"}`,
    );
  },

  /** `ctx.auth`: the signed-in session (see config/country/auth.ts) — here the bearer token's length. */
  tokenLength: async ({ auth, snackbar }) => {
    if (!auth) {
      snackbar("warning", "No <AzureAuth> above the page — ctx.auth is undefined");
      return;
    }
    const token = await auth.getToken();
    snackbar("info", `${auth.email ?? "nobody"} · status ${auth.status} · token: ${token ? `${token.length} chars` : "empty (mock mode)"}`);
  },

  /** Throws: the chain's catch shows the message through `snackbarError: "$exception"`. */
  fail: () => {
    throw new Error("fn:fail threw on purpose");
  },

  /** Async: the chain waits for it before the next step. */
  wait: async ({ snackbar }) => {
    await new Promise((r) => setTimeout(r, 800));
    snackbar("success", "fn:wait finished after 800 ms — the chain continued");
  },
};
