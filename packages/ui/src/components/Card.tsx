import React from "react";

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  shadow?: "none" | "sm" | "md" | "lg";
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
  style?: React.CSSProperties;
}

const shadowStyles: Record<string, string> = {
  none: "none",
  sm: "0 1px 3px rgba(0,0,0,0.1)",
  md: "0 4px 12px rgba(0,0,0,0.12)",
  lg: "0 8px 24px rgba(0,0,0,0.15)",
};

const paddingStyles: Record<string, string> = {
  none: "0",
  sm: "12px",
  md: "20px",
  lg: "32px",
};

export function Card({
  children,
  title,
  shadow = "md",
  padding = "md",
  className,
  style,
}: CardProps) {
  return (
    <div
      className={className}
      style={{
        background: "#fff",
        borderRadius: "10px",
        boxShadow: shadowStyles[shadow],
        padding: paddingStyles[padding],
        border: "1px solid #f1f5f9",
        ...style,
      }}
    >
      {title && (
        <h3 style={{ margin: "0 0 12px", fontSize: "16px", fontWeight: 600, color: "#1e293b" }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
