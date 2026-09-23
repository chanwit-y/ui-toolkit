import { IconButton } from "@radix-ui/themes";
import { ChevronDown, Image as ImageIcon } from "lucide-react";
import { useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import type { DataValue, NavigateTarget } from "./@types";
import { imageSrc } from "./core/bound";
import { useNavigateTo } from "./core/pages";
import { displayText, useDataValue } from "./core/rowScope";
import { Paper, type PaperProps } from "./Paper";

/**
 * A card after MUI's: a `Paper` with slots in MUI's order — `CardHeader`,
 * `CardMedia`, `CardContent`, `CardActions`, `CardCollapse`. The parts are
 * plain compound components for JSX use; `CardView` assembles them from the
 * `card` element's slot config (bound values, expand state, action area) and
 * is what the engine builder and the studio preview render.
 *
 * Surfaces come from `Paper` (Radix vars / `dark:` classes); text uses the
 * gray scale so it follows the appearance, the action-area focus ring the
 * accent.
 */

/** Controls inside the card keep their own click — they don't trigger `navigate`. */
export const CARD_INTERACTIVE_SELECTOR =
  "a,button,input,select,textarea,label,[role='button'],[role='link'],[role='checkbox'],[role='tab'],[role='menuitem']";

const CLICKABLE_CLASS =
  "cursor-pointer outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--accent-8)] hover:shadow-lg";

export type CardProps = PaperProps & {
  /**
   * Makes the whole card a link (MUI `CardActionArea`): `role="link"`,
   * Enter / Space, clicks on inner controls excluded. `CardView` wires the
   * engine's `navigate` to it.
   */
  onActivate?: () => void;
};

/** The shell: a `Paper` that clips its media band; optionally a link. */
export function Card({ onActivate, className, children, ...paper }: CardProps) {
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const hit = (e.target as HTMLElement).closest(CARD_INTERACTIVE_SELECTOR);
    if (hit && hit !== e.currentTarget) return;
    onActivate?.();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    onActivate?.();
  };
  return (
    <div
      className="gummy-card h-full min-w-0"
      {...(onActivate ? { role: "link", tabIndex: 0, onClick, onKeyDown } : {})}
    >
      <Paper
        {...paper}
        className={["flex h-full flex-col overflow-hidden", onActivate ? CLICKABLE_CLASS : "", className ?? ""]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </Paper>
    </div>
  );
}

export type CardHeaderProps = {
  avatar?: ReactNode;
  title?: ReactNode;
  subheader?: ReactNode;
  /** A control at the header's end (MUI's ⋮). */
  action?: ReactNode;
  className?: string;
};

/** avatar · title / subheader · action. The title reads smaller beside an avatar, as in MUI. */
export function CardHeader({ avatar, title, subheader, action, className }: CardHeaderProps) {
  const titleClass = avatar
    ? "text-sm font-medium leading-5 text-[var(--gray-12)]"
    : "text-base font-semibold leading-6 text-[var(--gray-12)]";
  return (
    <div className={`flex items-center gap-4 p-4 ${className ?? ""}`}>
      {avatar && <div className="flex shrink-0 items-center">{avatar}</div>}
      <div className="min-w-0 flex-1">
        {title !== undefined && title !== "" && <div className={`truncate ${titleClass}`}>{title}</div>}
        {subheader !== undefined && subheader !== "" && (
          <div className="truncate text-sm leading-5 text-[var(--gray-11)]">{subheader}</div>
        )}
      </div>
      {action && <div className="-my-1 -mr-2 flex shrink-0 items-center self-start">{action}</div>}
    </div>
  );
}

export const DEFAULT_CARD_MEDIA_HEIGHT = 180;

export type CardMediaProps = {
  src?: string;
  alt?: string;
  /** Height in px (default 180). */
  height?: number;
  className?: string;
};

/** The image band; a gray placeholder when there is no image or it fails to load. */
export function CardMedia({ src, alt, height = DEFAULT_CARD_MEDIA_HEIGHT, className }: CardMediaProps) {
  const [failed, setFailed] = useState(false);
  const showImage = !!src && !failed;
  return (
    <div
      className={`relative w-full shrink-0 overflow-hidden bg-[var(--gray-3)] ${className ?? ""}`}
      style={{ height }}
      role={showImage ? undefined : "img"}
      aria-label={showImage ? undefined : alt || "No image"}
    >
      {showImage ? (
        // Remount per src so a previous image's error doesn't stick.
        <img key={src} src={src} alt={alt ?? ""} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[var(--gray-8)]">
          <ImageIcon size={Math.min(40, Math.max(20, height / 4))} aria-hidden />
        </div>
      )}
    </div>
  );
}

export type CardContentProps = { children?: ReactNode; className?: string };

/** The body, padded like MUI's `CardContent`. */
export function CardContent({ children, className }: CardContentProps) {
  return <div className={`flex-1 p-4 text-sm text-[var(--gray-12)] ${className ?? ""}`}>{children}</div>;
}

export type CardActionsProps = {
  children?: ReactNode;
  /** Where the buttons sit (default "start"). */
  align?: "start" | "end";
  className?: string;
};

/** The footer button row. */
export function CardActions({ children, align = "start", className }: CardActionsProps) {
  return (
    <div className={`flex items-center gap-2 p-2 ${align === "end" ? "justify-end" : "justify-start"} ${className ?? ""}`}>
      {children}
    </div>
  );
}

export type CardExpandButtonProps = {
  expanded: boolean;
  onToggle: () => void;
  /** Accessible name / tooltip (default "Show more"). */
  label?: string;
  className?: string;
};

/** The chevron that opens `CardCollapse`; pushed to the row's end (MUI's `expand` icon). */
export function CardExpandButton({ expanded, onToggle, label = "Show more", className }: CardExpandButtonProps) {
  return (
    <IconButton
      type="button"
      variant="ghost"
      color="gray"
      size="2"
      radius="full"
      aria-expanded={expanded}
      aria-label={label}
      title={label}
      onClick={onToggle}
      className={className}
      // Ghost buttons carry negative margins; pin this one to the row's end.
      style={{ margin: "0 0 0 auto" }}
    >
      <ChevronDown size={18} className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} aria-hidden />
    </IconButton>
  );
}

