import { blit, createBuffer, type PixelBuffer } from '../art/pixel.ts';

export interface AtlasPlacement {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface PackedAtlas {
  readonly image: PixelBuffer;
  /** Dónde quedó cada imagen dentro del atlas. */
  readonly placements: ReadonlyMap<PixelBuffer, AtlasPlacement>;
}

/** Siguiente potencia de dos (texturas amables con cualquier GPU). */
export function nextPowerOfTwo(value: number): number {
  let result = 1;
  while (result < value) result *= 2;
  return result;
}

/**
 * Empaqueta imágenes únicas en un atlas por estantes (ordenadas por alto).
 * Deja 1 px de separación para que el filtrado nunca mezcle vecinos.
 */
export function packAtlas(images: readonly PixelBuffer[], maxWidth = 1024): PackedAtlas {
  const unique = [...new Set(images)];
  const sorted = [...unique].sort((a, b) => b.height - a.height || b.width - a.width);
  const padding = 1;
  const placements = new Map<PixelBuffer, AtlasPlacement>();
  let shelfX = 0;
  let shelfY = 0;
  let shelfHeight = 0;
  let usedWidth = 0;
  for (const image of sorted) {
    if (image.width > maxWidth) throw new Error(`Imagen de ${image.width}px no cabe en un atlas de ${maxWidth}px`);
    if (shelfX + image.width > maxWidth) {
      shelfY += shelfHeight + padding;
      shelfX = 0;
      shelfHeight = 0;
    }
    placements.set(image, { x: shelfX, y: shelfY, width: image.width, height: image.height });
    shelfX += image.width + padding;
    shelfHeight = Math.max(shelfHeight, image.height);
    usedWidth = Math.max(usedWidth, shelfX);
  }
  const width = nextPowerOfTwo(Math.max(1, usedWidth));
  const height = nextPowerOfTwo(Math.max(1, shelfY + shelfHeight));
  const atlas = createBuffer(width, height);
  for (const [image, placement] of placements) blit(atlas, image, placement.x, placement.y);
  return { image: atlas, placements };
}
