# Prompt: a `filepreview` element

> Grilled design, 2026-11-01 — **implemented the same day** (see the File preview bullet in
> `CLAUDE.md`). Deviations, all found while building it:
>
> - **The normaliser is `core/previewFile.ts`**, its test `previewFile.test.ts`; `core/filePreview.ts`
>   is the builder, the repo's split. `IconData` already had `eye`; the tile uses `FileSearch`.
> - **Added: a URL scheme allow-list** (`isSafeFileUrl`: http / https / blob). The URL reaches an
>   `<iframe src>` and an `<a href>` from data, so `javascript:` had to be stopped.
> - **Added: a node with `type: "folder"` is no file**, and a `type` without a `/` is dropped. A tree's
>   selection can be a folder, and its `type` is `"file"`, not a mime.
> - **Added: a list previews its first file; `{{value}}` fills from a bare string; an upload whose
>   `data` is a URL counts as a URL.**
> - **All root-relative URLs join the API base**, not only `urlTemplate` results: a record's relative
>   `url` is relative to the API that sent it. A site asset needs a full URL.
> - **The "No preview" card shows name, size and actions only without the header**, which already has
>   them, and offers Download alone: Open stays limited to what the viewer can show.
> - **Studio keys are empty by default**, meaning the engine's defaults, which each label names.
>   Pre-filled defaults flagged every fallback a record doesn't have as stale. No Reset button.
> - **Studio config**: `recordPath` (not `readPaths`, as on the approval line), and a `url` field for
>   the literal URL, since a binding has no static value of its own.
> - **The unbound canvas note is the view's own empty text**, not a dashed box.
> - **Mock API**: an SVG is served as `image/svg+xml` under a `sandbox` CSP, because `<img>` won't
>   render `application/octet-stream`. The content route is `/:id/:name` so a URL can carry a file
>   name. The tree's file nodes gained extensions, since the kind comes from the name.
> - **Seed**: the endpoint preview reads the selection through `:id`, since a studio navigate has no
>   query. The seed adds no missing-file case.

## Added after the first build: blurhash

