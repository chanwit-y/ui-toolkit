import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  color?: "primary" | "secondary" | "success" | "warning" | "danger";
  size?: "sm" | "md";
  className?: string;
}

const colorStyles: Record<string, { background: string; color: string }> = {
  primary: { background: "#ede9fe", color: "#6366f1" },
  secondary: { background: "#f1f5f9", color: "#64748b" },
  success: { background: "#dcfce7", color: "#16a34a" },
  warning: { background: "#fef9c3", color: "#ca8a04" },
  danger: { background: "#fee2e2", color: "#dc2626" },
};

const sizeStyles: Record<string, { padding: string; fontSize: string }> = {
  sm: { padding: "2px 8px", fontSize: "11px" },
  md: { padding: "4px 10px", fontSize: "12px" },
};

export function Badge({ children, color = "primary", size = "md", className }: BadgeProps) {
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: "999px",
        fontWeight: 500,
        ...colorStyles[color],
        ...sizeStyles[size],
      }}
    >
      {children}
    </span>
  );
}
