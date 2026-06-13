import React from "react";

export interface DividerProps {
  /**
   * Mirrors MUI Divider: "fullWidth" spans edge to edge, "inset" indents the
   * left edge, "middle" indents both edges.
   */
  variant?: "fullWidth" | "inset" | "middle";
  /** Margin above and below the line. Number → px, or any CSS length. Default: "8px". */
  spacing?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

const toLength = (v: number | string): string =>
  typeof v === "number" ? `${v}px` : v;

const insetByVariant = (
  variant: DividerProps["variant"]
): Pick<React.CSSProperties, "marginLeft" | "marginRight"> => {
  switch (variant) {
    case "inset":
      return { marginLeft: "72px" };
    case "middle":
      return { marginLeft: "16px", marginRight: "16px" };
    default:
      return {};
  }
};

export function Divider({
  variant = "fullWidth",
  spacing = "8px",
  className,
  style,
}: DividerProps) {
  const gap = toLength(spacing);
  return (
    <hr
      className={className}
      style={{
        border: "none",
        borderTop: "1px solid #e2e8f0",
        height: 0,
        marginTop: gap,
        marginBottom: gap,
        ...insetByVariant(variant),
        ...style,
      }}
    />
  );
}
