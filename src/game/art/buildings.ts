import type { WorldPalette } from '@/game/art/palettes.ts';
import {
  blit,
  createBuffer,
  fillRect,
  fromRows,
  hex,
  hLine,
  mix,
  outline,
  type PixelBuffer,
  type RGBA,
  setPixel,
  shade,
  vLine,
} from '@/game/art/pixel.ts';
import { hashString } from '@/game/core/rng.ts';
import { TILE } from '@/game/core/types.ts';

export type RoofStyle = 'tile' | 'flat' | 'gable' | 'scaffold';
export type WindowStyle = 'arched' | 'square' | 'wide';
export type DoorStyle = 'arched' | 'double' | 'glass';
export type Emblem =
  | 'house'
  | 'mail'
  | 'book'
  | 'phone'
  | 'badge'
  | 'pen'
  | 'beam'
  | 'globe'
  | 'plus'
  | 'chat'
  | 'helmet'
  | 'code'
  | 'shield';

export interface BuildingStyle {
  /** Huella en tiles. Ancho impar para que la puerta quede centrada en un tile. */
  readonly width: number;
  readonly height: number;
  readonly wall: string;
  readonly roof: string;
  readonly trim?: string;
  readonly door?: string;
  readonly roofStyle: RoofStyle;
  readonly windows: WindowStyle;
  readonly doorStyle?: DoorStyle;
  readonly emblem: Emblem;
  /** Color de las rayas del toldo (tiendas/agencias). */
  readonly awning?: string;
  readonly floors?: number;
}

export interface BuildingArt {
  readonly image: PixelBuffer;
  readonly offsetX: number;
  readonly offsetY: number;
}

/** Píxeles extra de techo por encima de la huella (tapan la fila de atrás: efecto de profundidad). */
export const ROOF_OVERHANG = 16;

const ICONS: Readonly<Record<Emblem, readonly string[]>> = {
  house: ['...##...', '..####..', '.######.', '########', '.#....#.', '.#.##.#.', '.#.##.#.', '.######.'],
  mail: ['........', '########', '##....##', '#.#..#.#', '#..##..#', '#......#', '########', '........'],
  book: ['.##..##.', '#..##..#', '#..##..#', '#..##..#', '#..##..#', '#..##..#', '.##..##.', '...##...'],
  phone: ['.######.', '.#....#.', '.#....#.', '.#....#.', '.#....#.', '.#....#.', '.##..##.', '.######.'],
  badge: ['########', '#......#', '#.##...#', '#.##.#.#', '#......#', '#.####.#', '#......#', '########'],
  pen: ['......##', '.....###', '....###.', '...###..', '..###...', '.###....', '.##.....', '#.......'],
  beam: ['########', '########', '...##...', '...##...', '...##...', '...##...', '########', '########'],
  globe: ['..####..', '.#.##.#.', '#..##..#', '########', '#..##..#', '#..##..#', '.#.##.#.', '..####..'],
  plus: ['...##...', '...##...', '...##...', '########', '########', '...##...', '...##...', '...##...'],
  chat: ['.######.', '#......#', '#.#.#.##', '#......#', '.####.#.', '....##..', '....#...', '........'],
  helmet: ['........', '..####..', '.##..##.', '#..##..#', '#......#', '########', '##....##', '........'],
  code: ['########', '#......#', '#.#....#', '#..#...#', '#.#.##.#', '#......#', '########', '........'],
  shield: ['########', '#......#', '#.....##', '#....#.#', '##..#..#', '.##.#.#.', '..##.##.', '...##...'],
};

function emblemImage(emblem: Emblem, color: RGBA): PixelBuffer {
  return fromRows(ICONS[emblem], { '#': color });
}

function roofTiles(image: PixelBuffer, top: number, height: number, roof: RGBA, palette: WorldPalette): void {
  const width = image.width;
  fillRect(image, 0, top, width, height, roof);
  for (let row = 0; row * 4 < height; row += 1) {
    const y = top + row * 4;
    hLine(image, 0, y + 3, width, shade(roof, 0.72));
    const offset = row % 2 === 0 ? 0 : 3;
    for (let x = offset; x < width; x += 6) {
      vLine(image, x, y, 3, shade(roof, 0.82));
      setPixel(image, x + 2, y, shade(roof, 1.18));
      setPixel(image, x + 3, y, shade(roof, 1.18));
    }
  }
  // Cumbrera clara y alero oscuro: le dan volumen al techo visto desde arriba.
  hLine(image, 0, top, width, shade(roof, 1.3));
  hLine(image, 0, top + 1, width, shade(roof, 1.12));
  hLine(image, 0, top + height - 1, width, shade(roof, 0.58));
  vLine(image, 0, top, height, shade(roof, 0.85));
  vLine(image, width - 1, top, height, shade(roof, 0.7));
  setPixel(image, 0, top + height, palette.outline);
}

