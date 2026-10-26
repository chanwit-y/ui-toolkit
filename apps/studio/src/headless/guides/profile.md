# switchprofile, replaceprofile

The active profile is a **global-state slice** (`stateKey`, default
`profile`) anything binds to with `{ source: "state", key: "profile", path }`;
while impersonating, the admin's own profile is `<stateKey>Original`, and
`<stateKey>List` holds the person's profiles.

Shared: `initial` (an `ItemBinding` to the signed-in profile — the sign-in's
`me` slice), `keys` (fallback path lists: `personId`, `userId`, `name`,
`nameTemplate`, `jobTitle`, `company`, `department`, `email`, `avatar`, `primary`), `persist`,
`reload` (names to refetch after a change), `navigate`.

- **switchprofile** — lists the person's profiles from `read` (a CRUD ref)
  + `readPaths`, the person id going into `personParam`; `display`
  (`list | dropdown`), `showSubtitle`, `hideWhenSingle`, `title`, `emptyText`.
- **replaceprofile** — a trigger (`trigger`, offered while `canReplace` holds)
  opening a dialog that searches people (`search` ref + `searchPaths`,
  `searchParam`, `debounceMs`); Confirm loads the picked person's profiles
  (`read`) and makes one active; texts `title`, `description`,
  `placeholder`, `confirmLabel`, `cancelLabel`, `returnLabel`, `showBanner`.
