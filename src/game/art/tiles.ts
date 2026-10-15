import type { WorldPalette } from '@/game/art/palettes.ts';
import { createBuffer, fillRect, hLine, type PixelBuffer, setPixel, vLine } from '@/game/art/pixel.ts';
import { createRng } from '@/game/core/rng.ts';
import { TILE } from '@/game/core/types.ts';

/** Tipos de suelo. El mapa del pueblo es una grilla de estos. */
export type GroundKind = 'grass' | 'tallGrass' | 'flowers' | 'path' | 'plaza' | 'sand' | 'water' | 'shore' | 'dock';

export const GROUND_KINDS: readonly GroundKind[] = [
  'grass',
  'tallGrass',
  'flowers',
  'path',
  'plaza',
  'sand',
  'water',
  'shore',
  'dock',
];

/** Cuántos frames de animación tiene cada suelo (1 = estático). */
export const GROUND_FRAMES: Readonly<Record<GroundKind, number>> = {
  grass: 1,
  tallGrass: 1,
  flowers: 2,
  path: 1,
  plaza: 1,
  sand: 1,
  water: 4,
  shore: 4,
  dock: 1,
};

/** El agua se puede ver pero no pisar; el resto del suelo es caminable. */
export function isGroundWalkable(kind: GroundKind): boolean {
  return kind !== 'water' && kind !== 'shore';
}

function grass(palette: WorldPalette, variant: number): PixelBuffer {
  const tile = createBuffer(TILE, TILE);
  fillRect(tile, 0, 0, TILE, TILE, palette.grass);
  const rng = createRng(1000 + variant);
  for (let index = 0; index < 9; index += 1) {
    setPixel(tile, rng.int(0, 15), rng.int(0, 15), palette.grassShade);
  }
  for (let index = 0; index < 5; index += 1) {
    setPixel(tile, rng.int(0, 15), rng.int(0, 15), palette.grassLight);
  }
  // Mechones en "v": el detalle que hace que el césped no se vea plano.
  const tufts = variant % 2 === 0 ? 2 : 1;
  for (let index = 0; index < tufts; index += 1) {
    const x = rng.int(2, 13);
    const y = rng.int(3, 13);
    setPixel(tile, x, y, palette.grassDark);
    setPixel(tile, x - 1, y - 1, palette.grassShade);
    setPixel(tile, x + 1, y - 1, palette.grassShade);
    setPixel(tile, x - 1, y - 2, palette.grassLight);
    setPixel(tile, x + 1, y - 2, palette.grassLight);
  }
  return tile;
}

function tallGrass(palette: WorldPalette): PixelBuffer {
  const tile = createBuffer(TILE, TILE);
  fillRect(tile, 0, 0, TILE, TILE, palette.tallGrass);
  for (let row = 0; row < 3; row += 1) {
    const baseY = row * 5 + 1;
    const shift = row % 2 === 0 ? 0 : 2;
    for (let blade = 0; blade < 4; blade += 1) {
      const x = blade * 4 + shift;
      setPixel(tile, x + 1, baseY, palette.tallGrassTip);
      setPixel(tile, x, baseY + 1, palette.tallGrassTip);
      setPixel(tile, x + 2, baseY + 1, palette.tallGrassTip);
      setPixel(tile, x + 1, baseY + 1, palette.grassLight);
      setPixel(tile, x + 1, baseY + 2, palette.grass);
      hLine(tile, x, baseY + 3, 3, palette.grassDark);
    }
  }
  return tile;
}

function flowers(palette: WorldPalette, frame: number): PixelBuffer {
  const tile = grass(palette, 3);
  const sway = frame % 2;
  const flower = (x: number, y: number, petal: typeof palette.flowerA): void => {
    setPixel(tile, x, y + 2, palette.grassDark);
    setPixel(tile, x - 1, y + 3, palette.grassShade);
    setPixel(tile, x + 1, y + 3, palette.grassShade);
    const top = y - sway;
    setPixel(tile, x, top - 1, petal);
    setPixel(tile, x - 1, top, petal);
    setPixel(tile, x + 1, top, petal);
    setPixel(tile, x, top + 1, petal);
    setPixel(tile, x, top, palette.flowerCenter);
  };
  flower(4, 4, palette.flowerA);
  flower(11, 10, palette.flowerB);
  flower(12, 3, palette.flowerA);
  return tile;
}

