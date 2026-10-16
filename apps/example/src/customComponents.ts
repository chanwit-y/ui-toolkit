import type { TComponentMaster } from "@gummy-ui/ui";
import { Broken } from "./components/custom/Broken";
import { CountryChip } from "./components/custom/CountryChip";
import { Sparkline } from "./components/custom/Sparkline";
import { StatBadge } from "./components/custom/StatBadge";

/**
 * Custom components: React components that live in this app's code, placed
 * by a config through a `custom` Bin — `{ type: "custom", element: { component:
 * "StatBadge", props: {…}, value: {…} } }`. The registry is handed to
 * `<ComponentsProvider components={components}>` in App.tsx (once, above the
 * routes, beside `<ActionsProvider>`). Every component receives one
 * `CustomComponentProps`: the config's `props` verbatim, the resolved `value`
 * binding, the `loading` flag of a skeleton-mode page load, the enclosing
 * repeater `row`, `navigate` and read-only `state`. An unregistered name draws
 * a placeholder; a throw costs its own cell only. Exercised on the Custom
 * components page (config/country/customComponentsDemo.ts).
 */
export const components: TComponentMaster = {
  StatBadge,
  Sparkline,
  CountryChip,
  Broken,
};
