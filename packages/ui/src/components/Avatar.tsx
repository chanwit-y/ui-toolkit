import React, { useState } from "react";
import type { AvatarProps } from "./@types";

const sizeMap = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 56,
} as const;

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  size = "md",
  fallback,
  className,
  loading = "lazy",
  onError,
  ...props
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeValue = typeof size === "number" ? size : sizeMap[size];

  const handleImageError = () => {
    setImageError(true);
    onError?.();
  };

  const showFallback = !src || imageError;

  const baseClasses = "inline-flex items-center justify-center rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium";
  const combinedClassName = className ? `${baseClasses} ${className}` : baseClasses;

  const containerStyle = {
    width: sizeValue,
    height: sizeValue,
    minWidth: sizeValue,
    minHeight: sizeValue,
  };

  // Calculate font size based on avatar size
  const fontSize = Math.max(10, Math.floor(sizeValue * 0.4));

  if (showFallback) {
    return (
      <div
        className={combinedClassName}
        style={{ ...containerStyle, fontSize }}
        {...props}
      >
        {fallback || (alt ? alt.charAt(0).toUpperCase() : "?")}
      </div>
    );
  }

  return (
    <div className={combinedClassName} style={containerStyle} {...props}>
      <img
        src={src}
        alt={alt || "Avatar"}
        loading={loading}
        onError={handleImageError}
        className="w-full h-full object-cover"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};

export default Avatar;