import type { Bin, Container, DrawerAnchor } from "@gummy-ui/ui";
import { DEFAULT_CONTAINER_GRID } from "@gummy-ui/ui";

/**
 * Drawer demo page (`/drawer`): the `drawer` element, after MUI's *temporary*
 * Drawer — a panel that slides in over the page from one edge behind a scrim,
 * holding a self-contained container (its own form, like a modal), opened by
 * any trigger element and closed by the scrim, Esc, its close button or a
 * `CloseModal` button inside it.
 *
 * The sections mirror the MUI page and then show what the engine adds: the
 * four anchors, a form drawer posting to the API, a header-less nav drawer
 * with a custom size, a card as the trigger, and a button elsewhere on the
 * page opening a drawer by id (`OpenModal` + `modalId`).
 */
const full = { sm: "12", md: "12", lg: "12", xl: "12" } as const;

const section = (text: string, caption: string): Bin[] => [
  { ...full, type: "typography", element: { text, variant: "subtitle1", weight: "medium" } },
  { ...full, type: "typography", element: { text: caption, variant: "body2", color: "gray" } },
];

const typography = (text: string, element: Record<string, unknown> = {}): Bin => ({
  ...full,
  type: "typography",
  element: { text, variant: "body2", ...element } as Bin["element"],
});

const divider: Bin = { ...full, type: "divider", justifySelf: "stretch", element: { variant: "fullWidth", spacing: 4 } };

/** MUI's mail list: two groups of entries split by a divider. */
const mailList = (id: string): Container => ({
  id,
  name: `DrawerNav-${id}`,
  isArray: false,
  bins: [
    ...["Inbox", "Starred", "Send email", "Drafts"].map((t) => typography(t, { variant: "body1" })),
    divider,
    ...["All mail", "Trash", "Spam"].map((t) => typography(t, { variant: "body1" })),
  ],
  ...DEFAULT_CONTAINER_GRID,
  gap: "2",
});

/** A drawer bin whose trigger is a button labelled after its anchor. */
const anchorDrawer = (anchor: DrawerAnchor, icon: string): Bin => ({
  sm: "6", md: "3", lg: "3", xl: "3",
  type: "drawer",
  element: {
    id: `drawer-${anchor}`,
    title: anchor[0].toUpperCase() + anchor.slice(1),
    description: `anchor: "${anchor}"`,
    anchor,
    container: mailList(`drawer-nav-${anchor}`),
    trigger: {
      type: "button",
      element: { label: anchor[0].toUpperCase() + anchor.slice(1), icon, variant: "outlined" },
    },
  } as Bin["element"],
});

/** The form drawer's content: three fields and a Cancel / Save row. */
const contactForm: Container = {
  id: "drawer-contact-form",
  name: "DrawerContactForm",
  isArray: false,
  bins: [
    {
      ...full,
      type: "textfield",
      element: { name: "name", label: "Name", dataType: "string", isRequired: true, errorMessage: "Name is required" },
    },
    {
      ...full,
      type: "textfield",
      element: { name: "email", label: "Email", dataType: "email", isRequired: false, errorMessage: "", placeholder: "name@example.com" },
    },
    {
      ...full,
      type: "autocomplete",
      element: {
        name: "role",
        label: "Role",
        dataType: "string",
        isRequired: false,
        errorMessage: "",
        canObserve: false,
        observeTo: "",
        isSingleLoad: false,
        keys: { id: "value", search: "label", display: "label" },
        defaultData: {},
        options: [
          { value: "Engineering", label: "Engineering" },
          { value: "Design", label: "Design" },
          { value: "Sales", label: "Sales" },
        ],
      } as Bin["element"],
    },
    {
      sm: "6", md: "6", lg: "6", xl: "6",
      type: "button",
      justifySelf: "start",
      element: { label: "Cancel", variant: "text", modalId: "drawer-form", actions: ["CloseModal"] },
    },
    {
      sm: "6", md: "6", lg: "6", xl: "6",
      type: "button",
      justifySelf: "end",
      element: {
        label: "Save",
        icon: "save",
        modalId: "drawer-form",
        actions: ["StartLoading", "SubmitFormToPostAPI", "StopLoading", "CloseModal"],
        api: { name: "createContact" },
        snackbarSuccess: { type: "success", message: "Contact saved" },
        snackbarError: "$exception",
      },
    },
  ],
  ...DEFAULT_CONTAINER_GRID,
  gap: "4",
};

/** A header-less nav drawer: the content brings its own heading. */
const navWithHeading: Container = {
  id: "drawer-nav-headed",
  name: "DrawerNavHeaded",
  isArray: false,
  bins: [
    typography("Mail", { variant: "h6" }),
    typography("hideHeader: true · size: \"240px\"", { variant: "caption", color: "gray" }),
    divider,
    ...["Inbox", "Starred", "Send email", "Drafts"].map((t) => typography(t, { variant: "body1" })),
    divider,
    ...["All mail", "Trash", "Spam"].map((t) => typography(t, { variant: "body1" })),
  ],
  ...DEFAULT_CONTAINER_GRID,
  gap: "2",
};

