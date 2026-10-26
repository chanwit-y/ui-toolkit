# custom

Places a React component the app registers by name. Declare it first with
`upsert_custom_component` (name + typed props), then add the item with
`component: "<name>"` (or set `config.componentId`).

- `props` — the declared props' values as **text** (`{ "months": "6" }`):
  they are parsed to the declared kind on export; a key equal to the
  declared default is dropped.
- `binding` — the one bound value the component receives (`value`), an
  `ItemBinding` (the repeater item, a page load…).

The app's code lives in `src/components.tsx` (the studio's export writes a
typed stub); until then the item draws a dashed placeholder. Display-only:
it is not a form field.
