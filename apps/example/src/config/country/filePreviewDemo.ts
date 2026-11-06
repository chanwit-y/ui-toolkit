import type { Bin, Container, DataValue } from "@gummy-ui/ui";
import { DEFAULT_CONTAINER_GRID } from "@gummy-ui/ui";

/**
 * File preview demo page (`/file-preview`) — the `filepreview` element over the
 * mock API's `/collection/files` (see `apps/api/src/data/files.ts`). The element
 * knows nothing about where a file comes from, so each section only differs in
 * what it is bound to:
 *
 * - **From a file collection** — the tree's selection slice, whose nodes carry
 *   only an `id`, plus a `urlTemplate`. A selected folder shows the empty text.
 *   The same click navigates here with `?file=<id>`, and the second preview
 *   reads that through its own endpoint. The tree takes drops (only
 *   `uploadItem` is wired, so nothing else can be changed): the mock API keeps
 *   the bytes and, for a raster image, computes its blurhash and size, so the
 *   uploaded file previews at once, placeholder first.
 * - **From an endpoint** — the JSON envelope with the bytes inline as `data`.
 * - **From a literal** — a bare URL (its last segment names the file) and a
 *   record pinned in the config.
 * - **In a repeater** — one preview per list item, `openOnClick` opening the
 *   modal viewer.
 * - **Spreadsheets** — an .xlsx workbook and a .csv drawn as sheet grids.
 * - **Blurhash** — an image's placeholder while it loads, from the record, a
 *   nested key or the config, over a URL the mock API delays.
 * - **What can't be shown** — the "No preview" card, without its header too,
 *   then a missing file, then a read that fails.
 */
const full = { sm: "12", md: "12", lg: "12", xl: "12" } as const;
const half = { sm: "12", md: "6", lg: "6", xl: "6" } as const;
const third = { sm: "12", md: "4", lg: "4", xl: "4" } as const;

const state = (key: string): DataValue => ({ type: "state", key });
const literal = (value: unknown): DataValue => ({ type: "value", key: "none", value });

const note = (text: string): Bin => ({ ...full, type: "typography", element: { text, variant: "body2", color: "gray" } as Bin["element"] });

const fromCollectionBins: Bin[] = [
  note("Pick a file: the left preview reads the tree's selection slice and builds a content URL from the node's id; the right one fetches the same file by the ?file= param and gets the bytes inline. A folder has nothing to preview. Drop a file from your desktop onto a folder or a collection to upload it — it is selected once it lands; an image gets its blurhash and size computed by the API when it is stored, so the preview opens on its placeholder."),
  {
    sm: "12", md: "4", lg: "3", xl: "3",
    alignSelf: "stretch",
    type: "filecollection",
    element: {
      name: "previewDocs",
      title: "Documents",
      api: {
        list: { name: "fileCollections", paths: ["data"] },
        // The only mutation: drops and the New menu's Upload entry; every other affordance stays hidden.
        uploadItem: {
          name: "uploadFileItem",
          accept: ["image", "pdf", "document", "spreadsheet", "text"],
          maxSizeMB: 10,
          maxFiles: 5,
          snackbarSuccess: { type: "success", message: "{{count}} file(s) uploaded" },
        },
      },
      kindIcons: { markdown: "fileText", sheet: "table", image: "image", document: "fileText", spreadsheet: "table", pdf: "fileText", text: "fileText" },
      selectNavigate: { page: "filePreviewDemo", query: { file: { type: "row", key: "id" } }, replace: true },
    },
  },
  {
    sm: "12", md: "4", lg: "5", xl: "5",
    type: "filepreview",
    element: {
      name: "selectedFile",
      value: state("previewDocsSelected"),
      urlTemplate: "/collection/files/{{id}}/content",
      fit: "cover",
      blurhashDelay: 2000,
    },
  },
  {
    sm: "12", md: "4", lg: "4", xl: "4",
    type: "filepreview",
    element: {
      name: "fetchedFile",
      api: { name: "fileDetail", paths: ["data"], params: { id: { type: "url", key: "file", source: "query" } } },
      emptyText: "Waiting for ?file= in the URL",
      fit: "cover",
      blurhashDelay: 2000,
    },
  },
];

const literalBins: Bin[] = [
  note("A bare URL is a file named by its last path segment; a record in the config says what the URL can't."),
  { ...half, type: "filepreview", element: { name: "literalUrl", value: literal("/collection/files/n11/Hero%20banner.png"), height: "220px" } },
  {
    ...half,
    type: "filepreview",
    element: {
      name: "literalRecord",
      value: literal({ name: "Brand guide.pdf", type: "application/pdf", url: "/collection/files/n12/content" }),
      height: "220px",
    },
  },
];

const repeaterBins: Bin[] = [
  note("One preview per item of GET /collection/files, bound to the item itself. A click opens the modal viewer."),
  {
    ...full,
    type: "repeater",
    element: {
      name: "fileCards",
      api: { name: "files", paths: ["data"] },
      itemSpan: { sm: "6", md: "4", lg: "3", xl: "3" },
      gap: "3",
      itemContainer: {
        id: "file-card",
        name: "FileCard",
        isArray: false,
        ...DEFAULT_CONTAINER_GRID,
        bins: [
          {
            ...full,
            type: "filepreview",
            element: { name: "fileCard", value: { type: "row", key: "none" }, height: "140px", openOnClick: true },
          },
        ],
      },
    },
  },
];

