# modal, drawer, popover

Overlays opened by their **trigger**; their child canvas 0 is the content and
mounts its **own form** — a Save button inside submits only the overlay's fields.

- **modal** — `id` (the registry key a `CloseModal` button names via
  `modalItemId`), `title`, `description`, `maxWidth` / `minWidth` / `maxHeight`
  (CSS lengths), `trigger: { label, icon, variant, color }`.
- **drawer** — same plus `anchor` (`left | right | top | bottom`), `size`
  (width or height, CSS), `hideHeader`.
- **popover** — `placement`, `triggerMode` (`click | hover`), `offset`,
  `triggerKind` (`button | text`), `triggerButton` / `triggerText`.

A typical form modal: inputs, then a button
`actions: ["StartLoading", "SubmitFormToPostAPI", "StopLoading", "CloseModal"]`,
`endpointId`, `modalItemId: "<this modal>"`.
