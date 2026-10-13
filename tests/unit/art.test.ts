import { describe, expect, it } from 'vitest';
import { bakeGround, groundFrameCount, worldSprites } from '../../src/game/art/bake.ts';
import { type BuildingStyle, buildingArt, ROOF_OVERHANG } from '../../src/game/art/buildings.ts';
import {
  characterFrame,
  characterSheet,
  FRAME_HEIGHT,
  FRAME_WIDTH,
  frameRect,
  NPC_LOOKS,
  PLAYER_LOOK,
} from '../../src/game/art/characters.ts';
import { paletteFor, SEASONS } from '../../src/game/art/palettes.ts';
import { countOpaque, crop, flipX, getPixel } from '../../src/game/art/pixel.ts';
import { PROP_SHAPES, type PropKind, propArt } from '../../src/game/art/props.ts';
import { GROUND_FRAMES, GROUND_KINDS, groundTile, isGroundWalkable } from '../../src/game/art/tiles.ts';
import { TILE } from '../../src/game/core/types.ts';
import { PRIMADA } from '../../src/game/world/primada.ts';
import { TownMap } from '../../src/game/world/town-map.ts';

describe('tiles de suelo', () => {
  it.each(SEASONS)('cada suelo de %s es un tile 16×16 totalmente opaco', (season) => {
    const palette = paletteFor(season);
    for (const kind of GROUND_KINDS) {
      const tile = groundTile(kind, palette, 1, 0);
      expect(tile.width).toBe(TILE);
      expect(tile.height).toBe(TILE);
      expect(countOpaque(tile)).toBe(TILE * TILE);
    }
  });

  it('los suelos animados cambian entre frames', () => {
    const palette = paletteFor('summer');
    for (const kind of GROUND_KINDS.filter((kind) => GROUND_FRAMES[kind] > 1)) {
      const first = groundTile(kind, palette, 0, 0).data;
      const second = groundTile(kind, palette, 0, 1).data;
      expect(Buffer.from(first).equals(Buffer.from(second))).toBe(false);
    }
  });

  it('el agua no se pisa; el resto sí', () => {
    expect(isGroundWalkable('water')).toBe(false);
    expect(isGroundWalkable('shore')).toBe(false);
    expect(isGroundWalkable('path')).toBe(true);
    expect(isGroundWalkable('dock')).toBe(true);
  });

  it('cada estación tiene una paleta distinta', () => {
    const grass = SEASONS.map((season) => paletteFor(season).grass.join(','));
    expect(new Set(grass).size).toBe(SEASONS.length);
  });
});

describe('objetos', () => {
  it.each(Object.keys(PROP_SHAPES) as PropKind[])('%s se dibuja y cabe en su huella', (kind) => {
    const art = propArt(kind, paletteFor('summer'));
    const shape = PROP_SHAPES[kind];
    expect(countOpaque(art.image)).toBeGreaterThan(10);
    expect(art.image.width).toBeGreaterThanOrEqual(shape.width * TILE);
    // El dibujo termina justo en el borde inferior de la huella.
    expect(art.image.height + art.offsetY).toBe(shape.height * TILE);
  });

  it('la fuente está animada', () => {
    const palette = paletteFor('summer');
    const frames = Array.from({ length: PROP_SHAPES.fountain.frames }, (_, frame) =>
      Buffer.from(propArt('fountain', palette, frame).image.data).toString('base64'),
    );
    expect(new Set(frames).size).toBe(frames.length);
  });
});

describe('edificios', () => {
  const style: BuildingStyle = {
    width: 5,
    height: 4,
    wall: '#f3d9b1',
    roof: '#c8643c',
    roofStyle: 'tile',
    windows: 'arched',
    emblem: 'house',
  };

  it('ocupa su huella más el alero del techo', () => {
    const art = buildingArt(style, paletteFor('summer'));
    expect(art.image.width).toBe(5 * TILE);
    expect(art.image.height).toBe(4 * TILE + ROOF_OVERHANG);
    expect(art.offsetY).toBe(-ROOF_OVERHANG);
    expect(countOpaque(art.image)).toBe(art.image.width * art.image.height);
  });

  it('exige ancho impar para centrar la puerta', () => {
    expect(() => buildingArt({ ...style, width: 4 }, paletteFor('summer'))).toThrow('impar');
  });

  it.each(['tile', 'gable', 'flat', 'scaffold'] as const)('dibuja techos de tipo %s', (roofStyle) => {
    const art = buildingArt({ ...style, roofStyle, awning: '#2f6fd8', floors: 2 }, paletteFor('autumn'));
    expect(countOpaque(art.image)).toBeGreaterThan(1000);
  });
});

describe('personajes', () => {
  it('la hoja tiene 3 frames × 4 direcciones', () => {
    const sheet = characterSheet(PLAYER_LOOK);
    expect(sheet.width).toBe(FRAME_WIDTH * 3);
    expect(sheet.height).toBe(FRAME_HEIGHT * 4);
  });

  it.each(Object.entries(NPC_LOOKS))('el aspecto "%s" genera frames con contenido', (_, look) => {
    for (const direction of ['down', 'up', 'left', 'right'] as const) {
      for (const frame of [0, 1, 2]) {
        expect(countOpaque(characterFrame(look, direction, frame))).toBeGreaterThan(120);
      }
    }
  });

  it('mirar a la derecha es el espejo de mirar a la izquierda', () => {
    const left = characterFrame(PLAYER_LOOK, 'left', 0);
    const right = characterFrame(PLAYER_LOOK, 'right', 0);
    expect(Buffer.from(flipX(left).data).equals(Buffer.from(right.data))).toBe(true);
  });

  it('los pies tocan el borde inferior del tile y dejan sitio al contorno', () => {
    const frame = characterFrame(PLAYER_LOOK, 'down', 0);
    const lastRow = Array.from({ length: FRAME_WIDTH }, (_, x) => getPixel(frame, x, FRAME_HEIGHT - 1)[3]);
    expect(lastRow.some((alpha) => alpha > 0)).toBe(true);
  });

  it('frameRect apunta al frame correcto de la hoja', () => {
    expect(frameRect('down', 0)).toEqual({ x: 0, y: 0, width: 16, height: 24 });
    expect(frameRect('right', 2)).toEqual({ x: 32, y: 72, width: 16, height: 24 });
    const sheet = characterSheet(PLAYER_LOOK);
    const rect = frameRect('up', 1);
    const fromSheet = crop(sheet, rect.x, rect.y, rect.width, rect.height);
    expect(Buffer.from(fromSheet.data).equals(Buffer.from(characterFrame(PLAYER_LOOK, 'up', 1).data))).toBe(true);
  });
});

describe('horneado del pueblo', () => {
  const map = new TownMap(PRIMADA);

  it('el suelo ocupa todo el mapa', () => {
    const ground = bakeGround(map, paletteFor('summer'));
    expect(ground.width).toBe(map.width * TILE);
    expect(ground.height).toBe(map.height * TILE);
    expect(countOpaque(ground)).toBe(ground.width * ground.height);
  });

  it('hay tantos frames de suelo como la animación más larga', () => {
    expect(groundFrameCount()).toBe(Math.max(...Object.values(GROUND_FRAMES)));
  });

  it('hay un sprite por edificio y por objeto', () => {
    const sprites = worldSprites(map, paletteFor('summer'));
    expect(sprites).toHaveLength(PRIMADA.buildings.length + PRIMADA.props.length);
    expect(new Set(sprites.map((sprite) => sprite.id)).size).toBe(sprites.length);
    for (const sprite of sprites) expect(sprite.frames.length).toBeGreaterThan(0);
  });
});
