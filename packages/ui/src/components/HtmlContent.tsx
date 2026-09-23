import type { CSSProperties } from "react";
import type { DataValue } from "./@types";
import { useDataValue } from "./core/rowScope";
import { HtmlCell } from "./HtmlCell";

export type HtmlContentProps = {
  /** The markup, with `{{path}}` placeholders into the bound value (`{{value}}` = the value itself). */
  html: string;
  /** What the placeholders read; `undefined` renders the template as static markup. */
  value?: DataValue;
  /** Typographic defaults for headings / paragraphs / lists / tables (default true). */
  prose?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * A block of HTML on the page (the `html` element): the data table's HTML-cell
 * pipeline — `{{path}}` placeholders filled with escaped values, DOMPurify's
 * presentational profile, same-origin links routed in-app — over a bound value
 * instead of a table row. `useDataValue` resolves the binding against the URL,
 * global state and the enclosing repeater item, so it needs a router above it
 * like every bound element. `prose` adds the `gummy-html-prose` typography
 * (`styles/htmlContent.css`: Radix-var colours, so it follows the appearance).
 */
export function HtmlContent({ html, value, prose = true, className, style }: HtmlContentProps) {
  const data = useDataValue(value);
  return (
    <div className={`gummy-html-content ${className ?? ""}`} style={style}>
      <HtmlCell template={html} row={data} value={data} className={prose ? "gummy-html-prose" : ""} />
    </div>
  );
}
