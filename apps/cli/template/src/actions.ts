import type { TActionMaster } from "@gummy-ui/ui";

/**
 * Custom button actions: functions a config names inline in a button's action
 * chain as `"fn:<name>"`. Each gets the engine's ActionContext (form, row,
 * state, api, snackbar, navigate…); `return false` ends the chain.
 *
 * The names must match `customActions` in gummy/projects/__KEY__.json — <GummyApp>
 * warns at mount about a name the project uses that is missing here.
 */
export const actions: TActionMaster = {
  greet: async ({ state, snackbar }) => {
    const name = state.get("country", "name");
    snackbar("success", `Hello from ${typeof name === "string" && name ? name : "__NAME__"}!`);
  },
};
