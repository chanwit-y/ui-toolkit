import type { Bin, Container, DataValue, PageLoad, WorkflowEditorElement } from "@gummy-ui/ui";
import { DEFAULT_CONTAINER_GRID } from "@gummy-ui/ui";

/**
 * Workflow editor demo (`/workflow/:id`): the `workfloweditor` element — a
 * form-bound editor for one approval line, after the user's e-memo "Line
 * Approval" screens. The page loads one workflow config (`workflow`), the
 * form's fields (name, status, business unit, site and the line itself) take
 * their initial values from it, and Save PATCHes the whole record back —
 * the editor's value is just the `steps` field of that form. Insert ("+"
 * between steps), add (the button at the end), edit (click a card) and
 * remove (in the dialog, confirmed) are local edits until Save. The dialog's
 * user pickers load `/collection/users` once.
 *
 * Roles: Inputter (max 1, pinned first — "(Already assigned.)" once there is
 * one), Approver, Acknowledger; CC on every role; a person in charge of one
 * step isn't offered for another.
 */
export const workflowLoads: PageLoad[] = [
  {
    key: "workflow",
    blocking: true,
    errorMessage: "Workflow not found.",
    api: { name: "workflowDetail", paths: ["data"], params: { id: { type: "url", key: "id" } } },
  },
];

const full = { sm: "12", md: "12", lg: "12", xl: "12" } as const;
const state = (path: string): DataValue => ({ type: "state", key: "workflow", path });

const text = (t: string, element: Record<string, unknown> = {}, span: Partial<Bin> = full): Bin => ({
  ...full,
  ...span,
  type: "typography",
  element: { text: t, variant: "body2", ...element } as Bin["element"],
});
const section = (title: string, caption: string): Bin[] => [
  text(title, { variant: "subtitle1", weight: "medium" }),
  text(caption, { color: "gray" }),
];

const jump = (label: string, id: string): Bin => ({
  sm: "6", md: "3", lg: "2", xl: "2",
  type: "button",
  element: {
    label,
    variant: "outlined",
    actions: ["Navigate"],
    navigate: { page: "workflowDemo", params: { id: { type: "value", key: "none", value: id } } },
  },
});

/** The editor's config, shared by the editable and the read-only copies. */
export const workflowEditorBase: Omit<WorkflowEditorElement, "name" | "dataType" | "value" | "disabled" | "label"> = {
  isRequired: true,
  errorMessage: "Add at least one step",
  roles: [
    { value: "inputter", label: "Inputter", max: 1, position: "first" },
    { value: "approver", label: "Approver" },
    { value: "acknowledger", label: "Acknowledger" },
  ],
  users: {
    api: { name: "users", paths: ["data"] },
    keys: { id: "PersonId", display: "FullNameEN", subtitle: "JobTitle", search: "FullNameEN" },
  },
};

export const containerWorkflowDemo: Container[] = [
  {
    id: "1",
    name: "WorkflowDemo",
    isArray: false,
    bins: [
      text("Workflow editor", { variant: "h3" }),
      text(
        "One approval line as a form field: cards for the steps, a + on every connector to insert one, Add Line Approval at the end; click a card to edit or remove it. Nothing is sent until Save, which PATCHes the whole form — the line is its steps field.",
        { color: "gray" },
      ),
      jump("Temple II", "wf-1"),
      jump("Dev line", "wf-2"),
      jump("Empty", "wf-3"),
      jump("Unknown", "wf-0"),

      ...section("The form", "Name, status, business unit and site come from the loaded record, and so does the line."),
      { ...full, type: "hidden", element: { name: "_id", dataType: "string", value: state("_id") } },
      {
        sm: "12", md: "6", lg: "6", xl: "6",
        type: "textfield",
        justifySelf: "stretch",
        element: { name: "name", label: "Name", dataType: "string", isRequired: true, errorMessage: "Name is required", value: state("name") },
      },
      {
        sm: "12", md: "6", lg: "6", xl: "6",
        type: "radio",
        element: {
          name: "status",
          label: "Status",
          dataType: "string",
          isRequired: true,
          orientation: "horizontal",
          options: [
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ],
          value: state("status"),
        } as Bin["element"],
      },
      {
        sm: "12", md: "6", lg: "6", xl: "6",
        type: "textfield",
        justifySelf: "stretch",
        element: { name: "businessUnit", label: "Group Business Unit", dataType: "string", isRequired: false, errorMessage: "", value: state("businessUnit") },
      },
      {
        sm: "12", md: "6", lg: "6", xl: "6",
        type: "textfield",
        justifySelf: "stretch",
        element: { name: "site", label: "Site", dataType: "string", isRequired: false, errorMessage: "", value: state("site") },
      },
      {
        ...full,
        type: "workfloweditor",
        justifySelf: "stretch",
        element: {
          name: "steps",
          dataType: "array",
          label: "Line Approval 1",
          ...workflowEditorBase,
          value: state("steps"),
        } as Bin["element"],
      },
      {
        sm: "6", md: "3", lg: "2", xl: "2",
        type: "button",
        element: {
          label: "Save",
          icon: "save",
          actions: ["StartLoading", "SubmitFormToPatchAPI", "StopLoading"],
          api: { name: "updateWorkflow" },
          reloadDataTable: "workflow",
          snackbarSuccess: { type: "success", message: "Workflow saved" },
          snackbarError: "$exception",
        },
      },

      ...section("Read-only", "The same line with `disabled`: cards and connectors only — for a detail page beside its approval line."),
      {
        ...full,
        type: "workfloweditor",
        justifySelf: "stretch",
        element: {
          name: "stepsReadOnly",
          dataType: "array",
          ...workflowEditorBase,
          isRequired: false,
          disabled: true,
          value: state("steps"),
        } as Bin["element"],
      },
    ],
    ...DEFAULT_CONTAINER_GRID,
    gap: "3",
    alignItems: "start",
  },
];
