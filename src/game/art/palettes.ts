import { hex, type RGBA } from './pixel.ts';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];

export const SEASON_LABELS: Readonly<Record<Season, string>> = {
  spring: 'Primavera',
  summer: 'Verano',
  autumn: 'Otoño',
  winter: 'Invierno',
};

/** Colores con nombre del mundo. Los generadores de tiles solo usan estas claves. */
export interface WorldPalette {
  readonly outline: RGBA;
  readonly grass: RGBA;
  readonly grassLight: RGBA;
  readonly grassShade: RGBA;
  readonly grassDark: RGBA;
  readonly tallGrass: RGBA;
  readonly tallGrassTip: RGBA;
  readonly flowerA: RGBA;
  readonly flowerB: RGBA;
  readonly flowerCenter: RGBA;
  readonly stone: RGBA;
  readonly stoneLight: RGBA;
  readonly stoneShade: RGBA;
  readonly mortar: RGBA;
  readonly slab: RGBA;
  readonly slabLight: RGBA;
  readonly slabLine: RGBA;
  readonly sand: RGBA;
  readonly sandLight: RGBA;
  readonly sandShade: RGBA;
  readonly water: RGBA;
  readonly waterDeep: RGBA;
  readonly waterLight: RGBA;
  readonly foam: RGBA;
  readonly leaf: RGBA;
  readonly leafLight: RGBA;
  readonly leafShade: RGBA;
  readonly leafDark: RGBA;
  readonly leafHighlight: RGBA;
  readonly trunk: RGBA;
  readonly trunkShade: RGBA;
  readonly frond: RGBA;
  readonly frondLight: RGBA;
  readonly frondShade: RGBA;
  readonly wood: RGBA;
  readonly woodLight: RGBA;
  readonly woodShade: RGBA;
  readonly shadow: RGBA;
}

const SUMMER: WorldPalette = {
  outline: hex('#1c2333'),
  grass: hex('#6cbf5c'),
  grassLight: hex('#8fd672'),
  grassShade: hex('#53a14d'),
  grassDark: hex('#3d7f3f'),
  tallGrass: hex('#3f9a4a'),
  tallGrassTip: hex('#7ccf63'),
  flowerA: hex('#f05a5a'),
  flowerB: hex('#fff3b0'),
  flowerCenter: hex('#ffcf3f'),
  stone: hex('#cdbfa8'),
  stoneLight: hex('#e8dfcd'),
  stoneShade: hex('#a8987f'),
  mortar: hex('#8c7c66'),
  slab: hex('#ddd5c4'),
  slabLight: hex('#f1ece0'),
  slabLine: hex('#b3a78f'),
  sand: hex('#f1dc9f'),
  sandLight: hex('#faeec6'),
  sandShade: hex('#d9bf7d'),
  water: hex('#3f8ee6'),
  waterDeep: hex('#2c6ac4'),
  waterLight: hex('#9fd4fb'),
  foam: hex('#f2fbff'),
  leaf: hex('#3c9a4c'),
  leafLight: hex('#5fbf5a'),
  leafShade: hex('#2b7640'),
  leafDark: hex('#1f5434'),
  leafHighlight: hex('#9ae07a'),
  trunk: hex('#8a5a3a'),
  trunkShade: hex('#5e3b27'),
  frond: hex('#43a656'),
  frondLight: hex('#7bd06a'),
  frondShade: hex('#2a7a42'),
  wood: hex('#b07a48'),
  woodLight: hex('#d39c63'),
  woodShade: hex('#7d5233'),
  shadow: hex('#10182a55'),
};

const SPRING: WorldPalette = {
  ...SUMMER,
  grass: hex('#7ccb68'),
  grassLight: hex('#a6df84'),
  grassShade: hex('#5eae55'),
  flowerA: hex('#f78fc0'),
  flowerB: hex('#ffffff'),
  leaf: hex('#4aa857'),
  leafLight: hex('#78c96a'),
  leafHighlight: hex('#f5b3d6'),
};

const AUTUMN: WorldPalette = {
  ...SUMMER,
  grass: hex('#9fb35a'),
  grassLight: hex('#c2c972'),
  grassShade: hex('#7f9446'),
  grassDark: hex('#5f7036'),
  tallGrass: hex('#8a8a3c'),
  tallGrassTip: hex('#d0b35a'),
  flowerA: hex('#f08a3c'),
  flowerB: hex('#ffe08a'),
  leaf: hex('#d9782f'),
  leafLight: hex('#f0a03c'),
  leafShade: hex('#b0522a'),
  leafDark: hex('#7a3424'),
  leafHighlight: hex('#ffd36a'),
  frond: hex('#8fae4a'),
  frondLight: hex('#c2cf63'),
  frondShade: hex('#6a7d34'),
};

const WINTER: WorldPalette = {
  ...SUMMER,
  grass: hex('#e8f1f8'),
  grassLight: hex('#ffffff'),
  grassShade: hex('#c9d9ea'),
  grassDark: hex('#9fb4cc'),
  tallGrass: hex('#8fb0a8'),
  tallGrassTip: hex('#ffffff'),
  flowerA: hex('#9fc8f5'),
  flowerB: hex('#ffffff'),
  flowerCenter: hex('#d6e9ff'),
  sand: hex('#e6e2d4'),
  sandLight: hex('#f7f5ee'),
  sandShade: hex('#c8c2ad'),
  water: hex('#3a7ccc'),
  waterDeep: hex('#285aa8'),
  leaf: hex('#2f7a4c'),
  leafLight: hex('#4f9a64'),
  leafShade: hex('#215c3d'),
  leafDark: hex('#17402c'),
  leafHighlight: hex('#ffffff'),
};

export const SEASON_PALETTES: Readonly<Record<Season, WorldPalette>> = {
  spring: SPRING,
  summer: SUMMER,
  autumn: AUTUMN,
  winter: WINTER,
};

export function paletteFor(season: Season): WorldPalette {
  return SEASON_PALETTES[season];
}