An image can show a [blurhash](https://blurha.sh/) while it loads, and hold it for a set time.

- **The hash comes with the data.** It is computed from the image when it is stored, so `keys.blurhash`
  reads it from the record (defaults `blurhash`, `blurHash`) and `blurhash` in the config covers a
  literal URL, which has no record. Nothing can make one in the browser before the image has loaded.
- **`showBlurhash`** (default true) turns it off; an invalid hash counts as none.
- **`blurhashDelay`** (ms, 0–10000, default 0) is the least time the placeholder stays, even when the
  image is ready sooner. It is a floor, so it can't speed up a slow image, and it applies to the inline
  preview only: the modal viewer shows a file as soon as it can.
- **Package**: `blurhash` (woltapp), the library's new dependency. `components/Blurhash.tsx` decodes
  to a 32 × 32 canvas that CSS stretches over the body; the image fades in as it fades out.
- **Studio**: optional config keys, no migration; the seeded file models gained `blurhash`, folded
  into v65, which was never released. The mock API's two images carry hashes encoded from their real
  pixels, and `?delay=` on the content route makes a placeholder visible.
- **The hand-over, from a recording of the first version**: a blank frame came before the hash (it was
  drawn after paint), both faded together so the frame washed out, and a 64 × 36 image shrank to a speck
  inside a placeholder that filled the frame. Now the hash is drawn before paint in the image's own box,
  the image waits for `decode()` and fades in over the opaque hash, the hash leaves after it, and an
  image scales up to fill the frame. The modal viewer keeps images at their own size.
- **Known limit**: under `height: "auto"` the placeholder has no aspect ratio to use, so a 200px spacer
  stands in and the height shifts on load. A fixed height doesn't shift.

## Goal

A component the studio author drops into a layout cell that shows a file — image, PDF, video,
audio, text — inline in its area. The file comes from somewhere else on the page: a file
collection's selected node, a page / global state slice, a repeater item, a URL param, a literal
URL, or an endpoint. The element knows nothing about where the file came from.

## Decisions (the design tree, resolved)

1. **One normalised file, one source.** The element resolves whatever it is given into
   `PreviewFile = { name, type?, size?, url? | data? }` and takes the file from **exactly one** of
   `value: DataValue` (`state` / `url` / `row` / `value`) or `api: API` — the approval line /
   repeater split. A `keys` map with fallback paths (`ApprovalKeyPath` style, defaults
   `name` / `fileName` / `filename`, `type` / `mimeType` / `contentType`, `size`, `url` / `src`,
   `data`) reads the record; a bare string resolves as
   `{ url }` with the name taken from the URL. The file-collection case is **not** special-cased:
   it is `value` reading the tree's selection slice (`docsSelected`) plus a content URL template,
   or `api` whose `:id` param reads that slice.
2. **JSON records only; bytes come by URL or inline.** The engine's client stays a JSON client —
   no `responseType: "blob"` path. A record points at the bytes with `url` (loaded by the browser
   in `<img>` / `<iframe>` / `<video>`) or carries them inline as `data` (base64 / data URL / bytes,
   the `UploadedFile` formats). A binary endpoint is expressed as a URL: `urlTemplate` is a
   `{{field}}` template over the record (`"/api/files/{{id}}/content"`), so a file-collection node —
   which has only an `id` — previews with no envelope. Each interpolated value is
   `encodeURIComponent`ed (`renderUrlTemplate` beside `renderTemplate` in `util/template.ts`,
   tested); a result starting with `/` resolves against the app's API base URL. Precedence:
   `data` > `urlTemplate` > `keys.url`. **A browser-loaded URL carries no bearer token** — protected
   files need a cookie session, a signed URL, or inline `data`.
3. **The viewer's modes, inline; a card for the rest.** The mode logic of `UploadFileViewer`
   (`viewerMode`, `useFileUrl`, `useFileText`, `blobType`, the SVG-never-as-document rule) moves
   into a shared **`FilePreviewBody`** rendered by both the modal viewer and the new element, so
   the forced-mime / SVG rules can't drift. The element draws a `gummy-surface` frame with an
   optional header (`showHeader`, default true: kind icon · name · size, **Open in new tab** /
   **Download** actions) and the body at `height` (default `320px`; `"auto"` lets an image size
   itself), images `object-fit: contain`, text in a scrolling `<pre>` (the viewer's 200 KB cap).
   Non-previewable kinds (`docx`, `xlsx`, archives, unknown) get a **"No preview" card** — kind
   icon, name, size, the same two actions. **No third-party embeds** (Google / Office viewers would
   send the file URL off-site); an office preview is the backend converting to PDF. Empty binding →
   `emptyText` (default "Select a file to preview"); a load failure → "Couldn't load this file" +
   Retry. `openOnClick` (default false) opens the existing modal viewer on the file. One file only —
   a list previews through a repeater. Known limitation: a PDF `<iframe>` blocked by the server's
   `X-Frame-Options` / CSP shows the browser's error and isn't detectable; Open in new tab is the
   escape hatch (no `HEAD` probe).
4. **Engine shape.** `FilePreviewElement { name, value?: DataValue, api?: API, keys?, urlTemplate?,
   height?, showHeader?, openOnClick?, emptyText? }`. `api` through `useReadApi` (held until every
   `:param` resolves, refetch registered under `name` for `ReloadDataTable`), `value` through
   `useDataValue` + `useSkeleton` (a `SkeletonBlock` at `height` + a `SkeletonText` header line
   while a skeleton-mode load is empty). Kind detection works from the name alone when `type` is
   absent (`matchesAccept`'s extension fallback). `schema.ts` skips the bin; it is in
   `SELF_SKELETON`. `FilePreview` = hooks + the hook-light `FilePreviewView` (the studio canvas
   renders the view). CSS: a Radix-vars partial `styles/filePreview.css` (`gummy-fp-*`),
   `@import`ed by `styles.css` and the studio `index.css`, the body transparent inside the frame
   (glass-safe). `IconData` gains `eye`. Tests: `core/filePreview.test.ts` (string → `{ url }`,
   keys with fallbacks, precedence, a record with neither url nor data → empty) and the URL
   encoding in `util/template.test.ts`.
5. **Studio config.** `FilePreviewConfig { name, source: 'binding' | 'endpoint', binding:
   ItemBinding, read: FormListCrudRef, readPaths, keys: { name, type, size, url, data: string[] },
   urlTemplate, height, showHeader, openOnClick, emptyText }`. Binding = `ItemBindingField`
   (Static = a literal URL; Item field inside a repeater; Page data = a load, a table selection or
   a **file collection's selection**, already listed by `selectionLoads.ts`). Endpoint =
   `CrudRefEditor` + paths with `:param` sources seeded from the URL. Keys = `PathListField`s over
   the resolved record model (endpoint response walked by `readPaths` / `bindingRowModel` /
   `RepeaterScope.itemModel`), pre-filled with the defaults, exported only when changed. Content
   URL = a template field with "Insert field" over the same model (the `ColumnHtmlField` pattern),
   hint "Leave empty when the record carries a URL or the bytes". `filePreviewElement` in
   `gridConfig.ts` exports only off the defaults. No third "from file collection" source — the
   case lives in the guide and the seeded page.
6. **Canvas + Live Preview.** The real `FilePreviewView` in the always-live tier over a built-in
   sample file (a small code-drawn SVG as a `data:` URL, header `sample.svg · 1.2 KB`) with a
   "Sample file" pill; a dashed "No file source" note while unbound; `height` / `showHeader` /
   `emptyText` reflected live; no sample-kind picker. The Live Preview runs the real element over
   the real slices; the wiring check reads `api.name` like the repeater's.
7. **Demos, seed, MCP.** Mock API `apps/api/src/routes/files.ts`: a deterministic store (an
   image, a PDF, a `.txt` / `.csv`, a `.docx`; no audio / video) with `GET /collection/files`
   (records `{ _id, name, type, size, url }`), `GET /collection/files/:id` (the JSON envelope with
   inline `data`), `GET /collection/files/:id/content` (raw bytes, `.svg` / `.html` as
   octet-stream); the file-collection tree's file nodes get matching ids. Example app: the **File
   preview** page (`/file-preview`, `config/country/filePreviewDemo.ts`, menu icon `fileText`) —
   (1) a file collection beside a preview bound to `docsSelected` with
   `urlTemplate: "/collection/files/{{id}}/content"`, (2) `api` over `/collection/files/:id` with
   `:id` from `?file=`, (3) a static PDF URL, (4) previews in a repeater over `/collection/files`
   (`height: 200`, `openOnClick: true`), (5) the `.docx` card and a bad URL. Studio: the seeded
   page `seed-page-file-preview` (`filePreviewDemoSeedItems` / `filePreviewDemoPage`), workspace
   `version: 65` (`migrateV64`: the files models + endpoints via `seedLibraryAdditions`, the page
   via `appendDemoPages`). MCP: `DEFAULT_CONFIGS`, `itemTypes.ts`, `schemaRoots.ts`, a
   `filepreview` guide, `gen-schemas`; `validate_project` warns on an endpoint source with an
   unmapped `:param`. Not added to the Book shop or the other demo projects.

## Out of scope

- A binary (`blob`) response path in the engine client; authenticated browser-loaded URLs.
- Office-document previews, third-party viewer embeds, a `HEAD` probe for frame-blocked PDFs.
- A multi-file gallery with prev / next (one file per element; lists go through a repeater).
- A dedicated "from file collection" studio source; a sample-kind picker on the canvas.
- Editing / annotating the file, or publishing anything to state (the element only reads).
