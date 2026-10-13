import type { ApprovalLineElement, Bin, Container, DataValue, PageLoad } from "@gummy-ui/ui";
import { DEFAULT_CONTAINER_GRID } from "@gummy-ui/ui";

/**
 * Approval line demo (`/approval-line/:id`): the `approvalline` element — an
 * approval workflow tracker fed by the raw step rows of the user's document
 * system. The page loads one request (`approval`), whose `steps` carry a
 * `ReviewerUser` row and `ApproverUser` rows with a `Sequence`, and the
 * component reads them through `keys` with **fallback paths**, labels them
 * through `roleRules` (Reviewer / Acknowledge = approver sequence 1 /
 * Approver), maps the `Status` codes 0–9 to step states, and prepends the
 * request's `requester` as a fixed first step.
 *
 * Sections: the request itself (horizontal, the default), the same line
 * vertical, sizes, job titles, a narrow cell (the line scrolls), and one
 * line per request in a repeater — pending, rejected, done, a long line,
 * and a revised step. The jump buttons open each request.
 */
export const approvalLineLoads: PageLoad[] = [
  {
    key: "approval",
    blocking: true,
    errorMessage: "Approval request not found.",
    api: { name: "approvalDetail", paths: ["data"], params: { id: { type: "url", key: "id" } } },
  },
];

const full = { sm: "12", md: "12", lg: "12", xl: "12" } as const;
const state = (key: string, path?: string): DataValue => ({ type: "state", key, ...(path ? { path } : {}) });

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

/** The mapping every line on this page shares — the raw rows' shape, once. */
export const approvalLineBase: Pick<ApprovalLineElement, "keys" | "roleRules"> = {
  keys: {
    name: ["ApproverUser.FullNameEN", "ReviewerUser.FullNameEN"],
    jobTitle: ["ApproverUser.JobTitle", "ReviewerUser.JobTitle"],
    personId: ["ApproverUser.PersonId", "ReviewerUser.PersonId"],
    status: "Status",
    remark: "Remark",
    date: "Model.UpdatedAt",
    sequence: "Sequence",
  },
  roleRules: [
    { path: "ReviewerUser", role: "Reviewer" },
    { path: "ApproverUser", sequence: 1, role: "Acknowledge" },
    { path: "ApproverUser", role: "Approver" },
  ],
};

/** A line over the loaded request, with the requester from the same record. */
const line = (name: string, extra: Partial<ApprovalLineElement> = {}, span: Partial<Bin> = full): Bin => ({
  ...full,
  ...span,
  type: "approvalline",
  justifySelf: "stretch",
  element: {
    name,
    ...approvalLineBase,
    items: state("approval", "steps"),
    requester: {
      nameValue: state("approval", "requester.FullNameEN"),
      jobTitleValue: state("approval", "requester.JobTitle"),
    },
    ...extra,
  } as Bin["element"],
});

const jump = (label: string, id: string): Bin => ({
  sm: "6", md: "4", lg: "2", xl: "2",
  type: "button",
  element: {
    label,
    variant: "outlined",
    actions: ["Navigate"],
    navigate: { page: "approvalLineDemo", params: { id: { type: "value", key: "none", value: id } } },
  },
});

/**
 * One request card in the repeater: the title, and a line that fetches the
 * request's steps itself — the list endpoint has no `steps`, so each card's
 * `api` calls `approvalDetail` with `:id` read off the repeater item
 * (`{ type: "row" }`), and the requester comes from that record.
 */
const requestItem: Container = {
  id: "approval-item",
  name: "ApprovalItem",
  isArray: false,
  bins: [
    { ...full, type: "typography", element: { variant: "subtitle2", text: "—", value: { type: "row", key: "title" } } },
    {
      ...full,
      type: "approvalline",
      justifySelf: "stretch",
      element: {
        name: "alItem",
        ...approvalLineBase,
        api: { name: "approvalDetail", paths: ["data"], params: { id: { type: "row", key: "_id" } } },
        stepsPath: "steps",
        requester: { namePath: "requester.FullNameEN", jobTitlePath: "requester.JobTitle" },
        size: "sm",
      } as Bin["element"],
    },
  ],
  ...DEFAULT_CONTAINER_GRID,
  gap: "2",
};

export const containerApprovalLineDemo: Container[] = [
  {
    id: "1",
    name: "ApprovalLineDemo",
    isArray: false,
    bins: [
      text("Approval line", { variant: "h3" }),
      text(
        "An approval workflow tracker over the raw step rows of a document system: keys with fallback paths read heterogeneous rows, role rules label them, a status map turns the codes into done / current / pending / rejected / revised / skipped, and the requester is a fixed first step. Hover a step for its details.",
        { color: "gray" },
      ),
      jump("Pending", "req-1001"),
      jump("Rejected", "req-1002"),
      jump("Completed", "req-1003"),
      jump("Long line", "req-1004"),
      jump("Revised", "req-1005"),
      jump("Unknown", "req-0"),

      ...section("The request", "Loaded for the page (the `approval` load); the line reads its steps and requester."),
      text("", { variant: "subtitle2", value: state("approval", "title") }),
      line("alMain"),

      ...section("Own endpoint", "This line fetches the request itself (api with :id from the URL, paths to the record, stepsPath to the rows) and reads the requester off the same record — no page load needed."),
      {
        ...full,
        type: "approvalline",
        justifySelf: "stretch",
        element: {
          name: "alOwn",
          ...approvalLineBase,
          api: { name: "approvalDetail", paths: ["data"], params: { id: { type: "url", key: "id" } } },
          stepsPath: "steps",
          requester: { namePath: "requester.FullNameEN", jobTitlePath: "requester.JobTitle", personIdPath: "requester.PersonId" },
          showJobTitle: true,
        } as Bin["element"],
      },

      ...section("Vertical", "The timeline look — for a side panel or a narrow column."),
      line("alVertical", { orientation: "vertical", showJobTitle: true }, { sm: "12", md: "6", lg: "4", xl: "4" }),
      {
        sm: "12", md: "6", lg: "8", xl: "8",
        type: "container",
        container: {
          id: "approval-sizes",
          name: "ApprovalSizes",
          isArray: false,
          bins: [
            text("Small, no index", { variant: "caption", color: "gray" }),
            line("alSm", { size: "sm", showIndex: false }),
            text("Large, with job titles", { variant: "caption", color: "gray" }),
            line("alLg", { size: "lg", showJobTitle: true }),
          ],
          ...DEFAULT_CONTAINER_GRID,
          gap: "2",
        },
      },

      ...section("Narrow cell", "A horizontal line never wraps: below the step minimum it scrolls, the current step scrolled into view. Below `md` this one flips vertical (`verticalBelow`)."),
      line("alNarrow", { stepMinWidth: 120, verticalBelow: "md" }, { sm: "12", md: "6", lg: "5", xl: "4" }),

      ...section("Every request", "One line per request from the list endpoint — pending, rejected, completed, a long line and a revised step — inside a repeater; each line fetches its own request through the detail endpoint with :id from the item."),
      {
        ...full,
        type: "repeater",
        element: {
          name: "approvalList",
          api: { name: "approvals", paths: ["data"] },
          itemContainer: requestItem,
          itemSpan: { sm: "12", md: "12", lg: "6", xl: "6" },
          gap: "4",
          itemSurface: "outlined",
          itemNavigate: { page: "approvalLineDemo", params: { id: { type: "row", key: "_id" } } },
          emptyText: "No requests.",
        } as Bin["element"],
      },
    ],
    ...DEFAULT_CONTAINER_GRID,
    gap: "3",
    alignItems: "start",
  },
];
