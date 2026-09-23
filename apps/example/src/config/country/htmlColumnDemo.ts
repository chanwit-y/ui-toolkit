import type { Bin, Container, DataTableColumnDef } from "@gummy-ui/ui";
import { DEFAULT_CONTAINER_GRID } from "@gummy-ui/ui";

/**
 * HTML columns demo page (`/html-columns`). `html` on a `datatable` column
 * draws the cell from a template instead of the plain value. One table per
 * aspect of the feature:
 *
 * - **Helpers** — `{{path}}` placeholders read the row, `{{value}}` is the
 *   column's own value after `useDateFormat`; the `dt-*` classes ship with the
 *   library and follow the theme. A same-origin `<a href>` navigates in-app,
 *   `target="_blank"` opens a new tab (the sanitiser adds the safe `rel`).
 * - **Rich cells** — a cell as a small layout: profile block, `<dl>`, inline
 *   formatting, a `<details>` disclosure, link pills.
 * - **Images and inline style** — `<img>` and the `style` attribute survive
 *   the sanitiser; Radix vars keep a hand-styled cell theme-aware.
 * - **Nested paths** — a placeholder is a lodash `get` path, so it reaches
 *   into objects and arrays (`{{countries.0.name}}`, `{{countries.length}}`).
 *   A path that resolves to nothing renders empty.
 * - **Sanitiser** — what a template may *not* carry: scripts, event handlers,
 *   `<style>`, form controls and `javascript:` URLs are dropped; the rest of
 *   the cell still renders.
 *
 * Row values are always HTML-escaped before they meet the template, so data
 * never becomes markup — rename a country to `<b>bold</b>` on the Countries
 * page and it shows up here as that literal text. Sorting and the search box
 * keep working off the accessor's plain value, not the rendered markup.
 */
const section = (text: string, caption: string): Bin[] => [
  {
    sm: "12", md: "12", lg: "12", xl: "12",
    type: "typography",
    element: { text, variant: "subtitle1", weight: "medium" },
  },
  {
    sm: "12", md: "12", lg: "12", xl: "12",
    type: "typography",
    element: { text: caption, variant: "body2", color: "gray" },
  },
];

const table = (element: Record<string, unknown>): Bin => ({
  sm: "12", md: "12", lg: "12", xl: "12",
  type: "datatable",
  justifySelf: "stretch",
  alignSelf: "start",
  element: element as Bin["element"],
});

const countriesApi = {
  name: "countries",
  paths: ["data"],
  body: {
    collectionId: { type: "value", key: "collectionId", value: "691e9963992636eb1560eadb" },
    offset: { type: "value", key: "offset", value: 0 },
    limit: { type: "value", key: "limit", value: 100 },
  },
};

const helperColumns: DataTableColumnDef[] = [
  {
    accessor: "name",
    header: "Country",
    align: "start",
    enableSorting: true,
    enableColumnFilter: false,
    html: '<div class="dt-strong"><a href="/country/{{_id}}">{{name}}</a></div><div class="dt-muted">id {{_id}}</div>',
  },
  {
    accessor: "code",
    header: "Code",
    align: "center",
    enableSorting: true,
    enableColumnFilter: false,
    html: '<span class="dt-badge">{{code}}</span>',
  },
  {
    accessor: "updated_by_name",
    header: "Updated By",
    align: "center",
    enableSorting: false,
    enableColumnFilter: true,
    html: '<span class="dt-badge dt-badge-gray">{{updated_by_name}}</span>',
  },
  {
    accessor: "updated_at",
    header: "Updated",
    align: "start",
    useDateFormat: "DD/MM/YYYY HH:mm",
    enableSorting: true,
    enableColumnFilter: false,
    html: '{{value}} <span class="dt-muted">by {{updated_by_name}}</span>',
  },
  {
    // Column ids are the accessors, so a cell that isn't about one field
    // borrows a free one — the template reads whatever it wants.
    accessor: "_id",
    header: "Look up",
    align: "start",
    enableSorting: false,
    enableColumnFilter: false,
    html: '<a href="https://en.wikipedia.org/wiki/{{name}}" target="_blank">Wikipedia ↗</a>',
  },
];

const PILL = "display:inline-block;padding:2px 10px;border-radius:9999px;text-decoration:none;font-size:0.85em;";

/**
 * Rich cells: a template is free-form markup, so one cell can be a small
 * layout of its own — flex blocks, a `<dl>`, inline formatting, a native
 * `<details>` disclosure, several links. Layout goes through `style` (the
 * config isn't Tailwind-scanned) and colours through Radix vars. The profile
 * flag is a `background` url rather than an `<img>`: a row whose `avatar`
 * isn't a URL string then falls back to the gray placeholder block.
 */
