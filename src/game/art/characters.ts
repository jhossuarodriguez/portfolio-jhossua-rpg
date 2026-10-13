import type { Direction } from '../core/types.ts';
import { blit, createBuffer, flipX, fromRows, hex, mirrorRows, outline, type PixelBuffer } from './pixel.ts';

/**
 * Personajes de 16x24 (los pies en su tile, la cabeza invade el tile de arriba).
 * Se arman por piezas: cabeza + torso + piernas, con vista de frente/espalda simétrica
 * (se dibuja media fila y se refleja) y vista lateral completa (derecha = izquierda espejada).
 * El contorno no se dibuja a mano: lo agrega `outline()` alrededor de la silueta.
 */

export const FRAME_WIDTH = 16;
export const FRAME_HEIGHT = 24;
/** 0 = quieto, 1 = paso A, 2 = paso B. */
export const WALK_FRAMES = 3;
/** Orden de las filas en la hoja de sprites. */
export const SHEET_DIRECTIONS: readonly Direction[] = ['down', 'up', 'left', 'right'];

export type HairStyle = 'short' | 'long';
export type Headwear = 'none' | 'helmet' | 'cap';

export interface CharacterLook {
  readonly hair: string;
  readonly hairLight: string;
  readonly hairDark: string;
  readonly skin: string;
  readonly skinShade: string;
  readonly jacket: string;
  readonly jacketShade: string;
  readonly accent: string;
  readonly pants: string;
  readonly pantsShade: string;
  readonly shoes: string;
  readonly soles: string;
  readonly hairStyle: HairStyle;
  readonly headwear?: Headwear;
  readonly headwearColor?: string;
}

// ── Cabezas ─────────────────────────────────────────────────────────────
const HEAD_FRONT = mirrorRows([
  '........',
  '......hh',
  '....hhhh',
  '...hhhHH',
  '..hhhhhh',
  '..hhhhhh',
  '..hhhshh',
  '..hsssss',
  '..hssess',
  '..hssess',
  '...Sssss',
]);

const HEAD_BACK = mirrorRows([
  '........',
  '......hh',
  '....hhhh',
  '...hhhhH',
  '..hhhhhh',
  '..hhhhhh',
  '..hhhhhh',
  '..hhhhhh',
  '..dhhhhh',
  '..ddhhhh',
  '...ddddd',
]);

const HEAD_SIDE = [
  '................',
  '......hhhh......',
  '....hhhhhhh.....',
  '...hhhHHhhhh....',
  '..hhhhhhhhhhh...',
  '..hhhhhhhhhhh...',
  '..shhhhhhhhhh...',
  '..sssshhhhhhh...',
  '.sesssShhhhhh...',
  '..esssSShhhhd...',
  '...sssSddhhd....',
];

// ── Torsos ──────────────────────────────────────────────────────────────
const TORSO_FRONT = mirrorRows(['...jjjjc', '..jjjjjc', '..jJjjjc', '..jJjjjc', '..sJjjjc', '...JjjjJ', '...ppppp']);

const TORSO_BACK = mirrorRows(['...jjjjj', '..jjjjjj', '..jJjccc', '..jJjjjj', '..sJjjjj', '...JJjjj', '...ppppp']);

const TORSO_SIDE = [
  '....jjjjjj......',
  '...cjjjjjjj.....',
  '...cjjJjjjj.....',
  '...cjjJjjjj.....',
  '....jjsjjjJ.....',
  '....JjjjjJ......',
  '....pppppp......',
];

// ── Piernas (las de "paso" tienen una fila menos porque el cuerpo baja 1 px) ──
const LEGS_FRONT_STAND = [
  '....ppp..ppp....',
  '....ppP..Ppp....',
  '....ppP..Ppp....',
  '...bbbb..bbbb...',
  '...BBBB..BBBB...',
  '................',
];
const LEGS_FRONT_STEP_A = [
  '....ppp..ppp....',
  '....ppP..bbbb...',
  '...bbbb..BBBB...',
  '...BBBB.........',
  '................',
];
const LEGS_FRONT_STEP_B = [
  '....ppp..ppp....',
  '...bbbb..Ppp....',
  '...BBBB..bbbb...',
  '.........BBBB...',
  '................',
];
const LEGS_SIDE_STAND = [
  '.....pppp.......',
  '.....ppPp.......',
  '.....ppPp.......',
  '....bbbbb.......',
  '....BBBBB.......',
  '................',
];
const LEGS_SIDE_STEP_A = [
  '....pp..pP......',
  '...ppP...pP.....',
  '..bbbb...bbbb...',
  '..BBBB...BBBB...',
  '................',
];
const LEGS_SIDE_STEP_B = [
  '....pP..pp......',
  '...pPP...pp.....',
  '..bbbb...bbbb...',
  '..BBBB...BBBB...',
  '................',
];

