# filepreview

One file shown in place: an image, PDF, video, audio or text file drawn in its
cell, a spreadsheet (.xlsx / .xls / .ods / .csv) as a read-only sheet grid with
a tab per sheet (first 500 rows × 50 columns, files over 15 MB not parsed), a
"no preview" card with Download for anything else. It reads and never
writes, so it knows nothing about where the file came from.

**Source** (`source`):

- `"binding"` — `binding` is an item binding: `{ key: "<slice>", path: "", source: "state" }`
  for page data, `{ key: "none", path: "" }` for the repeater item. A file
  collection's selection is page data: key `<name>Selected`. With `binding: null`,
  `url` is a literal URL. Its last segment names the file, and the extension
  picks how it is shown.
- `"endpoint"` — `read` is a CRUD ref `{ endpointId, params, extra }`, `recordPath`
  a dot path to the file record (`"data"`). A `:param` can read the selection:
  `{ type: "state", key: "docsSelected", path: "id" }`.

**The record.** `keys` hold fallback paths for `name`, `type`, `size`, `url` and
`data`, plus `blurhash` below; leave a key `[]` for the engine's default paths (`name` / `fileName` /
`filename`, `type` / `mimeType` / `contentType`, `size`, `url` / `src`, `data`).
`data` is inline content (a data URL or
base64) and wins over a URL. `type` must be a mime type: anything else, such as
a tree node's `"file"`, is ignored and the name's extension decides. A node with
`type: "folder"` previews nothing.

**`urlTemplate`** builds a content URL when the record has only an id:
`"/api/files/{{id}}/content"`, `{{value}}` for a bare string. Each value is
URL-encoded, and a blank placeholder means no file. It beats `keys.url` and
loses to inline `data`. A URL starting with `/` is joined to the API base URL.
Only `http`, `https` and `blob` URLs load.

**Bytes.** The engine's client is JSON only, so a binary endpoint is expressed as
a URL. The browser loads it itself, **without the app's bearer token**: protected
files need a cookie session, a signed URL or inline `data`.

**Blurhash.** While an image loads, its blurhash is drawn in its place; the image
fades in over it, then it fades out. An image is drawn at its own size, no larger than the frame. The hash is computed from the image when it is stored,
so it comes with the record: the default paths are `blurhash` and `blurHash`, and
`keys.blurhash` overrides them. The placeholder has the image's exact size when the
record also carries the image's pixel size — `keys.width` / `keys.height`, default
paths `width` / `imageWidth` and `height` / `imageHeight`, both needed; without
it the placeholder fills the frame until the image's own size is known. `blurhash` in the config is the hash to use when
the record has none, as with a literal URL. `showBlurhash: false` turns it off.
`blurhashDelay` keeps it on show at least that many milliseconds (0 to 10000),
even when the image is ready sooner; it can't make a slow image any faster.
Other file kinds ignore it, and an invalid hash draws nothing. Under
`height: "auto"` the placeholder has the image's aspect ratio when its size is
known, else it is 200px tall until the image arrives.

**Look.** `height` (CSS length or `"auto"`, `""` = 320px), `fit` (how an image is
resized in the frame: `"natural"` — its own size, no larger than the frame, the
default —, `"contain"` to scale it to fit, `"cover"` to scale it to fill, cropped;
the blurhash follows), `showHeader`,
`openOnClick` (a click opens the modal viewer; it covers the file, so a PDF can't
be scrolled inline), `emptyText`.

A PDF blocked by the server's `X-Frame-Options` or CSP shows the browser's own
error, which can't be detected; Open in new tab is the way out.

To show a file from a tree beside it:

```json
{ "binding": { "key": "docsSelected", "path": "", "source": "state" }, "urlTemplate": "/api/files/{{id}}/content" }
```
