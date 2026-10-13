import { describe, expect, it } from 'vitest';
import type { WorldSprite } from '../../src/game/art/bake.ts';
import { createBuffer, fillRect, hex, type PixelBuffer } from '../../src/game/art/pixel.ts';
import { nextPowerOfTwo, packAtlas } from '../../src/game/render/atlas.ts';
import { buildSpriteBatch, uvRect, writeQuadUv } from '../../src/game/render/batch.ts';

function solid(width: number, height: number): PixelBuffer {
  const buffer = createBuffer(width, height);
  fillRect(buffer, 0, 0, width, height, hex('#39c6f4'));
  return buffer;
}

describe('packAtlas', () => {
  it('no superpone imágenes, deduplica y usa potencias de dos', () => {
    const shared = solid(32, 32);
    const images = [shared, shared, solid(80, 96), solid(16, 16), solid(48, 48), solid(200, 10)];
    const atlas = packAtlas(images, 256);
    expect(atlas.placements.size).toBe(5);
    expect(atlas.image.width).toBe(nextPowerOfTwo(atlas.image.width));
    expect(atlas.image.height).toBe(nextPowerOfTwo(atlas.image.height));
    const rects = [...atlas.placements.values()];
    for (const [index, a] of rects.entries()) {
      expect(a.x + a.width).toBeLessThanOrEqual(atlas.image.width);
      expect(a.y + a.height).toBeLessThanOrEqual(atlas.image.height);
      for (const b of rects.slice(index + 1)) {
        const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
        expect(overlap).toBe(false);
      }
    }
  });

  it('avisa si una imagen no cabe', () => {
    expect(() => packAtlas([solid(300, 4)], 256)).toThrow('no cabe');
  });

  it('nextPowerOfTwo', () => {
    expect(nextPowerOfTwo(1)).toBe(1);
    expect(nextPowerOfTwo(65)).toBe(128);
    expect(nextPowerOfTwo(512)).toBe(512);
  });
});

describe('buildSpriteBatch', () => {
  const tall = solid(16, 32);
  const frameA = solid(48, 48);
  const frameB = createBuffer(48, 48);
  const sprites: WorldSprite[] = [
    { id: 'front', frames: [tall], x: 0, y: 80, baseY: 112 },
    { id: 'back', frames: [tall], x: 32, y: 0, baseY: 32 },
    { id: 'fountain', frames: [frameA, frameB], x: 64, y: 64, baseY: 112 },
  ];
  const atlas = packAtlas(sprites.flatMap((sprite) => sprite.frames));
  const batch = buildSpriteBatch(sprites, atlas, 10);

  it('genera un quad por sprite, de atrás hacia adelante', () => {
    expect(batch.count).toBe(3);
    expect(batch.positions).toHaveLength(3 * 4 * 3);
    expect(batch.indices).toHaveLength(3 * 6);
    const firstZ = batch.positions[2] ?? 0;
    const lastZ = batch.positions[(batch.count - 1) * 12 + 2] ?? 0;
    expect(lastZ).toBeGreaterThan(firstZ);
    // El primer quad es el de atrás ("back", baseY 32): x = 32.
    expect(batch.positions[0]).toBe(32);
  });

  it('los UV quedan dentro del atlas', () => {
    for (const value of batch.uvs) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('registra los sprites animados con un UV por frame', () => {
    expect(batch.animated).toHaveLength(1);
    expect(batch.animated[0]?.frames).toHaveLength(2);
  });

  it('falla con sprites que no están en el atlas', () => {
    expect(() => buildSpriteBatch([{ id: 'x', frames: [solid(4, 4)], x: 0, y: 0, baseY: 4 }], atlas, 10)).toThrow(
      'fuera del atlas',
    );
    expect(() => buildSpriteBatch([{ id: 'x', frames: [], x: 0, y: 0, baseY: 4 }], atlas, 10)).toThrow('sin frames');
  });

  it('uvRect y writeQuadUv usan v hacia abajo', () => {
    const rect = uvRect({ x: 16, y: 32, width: 16, height: 32 }, 64, 128);
    expect(rect).toEqual({ u0: 0.25, v0: 0.25, u1: 0.5, v1: 0.5 });
    const uvs = new Float32Array(16);
    writeQuadUv(uvs, 1, rect);
    expect([...uvs.slice(8)]).toEqual([0.25, 0.25, 0.5, 0.25, 0.25, 0.5, 0.5, 0.5]);
  });
});
