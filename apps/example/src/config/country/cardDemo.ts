import type { Bin, Container } from "@gummy-ui/ui";
import { DEFAULT_CONTAINER_GRID } from "@gummy-ui/ui";

/**
 * Card demo page (`/card`): the `card` element, after MUI's Card. A card is a
 * Paper with slots in MUI's order — `header` (avatar · title / subheader ·
 * action), `media` (an image band), `content` (nested bins), `actions` (a
 * button row) and `collapse` (bins behind an expand toggle) — plus `navigate`,
 * which makes the whole card a link (MUI's CardActionArea).
 *
 * The sections mirror the MUI page: the basic card, the media card, the
 * "complex interaction" card (avatar, ⋮ menu, media, expand), the action-area
 * card, and — the case the element is for — cards inside a `repeater`, whose
 * header / media bind to the item with `type: "row"` values.
 */
const section = (text: string, caption: string): Bin[] => [
  {
    sm: "12", md: "12", lg: "12", xl: "12",
    type: "typography",
    element: { text, variant: "subtitle1", weight: "medium" },
  },
  {
    sm: "12", md: "12", lg: "12", xl: "12",
    type: "typography",
    element: { text: caption, variant: "body2", color: "gray" },
  },
];

const full = { sm: "12", md: "12", lg: "12", xl: "12" } as const;

const typography = (
  text: string,
  element: Record<string, unknown> = {},
): Bin => ({
  ...full,
  type: "typography",
  element: { text, variant: "body2", ...element } as Bin["element"],
});

/** MUI's "basic card" body: an overline, a headline, a caption and a paragraph. */
const wordOfTheDay: Container = {
  id: "card-word",
  name: "CardWord",
  isArray: false,
  bins: [
    typography("Word of the Day", { variant: "caption", color: "gray" }),
    typography("be•nev•o•lent", { variant: "h5" }),
    typography("adjective", { variant: "body2", color: "gray" }),
    typography("well meaning and kindly. \"a benevolent smile\"", { variant: "body2" }),
  ],
  ...DEFAULT_CONTAINER_GRID,
  gap: "1",
};

const lizard: Container = {
  id: "card-lizard",
  name: "CardLizard",
  isArray: false,
  bins: [
    typography("Lizard", { variant: "h5" }),
    typography(
      "Lizards are a widespread group of squamate reptiles, with over 6,000 species, ranging across all continents except Antarctica.",
      { variant: "body2", color: "gray" },
    ),
  ],
  ...DEFAULT_CONTAINER_GRID,
  gap: "1",
};

const paella: Container = {
  id: "card-paella",
  name: "CardPaella",
  isArray: false,
  bins: [
    typography(
      "This impressive paella is a perfect party dish and a fun meal to cook together with your guests. Add 1 cup of frozen peas along with the mussels, if you like.",
      { variant: "body2", color: "gray" },
    ),
  ],
  ...DEFAULT_CONTAINER_GRID,
};

const paellaMethod: Container = {
  id: "card-paella-method",
  name: "CardPaellaMethod",
  isArray: false,
  bins: [
    typography("Method:", { variant: "subtitle2" }),
    typography(
      "Heat 1/2 cup of the broth in a pot until simmering, add saffron and set aside for 10 minutes.",
      { variant: "body2" },
    ),
    typography(
      "Heat oil in a paella pan or a large, deep skillet over medium-high heat. Add chicken, shrimp and chorizo, and cook, stirring occasionally until lightly browned, 6 to 8 minutes.",
      { variant: "body2" },
    ),
    typography("Set aside off of the heat to let rest for 10 minutes, and then serve.", { variant: "body2" }),
  ],
  ...DEFAULT_CONTAINER_GRID,
  gap: "2",
};

/** The ⋮ menu of the complex card: a popover with two Navigate buttons. */
const cardMenu: Container = {
  id: "card-menu",
  name: "CardMenu",
  isArray: false,
  bins: [
    {
      ...full,
      type: "button",
      element: { label: "Open countries", icon: "list", variant: "text", actions: ["Navigate"], navigate: { page: "countryList" } },
    },
    {
      ...full,
      type: "button",
      element: { label: "Open repeater", icon: "grid", variant: "text", actions: ["Navigate"], navigate: { page: "repeaterDemo" } },
    },
  ],
  ...DEFAULT_CONTAINER_GRID,
  gap: "1",
};