function gableRoof(image: PixelBuffer, top: number, height: number, roof: RGBA): void {
  const width = image.width;
  fillRect(image, 0, top, width, height, roof);
  const middle = Math.floor(width / 2);
  for (let y = 0; y < height; y += 1) {
    // Mitad derecha en sombra: tejado a dos aguas.
    hLine(image, middle, top + y, width - middle, shade(roof, 0.82));
    if (y % 3 === 2) hLine(image, 0, top + y, width, shade(roof, y % 6 === 2 ? 0.9 : 0.75));
  }
  vLine(image, middle, top, height, shade(roof, 1.25));
  hLine(image, 0, top, width, shade(roof, 1.2));
  hLine(image, 0, top + height - 1, width, shade(roof, 0.55));
}

function flatRoof(image: PixelBuffer, top: number, height: number, roof: RGBA, trim: RGBA): void {
  const width = image.width;
  fillRect(image, 0, top, width, height, roof);
  // Parapeto y equipos de aire en la azotea.
  hLine(image, 0, top, width, shade(trim, 1.1));
  hLine(image, 0, top + 1, width, trim);
  hLine(image, 0, top + height - 2, width, trim);
  hLine(image, 0, top + height - 1, width, shade(trim, 0.6));
  for (let x = 6; x < width - 10; x += 22) {
    fillRect(image, x, top + 4, 8, Math.max(3, height - 8), shade(roof, 1.25));
    hLine(image, x, top + 4 + Math.max(3, height - 8), 8, shade(roof, 0.7));
  }
}

function scaffold(image: PixelBuffer, top: number, height: number, palette: WorldPalette): void {
  const width = image.width;
  const pole = hex('#9aa6b8');
  const plank = palette.wood;
  for (let x = 1; x < width; x += 10) vLine(image, x, top, height + 10, pole);
  for (let y = top + 2; y < top + height + 8; y += 8) hLine(image, 0, y, width, plank);
  for (let x = 1; x + 10 < width; x += 10) {
    for (let index = 0; index < 8; index += 1) setPixel(image, x + index + 1, top + 2 + index, pole);
  }
}

function windowAt(image: PixelBuffer, x: number, y: number, style: WindowStyle, frame: RGBA, glass: RGBA): void {
  const width = style === 'wide' ? 14 : 8;
  const height = style === 'wide' ? 8 : 9;
  fillRect(image, x - 1, y - 1, width + 2, height + 2, frame);
  fillRect(image, x, y, width, height, glass);
  if (style === 'arched') {
    setPixel(image, x, y, frame);
    setPixel(image, x + width - 1, y, frame);
  }
  // Brillo diagonal del vidrio y parteluz.
  setPixel(image, x + 1, y + 1, shade(glass, 1.5));
  setPixel(image, x + 2, y + 1, shade(glass, 1.35));
  setPixel(image, x + 1, y + 2, shade(glass, 1.35));
  vLine(image, x + Math.floor(width / 2), y, height, frame);
  if (style !== 'wide') hLine(image, x, y + Math.floor(height / 2), width, frame);
  hLine(image, x - 1, y + height + 1, width + 2, shade(frame, 0.7));
}

function doorAt(image: PixelBuffer, centerX: number, bottom: number, style: DoorStyle, color: RGBA, trim: RGBA): void {
  const width = style === 'double' ? 12 : 10;
  const height = 15;
  const left = centerX - Math.floor(width / 2);
  const top = bottom - height;
  fillRect(image, left - 1, top - 1, width + 2, height + 1, trim);
  fillRect(image, left, top, width, height, color);
  if (style === 'arched') {
    setPixel(image, left, top, trim);
    setPixel(image, left + width - 1, top, trim);
    hLine(image, left + 1, top + 1, width - 2, shade(color, 1.25));
  }
  if (style === 'glass') {
    fillRect(image, left + 1, top + 1, width - 2, height - 2, hex('#8fd8ff'));
    vLine(image, centerX, top + 1, height - 2, trim);
    setPixel(image, left + 2, top + 2, hex('#e6f6ff'));
  } else {
    vLine(image, centerX, top + 1, height - 1, shade(color, 0.7));
    setPixel(image, centerX - 2, top + 8, hex('#ffd65a'));
    setPixel(image, centerX + 1, top + 8, hex('#ffd65a'));
  }
  // Escalón.
  hLine(image, left - 2, bottom, width + 4, hex('#9aa6b8'));
}

/**
 * Pinta un edificio estilo "zona colonial" a partir de su estilo.
 * Devuelve el dibujo y cómo apoyarlo sobre su huella (el techo sobresale hacia arriba).
 */
