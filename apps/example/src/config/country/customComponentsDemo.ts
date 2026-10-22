import type { Bin, Container, PageLoad } from "@gummy-ui/ui";
import { DEFAULT_CONTAINER_GRID } from "@gummy-ui/ui";

/**
 * Custom components demo page (`/custom-components`): React components coded
 * in this app (`src/components/custom/*`, registered in `src/customComponents.ts`
 * through `<ComponentsProvider>` in App.tsx) placed by `custom` Bins.
 *
 * Sections, one per aspect of the contract: static `props` (StatBadge ×3), a
 * bound `value` over a skeleton-mode page load with the `loading` flag
 * (Sparkline), the enclosing repeater item as `row` + `navigate` (CountryChip),
 * the failure modes (an unregistered name → placeholder, a throwing component
 * → its own cell only), and a bin `condition` on page data hiding one instance.
 */
const full = { sm: "12", md: "12", lg: "12", xl: "12" } as const;
const half = { sm: "12", md: "6", lg: "6", xl: "6" } as const;
const third = { sm: "12", md: "4", lg: "4", xl: "4" } as const;

const section = (text: string, caption: string): Bin[] => [
  { ...full, type: "typography", element: { text, variant: "subtitle1", weight: "medium" } },
  { ...full, type: "typography", element: { text: caption, variant: "body2", color: "gray" } },
];

const custom = (component: string, element: Record<string, unknown> = {}, span: Record<string, string> = third): Bin => ({
  ...(span as typeof third),
  type: "custom",
  alignSelf: "center",
  element: { component, ...element } as Bin["element"],
});

/** The regions, loaded for this page in skeleton mode: the Sparkline draws its own placeholder meanwhile. */
export const customComponentsLoads: PageLoad[] = [
  { key: "regionsChart", loading: "skeleton", api: { name: "regions", paths: ["data"] } },
];

/** One country item: the chip reads the item as `row`. */
const countryItem: Container = {
  id: "custom-components-country",
  name: "CustomComponentsCountry",
  isArray: false,
  bins: [custom("CountryChip", { props: { showCode: true } }, full)],
  ...DEFAULT_CONTAINER_GRID,
  gap: "2",
};

const loaded = { left: { source: "state", key: "regionsChart", path: "$status" }, operator: "eq", right: { val: "success" } } as const;

export const containerCustomComponentsDemo: Container[] = [
  {
    id: "1",
    name: "CustomComponentsDemo",
    isArray: false,
    bins: [
      { ...full, type: "typography", element: { text: "Custom components", variant: "h3" } },
      {
        ...full,
        type: "typography",
        element: {
          variant: "body2",
          color: "gray",
          text: "React components coded in the app (src/components/custom), registered once through <ComponentsProvider components={…}> and placed by a `custom` Bin naming them. Each receives { props, value, loading, row, navigate, state }: the config's props verbatim, one bound value, the skeleton flag, the repeater item, and page navigation.",
        },
      },

      ...section("Static props", "Three StatBadge instances differing only in props (label / tone / big). A select-kind prop in the studio, a plain string here."),
      custom("StatBadge", { props: { label: "Countries", tone: "accent" }, value: { type: "value", key: "n", value: 12 } }),
      custom("StatBadge", { props: { label: "Regions", tone: "green", big: true }, value: { type: "value", key: "n", value: 4 } }),
      custom("StatBadge", { props: { label: "Unbound", tone: "gray" } }),

      ...section("Bound value + loading", "Sparkline over the page load `regionsChart` (skeleton mode): `loading` is true until the regions land, and the component draws its own SkeletonBlock. Reload the page to see it."),
      custom("Sparkline", { props: { countField: "countries", labelField: "name", color: "accent", height: 72 }, value: { type: "state", key: "regionsChart" } }, half),
      custom("Sparkline", { props: { color: "orange", height: 40 }, value: { type: "state", key: "regionsChart" } }, half),

      ...section("Inside a repeater", "CountryChip reads the enclosing item as `row` and opens the detail page through `navigate` — no config on the chip beyond its name."),
      {
        ...full,
        type: "repeater",
        element: {
          name: "customComponentCountries",
          idKey: "_id",
          api: { name: "countries", paths: ["data"], body: { collectionId: { type: "value", key: "collectionId", value: "691e9963992636eb1560eadb" } } },
          itemContainer: countryItem,
          itemSpan: { sm: "6", md: "4", lg: "3", xl: "2" },
          gap: "2",
          emptyText: "No countries",
        },
      },

      ...section("Failure modes", "Left: a name the registry doesn't have — the engine warns and draws the placeholder with the props it was given. Right: a component that throws — its boundary paints the error in its own cell, the rest of the page is unaffected."),
      custom("NotRegistered", { props: { anything: "goes", n: 3 } }, half),
      custom("Broken", { props: { message: "Broken on purpose" } }, half),

      ...section("Conditional", "A bin `condition` on page data: this badge appears only once `regionsChart` has loaded — ContainerGrid handles it like any other bin."),
      { ...custom("StatBadge", { props: { label: "Regions loaded", tone: "green" }, value: { type: "state", key: "regionsChart", path: "length" } }), condition: loaded },
    ],
    ...DEFAULT_CONTAINER_GRID,
    gap: "4",
  },
];