/** The body of one country card in the repeater: the code and the last editor, bound to the item. */
const countryCardBody: Container = {
  id: "card-country-body",
  name: "CardCountryBody",
  isArray: false,
  bins: [
    {
      ...full,
      type: "typography",
      element: { variant: "body2", color: "gray", text: "—", value: { type: "row", key: "updated_by_name" } },
    },
  ],
  ...DEFAULT_CONTAINER_GRID,
};

const countryCard: Container = {
  id: "card-country-item",
  name: "CardCountryItem",
  isArray: false,
  bins: [
    {
      ...full,
      type: "card",
      element: {
        name: "countryCard",
        variant: "outlined",
        header: {
          title: "Unnamed country",
          titleValue: { type: "row", key: "name" },
          subheader: "—",
          subheaderValue: { type: "row", key: "code" },
          avatar: { size: "md", fallback: "?", srcValue: { type: "row", key: "avatar" }, fallbackValue: { type: "row", key: "code" } },
        },
        media: { height: 120, alt: "Flag", srcValue: { type: "row", key: "image" } },
        content: countryCardBody,
        actions: [
          {
            label: "Open",
            icon: "chevronRight",
            variant: "text",
            actions: ["Navigate"],
            navigate: { page: "countryDetail", params: { id: { type: "row", key: "_id" } } },
          },
        ],
        actionsAlign: "end",
      } as Bin["element"],
    },
  ],
  ...DEFAULT_CONTAINER_GRID,
};

