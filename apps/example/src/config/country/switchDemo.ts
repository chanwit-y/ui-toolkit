import type { Bin, Container } from "@gummy-ui/ui";
import { DEFAULT_CONTAINER_GRID } from "@gummy-ui/ui";

/**
 * Switch demo page (`/switch`): the `switch` element after MUI's Switch — one
 * boolean form field drawn as an on / off toggle.
 *
 * Sections: the basics (label, default on, helper text), the label on either
 * side, Radix's sizes and variants, a disabled switch, one switch gating
 * another (`canObserve` + `enabledWhen`), and a required "accept the terms"
 * switch in front of a Save button that validates (no API — the action just
 * validates and reports) — a required switch must be on.
 */
const full = { sm: "12", md: "12", lg: "12", xl: "12" } as const;
const quarter = { sm: "6", md: "3", lg: "3", xl: "3" } as const;

const section = (text: string, caption: string): Bin[] => [
  { ...full, type: "typography", element: { text, variant: "subtitle1", weight: "medium" } },
  { ...full, type: "typography", element: { text: caption, variant: "body2", color: "gray" } },
];

const sw = (
  name: string,
  label: string,
  element: Record<string, unknown> = {},
  span: Record<string, string> = quarter,
): Bin => ({
  ...(span as typeof quarter),
  type: "switch",
  element: { name, label, dataType: "boolean", isRequired: false, errorMessage: "", ...element } as Bin["element"],
});

export const containerSwitchDemo: Container[] = [
  {
    id: "1",
    name: "SwitchDemo",
    isArray: false,
    bins: [
      { ...full, type: "typography", element: { text: "Switch", variant: "h3" } },
      {
        ...full,
        type: "typography",
        element: {
          variant: "body2",
          color: "gray",
          text: "The switch element is one boolean field drawn as an on / off toggle — Radix Themes' Switch with a label on either side, helper text and the engine's form binding. A required switch must be on.",
        },
      },

      ...section("Basic", "label, defaultChecked and helperText. The value is a boolean in the form."),
      sw("notifications", "Email notifications"),
      sw("darkMode", "Dark mode", { defaultChecked: true }),
      sw("newsletter", "Weekly digest", { helperText: "Sent every Monday" }),
      sw("unlabelled", "", { helperText: "No label — helper text only" }),

      ...section("Label position", "labelPosition: \"end\" (default) puts the label after the thumb, \"start\" before it."),
      sw("labelEnd", "Label after", { labelPosition: "end" }),
      sw("labelStart", "Label before", { labelPosition: "start" }),

      ...section("Sizes and variants", "Radix Themes' size (1 · 2 · 3, default 2) and variant (surface · classic · soft)."),
      sw("size1", "Size 1", { size: "1", defaultChecked: true }),
      sw("size2", "Size 2", { size: "2", defaultChecked: true }),
      sw("size3", "Size 3", { size: "3", defaultChecked: true }),
      sw("variantSurface", "surface", { variant: "surface", defaultChecked: true }),
      sw("variantClassic", "classic", { variant: "classic", defaultChecked: true }),
      sw("variantSoft", "soft", { variant: "soft", defaultChecked: true }),

      ...section("Disabled and gated", "disabled locks a switch. enabledWhen enables one only while another switch (canObserve: true) is on — turn on \"Advanced settings\" to unlock the two beside it."),
      sw("locked", "Locked on", { disabled: true, defaultChecked: true }),
      sw("advanced", "Advanced settings", { canObserve: true }),
      sw("telemetry", "Send telemetry", {
        helperText: "Needs Advanced settings",
        enabledWhen: { left: { key: "advanced", type: "observe" }, operator: "eq", right: { val: true } },
      }),
      sw("beta", "Beta features", {
        helperText: "Needs Advanced settings",
        enabledWhen: { left: { key: "advanced", type: "observe" }, operator: "eq", right: { val: true } },
      }),

      ...section("Required", "isRequired on a switch means it must be on: Save validates the form and shows the errorMessage under the switch until \"Accept the terms\" is on."),
      sw("terms", "Accept the terms", {
        isRequired: true,
        errorMessage: "You must accept the terms to continue",
        helperText: "Required",
      }, { sm: "12", md: "6", lg: "6", xl: "6" }),
      {
        sm: "12", md: "6", lg: "6", xl: "6",
        type: "button",
        justifySelf: "start",
        element: {
          label: "Save",
          icon: "save",
          // No `api`: the action validates the form and reports; nothing is sent.
          actions: ["SubmitFormToPostAPI"],
          snackbarSuccess: { type: "success", message: "Saved — the terms are accepted" },
        },
      },
    ],
    ...DEFAULT_CONTAINER_GRID,
    gap: "4",
  },
];
