# Prompt: RAG Admin — a Gummy operator console over a common RAG schema

> Grilled design, 2026-10-27 — not implemented yet. The app lives in
> `/Users/chanwit_y/Desktop/Projects/RAG-Gummy` (a separate repo); this file is the record of the
> decisions. Source: the user's ERM of `apps`, `app_document_collections`, `collection_access`,
> `app_documents`, `document_chunks`, `search_queries`, `search_results`.

## Goal

A **Gummy RAG Admin** console: operators manage apps, collections, documents, ingestion and access,
browse chunks, try searches as a principal and read the query log. Designed through the Gummy MCP
into `RAG-Gummy/gummy/workspace.json`, rendered by `<GummyApp>` from JSON, backed by its own mock
API. The real RAG backend later replaces the mock by matching its contract.

## Decisions (the design tree, resolved)

1. **Backend = own mock API.** `RAG-Gummy/api/` — Hono on Bun, **port 9200**, `api/README.md` is the
   contract, deterministic seed data. Vite proxies `/api` → 9200.
2. **Operator console, six areas.** Apps; App detail; Collection detail; Document detail (+ chunk
   browser); Search playground; Query log (+ query detail). No end-user chat / LLM answer page in
   v1 (later: a custom component).
3. **Authoring = the Gummy MCP** over `RAG-Gummy/gummy/` (the studio stays the source of truth;
   `gummy init` writes the starter's `.mcp.json`). An MCP gap ⇒ stop, report, fix it in ui-toolkit
   on a branch (drift test green) — never hand-edit `workspace.json` around it.
4. **No sign-in in v1.** The mock stamps `created_by` / `updated_by` / `granted_by` with a fixed
   operator uuid (shown as "Operator"). The principal is a **playground input** ("Act as"), not the
   logged-in user. Enums: `principal_type` user|group|service · `permission` read|write|admin
   (≥ read gates search) · `retrieval_mode` vector|lexical|hybrid · `ingestion_status`
   pending|processing|ready|failed · `feedback` up|down.
5. **Mock ingestion.** Upload drawer: `uploadfile` (document/text/pdf presets) + description; Save
   POSTs the file then creates the `app_documents` row (`pending`); the mock computes `file_hash`
   (sha256), `byte_size`, `content_type`; duplicate hash in the collection ⇒ 409. A server timer moves
   pending → processing (~1 s) → ready (~3 s, `ingested_at`, `ingestion_version`++). `.txt` / `.md`
   are really chunked: level-0 sections (parents, `embedding` null, `section_path` from headings)
   and level-1 leaves of ~120 tokens with offsets / `token_count`; leaves get a deterministic
   8-dim fake embedding and a token-list `content_tsv`. Binary types → placeholder chunks with
   `page_number`. `*fail*` or empty files ⇒ `failed` + `ingestion_error`. No polling: documents table
   has a status badge + **Refresh** (`ReloadDataTable`). **Re-ingest** bumps the version, re-chunks,
   soft-deletes the old version's chunks. Seed: 2 apps, 5 collections, ~12 documents across every
   status with real markdown (handbook / policy text).
6. **Search playground = a data table driven by its filter form** (no engine change). Inline
   `filterContainer`: query text, app, act-as type + id, collections (multi over the app's
   collections), mode, `top_k`. Apply → `GET /api/search?…`: resolve access → rank inside allowed
   collections → log a `search_queries` + its `search_results` → return ranked rows (rank, app /
   collection / document ids + names, section, snippet, vector / lexical / fused score, null as "—",
   HTML link column to the chunk). No pagination, no sort (would re-run + re-log). Feedback = row
   Edit modal (👍 / 👎 / none) → `PATCH /api/search-results/:id`. Empty text covers no-access and
   no-match. (Rejected for now: an engine `responseTo: { state }` on button APIs.)
7. **Chunk browser** (document detail): server-filtered, paged (50) table over
   `GET /api/documents/:id/chunks`; `section_path` = `rowHeader` + `mergeRows`; index, level, page,
   offsets, tokens, content (`lines: 3` + tooltip), embedded badge (HTML: ✓ / gray "parent").
   Inline filter: level (leaves default / parents / all), version (default current; older shows
   soft-deleted with a "deleted" badge), content contains. **Chunk detail page**: full content,
   hashes / tokens / offsets / page, `metadata` JSON in an HTML block, parent link, children table,
   "Seen in searches" (query, rank, fused score, cited, feedback → query). Vector shown as its
   dimension only ("8 dims (mock)").
8. **Query log.** `/queries` (and a tab on App detail scoped by app): server-paged, newest first —
   time, app, principal, query (clamped), mode badge, top_k, results, cited, 👍/👎 counts, latency
   badge (< 200 green, < 800 amber, else red); inline filter app / mode / principal / text; server
   sort time / latency. **Query detail**: header card (text, principal, mode, top_k, latency,
   collections searched, embedding dim) + results table (rank, document, chunk link, scores, cited,
   feedback editable); `chunk_id` null ⇒ "chunk purged", document still linked. **App stats strip**:
   page load `GET /api/apps/:id/stats` (docs by status, collections, leaf chunks, queries 7 d,
   p50 latency, 👍 ratio) on cards in skeleton mode. No charts in v1 (a Sparkline custom component
   later).
9. **Nested routes** so breadcrumbs fill ancestor `:params` (made possible by the DN `app_id` /
   `collection_id`):
   `/apps` · `/apps/:appId` (tabs Overview · Collections · Query log) ·
   `/apps/:appId/collections/:collectionId` (tabs Documents · Access) ·
   `…/documents/:documentId` · `…/documents/:documentId/chunks/:chunkId` · `/playground` ·
   `/queries` · `/queries/:queryId`. Titles from page data (`{ state: "app", path: "name" }` …).
   Every search / log row carries app / collection / document ids so links reach the chunk page.
   Sidebar: Apps, Search playground, Query log. Plain sidebar, iris accent, `fade-up`. `/` → `/apps`.
10. **Write rules.** App: create / edit name + description; soft delete **blocked (409) while it has
    live collections**. Collection: same fields (`app_id` from the route); soft delete **cascades**
    to documents + chunks, hard-deletes its grants. Document: upload only; edit **description
    only** (never moves); soft delete with chunks, confirm shows the chunk count; the page's Delete
    POSTs `…/documents/:id/delete` (`SubmitFormToDeleteAPI` is a no-op). Access grant (form list):
    type, principal id, permission; edit permission only; hard delete with confirm; duplicate
    `(collection, type, id)` ⇒ 409. Search result: feedback only. Deleted rows hidden everywhere,
    no restore UI.
11. **Layout + done.** `RAG-Gummy/`: the `gummy init` starter (`gummy/projects/rag-admin/` folder
    form), `api/`, `scripts/dev.mjs` (API + app), `.claude/launch.json` (`rag-api`, `rag`),
    `.env.example`, `git init` + first commit (no push). Order: API contract + mock with `bun test`
    (ingestion transitions, chunking, access-filtered search, 409s, cascades) → project via MCP
    (models → endpoints → pages → menu / shell) → `validate_project` → a `test/project.test.ts`
    calling every endpoint the project names. Done = in the browser: create app → collection →
    grant → upload `.md` → pending → ready → browse chunks → search as a principal with and without
    access → feedback → see it in the query log; light + dark; screenshots.
