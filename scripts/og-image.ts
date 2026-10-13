/**
 * Genera `public/og.png` (1200×630) con el mismo arte del juego: la Plaza Mayor de
 * Ciudad Primada con sus vecinos, a escala ×3. Se corre con `pnpm og`.
 */
import { fileURLToPath } from 'node:url';
import { bakeGround, worldSprites } from '../src/game/art/bake.ts';
import { characterFrame, NPC_LOOKS, PLAYER_LOOK } from '../src/game/art/characters.ts';
import { paletteFor } from '../src/game/art/palettes.ts';
import { blit, crop } from '../src/game/art/pixel.ts';
import { TILE } from '../src/game/core/types.ts';
import { PRIMADA } from '../src/game/world/primada.ts';
import { TownMap } from '../src/game/world/town-map.ts';
import { writePng } from './png.ts';

const SCALE = 3;
const WIDTH = 1200 / SCALE;
const HEIGHT = 630 / SCALE;

const map = new TownMap(PRIMADA);
const palette = paletteFor('summer');
const world = bakeGround(map, palette);

const drawables = [
  ...worldSprites(map, palette).map((sprite) => ({
    baseY: sprite.baseY,
    draw: () => {
      const frame = sprite.frames[0];
      if (frame) blit(world, frame, sprite.x, sprite.y);
    },
  })),
  ...PRIMADA.npcs.map((npc) => ({
    baseY: (npc.y + 1) * TILE,
    draw: () => blit(world, characterFrame(NPC_LOOKS[npc.look], npc.facing, 0), npc.x * TILE, npc.y * TILE - 8),
  })),
  {
    // Jhossua posa en la plaza, frente a la fuente.
    baseY: 20 * TILE,
    draw: () => blit(world, characterFrame(PLAYER_LOOK, 'down', 0), 23 * TILE, 19 * TILE - 8),
  },
].sort((a, b) => a.baseY - b.baseY);
for (const drawable of drawables) drawable.draw();

const centerX = 23.5 * TILE;
const centerY = 17 * TILE;
const image = crop(world, Math.round(centerX - WIDTH / 2), Math.round(centerY - HEIGHT / 2), WIDTH, HEIGHT);
const output = fileURLToPath(new URL('../public/og.png', import.meta.url));
writePng(output, image, SCALE);
console.log(`OG image → ${output} (${image.width * SCALE}×${image.height * SCALE})`);