type View = 'front' | 'back' | 'side';

function rowsFor(view: View, frame: number): string[] {
  const head = view === 'front' ? HEAD_FRONT : view === 'back' ? HEAD_BACK : HEAD_SIDE;
  const torso = view === 'front' ? TORSO_FRONT : view === 'back' ? TORSO_BACK : TORSO_SIDE;
  if (frame === 0) {
    const legs = view === 'side' ? LEGS_SIDE_STAND : LEGS_FRONT_STAND;
    return [...head, ...torso, ...legs];
  }
  const legs =
    view === 'side'
      ? frame === 1
        ? LEGS_SIDE_STEP_A
        : LEGS_SIDE_STEP_B
      : frame === 1
        ? LEGS_FRONT_STEP_A
        : LEGS_FRONT_STEP_B;
  // En los pasos el cuerpo baja 1 px: el "rebote" al caminar.
  return ['................', ...head, ...torso, ...legs];
}

function overlayRows(look: CharacterLook, view: View, bob: number): string[] | null {
  const rows: string[] = Array.from({ length: FRAME_HEIGHT }, () => '................');
  const put = (y: number, row: string): void => {
    const target = y + bob;
    if (target >= 0 && target < FRAME_HEIGHT) rows[target] = row;
  };
  let used = false;
  if (look.hairStyle === 'long') {
    used = true;
    if (view === 'front') {
      for (let y = 6; y <= 13; y += 1) put(y, y < 11 ? '.hh..........hh.' : '.hh..........hh.');
    } else if (view === 'back') {
      put(10, '..hhhhhhhhhhhh..');
      put(11, '..hhhhhhhhhhhh..');
      put(12, '...hhhhhhhhhh...');
      put(13, '...dhhhhhhhhd...');
      put(14, '....dddddddd....');
    } else {
      put(9, '..........hhh...');
      put(10, '.........hhhh...');
      put(11, '.........hhhh...');
      put(12, '.........dhhh...');
      put(13, '..........dd....');
    }
  }
  const wear = look.headwear ?? 'none';
  if (wear !== 'none') {
    used = true;
    if (wear === 'helmet') {
      put(0, '.....oooooo.....');
      put(1, '...oooOOoooo....');
      put(2, '..oooooooooooo..');
      put(3, '..oooooooooooo..');
      put(4, view === 'side' ? '.ooooooooooooo..' : '.oooooooooooooo.');
    } else {
      put(1, '....oooooooo....');
      put(2, '...ooOOoooooo...');
      put(3, '..oooooooooooo..');
      put(4, view === 'front' ? '..OOOOOOOOOOOO..' : view === 'side' ? 'OOOOooooooooo...' : '..oooooooooooo..');
    }
  }
  return used ? rows : null;
}

function paletteFor(look: CharacterLook): Readonly<Record<string, ReturnType<typeof hex>>> {
  const wear = hex(look.headwearColor ?? '#ffd65a');
  return {
    h: hex(look.hair),
    H: hex(look.hairLight),
    d: hex(look.hairDark),
    s: hex(look.skin),
    S: hex(look.skinShade),
    e: hex('#1c2333'),
    j: hex(look.jacket),
    J: hex(look.jacketShade),
    c: hex(look.accent),
    p: hex(look.pants),
    P: hex(look.pantsShade),
    b: hex(look.shoes),
    B: hex(look.soles),
    o: wear,
    O: [Math.min(255, wear[0] + 40), Math.min(255, wear[1] + 40), Math.min(255, wear[2] + 40), 255],
  };
}

/** Un frame suelto (quieto o paso) para una dirección. */
export function characterFrame(look: CharacterLook, direction: Direction, frame: number): PixelBuffer {
  const view: View = direction === 'down' ? 'front' : direction === 'up' ? 'back' : 'side';
  const palette = paletteFor(look);
  const body = fromRows(rowsFor(view, frame), palette);
  const extra = overlayRows(look, view, frame === 0 ? 0 : 1);
  if (extra) blit(body, fromRows(extra, palette), 0, 0);
  const finished = outline(body, hex('#1c2333'));
  return direction === 'right' ? flipX(finished) : finished;
}

/** Hoja completa: 3 frames de ancho × 4 direcciones de alto (48×96). */
export function characterSheet(look: CharacterLook): PixelBuffer {
  const sheet = createBuffer(FRAME_WIDTH * WALK_FRAMES, FRAME_HEIGHT * SHEET_DIRECTIONS.length);
  SHEET_DIRECTIONS.forEach((direction, row) => {
    for (let frame = 0; frame < WALK_FRAMES; frame += 1) {
      blit(sheet, characterFrame(look, direction, frame), frame * FRAME_WIDTH, row * FRAME_HEIGHT);
    }
  });
  return sheet;
}

