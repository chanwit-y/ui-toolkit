import type { Bin, Container } from "@gummy-ui/ui";
import { DEFAULT_CONTAINER_GRID } from "@gummy-ui/ui";

/**
 * HTML content demo page (`/html-content`): the `html` element — a block of
 * markup on the page. `html` is a `{{path}}` template rendered against
 * `value` (a `DataValue`: the enclosing repeater item, a `state` slice, a URL
 * param — or nothing, for static markup); every placeholder is escaped and
 * the result goes through the same sanitiser as the data table's HTML columns
 * (no scripts, no `<style>`, no form controls; `class` / `style` / links kept).
 * Same-origin links navigate in-app. `prose: false` drops the typographic
 * defaults for markup that brings its own layout.
 */
const full = { sm: "12", md: "12", lg: "12", xl: "12" } as const;

const section = (text: string, caption: string): Bin[] => [
  { ...full, type: "typography", element: { text, variant: "subtitle1", weight: "medium" } },
  { ...full, type: "typography", element: { text: caption, variant: "body2", color: "gray" } },
];

const html = (name: string, html: string, extra: Record<string, unknown> = {}, span: Partial<Pick<Bin, "sm" | "md" | "lg" | "xl">> = {}): Bin => ({
  ...full,
  ...span,
  type: "html",
  element: { name, html, ...extra } as Bin["element"],
});

/** One region in the repeater: its name, about text and a computed count from the item. */
const regionBlock: Container = {
  id: "html-region-block",
  name: "HtmlRegionBlock",
  isArray: false,
  bins: [
    html(
      "regionHtml",
      `<h3>{{name}} <span class="dt-badge-gray dt-badge">{{countries.length}} countries</span></h3>
<p class="dt-muted">{{description}}</p>
<p>{{about}}</p>
<p>First on the list: <a href="/country/{{countries.0._id}}">{{countries.0.name}}</a></p>`,
      { value: { type: "row", key: "none" } },
    ),
  ],
  ...DEFAULT_CONTAINER_GRID,
};

export const containerHtmlContentDemo: Container[] = [
  {
    id: "1",
    name: "HtmlContentDemo",
    isArray: false,
    bins: [
      { ...full, type: "typography", element: { text: "HTML content", variant: "h3" } },
      {
        ...full,
        type: "typography",
        element: {
          variant: "body2",
          color: "gray",
          text: "The html element renders a block of markup: a {{path}} template over a bound value, escaped and sanitised like a data table's HTML column, with in-app links and the dt-* helpers. Static markup needs no value at all.",
        },
      },

      ...section("Static markup", "A CMS-style block: headings, paragraphs, lists, a quote, inline code, a table and links — the prose defaults style them with Radix vars, so they follow the theme."),
      html(
        "staticHtml",
        `<h2>Getting started</h2>
<p>Gummy UI screens are <strong>three plain-object configs</strong> — <code>model</code>, <code>api</code> and <code>container</code> — handed to <code>Core</code>. This block is one <code>html</code> bin.</p>
<ul>
  <li>Placeholders (a path in double curly braces) are filled with <em>escaped</em> text — no injection.</li>
  <li>Scripts, <code>&lt;style&gt;</code> and form controls are stripped by the sanitiser.</li>
  <li>Same-origin links are routed: <a href="/repeater">open the Repeater page</a>; external ones open normally: <a href="https://mui.com/material-ui/react-card/" target="_blank">MUI Card</a>.</li>
</ul>
<blockquote>Describe the screen, don't write it.</blockquote>
<table>
  <thead><tr><th>Key</th><th>What it is</th></tr></thead>
  <tbody>
    <tr><td><code>html</code></td><td>The template</td></tr>
    <tr><td><code>value</code></td><td>What the placeholders read</td></tr>
    <tr><td><code>prose</code></td><td>Typographic defaults (default on)</td></tr>
  </tbody>
</table>
<p>Helpers: <span class="dt-badge">accent badge</span> <span class="dt-badge dt-badge-gray">gray badge</span> <span class="dt-muted">muted</span> <span class="dt-strong">strong</span>.</p>`,
        {},
        { md: "8", lg: "8", xl: "8" },
      ),
      html(
        "staticHtmlNoProse",
        `<div style="padding:16px;border-radius:12px;background:var(--accent-3);color:var(--accent-11)">
  <div style="font-weight:600;margin-bottom:4px">prose: false</div>
  <div style="font-size:13px">Markup that brings its own layout — inline styles and Radix vars, no typographic defaults applied.</div>
</div>`,
        { prose: false },
        { md: "4", lg: "4", xl: "4" },
      ),

      ...section("Bound to a repeater item", "One block per region: {{name}}, {{about}}, a nested path {{countries.0.name}} and a count {{countries.length}} all read the item ({ type: \"row\", key: \"none\" } is the item itself)."),
      {
        ...full,
        type: "repeater",
        element: {
          name: "regionHtmlBlocks",
          idKey: "_id",
          api: { name: "regions", paths: ["data"] },
          itemContainer: regionBlock,
          itemSpan: { sm: "12", md: "6", lg: "6", xl: "6" },
          gap: "4",
          itemSurface: "outlined",
          itemPadding: "4",
          emptyText: "No regions",
        } as Bin["element"],
      },

      ...section("Inside a card", "An html bin is an ordinary bin, so it can be a card's content."),
      {
        sm: "12", md: "6", lg: "5", xl: "4",
        type: "card",
        element: {
          name: "htmlCard",
          variant: "outlined",
          header: { title: "Release notes", subheader: "v1.4 — rendered from HTML" },
          content: {
            id: "html-card-body",
            name: "HtmlCardBody",
            isArray: false,
            bins: [
              html(
                "cardHtml",
                `<ul>
  <li><span class="dt-badge">new</span> <code>card</code> and <code>html</code> elements</li>
  <li><span class="dt-badge dt-badge-gray">fix</span> repeater item spans</li>
</ul>`,
              ),
            ],
            ...DEFAULT_CONTAINER_GRID,
          },
        } as Bin["element"],
      },

      ...section("What the sanitiser removes", "The template below carries a script, an onclick, a <style> tag, a form control and a javascript: link — none of them survive."),
      html(
        "strippedHtml",
        `<p>Only this paragraph and the <a href="javascript:alert(1)">disarmed link</a> remain visible.</p>
<script>alert("xss")</script>
<style>body { background: red }</style>
<button onclick="alert(1)">a button</button>
<input placeholder="an input">
<img src="x" onerror="alert(1)" alt="">`,
        {},
        { md: "8", lg: "8", xl: "8" },
      ),
    ],
    ...DEFAULT_CONTAINER_GRID,
    gap: "5",
  },
];
