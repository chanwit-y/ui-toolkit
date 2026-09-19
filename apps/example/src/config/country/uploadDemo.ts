import type { Bin, Container } from "@gummy-ui/ui";
import { DEFAULT_CONTAINER_GRID } from "@gummy-ui/ui";

/**
 * Upload demo page (`/file-upload`). Six `uploadfile` bins, one per config worth
 * seeing on its own. The value is an `UploadedFile[]` in every case:
 *
 * - **Mode** — `multiple: false` (default) takes one file, which replaces the
 *   dropzone and carries Replace / Remove; `multiple: true` keeps the dropzone
 *   and appends, capped by `maxFiles`.
 * - **Accept** — a comma list or an array mixing presets (`image`, `pdf`,
 *   `document`, `spreadsheet`, `presentation`, `text`, `archive`, `audio`,
 *   `video`) with raw tokens (`.dwg`, `image/png`). Enforced on pick *and*
 *   drop: drop a mixed batch and the files that don't fit are skipped and
 *   named in the error line while the rest land.
 * - **Preview** — `preview` (default true) draws thumbnails / file-type icons
 *   and opens the viewer on click (images, PDF, video, audio, text; ← / → step
 *   through the files); `previewLayout` picks rows (`list`) or cards (`grid`).
 */
const section = (text: string): Bin => ({
  sm: "12", md: "12", lg: "12", xl: "12",
  type: "typography",
  element: { text, variant: "subtitle1", weight: "medium" },
});

const uploadApi = {
  uploadUrl: "/upload/single",
  deleteUrl: "/upload/:filename",
  fieldName: "file",
  responsePath: "data.url",
};

const modeBins: Bin[] = [
  section("Mode"),
  {
    sm: "12", md: "6", lg: "6", xl: "6",
    type: "uploadfile",
    alignSelf: "start",
    element: {
      name: "singleFile",
      label: "Single file",
      dataType: "array",
      helperText: "multiple: false — the file replaces the dropzone; Replace swaps it",
      isFullWidth: true,
    },
  },
  {
    sm: "12", md: "6", lg: "6", xl: "6",
    type: "uploadfile",
    alignSelf: "start",
    element: {
      name: "multiFiles",
      label: "Multiple files",
      dataType: "array",
      multiple: true,
      maxFiles: 4,
      helperText: "multiple: true, maxFiles: 4 — pick 5 and the fifth is skipped",
      isFullWidth: true,
    },
  },
];

const acceptBins: Bin[] = [
  section("Accept"),
  {
    sm: "12", md: "6", lg: "6", xl: "6",
    type: "uploadfile",
    alignSelf: "start",
    element: {
      name: "contract",
      label: "Signed contract",
      dataType: "array",
      accept: "pdf",
      maxSizeMB: 5,
      helperText: 'accept: "pdf" — one preset; anything else is rejected, also on drop',
      isFullWidth: true,
    },
  },
  {
    sm: "12", md: "6", lg: "6", xl: "6",
    type: "uploadfile",
    alignSelf: "start",
    element: {
      name: "projectFiles",
      label: "Project files",
      dataType: "array",
      multiple: true,
      accept: ["document", "spreadsheet", "presentation", "archive", ".dwg", ".psd"],
      maxSizeMB: 10,
      helperText: "Presets mixed with raw extensions — drop a mixed batch to see partial acceptance",
      isFullWidth: true,
    },
  },
];

const previewBins: Bin[] = [
  section("Preview"),
  {
    sm: "12", md: "12", lg: "6", xl: "6",
    type: "uploadfile",
    alignSelf: "start",
    element: {
      name: "gallery",
      label: "Photo gallery",
      dataType: "array",
      multiple: true,
      maxFiles: 8,
      accept: ["image"],
      previewLayout: "grid",
      helperText: 'previewLayout: "grid" — click a card for the viewer, ← / → to step through',
      isFullWidth: true,
    },
  },
  {
    sm: "12", md: "6", lg: "3", xl: "3",
    type: "uploadfile",
    alignSelf: "start",
    element: {
      name: "media",
      label: "Media via API",
      dataType: "array",
      multiple: true,
      maxFiles: 3,
      accept: ["image", "pdf", "audio", "video", "text"],
      valueFormat: "api",
      uploadApi,
      helperText: "List preview over uploaded URLs — PDF, audio, video and text open in the viewer",
      isFullWidth: true,
    },
  },
  {
    sm: "12", md: "6", lg: "3", xl: "3",
    type: "uploadfile",
    alignSelf: "start",
    element: {
      name: "plainFiles",
      label: "Preview off",
      dataType: "array",
      multiple: true,
      preview: false,
      helperText: "preview: false — plain rows, no thumbnails, no viewer",
      isFullWidth: true,
    },
  },
];

export const containerUploadDemo: Container[] = [
  {
    id: "1",
    name: "UploadDemo",
    isArray: false,
    bins: [
      {
        sm: "12", md: "12", lg: "12", xl: "12",
        type: "typography",
        element: { text: "Upload", variant: "h3" },
      },
      {
        sm: "12", md: "12", lg: "12", xl: "12",
        type: "typography",
        element: {
          variant: "body2",
          color: "gray",
          text: "The file upload's mode, accepted types and preview, one config per field.",
        },
      },
      ...modeBins,
      ...acceptBins,
      ...previewBins,
    ],
    ...DEFAULT_CONTAINER_GRID,
    gap: "6",
  },
];