const richColumns: DataTableColumnDef[] = [
  {
    accessor: "name",
    header: "Profile",
    align: "start",
    enableSorting: true,
    enableColumnFilter: false,
    html: '<div style="display:flex;align-items:center;gap:10px"><span style="flex:none;width:32px;height:22px;border-radius:3px;background:var(--gray-3) url({{avatar}}) center/cover;box-shadow:0 0 0 1px var(--gray-a5)"></span><div><div class="dt-strong"><a href="/country/{{_id}}">{{name}}</a></div><div class="dt-muted">{{code}} · record #{{_id}}</div></div></div>',
  },
  {
    accessor: "code",
    header: "Facts",
    align: "start",
    enableSorting: true,
    enableColumnFilter: false,
    html: '<dl style="display:grid;grid-template-columns:auto 1fr;gap:2px 10px;margin:0;font-size:0.85em"><dt style="color:var(--gray-10)">Code</dt><dd style="margin:0"><span class="dt-badge">{{code}}</span></dd><dt style="color:var(--gray-10)">Id</dt><dd style="margin:0"><code>{{_id}}</code></dd><dt style="color:var(--gray-10)">Editor</dt><dd style="margin:0">{{updated_by_name}}</dd></dl>',
  },
  {
    accessor: "updated_at",
    header: "Summary",
    align: "start",
    useDateFormat: "DD MMM YYYY",
    enableSorting: true,
    enableColumnFilter: false,
    html: '<p style="margin:0;max-width:300px;white-space:normal"><strong>{{name}}</strong> <em>({{code}})</em> was last edited by <mark style="padding:0 4px;border-radius:3px;background:var(--accent-4);color:var(--accent-12)">{{updated_by_name}}</mark> on <u>{{value}}</u>.</p>',
  },
  {
    accessor: "updated_by_name",
    header: "More",
    align: "start",
    enableSorting: false,
    enableColumnFilter: false,
    html: '<details><summary class="dt-link">Show record</summary><ul style="margin:4px 0 0;padding-left:16px;list-style:disc;font-size:0.85em"><li>Name: <strong>{{name}}</strong></li><li>Code: {{code}}</li><li>Updated: {{updated_at}}</li></ul></details>',
  },
  {
    accessor: "_id",
    header: "Actions",
    align: "start",
    enableSorting: false,
    enableColumnFilter: false,
    html: `<div style="display:flex;flex-wrap:wrap;gap:6px"><a href="/country/{{_id}}" style="${PILL}background:var(--accent-9);color:var(--accent-contrast)">Details</a><a href="https://en.wikipedia.org/wiki/{{name}}" target="_blank" style="${PILL}border:1px solid var(--gray-7);color:var(--gray-12)">Wikipedia ↗</a><a href="https://www.openstreetmap.org/search?query={{name}}" target="_blank" style="${PILL}border:1px solid var(--gray-7);color:var(--gray-12)">Map ↗</a></div>`,
  },
];

const styledColumns: DataTableColumnDef[] = [
  {
    // `avatar` is the flag URL on most rows; where it is an object the
    // placeholder resolves empty and the image simply doesn't draw.
    accessor: "name",
    header: "Country",
    align: "start",
    enableSorting: true,
    enableColumnFilter: false,
    html: '<img src="{{avatar}}" alt="" style="height:16px;border-radius:2px;margin-right:8px" /><span class="dt-strong">{{name}}</span>',
  },
  {
    accessor: "code",
    header: "Code",
    align: "center",
    enableSorting: true,
    enableColumnFilter: false,
    html: '<code style="padding:2px 6px;border-radius:4px;font-size:0.85em;background:var(--gray-3);color:var(--gray-12)">{{code}}</code>',
  },
  {
    accessor: "updated_by_name",
    header: "Status",
    align: "center",
    enableSorting: false,
    enableColumnFilter: false,
    html: '<span style="display:inline-flex;align-items:center;gap:6px;color:var(--green-11)"><span style="width:8px;height:8px;border-radius:9999px;background:var(--green-9)"></span>Synced by {{updated_by_name}}</span>',
  },
  {
    accessor: "_id",
    header: "Open",
    align: "end",
    enableSorting: false,
    enableColumnFilter: false,
    html: '<a href="/country/{{_id}}" style="display:inline-block;padding:2px 10px;border-radius:9999px;text-decoration:none;border:1px solid var(--accent-7);color:var(--accent-11)">Details →</a>',
  },
];

