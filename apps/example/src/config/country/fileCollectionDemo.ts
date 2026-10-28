import type { Bin, Container, DataValue, FileCollectionApi } from "@gummy-ui/ui";
import { DEFAULT_CONTAINER_GRID } from "@gummy-ui/ui";

/**
 * File collection demo page (`/file-collection`) — the `filecollection`
 * element (see `spec/gummy-file-collection-spec.md`) over the mock API's
 * `/collection/file-collections` + `/collection/file-items` resources:
 *
 * - **Documents** — every slot wired: add / rename / delete collections, the
 *   New menu (folder, note, sheet — `kind` drives the icon through
 *   `kindIcons`), inline rename, Move to, drag-and-drop, Duplicate, Delete
 *   with the non-empty-folder block. The card beside it is bound to the
 *   `docsSelected` slice; a file click also navigates to this page with
 *   `?file=<id>`, which the line under the card reads back.
 * - **Browse** — `moveItem`, `duplicateItem` and the two deletes unwired, so
 *   drag-and-drop, Move to, Duplicate and the Delete entries are gone while
 *   New and Rename stay; `collapsible` (the 48px rail) and a fixed `height`.
 * - **Read-only** — `readOnly: true`: selection and expand only.
 */
const full = { sm: "12", md: "12", lg: "12", xl: "12" } as const;
const state = (key: string, path?: string): DataValue => ({ type: "state", key, ...(path ? { path } : {}) });

const text = (t: string, element: Record<string, unknown> = {}, span: Partial<Bin> = full): Bin => ({
  ...full,
  ...span,
  type: "typography",
  element: { text: t, variant: "body2", ...element } as Bin["element"],
});

const api: FileCollectionApi = {
  list: { name: "fileCollections", paths: ["data"] },
  createCollection: { name: "createFileCollection" },
  renameCollection: { name: "renameFileCollection", params: { id: "id" } },
  deleteCollection: {
    name: "deleteFileCollection",
    params: { id: "id" },
    confirmBox: { title: "Delete collection", description: 'Delete "{{name}}" and its {{count}} files? This cannot be undone.' },
    snackbarSuccess: { type: "success", message: "Collection deleted" },
    snackbarError: "$exception",
  },
  createItem: { name: "createFileItem" },
  renameItem: { name: "renameFileItem", params: { id: "id" } },
  deleteItem: {
    name: "deleteFileItem",
    params: { id: "id" },
    confirmBox: { title: "Delete item", description: 'Delete "{{name}}"? This cannot be undone.' },
    snackbarSuccess: { type: "success", message: "Deleted" },
    snackbarError: "$exception",
  },
  moveItem: { name: "moveFileItem", params: { id: "id" } },
  duplicateItem: { name: "duplicateFileItem", params: { id: "id" } },
};

const kindIcons = { markdown: "fileText", sheet: "table", image: "image" };
const newItems = [
  { label: "New folder", icon: "folder", type: "folder" },
  { label: "New note", icon: "fileText", type: "file", kind: "markdown" },
  { label: "New sheet", icon: "table", type: "file", kind: "sheet" },
] as const;

const nothingSelected = { left: { source: "state", key: "docsSelected", path: "id" }, operator: "eq", right: { val: undefined } } as const;
const somethingSelected = { ...nothingSelected, operator: "neq" } as const;

const documentsBins: Bin[] = [
  text("Every slot wired. Click a file to select it (and navigate here with ?file=…); double-click or F2 renames; drag into a folder or onto the collection body; the … menu has Move to, Duplicate and Delete. A non-empty folder can't be deleted.", { color: "gray" }),
  {
    sm: "12", md: "5", lg: "4", xl: "4",
    alignSelf: "stretch",
    type: "filecollection",
    element: {
      name: "docs",
      title: "Documents",
      api,
      newItems: [...newItems],
      kindIcons,
      selectNavigate: { page: "fileCollectionDemo", query: { file: { type: "row", key: "id" } }, replace: true },
    },
  },
  {
    sm: "12", md: "7", lg: "8", xl: "8",
    type: "container",
    container: {
      id: "file-collection-selected",
      name: "FileCollectionSelected",
      isArray: false,
      ...DEFAULT_CONTAINER_GRID,
      gap: "3",
      bins: [
        {
          ...full,
          type: "typography",
          condition: nothingSelected,
          element: { text: "Nothing selected — click a folder or a file.", variant: "body2", color: "gray" },
        },
        {
          ...full,
          type: "card",
          condition: somethingSelected,
          element: {
            name: "selectedCard",
            variant: "outlined",
            header: {
              title: "—",
              titleValue: state("docsSelected", "name"),
              subheader: "",
              subheaderValue: state("docsSelected", "path"),
            },
            content: {
              id: "file-collection-selected-content",
              name: "FileCollectionSelectedContent",
              isArray: false,
              ...DEFAULT_CONTAINER_GRID,
              gap: "2",
              bins: [
                text("Type", { weight: "medium" }, { sm: "4", md: "3", lg: "2", xl: "2" }),
                text("", { value: state("docsSelected", "type") }, { sm: "8", md: "9", lg: "10", xl: "10" }),
                text("Kind", { weight: "medium" }, { sm: "4", md: "3", lg: "2", xl: "2" }),
                text("—", { value: state("docsSelected", "kind") }, { sm: "8", md: "9", lg: "10", xl: "10" }),
                text("Id", { weight: "medium" }, { sm: "4", md: "3", lg: "2", xl: "2" }),
                text("", { value: state("docsSelected", "id") }, { sm: "8", md: "9", lg: "10", xl: "10" }),
                text("Parent", { weight: "medium" }, { sm: "4", md: "3", lg: "2", xl: "2" }),
                text("(root)", { value: state("docsSelected", "parentId") }, { sm: "8", md: "9", lg: "10", xl: "10" }),
              ],
            },
          },
        },
        text("Navigated file id (from ?file=): ", { weight: "medium" }, { sm: "12", md: "5", lg: "4", xl: "4" }),
        text("—", { value: { type: "url", key: "file", source: "query" }, color: "gray" }, { sm: "12", md: "7", lg: "8", xl: "8" }),
      ],
    },
  },
];

const browseBins: Bin[] = [
  text("moveItem, duplicateItem and the two deletes are unwired: no drag-and-drop, no Move to, Duplicate or Delete entries; New and Rename remain. Collapsible, with a fixed height.", { color: "gray" }),
  {
    sm: "12", md: "6", lg: "4", xl: "4",
    type: "filecollection",
    element: {
      name: "browse",
      title: "Browse",
      collapsible: true,
      height: "320px",
      api: {
        list: api.list,
        createCollection: api.createCollection,
        renameCollection: api.renameCollection,
        createItem: api.createItem,
        renameItem: api.renameItem,
      },
      kindIcons,
    },
  },
  {
    sm: "12", md: "6", lg: "4", xl: "4",
    type: "filecollection",
    element: {
      name: "readOnlyDocs",
      title: "Read-only",
      readOnly: true,
      height: "320px",
      api,
      kindIcons,
    },
  },
];

export const containerFileCollectionDemo: Container[] = [
  {
    id: "file-collection-documents",
    name: "FileCollectionDocuments",
    isArray: false,
    bins: documentsBins,
    ...DEFAULT_CONTAINER_GRID,
    gap: "4",
    surface: { title: "File collection" },
  },
  {
    id: "file-collection-browse",
    name: "FileCollectionBrowse",
    isArray: false,
    bins: browseBins,
    ...DEFAULT_CONTAINER_GRID,
    gap: "4",
    surface: { title: "Unwired slots, collapsible and read-only" },
  },
];
