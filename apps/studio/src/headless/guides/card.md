# card

A card after MUI's: `header { title | titleBinding, subheader | subheaderBinding,
avatarEnabled + avatar, actionEnabled + action }`, `media { src | srcBinding, alt,
height }`, content (child canvas 0), `actions` (footer buttons:
`{ id, label, icon, variant, … }`) + `actionsAlign`, an expandable section
(`collapseEnabled`, `collapseLabel`, `defaultExpanded`; child canvas 1),
`navigate` (the whole card is a link), Paper's `variant` / `elevation` /
`square`, and `loading` — how the card waits for a Skeleton-mode page load one
of its bindings reads: `"slots"` (default, only the pending header / media slot
shimmers), `"card"` (the whole card shimmers while any slot or content binding
is pending) or `"none"` (the static fallbacks show); `skeletonDelay` (ms,
0–10000) keeps the shimmer at least that long once it has appeared — a floor,
never a slowdown.

Static text is the fallback when its binding resolves empty — a card inside a
repeater binds `titleBinding: { key: "name", path: "", source: "row" }`.
Fields placed in the content canvas belong to the page's form.