export type CardCollapseProps = { expanded: boolean; children?: ReactNode; className?: string };

/** The expandable section: an animated `0fr → 1fr` grid row, so no height measuring. */
export function CardCollapse({ expanded, children, className }: CardCollapseProps) {
  return (
    <div
      className="grid transition-[grid-template-rows,visibility] duration-200 ease-out"
      // `visibility` keeps a collapsed section out of the tab order; it flips at the transition's end.
      style={{ gridTemplateRows: expanded ? "1fr" : "0fr", visibility: expanded ? "visible" : "hidden" }}
      aria-hidden={!expanded}
    >
      <div className="min-h-0 overflow-hidden">
        <div className={`border-t border-[var(--gray-a6)] p-4 text-sm text-[var(--gray-12)] ${className ?? ""}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

export type CardViewProps = {
  /** Header slots; the header row renders when any of them is set. */
  title?: string;
  titleValue?: DataValue;
  subheader?: string;
  subheaderValue?: DataValue;
  avatar?: ReactNode;
  headerAction?: ReactNode;
  /** The media band renders when `media` is set, placeholder included. */
  media?: { src?: string; srcValue?: DataValue; alt?: string; height?: number };
  content?: ReactNode;
  /** The footer buttons; the row renders when there are any, or a `collapse`. */
  actions?: ReactNode[];
  actionsAlign?: "start" | "end";
  collapse?: ReactNode;
  collapseLabel?: string;
  defaultExpanded?: boolean;
  navigate?: NavigateTarget;
  variant?: PaperProps["variant"];
  elevation?: number;
  square?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * The `card` element assembled from its slots. Bound values resolve against
 * the URL, global state and the enclosing repeater item (`useDataValue`), so
 * it needs a router above it like every bound element; the static value is
 * the fallback when a binding resolves empty.
 */
export function CardView({
  title,
  titleValue,
  subheader,
  subheaderValue,
  avatar,
  headerAction,
  media,
  content,
  actions = [],
  actionsAlign,
  collapse,
  collapseLabel,
  defaultExpanded = false,
  navigate,
  variant,
  elevation,
  square,
  className,
  style,
}: CardViewProps) {
  const boundTitle = displayText(useDataValue(titleValue));
  const boundSubheader = displayText(useDataValue(subheaderValue));
  const boundMedia = imageSrc(useDataValue(media?.srcValue));
  const [expanded, setExpanded] = useState(defaultExpanded);
  const navigateTo = useNavigateTo();

  const headerTitle = boundTitle ?? title;
  const headerSubheader = boundSubheader ?? subheader;
  const hasHeader = !!(headerTitle || headerSubheader || avatar || headerAction);
  const hasActions = actions.length > 0 || collapse !== undefined;

  return (
    <Card onActivate={navigate ? () => navigateTo(navigate) : undefined} variant={variant} elevation={elevation} square={square} className={className} style={style}>
      {hasHeader && <CardHeader avatar={avatar} title={headerTitle} subheader={headerSubheader} action={headerAction} />}
      {media && <CardMedia src={boundMedia ?? media.src} alt={media.alt} height={media.height} />}
      {content !== undefined && <CardContent>{content}</CardContent>}
      {hasActions && (
        <CardActions align={actionsAlign}>
          {actions}
          {collapse !== undefined && (
            <CardExpandButton expanded={expanded} onToggle={() => setExpanded((v) => !v)} label={collapseLabel} />
          )}
        </CardActions>
      )}
      {collapse !== undefined && <CardCollapse expanded={expanded}>{collapse}</CardCollapse>}
    </Card>
  );
}