export function buildingArt(style: BuildingStyle, palette: WorldPalette): BuildingArt {
  if (style.width % 2 === 0) throw new Error('Los edificios usan ancho impar para centrar la puerta');
  const width = style.width * TILE;
  const height = style.height * TILE + ROOF_OVERHANG;
  const image = createBuffer(width, height);
  const wall = hex(style.wall);
  const roof = hex(style.roof);
  const trim = hex(style.trim ?? '#f4ede0');
  const doorColor = hex(style.door ?? '#6b3f2a');
  const glass = hex('#4f9fd8');
  const floors = style.floors ?? 1;
  const seed = hashString(`${style.wall}${style.roof}${style.emblem}`);

  const roofHeight = style.roofStyle === 'flat' ? 14 : style.roofStyle === 'scaffold' ? 10 : Math.round(height * 0.42);
  const facadeTop = roofHeight;

  // Fachada con textura de estuco, pilastras y zócalo.
  fillRect(image, 0, facadeTop, width, height - facadeTop, wall);
  for (let index = 0; index < (width * (height - facadeTop)) / 18; index += 1) {
    const x = (hashString(`${seed}x${index}`) % width) | 0;
    const y = facadeTop + ((hashString(`${seed}y${index}`) % (height - facadeTop)) | 0);
    setPixel(image, x, y, shade(wall, 0.94));
  }
  fillRect(image, 0, facadeTop, 3, height - facadeTop, shade(wall, 1.08));
  fillRect(image, width - 3, facadeTop, 3, height - facadeTop, shade(wall, 0.86));
  fillRect(image, 0, height - 4, width, 4, shade(wall, 0.72));
  hLine(image, 0, height - 4, width, shade(wall, 0.6));
  // Cornisa bajo el techo, con su sombra.
  hLine(image, 0, facadeTop, width, trim);
  hLine(image, 0, facadeTop + 1, width, shade(trim, 0.85));
  hLine(image, 0, facadeTop + 2, width, mix(wall, palette.outline, 0.35));

  switch (style.roofStyle) {
    case 'tile':
      roofTiles(image, 0, roofHeight, roof, palette);
      break;
    case 'gable':
      gableRoof(image, 0, roofHeight, roof);
      break;
    case 'flat':
      flatRoof(image, 0, roofHeight, roof, trim);
      break;
    case 'scaffold':
      scaffold(image, 0, roofHeight, palette);
      break;
  }

  // Ventanas por piso, centradas y simétricas; en planta baja dejan sitio a la puerta.
  const centerX = Math.floor(width / 2);
  const facadeHeight = height - facadeTop;
  const floorHeight = Math.floor((facadeHeight - 4) / floors);
  const windowWidth = style.windows === 'wide' ? 14 : 8;
  const gap = 8;
  const count = Math.max(1, Math.floor((width - 10 + gap) / (windowWidth + gap)));
  const rowWidth = count * windowWidth + (count - 1) * gap;
  const firstX = Math.round((width - rowWidth) / 2);
  const slots = Array.from({ length: count }, (_, index) => firstX + index * (windowWidth + gap));
  let groundWindowTop = height;
  for (let floor = 0; floor < floors; floor += 1) {
    const isGround = floor === floors - 1;
    const y = facadeTop + 5 + floor * floorHeight;
    if (isGround) groundWindowTop = y;
    for (const x of slots) {
      const nearDoor = isGround && x + windowWidth > centerX - 9 && x < centerX + 9;
      if (nearDoor) continue;
      if (isGround && y + 12 > height - 5) continue;
      windowAt(image, x, y, style.windows, trim, glass);
    }
  }

  if (style.awning) {
    const stripe = hex(style.awning);
    const awningY = Math.max(facadeTop + 3, groundWindowTop - 6);
    for (let x = 2; x < width - 2; x += 1) {
      const color = Math.floor(x / 4) % 2 === 0 ? stripe : hex('#f6f6f6');
      vLine(image, x, awningY, 4, color);
      // Borde festoneado del toldo.
      if (x % 4 < 2) setPixel(image, x, awningY + 4, shade(color, 0.8));
    }
    hLine(image, 2, awningY - 1, width - 4, shade(stripe, 0.7));
  }

  if (style.roofStyle !== 'scaffold') {
    doorAt(image, centerX, height - 1, style.doorStyle ?? 'arched', doorColor, trim);
  } else {
    // Obra: hueco de puerta con cinta de seguridad.
    fillRect(image, centerX - 5, height - 15, 10, 14, shade(wall, 0.45));
    for (let x = centerX - 7; x < centerX + 7; x += 1) {
      setPixel(image, x, height - 9, Math.floor(x / 2) % 2 === 0 ? hex('#ffd65a') : palette.outline);
    }
  }

  // Placa con el emblema sobre la puerta.
  const plaqueWidth = 12;
  const plaqueTop = height - 30;
  fillRect(image, centerX - plaqueWidth / 2, plaqueTop, plaqueWidth, 11, hex('#1b2438'));
  hLine(image, centerX - plaqueWidth / 2, plaqueTop, plaqueWidth, hex('#2fc6f0'));
  blit(image, emblemImage(style.emblem, hex('#e6f6ff')), centerX - 4, plaqueTop + 2);

  // Contorno exterior: el edificio llena su rectángulo, así que se dibuja a mano.
  if (style.roofStyle !== 'scaffold') {
    vLine(image, 0, 0, height, palette.outline);
    vLine(image, width - 1, 0, height, palette.outline);
    hLine(image, 0, 0, width, palette.outline);
  }
  return { image: outline(image, palette.outline), offsetX: 0, offsetY: -ROOF_OVERHANG };
}
