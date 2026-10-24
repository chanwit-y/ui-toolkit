import type { TActionMaster } from "@gummy-ui/ui";

/**
 * Custom button actions: functions a config names inline in a button's action
 * chain as `"fn:<name>"`. Each gets the engine's ActionContext (form, row,
 * state, api, snackbar, navigate…); `return false` ends the chain.
 *
 * The names must match `customActions` in gummy/projects/book-shop/project.json
 * (declared on the studio's Env page) — <GummyApp> warns at mount about a name
 * the project uses that is missing here.
 */
export const actions: TActionMaster = {
  /** Order page → Print: the browser's print dialog over the order on screen. */
  printOrder: async ({ state, snackbar }) => {
    const number = state.get("order", "number");
    if (typeof number !== "string" || !number) {
      snackbar("warning", "Open an order first.");
      return false;
    }
    window.print();
  },
};