const nestedColumns: DataTableColumnDef[] = [
  {
    accessor: "name",
    header: "Region",
    align: "start",
    enableSorting: true,
    enableColumnFilter: false,
    html: '<div class="dt-strong">{{name}}</div><div class="dt-muted">{{description}}</div>',
  },
  {
    accessor: "countries",
    header: "Countries",
    align: "center",
    enableSorting: false,
    enableColumnFilter: false,
    html: '<span class="dt-badge">{{countries.length}} countries</span>',
  },
  {
    accessor: "_id",
    header: "First two",
    align: "start",
    enableSorting: false,
    enableColumnFilter: false,
    html: '<a href="/country/{{countries.0._id}}">{{countries.0.name}}</a> <span class="dt-muted">{{countries.0.code}}</span> &nbsp; <a href="/country/{{countries.1._id}}">{{countries.1.name}}</a> <span class="dt-muted">{{countries.1.code}}</span>',
  },
  {
    accessor: "featured",
    header: "Featured",
    align: "center",
    enableSorting: true,
    enableColumnFilter: false,
    html: '<span class="dt-badge dt-badge-gray">featured: {{featured}}</span>',
  },
];

const sanitiserColumns: DataTableColumnDef[] = [
  {
    accessor: "name",
    header: "Script + handler",
    align: "start",
    enableSorting: false,
    enableColumnFilter: false,
    html: '<script>alert("{{name}}")</script><span class="dt-strong" onclick="alert(1)">{{name}}</span> <span class="dt-muted">script and onclick removed</span>',
  },
  {
    accessor: "code",
    header: "Style tag + form control",
    align: "start",
    enableSorting: false,
    enableColumnFilter: false,
    html: '<style>body{display:none}</style><input value="{{code}}" /><span class="dt-badge">{{code}}</span> <span class="dt-muted">only the badge is left</span>',
  },
  {
    accessor: "_id",
    header: "Unsafe link",
    align: "start",
    enableSorting: false,
    enableColumnFilter: false,
    html: '<a href="javascript:alert(1)">javascript: link</a> <span class="dt-muted">href removed</span>',
  },
];

export const containerHtmlColumnDemo: Container[] = [
  {
    id: "1",
    name: "HtmlColumnDemo",
    isArray: false,
    bins: [
      {
        sm: "12", md: "12", lg: "12", xl: "12",
        type: "typography",
        element: { text: "HTML columns", variant: "h3" },
      },
      {
        sm: "12", md: "12", lg: "12", xl: "12",
        type: "typography",
        element: {
          variant: "body2",
          color: "gray",
          text: "html on a data table column draws the cell from a template: {{field}} placeholders read the row (always HTML-escaped), and the result is sanitised before it reaches the page. Sorting and search still use the column's plain value.",
        },
      },
      ...section(
        "Theme-aware helpers and links",
        "dt-strong, dt-muted, dt-badge and dt-badge-gray ship with the library. The country name links to its detail page in-app; Updated combines {{value}} (the formatted date) with another field; Look up opens a new tab.",
      ),
      table({ name: "dtHtmlHelpers", title: "Countries — helpers", columns: helperColumns, api: countriesApi }),
      ...section(
        "Rich cells",
        "Rich cells: a template can hold as much markup as the cell needs — a flag-and-title profile block, a dl of facts, a paragraph with strong / em / mark / u, a native details disclosure that opens in place, and a row of link pills (one in-app, two in a new tab). Rows grow to fit.",
      ),
      table({ name: "dtHtmlRich", title: "Countries — rich cells", columns: richColumns, api: countriesApi }),
      ...section(
        "Images and inline style",
        "img and the style attribute pass the sanitiser. Radix vars (--gray-*, --green-*, --accent-*) keep hand-styled cells right in both appearances and under any accent colour.",
      ),
      table({ name: "dtHtmlStyled", title: "Countries — styled cells", columns: styledColumns, api: countriesApi, canSearch: false }),
      ...section(
        "Nested paths",
        "Placeholders are lodash get paths: {{countries.length}}, {{countries.0.name}}, {{countries.1._id}}. Antarctica has no countries, so those paths resolve empty and the cell stays blank.",
      ),
      table({
        name: "dtHtmlNested",
        title: "Regions — nested fields",
        columns: nestedColumns,
        api: { name: "regions", paths: ["data"] },
        canSearch: false,
      }),
      ...section(
        "What the sanitiser removes",
        "These templates try a script tag, an onclick handler, a style tag, form controls and a javascript: URL. All of them are dropped; the presentational rest of each cell still renders.",
      ),
      table({ name: "dtHtmlSanitised", title: "Countries — sanitised", columns: sanitiserColumns, api: countriesApi, canSearch: false }),
    ],
    ...DEFAULT_CONTAINER_GRID,
    gap: "6",
  },
];
