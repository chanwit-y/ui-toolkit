import { encode } from 'blurhash';
import { Jimp } from 'jimp';

export interface ImageMeta {
  blurhash: string;
  width: number;
  height: number;
}

/** The longer side the pixels are scaled to before encoding: the hash keeps 4 × 3 components, so more pixels only cost time. */
const HASH_SIDE = 32;

/**
 * An uploaded image's placeholder and pixel size, computed from its bytes when
 * it is stored (the File collection's `uploadItem`): the client can't make a
 * blurhash before the image has loaded, so it has to come with the record.
 * Rasters only (PNG / JPEG / GIF / BMP / TIFF); an SVG or anything the
 * decoder can't read gets none, and the upload still lands.
 */
export async function imageMeta(bytes: Uint8Array, type: string): Promise<ImageMeta | undefined> {
  if (!type.startsWith('image/') || type === 'image/svg+xml') return undefined;
  try {
    const image = await Jimp.read(Buffer.from(bytes));
    const { width, height } = image.bitmap;
    if (!width || !height) return undefined;
    const small = width > HASH_SIDE || height > HASH_SIDE ? image.scaleToFit({ w: HASH_SIDE, h: HASH_SIDE }) : image;
    const { data, width: w, height: h } = small.bitmap;
    return { blurhash: encode(new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength), w, h, 4, 3), width, height };
  } catch {
    return undefined;
  }
}
