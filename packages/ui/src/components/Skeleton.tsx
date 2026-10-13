import { Skeleton as RadixSkeleton } from "@radix-ui/themes";
import type { CSSProperties, ReactNode } from "react";

/**
 * The library's loading placeholder (see the grilled loading-mode design):
 * Radix Themes' `Skeleton` — a shimmer block in the shape of what it wraps,
 * theme-aware (`--gray-a3/a4`), still under `prefers-reduced-motion`.
 * `Skeleton` wraps real content (`loading` ⇒ the content is drawn invisible
 * and inert under the shimmer, so the placeholder has its exact size — a
 * typography variant, an input, a card); the presets draw a placeholder
 * where there is no content to size from.
 */
export type SkeletonProps = {
  /** `true` draws the placeholder over `children`; `false` renders them as is. */
  loading?: boolean;
  /** Size to the content inline (an avatar, a chip) instead of as a block. */
  inline?: boolean;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function Skeleton({ loading = true, inline = false, children, className, style }: SkeletonProps) {
  if (!loading) return <>{children}</>;
  // The shimmer lands on this div (Radix merges its class onto the child):
  // a plain element, so the wrapped component needn't forward `className`.
  return (
    <RadixSkeleton loading>
      <div className={className} style={{ display: inline ? "inline-block" : "block", ...style }}>
        {children}
      </div>
    </RadixSkeleton>
  );
}

/** A block placeholder — an input, an image band, a card. */
export function SkeletonBlock({ height = 36, width = "100%", radius, className, style }: {
  height?: number | string;
  width?: number | string;
  radius?: number | string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <RadixSkeleton
      loading
      className={className}
      style={{ display: "block", height, width, ...(radius !== undefined ? { borderRadius: radius } : {}), ...style }}
    />
  );
}

/** A round placeholder — an avatar. */
export function SkeletonCircle({ size = 40, className, style }: { size?: number; className?: string; style?: CSSProperties }) {
  return <SkeletonBlock height={size} width={size} radius="9999px" className={className} style={style} />;
}

/** Text lines, the last one shorter, as a paragraph placeholder. */
export function SkeletonText({ lines = 3, lineHeight = 14, gap = 8, lastWidth = "60%", className, style }: {
  lines?: number;
  lineHeight?: number;
  gap?: number;
  lastWidth?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap, ...style }} aria-hidden>
      {Array.from({ length: Math.max(1, lines) }).map((_, i) => (
        <SkeletonBlock key={i} height={lineHeight} width={i === lines - 1 && lines > 1 ? lastWidth : "100%"} />
      ))}
    </div>
  );
}
