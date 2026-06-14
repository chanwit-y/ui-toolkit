import React from "react";

export interface PaperProps {
  children?: React.ReactNode;
  /** Shadow depth on the elevation scale (0–24), mirroring MUI Paper. Ignored when variant is "outlined". */
  elevation?: number;
  /** "elevation" draws a shadow; "outlined" draws a 1px border and no shadow. */
  variant?: "elevation" | "outlined";
  /** When true, corners are not rounded. */
  square?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Approximates MUI's elevation shadow scale: deeper levels stack a tighter
 * umbra with a softer, more spread ambient shadow. Level 0 renders no shadow.
 */
const elevationShadow = (level: number): string => {
  const e = Math.max(0, Math.min(24, Math.round(level)));
  if (e === 0) return "none";
  const umbraY = Math.round(e * 0.5);
  const umbraBlur = Math.max(1, Math.round(e * 0.8));
  const ambientY = Math.round(e * 1.1);
  const ambientBlur = Math.round(e * 2.2);
  return [
    `0 ${umbraY}px ${umbraBlur}px rgba(0,0,0,0.16)`,
    `0 ${ambientY}px ${ambientBlur}px rgba(0,0,0,0.10)`,
  ].join(", ");
};

export function Paper({
  children,
  elevation = 1,
  variant = "elevation",
  square = false,
  className,
  style,
}: PaperProps) {
  const isOutlined = variant === "outlined";
  // Background/text/border follow the theme via Tailwind `dark:` classes (the
  // `dark` class lives on <html>), so Paper flips with light/dark mode. Only the
  // dynamic elevation shadow stays inline.
  const classes = [
    "bg-white dark:bg-gray-900",
    "text-slate-800 dark:text-gray-100",
    square ? "" : "rounded-lg",
    isOutlined ? "border border-slate-200 dark:border-gray-700" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div
      className={classes}
      style={{
        boxShadow: isOutlined ? "none" : elevationShadow(elevation),
        ...style,
      }}
    >
      {children}
    </div>
  );
}
