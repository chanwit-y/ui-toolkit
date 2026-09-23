import { useMemo, type MouseEvent } from "react";
import { useInRouterContext, useNavigate } from "react-router-dom";
import { renderTemplate } from "../util/template";
import { sanitizeHtml } from "../util/sanitizeHtml";

export type HtmlCellProps = {
  /** The column's `html` template (`{{path}}` placeholders, `{{value}}` alias). */
  template: string;
  row: unknown;
  /** The column's own value, already date-formatted — what `{{value}}` reads. */
  value?: unknown;
  /** Extra classes on the wrapper (the page-level `HtmlContent` adds its prose styles). */
  className?: string;
};

/** The sanitised markup of one cell; exported for authoring previews. */
export function renderHtmlCell(template: string, row: unknown, value?: unknown) {
  return sanitizeHtml(renderTemplate(template, row, value));
}

/**
 * A plain same-origin link click (`<a href="/countries/TH">`, no modifier key,
 * no `target`, no `download`) — the ones a router should take instead of the
 * browser reloading the page.
 */
function internalLinkPath(e: MouseEvent<HTMLElement>): string | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
  const anchor = (e.target as HTMLElement).closest("a");
  if (!anchor || !e.currentTarget.contains(anchor)) return null;
  if (anchor.hasAttribute("target") || anchor.hasAttribute("download")) return null;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return null;
  const url = new URL(href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  return url.pathname + url.search + url.hash;
}

function RoutedHtmlCell({ html, className }: { html: string; className: string }) {
  const navigate = useNavigate();
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const path = internalLinkPath(e);
    if (path === null) return;
    e.preventDefault();
    navigate(path);
  };
  return <div className={className} onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * An HTML table cell (see `ColumnDef.html`): the template is filled from the
 * row with escaped values, sanitised, and rendered as markup. Inside a router
 * same-origin links navigate in-app; outside one they stay ordinary anchors.
 */
export function HtmlCell({ template, row, value, className }: HtmlCellProps) {
  const html = useMemo(() => renderHtmlCell(template, row, value).html, [template, row, value]);
  const inRouter = useInRouterContext();
  const classes = `datatable-html-cell ${className ?? ""}`;
  if (inRouter) return <RoutedHtmlCell html={html} className={classes} />;
  return <div className={classes} dangerouslySetInnerHTML={{ __html: html }} />;
}
