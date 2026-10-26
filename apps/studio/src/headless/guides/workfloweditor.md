# workfloweditor

A form field whose value is one approval line — a list of steps, each with a
role, the people in charge and people in CC — saved with the page's form
(nothing is sent per step).

- `roles: [{ id, value, label, max, position }]` — `max` (`""` = no limit)
  caps how many steps take the role; `position: "first" | "last"` pins it.
- `users: { endpointId, paths, idKey, displayKey, subtitleKey, avatarKey, searchKey }`
  — the people to pick from (loaded once when the dialog opens); a picked
  user is stored as the whole record.
- `stepKeys` — the backend's field names for role / sequence / in charge /
  CC; `minInchargeUsers`, `allowDuplicateUsers`, `labels` (dialog texts),
  `isRequired` (≥ 1 step), `disabled`.
- Prefill it from a page load with `initialValue`.
