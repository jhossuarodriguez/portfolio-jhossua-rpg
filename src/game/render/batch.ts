import type { WorldSprite } from '@/game/art/bake.ts';
import { depthFor } from '@/game/core/camera.ts';
import type { AtlasPlacement, PackedAtlas } from '@/game/render/atlas.ts';

export interface UvRect {
  readonly u0: number;
  readonly v0: number;
  readonly u1: number;
  readonly v1: number;
}

/**
 * UV de un rectángulo del atlas. Convención del proyecto: v crece hacia abajo
 * (fila 0 de los datos = borde superior), así los buffers no se invierten.
 */
export function uvRect(placement: AtlasPlacement, atlasWidth: number, atlasHeight: number): UvRect {
  return {
    u0: placement.x / atlasWidth,
    v0: placement.y / atlasHeight,
    u1: (placement.x + placement.width) / atlasWidth,
    v1: (placement.y + placement.height) / atlasHeight,
  };
}

export interface AnimatedQuad {
  readonly quad: number;
  readonly frames: readonly UvRect[];
}

export interface SpriteBatch {
  readonly positions: Float32Array;
  readonly uvs: Float32Array;
  readonly indices: Uint32Array;
  readonly animated: readonly AnimatedQuad[];
  readonly count: number;
}

/** Escribe los 4 UV de un quad (orden: arriba-izq, arriba-der, abajo-izq, abajo-der). */
export function writeQuadUv(uvs: Float32Array, quad: number, rect: UvRect): void {
  const offset = quad * 8;
  uvs.set([rect.u0, rect.v0, rect.u1, rect.v0, rect.u0, rect.v1, rect.u1, rect.v1], offset);
}

/**
 * Convierte los sprites del mundo en una sola malla de quads (una llamada de dibujo).
 * Coordenadas: x a la derecha, y hacia arriba (y = -píxel del mundo), z = profundidad.
 * Los quads se ordenan de atrás hacia adelante para que la transparencia se mezcle bien.
 */
export function buildSpriteBatch(
  sprites: readonly WorldSprite[],
  atlas: PackedAtlas,
  mapHeightTiles: number,
): SpriteBatch {
  const ordered = [...sprites].sort((a, b) => a.baseY - b.baseY || a.x - b.x);
  const count = ordered.length;
  const positions = new Float32Array(count * 4 * 3);
  const uvs = new Float32Array(count * 4 * 2);
  const indices = new Uint32Array(count * 6);
  const animated: AnimatedQuad[] = [];
  ordered.forEach((sprite, quad) => {
    const first = sprite.frames[0];
    if (!first) throw new Error(`Sprite sin frames: ${sprite.id}`);
    const placement = atlas.placements.get(first);
    if (!placement) throw new Error(`Sprite fuera del atlas: ${sprite.id}`);
    const z = depthFor(sprite.baseY, sprite.x, mapHeightTiles);
    const left = sprite.x;
    const right = sprite.x + first.width;
    const top = -sprite.y;
    const bottom = -(sprite.y + first.height);
    positions.set([left, top, z, right, top, z, left, bottom, z, right, bottom, z], quad * 12);
    writeQuadUv(uvs, quad, uvRect(placement, atlas.image.width, atlas.image.height));
    const vertex = quad * 4;
    indices.set([vertex, vertex + 2, vertex + 1, vertex + 1, vertex + 2, vertex + 3], quad * 6);
    if (sprite.frames.length > 1) {
      animated.push({
        quad,
        frames: sprite.frames.map((frame) => {
          const framePlacement = atlas.placements.get(frame);
          if (!framePlacement) throw new Error(`Frame fuera del atlas: ${sprite.id}`);
          return uvRect(framePlacement, atlas.image.width, atlas.image.height);
        }),
      });
    }
  });
  return { positions, uvs, indices, animated, count };
}
