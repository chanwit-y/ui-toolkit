import type { AvatarElement, TextElement, TypographyElement } from "../@types";
import { Avatar } from "../Avatar";
import { Text } from "../Text";
import { Typography } from "../Typography";
import { displayText, useDataValue } from "./rowScope";

/**
 * Display elements with a {@link DataValue} binding. The builders mount these
 * only when a binding is configured, so a static element stays hook-free; the
 * static prop (`text` / `src` / `fallback`) is what shows when the bound value
 * resolves empty.
 */

export function BoundText({ value, text, ...props }: TextElement) {
  const bound = displayText(useDataValue(value));
  return <Text {...props} text={bound ?? text} />;
}

export function BoundTypography({ value, text, ...props }: TypographyElement) {
  const bound = displayText(useDataValue(value));
  return <Typography {...props} text={bound ?? text} />;
}

/** An image URL out of a bound value: the string itself, or an object's `src` / `url`. */
function imageSrc(value: unknown): string | undefined {
  if (typeof value === "string") return value || undefined;
  if (value && typeof value === "object") {
    const { src, url } = value as { src?: unknown; url?: unknown };
    if (typeof src === "string" && src) return src;
    if (typeof url === "string" && url) return url;
  }
  return undefined;
}

export function BoundAvatar({ srcValue, fallbackValue, src, fallback, name: _name, ...props }: AvatarElement) {
  const boundSrc = imageSrc(useDataValue(srcValue));
  const boundFallback = displayText(useDataValue(fallbackValue));
  return (
    <Avatar
      {...props}
      // Remount per image so a previous item's load error doesn't stick.
      key={boundSrc ?? src ?? ""}
      src={boundSrc ?? src}
      fallback={boundFallback !== undefined ? boundFallback.slice(0, 2).toUpperCase() : fallback}
    />
  );
}
