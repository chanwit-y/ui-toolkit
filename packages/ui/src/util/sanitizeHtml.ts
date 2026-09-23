import createDOMPurify, { type Config, type DOMPurify } from "dompurify";

/**
 * The presentational profile of an HTML table cell (see `ColumnDef.html`):
 * DOMPurify's HTML set (no SVG / MathML) minus what has no business in a cell —
 * the `<style>` tag (its CSS would leak over the whole app; the `style`
 * attribute stays) and dead form controls. `target` is let through for
 * `_blank` links, which the hook below pairs with a safe `rel`.
 */
const CELL_PROFILE: Config = Object.freeze({
  USE_PROFILES: { html: true },
  FORBID_TAGS: ["style", "form", "input", "button", "select", "textarea", "option", "optgroup", "label", "fieldset"],
  ADD_ATTR: ["target"],
});

export type SanitizedHtml = {
  html: string;
  /** How many elements / attributes the sanitiser dropped — for authoring hints. */
  removed: number;
};

let purifier: DOMPurify | null | undefined;

function getPurifier(): DOMPurify | null {
  if (purifier !== undefined) return purifier;
  if (typeof window === "undefined") return (purifier = null);
  // Our own instance, so the hook never touches a consumer's global DOMPurify.
  const instance = createDOMPurify(window);
  if (!instance.isSupported) return (purifier = null);
  instance.addHook("afterSanitizeAttributes", (node) => {
    if (!(node instanceof Element)) return;
    if (node.tagName === "A" && node.hasAttribute("target")) {
      if (node.getAttribute("target") === "_blank") node.setAttribute("rel", "noopener noreferrer");
      else node.removeAttribute("target");
    }
    if (node.tagName === "IMG") {
      const src = node.getAttribute("src") ?? "";
      if (/^\s*data:/i.test(src) && !/^\s*data:image\//i.test(src)) node.removeAttribute("src");
    }
  });
  return (purifier = instance);
}

/**
 * Sanitise markup for a table cell. Where DOMPurify can't run (no DOM) the
 * result is empty rather than the unsanitised input.
 */
export function sanitizeHtml(dirty: string): SanitizedHtml {
  const instance = getPurifier();
  if (!instance) return { html: "", removed: 0 };
  const html = instance.sanitize(dirty, CELL_PROFILE);
  return { html, removed: instance.removed.length };
}