function cobblestone(palette: WorldPalette): PixelBuffer {
  const tile = createBuffer(TILE, TILE);
  fillRect(tile, 0, 0, TILE, TILE, palette.mortar);
  const rows = [
    { y: 0, height: 5, offset: 0 },
    { y: 5, height: 5, offset: 3 },
    { y: 10, height: 6, offset: 6 },
  ];
  for (const row of rows) {
    for (let x = -row.offset; x < TILE; x += 6) {
      const left = Math.max(0, x + 1);
      const right = Math.min(TILE - 1, x + 5);
      if (right < left) continue;
      const width = right - left + 1;
      const top = row.y + 1;
      const height = row.height - 1;
      fillRect(tile, left, top, width, height, palette.stone);
      hLine(tile, left, top, width, palette.stoneLight);
      vLine(tile, left, top, height, palette.stoneLight);
      hLine(tile, left, top + height - 1, width, palette.stoneShade);
      vLine(tile, right, top, height, palette.stoneShade);
    }
  }
  return tile;
}

function plaza(palette: WorldPalette): PixelBuffer {
  const tile = createBuffer(TILE, TILE);
  for (const [x, y] of [
    [0, 0],
    [8, 0],
    [0, 8],
    [8, 8],
  ] as const) {
    fillRect(tile, x, y, 8, 8, palette.slab);
    hLine(tile, x, y, 7, palette.slabLight);
    vLine(tile, x, y, 7, palette.slabLight);
    hLine(tile, x, y + 7, 8, palette.slabLine);
    vLine(tile, x + 7, y, 8, palette.slabLine);
  }
  return tile;
}

function sand(palette: WorldPalette, variant: number): PixelBuffer {
  const tile = createBuffer(TILE, TILE);
  fillRect(tile, 0, 0, TILE, TILE, palette.sand);
  const rng = createRng(2000 + variant);
  for (let index = 0; index < 8; index += 1) {
    setPixel(tile, rng.int(0, 15), rng.int(0, 15), palette.sandShade);
  }
  for (let index = 0; index < 6; index += 1) {
    setPixel(tile, rng.int(0, 15), rng.int(0, 15), palette.sandLight);
  }
  return tile;
}

function water(palette: WorldPalette, frame: number): PixelBuffer {
  const tile = createBuffer(TILE, TILE);
  fillRect(tile, 0, 0, TILE, TILE, palette.water);
  const waves = [
    { x: 2, y: 3, length: 4, color: palette.waterLight },
    { x: 10, y: 6, length: 3, color: palette.waterLight },
    { x: 5, y: 11, length: 4, color: palette.waterLight },
    { x: 12, y: 13, length: 2, color: palette.waterDeep },
    { x: 0, y: 8, length: 3, color: palette.waterDeep },
  ];
  for (const wave of waves) {
    for (let index = 0; index < wave.length; index += 1) {
      // Las olas se desplazan 1 px por frame y dan la vuelta al tile: el patrón es continuo.
      const x = (wave.x + index + frame) % TILE;
      const lift = index === 0 || index === wave.length - 1 ? 0 : -1;
      setPixel(tile, x, wave.y + (wave.color === palette.waterLight ? lift : 0), wave.color);
    }
  }
  return tile;
}

/** Orilla: agua con espuma que lame la arena de arriba. */
function shore(palette: WorldPalette, frame: number): PixelBuffer {
  const tile = water(palette, frame);
  for (let x = 0; x < TILE; x += 1) {
    const foamY = 3 + Math.round(Math.sin(((x + frame * 4) / TILE) * Math.PI * 2) * 1.2);
    fillRect(tile, x, 0, 1, foamY, palette.sand);
    setPixel(tile, x, foamY, palette.foam);
    setPixel(tile, x, foamY + 1, palette.waterLight);
    if ((x + frame) % 5 === 0) setPixel(tile, x, foamY - 1, palette.sandLight);
  }
  return tile;
}

function dock(palette: WorldPalette): PixelBuffer {
  const tile = createBuffer(TILE, TILE);
  for (let plank = 0; plank < 4; plank += 1) {
    const y = plank * 4;
    fillRect(tile, 0, y, TILE, 4, palette.wood);
    hLine(tile, 0, y, TILE, palette.woodLight);
    hLine(tile, 0, y + 3, TILE, palette.woodShade);
    const seam = plank % 2 === 0 ? 5 : 11;
    vLine(tile, seam, y, 4, palette.woodShade);
    setPixel(tile, seam - 2, y + 1, palette.trunkShade);
    setPixel(tile, seam + 2, y + 2, palette.trunkShade);
  }
  return tile;
}

/** Genera el tile de un suelo para una paleta, variante y frame de animación. */
export function groundTile(kind: GroundKind, palette: WorldPalette, variant = 0, frame = 0): PixelBuffer {
  switch (kind) {
    case 'grass':
      return grass(palette, variant % 4);
    case 'tallGrass':
      return tallGrass(palette);
    case 'flowers':
      return flowers(palette, frame);
    case 'path':
      return cobblestone(palette);
    case 'plaza':
      return plaza(palette);
    case 'sand':
      return sand(palette, variant % 3);
    case 'water':
      return water(palette, frame);
    case 'shore':
      return shore(palette, frame);
    case 'dock':
      return dock(palette);
  }
}