/** Rectángulo (en píxeles de la hoja) de un frame. */
export function frameRect(
  direction: Direction,
  frame: number,
): { x: number; y: number; width: number; height: number } {
  const row = SHEET_DIRECTIONS.indexOf(direction);
  return { x: frame * FRAME_WIDTH, y: row * FRAME_HEIGHT, width: FRAME_WIDTH, height: FRAME_HEIGHT };
}

// ── Elenco ──────────────────────────────────────────────────────────────

/** Jhossua: sudadera oscura con detalles cian (el toque "Black 2"). */
export const PLAYER_LOOK: CharacterLook = {
  hair: '#2a2230',
  hairLight: '#4b3d57',
  hairDark: '#17121c',
  skin: '#c98b62',
  skinShade: '#a46a47',
  jacket: '#2b3346',
  jacketShade: '#1c2232',
  accent: '#2fc6f0',
  pants: '#3b4f7a',
  pantsShade: '#2b3a5c',
  shoes: '#f2f2f2',
  soles: '#2fc6f0',
  hairStyle: 'short',
};

export type NpcLookId = 'dev' | 'designer' | 'worker' | 'elder' | 'kid' | 'sailor' | 'student' | 'recruiter';

export const NPC_LOOKS: Readonly<Record<NpcLookId, CharacterLook>> = {
  dev: {
    ...PLAYER_LOOK,
    hair: '#7a4a2a',
    hairLight: '#9c6a42',
    hairDark: '#52301a',
    skin: '#f0c8a0',
    skinShade: '#d4a47c',
    jacket: '#3f8f5a',
    jacketShade: '#2c6a42',
    accent: '#c8f0a0',
    soles: '#9aa6b8',
  },
  designer: {
    ...PLAYER_LOOK,
    hairStyle: 'long',
    hair: '#d86a3a',
    hairLight: '#f08f5a',
    hairDark: '#a84a28',
    skin: '#f0c8a0',
    skinShade: '#d4a47c',
    jacket: '#f2a03c',
    jacketShade: '#c87a28',
    accent: '#fff3d0',
    pants: '#5a4a7a',
    pantsShade: '#40345a',
    soles: '#9aa6b8',
  },
  worker: {
    ...PLAYER_LOOK,
    skin: '#8a5a3a',
    skinShade: '#6a4228',
    jacket: '#ff8a2a',
    jacketShade: '#d06a1a',
    accent: '#f6f6f6',
    pants: '#4a5a6a',
    pantsShade: '#36424e',
    shoes: '#5e3b27',
    soles: '#2b3346',
    headwear: 'helmet',
    headwearColor: '#ffd65a',
  },
  elder: {
    ...PLAYER_LOOK,
    hair: '#c8c8d0',
    hairLight: '#f0f0f6',
    hairDark: '#9a9aa8',
    skin: '#d8a880',
    skinShade: '#b8865e',
    jacket: '#8a6a9a',
    jacketShade: '#6a4e78',
    accent: '#f0e0ff',
    pants: '#5a5a6a',
    pantsShade: '#44444e',
    shoes: '#5e3b27',
    soles: '#2b3346',
  },
  kid: {
    ...PLAYER_LOOK,
    hair: '#1a1a22',
    hairLight: '#3a3a48',
    hairDark: '#0e0e14',
    skin: '#a86a48',
    skinShade: '#86523a',
    jacket: '#e0483e',
    jacketShade: '#b0362e',
    accent: '#ffd65a',
    pants: '#2f6fd8',
    pantsShade: '#2454a8',
    headwear: 'cap',
    headwearColor: '#2f6fd8',
  },
  sailor: {
    ...PLAYER_LOOK,
    skin: '#b07850',
    skinShade: '#8e5c3a',
    jacket: '#f6f6f6',
    jacketShade: '#c8d4e0',
    accent: '#1f7fd8',
    pants: '#1f3f78',
    pantsShade: '#162e58',
    headwear: 'cap',
    headwearColor: '#1f3f78',
  },
  student: {
    ...PLAYER_LOOK,
    hairStyle: 'long',
    hair: '#3a2418',
    hairLight: '#5a3a28',
    hairDark: '#24160e',
    skin: '#c98b62',
    skinShade: '#a46a47',
    jacket: '#1f7fd8',
    jacketShade: '#165ea8',
    accent: '#f6f6f6',
    pants: '#2b3346',
    pantsShade: '#1c2232',
    soles: '#e0483e',
  },
  recruiter: {
    ...PLAYER_LOOK,
    hair: '#4a3020',
    hairLight: '#6a4a34',
    hairDark: '#301e14',
    skin: '#e8b890',
    skinShade: '#c8946c',
    jacket: '#3a3f58',
    jacketShade: '#282c40',
    accent: '#ffd65a',
    pants: '#3a3f58',
    pantsShade: '#282c40',
    shoes: '#2b2b2b',
    soles: '#111111',
  },
};
