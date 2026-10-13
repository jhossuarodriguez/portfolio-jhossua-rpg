import { hashString } from '../core/rng.ts';
import { TILE, type Vec2 } from '../core/types.ts';
import { buildingRect, propRect, type TownMap } from '../world/town-map.ts';
import { buildingArt } from './buildings.ts';
import type { WorldPalette } from './palettes.ts';
import { blit, createBuffer, hLine, type PixelBuffer, setPixel, vLine } from './pixel.ts';
import { PROP_SHAPES, propArt } from './props.ts';
import { GROUND_FRAMES, type GroundKind, groundTile } from './tiles.ts';

const GRASSY: ReadonlySet<GroundKind> = new Set(['grass', 'tallGrass', 'flowers']);
const PAVED: ReadonlySet<GroundKind> = new Set(['path', 'plaza', 'sand', 'dock']);

/** Cuántos frames distintos tiene el suelo del pueblo (mínimo común de sus animaciones). */
export function groundFrameCount(): number {
  return Math.max(...Object.values(GROUND_FRAMES));
}

/** Variante estable por tile para que el césped no se vea repetido. */
function variantFor(tile: Vec2): number {
  return hashString(`${tile.x}:${tile.y}`) % 4;
}

/**
 * Hornea todo el suelo del pueblo en un solo buffer (una textura en la GPU).
 * Añade un borde suave donde el césped toca piedra o arena.
 */
export function bakeGround(map: TownMap, palette: WorldPalette, frame = 0): PixelBuffer {
  const image = createBuffer(map.width * TILE, map.height * TILE);
  const cache = new Map<string, PixelBuffer>();
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const kind = map.groundAt({ x, y });
      const variant = variantFor({ x, y });
      const kindFrames = GROUND_FRAMES[kind];
      const key = `${kind}:${variant}:${frame % kindFrames}`;
      let tile = cache.get(key);
      if (!tile) {
        tile = groundTile(kind, palette, variant, frame % kindFrames);
        cache.set(key, tile);
      }
      blit(image, tile, x * TILE, y * TILE);
    }
  }
  // Bordes: la hierba proyecta una línea oscura sobre lo pavimentado vecino.
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      if (!GRASSY.has(map.groundAt({ x, y }))) continue;
      const px = x * TILE;
      const py = y * TILE;
      const edge = (dx: number, dy: number): boolean => {
        const neighbor = { x: x + dx, y: y + dy };
        return map.inBounds(neighbor) && PAVED.has(map.groundAt(neighbor));
      };
      if (edge(0, 1)) {
        hLine(image, px, py + TILE, TILE, palette.grassDark);
        for (let index = 1; index < TILE; index += 5) setPixel(image, px + index, py + TILE + 1, palette.grassShade);
      }
      if (edge(0, -1)) hLine(image, px, py, TILE, palette.grassShade);
      if (edge(1, 0)) vLine(image, px + TILE - 1, py, TILE, palette.grassShade);
      if (edge(-1, 0)) vLine(image, px, py, TILE, palette.grassShade);
    }
  }
  return image;
}

/** Un dibujo colocado en el mundo, listo para el renderer. */
export interface WorldSprite {
  readonly id: string;
  /** Frames de animación (casi siempre 1). */
  readonly frames: readonly PixelBuffer[];
  /** Esquina superior izquierda del dibujo, en píxeles del mundo. */
  readonly x: number;
  readonly y: number;
  /** Línea de apoyo (borde inferior de la huella): ordena qué tapa a qué. */
  readonly baseY: number;
}

/** Todos los edificios y objetos del pueblo como sprites estáticos (o animados). */
export function worldSprites(map: TownMap, palette: WorldPalette): WorldSprite[] {
  const sprites: WorldSprite[] = [];
  for (const building of map.def.buildings) {
    const art = buildingArt(building.style, palette);
    const rect = buildingRect(building);
    sprites.push({
      id: `building:${building.id}`,
      frames: [art.image],
      x: rect.x * TILE + art.offsetX,
      y: rect.y * TILE + art.offsetY,
      baseY: (rect.y + rect.height) * TILE,
    });
  }
  const propCache = new Map<string, PixelBuffer[]>();
  map.def.props.forEach((prop, index) => {
    const shape = PROP_SHAPES[prop.kind];
    let frames = propCache.get(prop.kind);
    if (!frames) {
      frames = Array.from({ length: shape.frames }, (_, frame) => propArt(prop.kind, palette, frame).image);
      propCache.set(prop.kind, frames);
    }
    const art = propArt(prop.kind, palette, 0);
    const rect = propRect(prop);
    sprites.push({
      id: `prop:${prop.kind}:${index}`,
      frames,
      x: rect.x * TILE + art.offsetX,
      y: rect.y * TILE + art.offsetY,
      baseY: (rect.y + rect.height) * TILE,
    });
  });
  return sprites;
}