export const containerCardDemo: Container[] = [
  {
    id: "1",
    name: "CardDemo",
    isArray: false,
    bins: [
      { ...full, type: "typography", element: { text: "Card", variant: "h3" } },
      {
        ...full,
        type: "typography",
        element: {
          variant: "body2",
          color: "gray",
          text: "A card is a Paper with slots: header (avatar, title, subheader, action), media, content (nested bins), actions (a button row) and collapse (bins behind an expand toggle). Every slot is optional; a title, subheader or image can be bound with a DataValue, and navigate makes the whole card a link.",
        },
      },

      ...section("Basic card", "An outlined card with nested typography bins in content and one text button in actions."),
      {
        sm: "12", md: "6", lg: "4", xl: "4",
        type: "card",
        alignSelf: "stretch",
        element: {
          name: "cardBasic",
          variant: "outlined",
          content: wordOfTheDay,
          actions: [{ label: "Learn more", variant: "text", actions: ["Navigate"], navigate: { page: "repeaterDemo" } }],
        } as Bin["element"],
      },
      {
        sm: "12", md: "6", lg: "4", xl: "4",
        type: "card",
        alignSelf: "stretch",
        element: {
          name: "cardElevated",
          elevation: 3,
          header: { title: "Elevated card", subheader: "elevation: 3 — no media, no actions" },
          content: wordOfTheDay,
        } as Bin["element"],
      },

      ...section("Media", "media draws an image band at the configured height; with a header it sits below it, otherwise at the top. Text buttons in actions, aligned end."),
      {
        sm: "12", md: "6", lg: "4", xl: "4",
        type: "card",
        alignSelf: "stretch",
        element: {
          name: "cardMedia",
          media: { src: "https://flagcdn.com/w640/au.png", alt: "Australia", height: 140 },
          content: lizard,
          actions: [
            { label: "Share", icon: "share", variant: "text", actions: [] },
            { label: "Learn more", variant: "text", actions: ["Navigate"], navigate: { page: "countryDetail", params: { id: { type: "value", key: "id", value: "34" } } } },
          ],
        } as Bin["element"],
      },
      {
        sm: "12", md: "6", lg: "4", xl: "4",
        type: "card",
        alignSelf: "stretch",
        element: {
          name: "cardMediaMissing",
          variant: "outlined",
          media: { src: "https://example.invalid/missing.png", alt: "A missing image", height: 140 },
          header: { title: "Missing image", subheader: "The band falls back to a placeholder" },
        } as Bin["element"],
      },

      ...section(
        "Complex interaction",
        "MUI's recipe: an avatar and a ⋮ header action (an icon-only button — label \"\" + icon), media, content, a footer with icon buttons and the expand toggle, and a collapse section that opens under it. Beside it, a card as a popover trigger: any element type can open a popover, so a card can be the menu's trigger as well as host one in its ⋮.",
      ),
      {
        sm: "12", md: "8", lg: "5", xl: "4",
        type: "card",
        element: {
          name: "cardComplex",
          header: {
            title: "Shrimp and Chorizo Paella",
            subheader: "September 14, 2016",
            avatar: { size: "md", fallback: "R", src: "" },
            action: {
              label: "",
              icon: "moreVertical",
              variant: "text",
              actions: [],
            },
          },
          media: { src: "https://flagcdn.com/w640/es.png", alt: "Paella", height: 194 },
          content: paella,
          actions: [
            { label: "", icon: "heart", variant: "text", actions: [] },
            { label: "", icon: "share", variant: "text", actions: [] },
          ],
          collapse: paellaMethod,
          collapseLabel: "Show method",
        } as Bin["element"],
      },
      {
        sm: "12", md: "8", lg: "5", xl: "4",
        type: "popover",
        element: {
          container: cardMenu,
          placement: "bottom-start",
          trigger: {
            type: "card",
            element: {
              name: "cardMenuTrigger",
              variant: "outlined",
              header: { title: "A card as a popover trigger", subheader: "Click anywhere on it" },
              content: {
                id: "card-menu-trigger-body",
                name: "CardMenuTriggerBody",
                isArray: false,
                bins: [typography("The popover's trigger can be any element type, so a card opens a menu just like the ⋮ button would.", { color: "gray" })],
                ...DEFAULT_CONTAINER_GRID,
              },
            },
          },
        } as Bin["element"],
      },

      ...section("Action area", "navigate makes the whole card a link (role=link, Enter / Space); the buttons inside keep their own click."),
      {
        sm: "12", md: "6", lg: "4", xl: "4",
        type: "card",
        alignSelf: "stretch",
        element: {
          name: "cardActionArea",
          variant: "outlined",
          media: { src: "https://flagcdn.com/w640/th.png", alt: "Thailand", height: 140 },
          content: {
            id: "card-action-area-body",
            name: "CardActionAreaBody",
            isArray: false,
            bins: [typography("Thailand", { variant: "h5" }), typography("Click the card to open the country's detail page.", { color: "gray" })],
            ...DEFAULT_CONTAINER_GRID,
            gap: "1",
          },
          navigate: { page: "countryDetail", params: { id: { type: "value", key: "id", value: "1" } } },
        } as Bin["element"],
      },
      {
        sm: "12", md: "6", lg: "4", xl: "4",
        type: "card",
        alignSelf: "stretch",
        element: {
          name: "cardActionAreaButtons",
          variant: "outlined",
          header: { title: "Link card with buttons", subheader: "The card navigates; the button below does its own thing" },
          content: {
            id: "card-action-area-buttons-body",
            name: "CardActionAreaButtonsBody",
            isArray: false,
            bins: [typography("Clicking the Share button must not follow the card's link.", { color: "gray" })],
            ...DEFAULT_CONTAINER_GRID,
          },
          actions: [{ label: "Share", icon: "share", variant: "text", actions: ["ConfirmBox"], confirmBox: { title: "Share", description: "The button's own click — the card's link was not followed.", True: [], False: [] } }],
          navigate: { page: "countryDetail", params: { id: { type: "value", key: "id", value: "3" } } },
        } as Bin["element"],
      },

      ...section(
        "Cards in a repeater",
        "One card per country: the header title / subheader / avatar and the media bind to the item with { type: \"row\" } values, the content bins too, and the Open button navigates with the item's _id.",
      ),
      {
        ...full,
        type: "repeater",
        element: {
          name: "countryCards",
          idKey: "_id",
          api: {
            name: "countries",
            paths: ["data"],
            body: { collectionId: { type: "value", key: "collectionId", value: "691e9963992636eb1560eadb" } },
          },
          itemContainer: countryCard,
          itemSpan: { sm: "12", md: "6", lg: "4", xl: "3" },
          gap: "4",
          itemSurface: "none",
          itemPadding: "0",
          emptyText: "No countries yet",
        } as Bin["element"],
      },
    ],
    ...DEFAULT_CONTAINER_GRID,
    gap: "5",
  },
];
