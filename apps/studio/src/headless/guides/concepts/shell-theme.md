# Shell and theme

**`update_shell`** (a deep-merge patch of `ShellSettings`):

- `navigation`: `sidebar` (collapsible to an icon rail; `collapsible`) or
  `top` (a strip in the app bar). `menuIcons`, `breadcrumbs`,
  `menuActiveColor` (any CSS colour for the active item's text).
- `appBar`: `title`, `icon` (an icon key), `logo` (URL or `data:` URL) +
  `logoSize`, `variant` — `panel` (neutral), `accent` (painted in the theme
  accent) or `custom` (`background`, or `gradient: { enabled, from, to,
  angle }`, with `foreground` `light | dark | ""`), `padding`,
  `sidebarToggle: { hide, show }` icons.
- `sidebar`: `variant` `plain | pill`, `toggle` `header | footer` (+
  `toggleLabel`), `railWidth`, pill colours (`itemBackground`,
  `activeBackground` or `activeGradient`), `indicator` (+ `indicatorColor`).
- `pageTransition`: `{ type: none | fade | fade-up | slide | scale,
  duration (ms or ""), easing }`.

**`update_theme`** (a patch of `StudioThemeConfig`): `appearance`
(`light | dark`), `accentColor` (a Radix colour: iris, indigo, blue, teal,
grass, amber, crimson…), `radius`, `panelBackground`, `scaling`
(`90% | 100% | 110%`), `buttonColor`, and the `dataTable` colour roles
(`editButtonColor`, `deleteButtonColor`, header / pagination / row hover).
Components follow the accent unless a colour is set on them (a button's
`color`).

**Glass** (`surface: "glass"`, default `"flat"`): every surfaced component —
cards, tables, dropdowns, dialogs, the app bar and sidebar, text fields — turns
into a translucent blurred panel over a backdrop; it works on light and dark
alike. The backdrop is `background: { kind, ... }`: `default` is an
accent-tinted gradient (nothing to set), `color` one CSS colour, `gradient`
`{ from, to, angle }` (both stops needed), `image` a URL or `data:` URL drawn
`cover`. Sticky / pinned table cells stay near-opaque so scrolled content never
shows through, and the OS "reduce transparency" setting, browsers without
`backdrop-filter` and print all fall back to that look. Buttons keep their
solid accent. The Book shop stays flat; the Gummy Portal project shows glass.
