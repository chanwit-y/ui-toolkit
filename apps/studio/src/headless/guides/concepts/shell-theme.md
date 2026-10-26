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
