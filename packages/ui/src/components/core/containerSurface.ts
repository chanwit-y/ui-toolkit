import type { Container, ContainerSurface } from "../@types";

/**
 * Resolves a container's optional themed surface into static Tailwind class
 * strings. Every class is written out as a literal here (not built at runtime)
 * so Tailwind's content scanner emits them. All neutral classes carry a `dark:`
 * variant so the panel flips with appearance; accent options use the Radix
 * `--accent-*` vars so they track the theme's accent color.
 */

const DEFAULTS: Required<Omit<ContainerSurface, "title">> & { title?: string } = {
  background: true,
  border: true,
  accentBorder: false,
  radius: "md",
  padding: "4",
  shadow: "sm",
  accentTitle: false,
  title: undefined,
};

const RADIUS_CLASS: Record<NonNullable<ContainerSurface["radius"]>, string> = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
};

const PADDING_CLASS: Record<NonNullable<ContainerSurface["padding"]>, string> = {
  "0": "p-0",
  "2": "p-2",
  "3": "p-3",
  "4": "p-4",
  "5": "p-5",
  "6": "p-6",
  "8": "p-8",
};

const SHADOW_CLASS: Record<NonNullable<ContainerSurface["shadow"]>, string> = {
  none: "",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
};

const BACKGROUND_CLASS = "bg-white dark:bg-gray-900";
const BORDER_NEUTRAL_CLASS = "border border-gray-200 dark:border-gray-700";
const BORDER_ACCENT_CLASS = "border border-[var(--accent-6,#bfdbfe)]";

const TITLE_NEUTRAL_CLASS = "text-gray-900 dark:text-gray-100";
const TITLE_ACCENT_CLASS = "text-[var(--accent-11,#2563eb)]";
const TITLE_BASE_CLASS = "text-sm font-semibold mb-3";

export type ResolvedContainerSurface = {
  /** className for the wrapper that surrounds the grid. */
  wrapperClass: string;
  /** Optional heading text. */
  title?: string;
  /** className for the heading, if a title is present. */
  titleClass: string;
};

/**
 * Resolves a surface config (`true` | object) into static Tailwind classes, or
 * null when the surface is absent/false. Shared by containers and any other
 * element (e.g. Tab) that wants the same themed panel.
 */
export function resolveSurface(
  surface: boolean | ContainerSurface | undefined
): ResolvedContainerSurface | null {
  if (!surface) return null;

  const s: ContainerSurface = surface === true ? {} : surface;

  const cfg = { ...DEFAULTS, ...s };

  const parts: string[] = [];
  if (cfg.background) parts.push(BACKGROUND_CLASS);
  if (cfg.border) parts.push(cfg.accentBorder ? BORDER_ACCENT_CLASS : BORDER_NEUTRAL_CLASS);
  parts.push(RADIUS_CLASS[cfg.radius]);
  parts.push(PADDING_CLASS[cfg.padding]);
  const shadow = SHADOW_CLASS[cfg.shadow];
  if (shadow) parts.push(shadow);

  return {
    wrapperClass: parts.filter(Boolean).join(" "),
    title: cfg.title,
    titleClass: `${TITLE_BASE_CLASS} ${cfg.accentTitle ? TITLE_ACCENT_CLASS : TITLE_NEUTRAL_CLASS}`,
  };
}

/** Returns resolved surface classes for a container, or null when it has no surface. */
export function getContainerSurface(container: Container): ResolvedContainerSurface | null {
  return resolveSurface(container.surface);
}
