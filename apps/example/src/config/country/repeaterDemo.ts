import type { Bin, Container } from "@gummy-ui/ui";
import { DEFAULT_CONTAINER_GRID } from "@gummy-ui/ui";

/**
 * Repeater demo page (`/repeater`). Two `repeater` bins:
 *
 * - **Country cards** — own fetch (`countries`, rows at `data`). The
 *   `countryCard` template renders once per country: the components inside
 *   bind to the current item with `type:"row"` DataValues (avatar `srcValue`,
 *   typography `value`). `itemSpan` lays the cards out 1 / 2 / 3 / 4 per row,
 *   `itemSurface` draws the card, and `itemNavigate` makes the whole card a
 *   link to the country's detail page (`:id` ← the item's `_id`).
 * - **Regions** — own fetch (`regions`); each region item hosts a **nested**
 *   repeater whose array is already in scope: `items: { type:"row",
 *   key:"countries" }`. A bin `condition` on `row.featured` shows the badge
 *   only for featured regions, and a per-item `Navigate` button reads the
 *   inner item's `_id`. Antarctica has no countries — the nested `emptyText`.
 */
const countryCard: Container = {
  id: "country-card",
  name: "CountryCard",
  isArray: false,
  bins: [
    {
      sm: "3", md: "3", lg: "3", xl: "3",
      type: "avatar",
      element: {
        name: "flag",
        size: "lg",
        fallback: "?",
        srcValue: { type: "row", key: "avatar" },
        fallbackValue: { type: "row", key: "code" },
      },
    },
    {
      sm: "9", md: "9", lg: "9", xl: "9",
      type: "container",
      container: {
        id: "country-card-text",
        name: "CountryCardText",
        isArray: false,
        bins: [
          {
            sm: "12", md: "12", lg: "12", xl: "12",
            type: "typography",
            element: {
              variant: "subtitle1",
              weight: "medium",
              truncate: true,
              text: "Unnamed country",
              value: { type: "row", key: "name" },
            },
          },
          {
            sm: "12", md: "12", lg: "12", xl: "12",
            type: "typography",
            element: {
              variant: "caption",
              color: "gray",
              text: "—",
              value: { type: "row", key: "code" },
            },
          },
        ],
        ...DEFAULT_CONTAINER_GRID,
        gap: "0",
      },
    },
  ],
  ...DEFAULT_CONTAINER_GRID,
  alignItems: "center",
};

const countryCardsBin: Bin = {
  sm: "12", md: "12", lg: "12", xl: "12",
  type: "repeater",
  element: {
    name: "countryCards",
    title: "Country cards",
    idKey: "_id",
    api: {
      name: "countries",
      paths: ["data"],
      body: {
        collectionId: { type: "value", key: "collectionId", value: "691e9963992636eb1560eadb" },
      },
    },
    itemContainer: countryCard,
    itemSpan: { sm: "12", md: "6", lg: "4", xl: "3" },
    gap: "4",
    itemSurface: "outlined",
    itemPadding: "3",
    itemNavigate: {
      page: "countryDetail",
      params: { id: { type: "row", key: "_id" } },
    },
    emptyText: "No countries yet",
  },
};

/** One country inside a region: a row with a per-item Navigate button. */
const regionCountryRow: Container = {
  id: "region-country-row",
  name: "RegionCountryRow",
  isArray: false,
  bins: [
    {
      sm: "2", md: "2", lg: "2", xl: "2",
      type: "avatar",
      element: {
        name: "flag",
        size: "sm",
        srcValue: { type: "row", key: "avatar" },
        fallbackValue: { type: "row", key: "code" },
      },
    },
    {
      sm: "6", md: "6", lg: "6", xl: "6",
      type: "typography",
      element: {
        variant: "body2",
        truncate: true,
        value: { type: "row", key: "name" },
      },
    },
    {
      sm: "4", md: "4", lg: "4", xl: "4",
      type: "button",
      align: "end",
      element: {
        label: "Open",
        icon: "chevronRight",
        actions: ["Navigate"],
        navigate: {
          page: "countryDetail",
          params: { id: { type: "row", key: "_id" } },
        },
      },
    },
  ],
  ...DEFAULT_CONTAINER_GRID,
  alignItems: "center",
};

const regionCard: Container = {
  id: "region-card",
  name: "RegionCard",
  isArray: false,
  bins: [
    {
      sm: "8", md: "8", lg: "8", xl: "8",
      type: "typography",
      element: {
        variant: "h6",
        value: { type: "row", key: "name" },
      },
    },
    {
      // Only featured regions show the badge: conditions see `{ row, index }`.
      sm: "4", md: "4", lg: "4", xl: "4",
      type: "typography",
      align: "end",
      condition: {
        left: { key: "row", path: "featured" },
        operator: "eq",
        right: { val: true },
      },
      element: {
        variant: "overline",
        color: "amber",
        text: "Featured",
      },
    },
    {
      sm: "12", md: "12", lg: "12", xl: "12",
      type: "typography",
      element: {
        variant: "body2",
        color: "gray",
        value: { type: "row", key: "description" },
      },
    },
    {
      sm: "12", md: "12", lg: "12", xl: "12",
      type: "divider",
      justifySelf: "stretch",
      element: { variant: "fullWidth", spacing: "4px" },
    },
    {
      sm: "12", md: "12", lg: "12", xl: "12",
      type: "repeater",
      element: {
        name: "regionCountries",
        idKey: "_id",
        // The array is already in scope: a field of the enclosing region item.
        items: { type: "row", key: "countries" },
        itemContainer: regionCountryRow,
        gap: "2",
        emptyText: "No countries in this region",
      },
    },
  ],
  ...DEFAULT_CONTAINER_GRID,
};

const regionsBin: Bin = {
  sm: "12", md: "12", lg: "12", xl: "12",
  type: "repeater",
  element: {
    name: "regions",
    title: "Regions (nested repeater)",
    idKey: "_id",
    api: { name: "regions", paths: ["data"] },
    itemContainer: regionCard,
    itemSpan: { sm: "12", md: "6", lg: "6", xl: "6" },
    gap: "4",
    itemSurface: "elevation",
    emptyText: "No regions",
  },
};

export const containerRepeaterDemo: Container[] = [
  {
    id: "1",
    name: "RepeaterDemo",
    isArray: false,
    bins: [
      {
        sm: "12", md: "12", lg: "12", xl: "12",
        type: "typography",
        element: { text: "Repeater", variant: "h3" },
      },
      {
        sm: "12", md: "12", lg: "12", xl: "12",
        type: "typography",
        element: {
          variant: "body2",
          color: "gray",
          text: "One item template rendered per API row; the components inside bind to the current item.",
        },
      },
      countryCardsBin,
      regionsBin,
    ],
    ...DEFAULT_CONTAINER_GRID,
    gap: "6",
  },
];