/** The banner, held back by the mock API so the placeholder stays on screen. */
const SLOW_BANNER = "/collection/files/n11/Hero%20banner.png?delay=2500";
const BANNER_HASH = "LXI_Rx2gw#SjsqWrjtfRfQfQfQfQ";
/** The banner's pixel size: with it, the placeholder is the image's exact box before the image arrives. */
const BANNER_SIZE = { width: 64, height: 36 };

const blurhashBins: Bin[] = [
  note("Each image takes 2.5 seconds here, so the placeholder can be seen; reload the page to replay it. The hash is computed when an image is stored and comes with its record: one preview has it in the config instead, for a literal URL, which has no record. A record that also carries the image's width and height gets a placeholder of the image's exact size from the start (the first is resized to cover the frame, and so is its placeholder); without them (the literal URL, the next one) the placeholder fills the frame until the image's own size is known. The last image isn't delayed by the API: blurhashDelay holds its placeholder for 4 seconds."),
  { ...third, type: "filepreview", element: { name: "hashRecord", value: literal({ name: "From the record.png", url: SLOW_BANNER, blurhash: BANNER_HASH, ...BANNER_SIZE }), height: "200px", fit: "cover" } },
  {
    ...third,
    type: "filepreview",
    element: {
      name: "hashKey",
      value: literal({ name: "From a key.png", url: SLOW_BANNER, thumb: { hash: BANNER_HASH, w: BANNER_SIZE.width, h: BANNER_SIZE.height } }),
      keys: { blurhash: "thumb.hash", width: "thumb.w", height: "thumb.h" },
      height: "200px",
    },
  },
  { ...third, type: "filepreview", element: { name: "hashOff", value: literal({ name: "Turned off.png", url: SLOW_BANNER, blurhash: BANNER_HASH, ...BANNER_SIZE }), showBlurhash: false, height: "200px" } },
  { ...third, type: "filepreview", element: { name: "hashLiteral", value: literal(SLOW_BANNER), blurhash: BANNER_HASH, height: "200px" } },
  { ...third, type: "filepreview", element: { name: "hashNoSize", value: literal({ name: "No size in the record.png", url: SLOW_BANNER, blurhash: BANNER_HASH }), height: "200px" } },
  { ...third, type: "filepreview", element: { name: "hashAuto", value: literal({ name: "Auto height.png", url: SLOW_BANNER, blurhash: BANNER_HASH, ...BANNER_SIZE }), height: "auto" } },
  { ...third, type: "filepreview", element: { name: "hashBad", value: literal({ name: "Not a real hash.png", url: SLOW_BANNER, blurhash: "not a hash" }), height: "200px" } },
  {
    ...third,
    type: "filepreview",
    element: {
      name: "hashDelay",
      value: literal({ name: "Held for 4 seconds.png", url: "/collection/files/n11/Hero%20banner.png", blurhash: BANNER_HASH, ...BANNER_SIZE }),
      blurhashDelay: 4000,
      height: "200px",
    },
  },
];

const spreadsheetBins: Bin[] = [
  note("A workbook (.xlsx, .xls, .ods) or a .csv is read in the browser and drawn as a grid: a tab per sheet, merged cells, the formatted values. Long sheets are cut at 500 rows and 50 columns, with a note saying so."),
  {
    sm: "12", md: "12", lg: "8", xl: "8",
    type: "filepreview",
    element: { name: "sheetWorkbook", value: literal({ name: "Q1 sales.xlsx", url: "/collection/files/n15/content" }), height: "360px" },
  },
  {
    sm: "12", md: "12", lg: "4", xl: "4",
    type: "filepreview",
    element: { name: "sheetCsv", value: literal({ name: "Q1 price list.csv", url: "/collection/files/n3/content" }), height: "360px" },
  },
];

const fallbackBins: Bin[] = [
  { ...third, type: "filepreview", element: { name: "noPreview", value: literal({ name: "Q2 supplier terms.docx", size: 74, url: "/collection/files/n5/content" }), height: "200px" } },
  { ...third, type: "filepreview", element: { name: "noPreviewBare", value: literal({ name: "Q2 supplier terms.docx", size: 74, url: "/collection/files/n5/content" }), height: "200px", showHeader: false } },
  { ...third, type: "filepreview", element: { name: "missingFile", value: literal("/collection/files/missing/lost.png"), height: "200px" } },
  { ...third, type: "filepreview", element: { name: "failedRead", api: { name: "fileDetail", paths: ["data"], params: { id: { type: "value", key: "none", value: "missing" } } }, height: "200px" } },
  { ...third, type: "filepreview", element: { name: "emptyPreview", height: "200px", emptyText: "Nothing bound yet" } },
];

const section = (id: string, title: string, bins: Bin[]): Container => ({
  id: `file-preview-${id}`,
  name: `FilePreview${id}`,
  isArray: false,
  bins,
  ...DEFAULT_CONTAINER_GRID,
  gap: "4",
  surface: { title },
});

export const containerFilePreviewDemo: Container[] = [
  section("collection", "From a file collection and an endpoint", fromCollectionBins),
  section("literal", "From a literal", literalBins),
  section("repeater", "In a repeater", repeaterBins),
  section("spreadsheet", "Spreadsheets", spreadsheetBins),
  section("blurhash", "Blurhash", blurhashBins),
  section("fallbacks", "What can't be shown", fallbackBins),
];
