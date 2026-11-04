import { decode, isBlurhashValid } from "blurhash";
import type { CSSProperties } from "react";
import { useLayoutEffect, useMemo, useRef } from "react";

/** A hash holds a few colours, so a small canvas stretched by CSS loses nothing. */
const DECODE_SIZE = 32;
/** The longer side of a canvas that carries an image's aspect ratio. */
const CANVAS_SIDE = 256;
const MAX_HOLD = 10_000;

/** The pixels of `hash`, or `undefined` for anything that isn't a valid one: bad data draws nothing. */
export function decodeBlurhash(hash: string, size = DECODE_SIZE): Uint8ClampedArray<ArrayBuffer> | undefined {
  if (!isBlurhashValid(hash).result) return undefined;
  try {
    return Uint8ClampedArray.from(decode(hash, size, size));
  } catch {
    return undefined;
  }
}

/** `blurhashDelay` in whole milliseconds, 0 to 10 s; anything else is no hold. */
export function blurhashHold(delay: unknown): number {
  return typeof delay === "number" && Number.isFinite(delay) ? Math.min(Math.max(Math.round(delay), 0), MAX_HOLD) : 0;
}

export type BlurhashSize = { width: number; height: number };

/**
 * The canvas size for an image of `width` × `height` pixels: the same aspect
 * ratio at a longer side of 256, so `object-fit: contain` lays the placeholder
 * out exactly like the image without a canvas the size of the image.
 * `undefined` for anything that isn't a positive size, which draws a square
 * stretched over its box.
 */
export function blurhashCanvasSize(width: unknown, height: unknown): BlurhashSize | undefined {
  if (typeof width !== "number" || typeof height !== "number") return undefined;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return undefined;
  const scale = CANVAS_SIDE / Math.max(width, height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export type BlurhashProps = {
  hash: string;
  /** The image's pixel size: the canvas then has its aspect ratio (see {@link blurhashCanvasSize}). */
  width?: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * A blurred placeholder decoded from `hash` into a canvas, sized by its class.
 * With the image's `width` / `height` the canvas has the image's aspect ratio,
 * so `object-fit: contain` paints it where the image will paint; without them
 * it is a square that fills whatever box it is given.
 */
export function Blurhash({ hash, width, height, className, style }: BlurhashProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pixels = useMemo(() => decodeBlurhash(hash), [hash]);
  const size = blurhashCanvasSize(width, height) ?? { width: DECODE_SIZE, height: DECODE_SIZE };

  // Before paint: an empty canvas would flash the frame's background first.
  useLayoutEffect(() => {
    const target = canvas.current?.getContext("2d");
    if (!pixels || !target) return;
    const image = new ImageData(pixels, DECODE_SIZE, DECODE_SIZE);
    if (size.width === DECODE_SIZE && size.height === DECODE_SIZE) return target.putImageData(image, 0, 0);
    // The decoded square, scaled onto the canvas of the image's aspect ratio.
    const source = document.createElement("canvas");
    source.width = DECODE_SIZE;
    source.height = DECODE_SIZE;
    source.getContext("2d")?.putImageData(image, 0, 0);
    target.imageSmoothingEnabled = true;
    target.drawImage(source, 0, 0, size.width, size.height);
  }, [pixels, size.width, size.height]);

  if (!pixels) return null;
  return <canvas ref={canvas} width={size.width} height={size.height} aria-hidden className={className} style={style} />;
}
