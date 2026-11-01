import { decode, isBlurhashValid } from "blurhash";
import { useLayoutEffect, useMemo, useRef } from "react";

/** A hash holds a few colours, so a small canvas stretched by CSS loses nothing. */
const DECODE_SIZE = 32;
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

export type BlurhashProps = {
  hash: string;
  className?: string;
};

/** A blurred placeholder decoded from `hash` into a canvas, sized by its class. */
export function Blurhash({ hash, className }: BlurhashProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pixels = useMemo(() => decodeBlurhash(hash), [hash]);

  // Before paint: an empty canvas would flash the frame's background first.
  useLayoutEffect(() => {
    if (pixels) canvas.current?.getContext("2d")?.putImageData(new ImageData(pixels, DECODE_SIZE, DECODE_SIZE), 0, 0);
  }, [pixels]);

  if (!pixels) return null;
  return <canvas ref={canvas} width={DECODE_SIZE} height={DECODE_SIZE} aria-hidden className={className} />;
}
