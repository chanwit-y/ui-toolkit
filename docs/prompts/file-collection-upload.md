# Prompt: drop OS files into the `filecollection` tree

> Grilled design, 2026-11-06 — **implemented the same day** (see the File collection bullet's
> **Upload** paragraph in `CLAUDE.md`). Spec: `spec/gummy-file-collection-spec.md` §11 (and §10 item
> 10). Memory: `file-collection-upload`. Deviations found while building it:
>
> - **A file row highlights itself** while OS files hover it (the drop lands in its parent); the move
>   drag highlights folders only. A drop needs a visible home.
> - **The engine refuses to upload through an endpoint with no body model** (a warning + an error
>   snackbar) instead of posting without the file — `callArgs` places the body by the declared
>   segments, so there is nowhere to put it.
> - **`busy` is a counter**: two overlapping drops share the header spinner until both settle.
> - **The mock API also serves an uploaded `.html` as `text/plain`** (an SVG keeps its type under the
>   sandbox CSP), the `/upload` route's rule carried over.
> - The pure helpers live in `core/fileCollectionUpload.ts` (`partitionDrop`, `filesFromDataTransfer`,
>   `uploadFormData`, `uploadSubject`, `rejectionMessage` / `failureMessage`, `runWithConcurrency`),
>   the drop hook (`useFileDrop`) and ghost row (`PendingRow`) in `FileCollectionTree.tsx`.

## Goal

A user drags files from the desktop onto a folder (or a collection) of a `filecollection` tree and
they are uploaded there, through a tenth endpoint slot, with the same rules the other slots follow:
an absent slot hides the affordance, the body is fixed, the tree re-fetches after the mutation, a
failure is a snackbar. The same upload is reachable without a mouse from the **New** menu.

## Decisions (the design tree, resolved)

1. **Transport: a tenth slot, `uploadItem`, multipart through the engine client.**
   `FileCollectionApi.uploadItem?: FileCollectionUploadApiRef` — a `FormListMutationApiRef` plus the
   upload rules below. The engine always sends a `FormData` body for this slot, so the request goes
   through `ApiMaster` like every other slot and carries the bearer token, base URL and `app-version`
   header (the upload component's raw `fetch` carries none). The one engine change outside the tree:
   `HttpClientBase`'s request interceptor no longer forces `Content-Type: application/json` when the
   body is a `FormData` (the browser then sets the multipart boundary). The slot's endpoint must
   declare *a* body model, as every body-bearing slot must, so the body lands in its positional
   argument (`callArgs`); the model's shape is not checked for this slot. Not chosen: reusing
   `UploadApiConfig` + `createItem` (two requests, no token), or a JSON body with a data URL (base64
   bloat, needs a hard cap).
2. **One request per file, fixed fields.** `file` (the `File`), `collectionId`, `parentId` (omitted
   at the collection root — `FormData` can't carry `null`), `name` (the file's name), `kind` (the
   engine's `fileKind` preset: image / pdf / document / spreadsheet / presentation / text / archive /
   audio / video / other). `extraBody` DataValues are appended as string fields; `params` map a
   `:param` to the target like `createItem` (`collectionId`, `parentId`, `id` = parentId, `name`,
   `kind`). A batch runs with a concurrency cap of 3 under `Promise.allSettled`, re-fetches **once**
   when settled, and names the failed files in one error snackbar (the `$exception` rule); partial
   batches land, like the upload component's. Field names are not configurable (bodies are fixed).
3. **Kind: send the preset, the backend decides.** The backend owns kind semantics for every
   existing node, so it stores, maps or ignores the preset. The mock API maps `spreadsheet → sheet`
   and a `.md` text file → `markdown`, pdf / document / presentation → `document`, so the demo's
   icons line up, and the example page's `kindIcons` gains entries for the preset names so a plain
   backend works too. No `kinds` map on the slot.
4. **Drop targets = the move drag's targets + the collection header.** Folder row → that folder;
   file row → its parent; the collection root zone (incl. its "Empty" row) and the collection header
   → the collection root (a collapsed collection expands on drop). The tree's blank area and the
   "No collections yet" state take nothing. dnd-kit never sees native file drags, so this is
   `dragenter` / `dragover` / `drop` handling on the same rows, accepted only when
   `DataTransfer.types` includes `Files`, gated on `canUpload = !readOnly && !!api.uploadItem`. The
   hovered target reuses the existing `data-over` highlight; no overlay banner, no hover-to-expand of
   closed folders (the move drag has neither). While wired, the component root `preventDefault`s a
   file `dragover` / `drop` that missed every target, so a stray drop never navigates the page away;
   unwired, the browser's default stands.
5. **Validation reuses the upload component's rules.** On the slot: `accept?: AcceptConfig` (presets
   + raw tokens, checked by `matchesAccept`), `maxSizeMB?`, `maxFiles?` (per drop). All optional,
   absent = anything goes and the server decides. Rejected files (type, size, past `maxFiles`,
   zero-byte, an OS folder entry) are skipped and named with their reason in the error snackbar; the
   rest upload. OS folder trees are **not** walked in v1.
