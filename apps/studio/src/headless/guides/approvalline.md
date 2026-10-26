# approvalline

An approval workflow tracker — avatars on a connector, each with a state —
drawn from the **raw** step rows of a document system.

- Source: `source: "binding"` + `items` (an `ItemBinding` to the row array:
  a page load, the repeater item) or `source: "endpoint"` + `read` (a CRUD
  ref) + `recordPath` (the request record) + `stepsPath` (the rows in it).
- `keys` — per step field a list of fallback paths tried in order
  (`name`, `status`, `jobTitle`, `personId`, `avatar`, `role`, `remark`,
  `date`, `sequence`), e.g. `["ApproverUser.Name", "ReviewerUser.Name"]`.
- `roleRules: [{ id, path, sequence, role }]` label steps; `statuses:
  [{ code, state: done|current|pending|rejected|revised|skipped, label }]`
  map the backend codes (pre-filled with the document statuses 0–9).
- The requester (prepended as done): `requesterEnabled` + name / job title
  (static, bound, or paths on the endpoint record).
- Look: `orientation`, `size`, `showJobTitle`, `showIndex`,
  `stepMinWidth`, `verticalBelow` (`sm | md`), `avatarUrl` (`{{path}}`
  template), `emptyText`.
