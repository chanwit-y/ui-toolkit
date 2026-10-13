import { createElement, useMemo, type ComponentType } from "react";
import type { AvatarElement, DataValue, TextElement, TypographyElement } from "../@types";
import { Avatar } from "../Avatar";
import { Text } from "../Text";
import { Typography } from "../Typography";
import { Skeleton } from "../Skeleton";
import { displayText, useDataValue, useSkeleton } from "./rowScope";

/** What a text placeholder is sized from while its slice loads. */
const TEXT_PLACEHOLDER = "Loading placeholder text";

/**
 * Display elements with a {@link DataValue} binding. The builders mount these
 * only when a binding is configured, so a static element stays hook-free; the
 * static prop (`text` / `src` / `fallback`) is what shows when the bound value
 * resolves empty.
 */

export function BoundText({ value, text, ...props }: TextElement) {
  const bound = displayText(useDataValue(value));
  const pending = useSkeleton(value);
  if (pending) return <Skeleton inline><Text {...props} text={text || TEXT_PLACEHOLDER} /></Skeleton>;
  return <Text {...props} text={bound ?? text} />;
}

export function BoundTypography({ value, text, ...props }: TypographyElement) {
  const bound = displayText(useDataValue(value));
  const pending = useSkeleton(value);
  if (pending) return <Skeleton inline><Typography {...props} text={text || TEXT_PLACEHOLDER} /></Skeleton>;
  return <Typography {...props} text={bound ?? text} />;
}

/** An image URL out of a bound value: the string itself, or an object's `src` / `url`. */
export function imageSrc(value: unknown): string | undefined {
  if (typeof value === "string") return value || undefined;
  if (value && typeof value === "object") {
    const { src, url } = value as { src?: unknown; url?: unknown };
    if (typeof src === "string" && src) return src;
    if (typeof url === "string" && url) return url;
  }
  return undefined;
}

const NO_OPTIONS: unknown[] = [];

/**
 * A select-family field whose `options` come from a {@link DataValue} (a page
 * load's slice): the resolved array, memoised on its identity so the field
 * only resets its list when the slice actually changes.
 */
export function BoundOptions<P extends { options?: unknown[] }>({
  component,
  optionsValue,
  props,
}: {
  component: ComponentType<P>;
  optionsValue: DataValue;
  props: P;
}) {
  const value = useDataValue(optionsValue);
  const pending = useSkeleton(optionsValue);
  const options = useMemo(() => (Array.isArray(value) ? value : NO_OPTIONS), [value]);
  const field = createElement(component, { ...props, options });
  return pending ? <Skeleton>{field}</Skeleton> : field;
}

export function BoundAvatar({ srcValue, fallbackValue, src, fallback, name: _name, ...props }: AvatarElement) {
  const boundSrc = imageSrc(useDataValue(srcValue));
  const boundFallback = displayText(useDataValue(fallbackValue));
  const pending = useSkeleton(srcValue, fallbackValue);
  if (pending) return <Skeleton inline style={{ borderRadius: "9999px" }}><Avatar {...props} fallback="" /></Skeleton>;
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