const countryDetails: Container = {
  id: "drawer-country-details",
  name: "DrawerCountryDetails",
  isArray: false,
  bins: [
    typography("A card is the trigger here: the drawer's trigger is a mini-Bin ({ type, element }), so any element can open it — a button, an icon button, an avatar, a card.", { color: "gray" }),
    divider,
    typography("Capital", { variant: "caption", color: "gray" }),
    typography("Bangkok", { variant: "body1" }),
    typography("Region", { variant: "caption", color: "gray" }),
    typography("Asia", { variant: "body1" }),
    typography("Calling code", { variant: "caption", color: "gray" }),
    typography("+66", { variant: "body1" }),
  ],
  ...DEFAULT_CONTAINER_GRID,
  gap: "1",
};

const bottomSheet: Container = {
  id: "drawer-sheet",
  name: "DrawerSheet",
  isArray: false,
  bins: [
    typography("Opened by id", { variant: "h6" }),
    typography("The button on the left is not this drawer's trigger — it is an ordinary button with the OpenModal action and modalId: \"drawer-sheet\". Modals and drawers register their id in the engine's fn registry, so any button on the page can open or close them.", { color: "gray" }),
    {
      ...full,
      type: "button",
      justifySelf: "end",
      element: { label: "Done", modalId: "drawer-sheet", actions: ["CloseModal"] },
    },
  ],
  ...DEFAULT_CONTAINER_GRID,
  gap: "3",
};

export const containerDrawerDemo: Container[] = [
  {
    id: "1",
    name: "DrawerDemo",
    isArray: false,
    bins: [
      { ...full, type: "typography", element: { text: "Drawer", variant: "h3" } },
      {
        ...full,
        type: "typography",
        element: {
          variant: "body2",
          color: "gray",
          text: "The drawer element is MUI's temporary drawer: a panel sliding in over the page from one edge behind a scrim. It holds its own container (its own form, like a modal), opens from any trigger element and closes on the scrim, Esc, its close button or a CloseModal button inside it.",
        },
      },

      ...section("Anchor", "One drawer per edge — anchor: left | right | top | bottom (default right). Left / right drawers are 360px wide, top / bottom ones 50vh tall unless size says otherwise."),
      anchorDrawer("left", "panelLeft"),
      anchorDrawer("right", "panelRight"),
      anchorDrawer("top", "panelTop"),
      anchorDrawer("bottom", "panelBottom"),

      ...section("A form in a drawer", "The content is its own form: validation, a Cancel button closing it (CloseModal + the drawer's id as modalId) and a Save button posting to the mock API's /collection/contacts with a snackbar — the panel people actually build."),
      {
        sm: "12", md: "4", lg: "3", xl: "3",
        type: "drawer",
        element: {
          id: "drawer-form",
          title: "New contact",
          description: "Saved to the Form list page's contacts",
          anchor: "right",
          size: "420px",
          container: contactForm,
          trigger: { type: "button", element: { label: "New contact", icon: "puls" } },
        } as Bin["element"],
      },

      ...section("Header-less, custom size", "hideHeader drops the title row (the content brings its own heading; Esc and the scrim still close it) and size sets the width — a 240px navigation drawer."),
      {
        sm: "12", md: "4", lg: "3", xl: "3",
        type: "drawer",
        element: {
          id: "drawer-nav",
          anchor: "left",
          size: "240px",
          hideHeader: true,
          container: navWithHeading,
          trigger: { type: "button", element: { label: "", icon: "menu", variant: "outlined" } },
        } as Bin["element"],
      },

      ...section("Any element as the trigger", "A card opens this one (trigger.type: \"card\") — the same mini-Bin trigger as the popover's."),
      {
        sm: "12", md: "6", lg: "4", xl: "4",
        type: "drawer",
        element: {
          id: "drawer-card",
          title: "Thailand",
          description: "Opened from a card",
          container: countryDetails,
          trigger: {
            type: "card",
            element: {
              name: "drawerCard",
              variant: "outlined",
              header: {
                title: "Thailand",
                subheader: "Click the card to open its details",
                avatar: { src: "https://flagcdn.com/w40/th.png", fallback: "TH", size: "3" },
              },
            },
          },
        } as Bin["element"],
      },

      ...section("Opened by id", "OpenModal + modalId from a button that is not the drawer's trigger. The drawer itself has an icon-only trigger on the right."),
      {
        sm: "6", md: "4", lg: "3", xl: "3",
        type: "button",
        justifySelf: "start",
        element: { label: "Open the sheet by id", variant: "outlined", modalId: "drawer-sheet", actions: ["OpenModal"] },
      },
      {
        sm: "6", md: "4", lg: "3", xl: "3",
        type: "drawer",
        justifySelf: "start",
        element: {
          id: "drawer-sheet",
          title: "Sheet",
          anchor: "bottom",
          size: "40vh",
          container: bottomSheet,
          trigger: { type: "button", element: { label: "", icon: "panelBottom", variant: "text" } },
        } as Bin["element"],
      },
    ],
    ...DEFAULT_CONTAINER_GRID,
    gap: "5",
  },
];
