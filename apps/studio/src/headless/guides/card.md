# card

A card after MUI's: `header { title | titleBinding, subheader | subheaderBinding,
avatarEnabled + avatar, actionEnabled + action }`, `media { src | srcBinding, alt,
height }`, content (child canvas 0), `actions` (footer buttons:
`{ id, label, icon, variant, … }`) + `actionsAlign`, an expandable section
(`collapseEnabled`, `collapseLabel`, `defaultExpanded`; child canvas 1),
`navigate` (the whole card is a link), and Paper's `variant` / `elevation` /
`square`.

Static text is the fallback when its binding resolves empty — a card inside a
repeater binds `titleBinding: { key: "name", path: "", source: "row" }`.
Fields placed in the content canvas belong to the page's form.
