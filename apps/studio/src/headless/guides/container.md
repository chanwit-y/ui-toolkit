# container, paper

Both hold one child canvas (index 0) with its own 12-column grid — use them to
group items and give a section its own layout (`update_canvas` with
`parent: { item, canvas: 0 }`).

- **container** — `background` and `border` (`ContainerConfig`, the engine
  surface; empty = none).
- **paper** — a surface: `variant` (`elevation | outlined`), `elevation`
  (0–5), `square`.

Items inside belong to the page's form (a field in a container is submitted
with the page). A `modal`, `drawer` or `popover` is different: its content is
its own form.