6. **Feedback: ghost rows + the header spinner; select the last file.** Each pending file is a greyed
   row with an indeterminate spinner in its target folder, which expands; the header spinner runs as
   for any mutation. When the batch settles the re-fetch replaces the ghosts, the last uploaded file
   is selected through the existing `findCreated` path (by name, like New file), the slot's
   `snackbarSuccess` fires once with `{{count}}` substituted, failures vanish from the tree and are
   named in the error snackbar. No percent progress (nothing threads `onUploadProgress` through the
   engine client yet), no cancel.
7. **Click path: an automatic "Upload files…" entry in the New menu.** While `canUpload`, every New
   menu (the header **+** and each folder's **…** → New) ends with the entry, which opens a hidden
   `<input type="file" multiple>` filtered by `accept`; the target follows the menu's own rule (the
   header: selected folder / selected file's parent / root; a folder's menu: that folder). Label and
   icon come from `uploadItem.label` (default "Upload files…") / `uploadItem.icon` (default `upload`,
   already in `IconData`); the entry is not part of `newItems`, so existing configs are untouched.
8. **Mock API stores the bytes so a dropped file previews.** `POST /collection/file-items/upload`
   (multipart) creates the node in `data/fileCollections.ts` and puts the bytes into
   `data/files.ts`' in-memory store under the new node id, so the File preview page's
   selection-bound preview shows a just-dropped file. Same 10 MB cap and blocked types as `/upload`;
   nothing written to disk. A raster image also gets its `blurhash` + `width` / `height` computed from
   the bytes when it is stored (`data/imageMeta.ts`, jimp + blurhash), so the preview opens on the
   placeholder; the File preview page's tree is wired upload-only for exactly that (added after the
   build, same day).
9. **Scope: engine + studio + MCP + demo in one PR, two commits.** Engine: the slot + the interceptor
   change + drop / picker / ghost rows + the mock route + the example page's wired tree gains the
   slot (its Browse and Read-only trees stay without it, showing the difference). Studio: a tenth slot
   card (`FileCollectionUploadSlot` = `FormListCrudRef` + `acceptPresets` / `accept` extra tokens /
   `maxSizeMB` / `maxFiles` / `label` / `icon`), export `uploadItem` only while wired, the slot in the
   body-model-hint list, workspace **v70** (`migrateV69`: the default slot on every file collection,
   the seeded `uploadFileItem` endpoint + `fileUploadBody` model via `seedLibraryAdditions`, wired on
   the seeded File collection page's main tree), the canvas preview inert, `schemas.generated.json`
   regenerated, a paragraph in the `filecollection` guide, `validate_project`'s body-model and
   unmapped-`:param` warnings covering the slot (`fileCollectionWarnings`).
10. **Docs:** this prompt, spec §11 + §10 item 10, memory `file-collection-upload`.

## Build notes

- Pure helpers in `core/fileCollectionUpload.ts`, tested: `partitionDrop(files, rules)` →
  `{ accepted, rejected: { file, reason }[] }`; `uploadFormData(file, target, extra)`; `dropTarget`
  resolution shares `checkDrop`-style logic (a file row forwards to its parent).
- `FILE_COLLECTION_MUTATIONS` gains `uploadItem` (builder resolves it like the others).
- Studio `FILE_COLLECTION_BODY_SLOTS` gains it; the MCP drift test will fail until the schema is
  regenerated (`bun scripts/gen-schemas.ts` in `apps/studio`).
- Example page: `apps/example/src/config/country/fileCollectionDemo.ts` (+ `kindIcons`), mock route
  in `apps/api/src/routes/fileCollections.ts`, bytes store in `apps/api/src/data/files.ts`.

## Out of scope

Percent progress and cancel, OS folder trees (recursive folder creation), paste-to-upload, replacing a
file's content by dropping onto its row (that drops into its parent), chunked / resumable uploads,
dragging files *out* of the tree, configurable multipart field names, a per-slot `kinds` map.
