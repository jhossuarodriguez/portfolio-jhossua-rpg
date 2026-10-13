import type { WorldPalette } from './palettes.ts';
import {
  createBuffer,
  fillEllipse,
  fillRect,
  hex,
  hLine,
  mix,
  outline,
  type PixelBuffer,
  pixelNoise,
  type RGBA,
  setPixel,
  shade,
  vLine,
} from './pixel.ts';

/** Objetos del mundo que no son edificios ni personajes. */
export type PropKind =
  | 'tree'
  | 'palm'
  | 'bush'
  | 'sign'
  | 'mailbox'
  | 'lamp'
  | 'bench'
  | 'fence'
  | 'cone'
  | 'barrier'
  | 'crate'
  | 'planter'
  | 'rock'
  | 'umbrella'
  | 'boat'
  | 'fountain';

/** Arte de un objeto y cómo se apoya sobre su huella de tiles. */
export interface PropArt {
  readonly image: PixelBuffer;
  /** Desplazamiento del dibujo respecto a la esquina superior izquierda de la huella. */
  readonly offsetX: number;
  readonly offsetY: number;
}

export interface PropShape {
  /** Huella en tiles (lo que bloquea el paso). */
  readonly width: number;
  readonly height: number;
  readonly frames: number;
}

export const PROP_SHAPES: Readonly<Record<PropKind, PropShape>> = {
  tree: { width: 2, height: 2, frames: 1 },
  palm: { width: 2, height: 1, frames: 1 },
  bush: { width: 1, height: 1, frames: 1 },
  sign: { width: 1, height: 1, frames: 1 },
  mailbox: { width: 1, height: 1, frames: 1 },
  lamp: { width: 1, height: 1, frames: 1 },
  bench: { width: 2, height: 1, frames: 1 },
  fence: { width: 1, height: 1, frames: 1 },
  cone: { width: 1, height: 1, frames: 1 },
  barrier: { width: 1, height: 1, frames: 1 },
  crate: { width: 1, height: 1, frames: 1 },
  planter: { width: 1, height: 1, frames: 1 },
  rock: { width: 1, height: 1, frames: 1 },
  umbrella: { width: 2, height: 1, frames: 1 },
  boat: { width: 2, height: 1, frames: 1 },
  fountain: { width: 3, height: 3, frames: 4 },
};

interface Circle {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

interface BlobColors {
  readonly dark: RGBA;
  readonly shade: RGBA;
  readonly base: RGBA;
  readonly light: RGBA;
  readonly highlight?: RGBA;
}

/** Ruido determinista por píxel en [-1, 1]. */
function noise(x: number, y: number, seed: number): number {
  return pixelNoise(x, y, seed) * 2 - 1;
}

/**
 * Volumen sombreado a partir de círculos: luz desde arriba a la izquierda,
 * bandas cuantizadas y bordes "rotos" con ruido para que parezca follaje.
 */
function shadedBlob(target: PixelBuffer, circles: readonly Circle[], colors: BlobColors, seed: number): void {
  const lightX = -0.55;
  const lightY = -0.83;
  for (let y = 0; y < target.height; y += 1) {
    for (let x = 0; x < target.width; x += 1) {
      let best: { depth: number; nx: number; ny: number } | null = null;
      for (const circle of circles) {
        const dx = (x + 0.5 - circle.x) / circle.r;
        const dy = (y + 0.5 - circle.y) / circle.r;
        const distance = Math.hypot(dx, dy);
        if (distance > 1) continue;
        const depth = 1 - distance;
        if (!best || depth > best.depth) best = { depth, nx: dx, ny: dy };
      }
      if (!best) continue;
      const lit = best.nx * lightX + best.ny * lightY + noise(x, y, seed) * 0.28;
      let color: RGBA;
      if (lit > 0.62 && colors.highlight && noise(y, x, seed + 7) > 0.35) color = colors.highlight;
      else if (lit > 0.45) color = colors.light;
      else if (lit > -0.05) color = colors.base;
      else if (lit > -0.5) color = colors.shade;
      else color = colors.dark;
      setPixel(target, x, y, color);
    }
  }
}

function tree(palette: WorldPalette): PropArt {
  const image = createBuffer(32, 32);
  // Sombra al pie del tronco.
  fillEllipse(image, 16, 29.5, 10, 2.5, palette.shadow);
  fillRect(image, 13, 21, 6, 9, palette.trunk);
  vLine(image, 17, 21, 9, palette.trunkShade);
  vLine(image, 18, 21, 9, palette.trunkShade);
  setPixel(image, 12, 29, palette.trunkShade);
  setPixel(image, 19, 29, palette.trunkShade);
  shadedBlob(
    image,
    [
      { x: 16, y: 12, r: 11 },
      { x: 9, y: 15, r: 7.5 },
      { x: 23, y: 15, r: 7.5 },
      { x: 16, y: 7, r: 8 },
      { x: 16, y: 18, r: 7 },
    ],
    {
      dark: palette.leafDark,
      shade: palette.leafShade,
      base: palette.leaf,
      light: palette.leafLight,
      highlight: palette.leafHighlight,
    },
    11,
  );
  return { image: outline(image, palette.outline), offsetX: 0, offsetY: 0 };
}

function palm(palette: WorldPalette): PropArt {
  const image = createBuffer(32, 48);
  fillEllipse(image, 16, 45.5, 8, 2.2, palette.shadow);
  // Tronco curvo con anillos.
  for (let y = 14; y <= 45; y += 1) {
    const t = (45 - y) / 31;
    const center = 15 + Math.round(Math.sin(t * 1.6) * 3);
    hLine(image, center - 1, y, 3, y % 3 === 0 ? palette.trunkShade : palette.trunk);
    setPixel(image, center + 2, y, palette.trunkShade);
    setPixel(image, center - 2, y, y % 3 === 0 ? palette.trunkShade : palette.wood);
  }
  // Cocos.
  for (const [x, y] of [
    [16, 15],
    [19, 16],
    [17, 17],
  ] as const) {
    fillEllipse(image, x, y, 1.6, 1.6, palette.trunkShade);
    setPixel(image, x - 1, y - 1, palette.wood);
  }
  // Hojas: arcos gruesos que caen desde la corona.
  const crownX = 18;
  const crownY = 12;
  const fronds = [
    { angle: Math.PI * 1.05, length: 15, droop: 7 },
    { angle: Math.PI * 1.35, length: 11, droop: 3 },
    { angle: Math.PI * 1.62, length: 10, droop: 2 },
    { angle: Math.PI * 1.9, length: 12, droop: 4 },
    { angle: Math.PI * 0.02, length: 14, droop: 7 },
    { angle: Math.PI * 0.7, length: 11, droop: 7 },
    { angle: Math.PI * 0.35, length: 10, droop: 6 },
  ];
  for (const frond of fronds) {
    for (let step = 0; step <= frond.length; step += 0.5) {
      const t = step / frond.length;
      const x = crownX + Math.cos(frond.angle) * step;
      const y = crownY + Math.sin(frond.angle) * step + t * t * frond.droop;
      const width = 2.2 * (1 - t) + 0.6;
      fillEllipse(image, x, y, width, width * 0.8, t < 0.25 ? palette.frondShade : palette.frond);
      if (t > 0.2 && t < 0.85) setPixel(image, Math.round(x), Math.round(y - width * 0.6), palette.frondLight);
    }
  }
  return { image: outline(image, palette.outline), offsetX: 0, offsetY: -32 };
}

function bush(palette: WorldPalette): PropArt {
  const image = createBuffer(16, 16);
  fillEllipse(image, 8, 13.5, 6.5, 2, palette.shadow);
  shadedBlob(
    image,
    [
      { x: 8, y: 8.5, r: 6 },
      { x: 4.5, y: 10, r: 4 },
      { x: 11.5, y: 10, r: 4 },
    ],
    { dark: palette.leafDark, shade: palette.leafShade, base: palette.leaf, light: palette.leafLight },
    23,
  );
  return { image: outline(image, palette.outline), offsetX: 0, offsetY: 0 };
}

function sign(palette: WorldPalette): PropArt {
  const image = createBuffer(16, 16);
  fillEllipse(image, 8, 14.5, 5, 1.5, palette.shadow);
  fillRect(image, 7, 9, 2, 6, palette.woodShade);
  fillRect(image, 2, 2, 12, 8, palette.wood);
  hLine(image, 2, 2, 12, palette.woodLight);
  hLine(image, 2, 9, 12, palette.woodShade);
  // "Letras" del cartel.
  hLine(image, 4, 4, 6, palette.trunkShade);
  hLine(image, 4, 6, 8, palette.trunkShade);
  hLine(image, 4, 8, 4, mix(palette.trunkShade, palette.wood, 0.4));
  return { image: outline(image, palette.outline), offsetX: 0, offsetY: 0 };
}

function mailbox(palette: WorldPalette): PropArt {
  const image = createBuffer(16, 16);
  const red = hex('#e0483e');
  fillEllipse(image, 8, 14.5, 5, 1.5, palette.shadow);
  fillRect(image, 7, 9, 2, 6, palette.woodShade);
  fillRect(image, 3, 2, 10, 8, red);
  hLine(image, 4, 1, 8, red);
  hLine(image, 3, 2, 10, shade(red, 1.25));
  vLine(image, 12, 2, 8, shade(red, 0.75));
  hLine(image, 5, 5, 6, hex('#2a1f2a'));
  fillRect(image, 4, 7, 8, 1, hex('#ffd65a'));
  return { image: outline(image, palette.outline), offsetX: 0, offsetY: 0 };
}

function lamp(palette: WorldPalette): PropArt {
  const image = createBuffer(16, 32);
  const iron = hex('#2b3346');
  const glow = hex('#ffe9a0');
  fillEllipse(image, 8, 30.5, 4, 1.4, palette.shadow);
  fillRect(image, 7, 9, 2, 22, iron);
  fillRect(image, 5, 28, 6, 3, iron);
  fillRect(image, 4, 2, 8, 7, iron);
  fillRect(image, 5, 3, 6, 5, glow);
  vLine(image, 8, 3, 5, iron);
  hLine(image, 3, 1, 10, iron);
  setPixel(image, 8, 0, iron);
  setPixel(image, 6, 4, hex('#fffbe6'));
  return { image: outline(image, palette.outline), offsetX: 0, offsetY: -16 };
}

function bench(palette: WorldPalette): PropArt {
  const image = createBuffer(32, 16);
  const iron = hex('#2b3346');
  fillEllipse(image, 16, 14, 13, 1.6, palette.shadow);
  for (const y of [4, 7]) {
    fillRect(image, 2, y, 28, 2, palette.wood);
    hLine(image, 2, y, 28, palette.woodLight);
  }
  fillRect(image, 2, 10, 28, 2, palette.woodShade);
  for (const x of [4, 26]) {
    fillRect(image, x, 9, 2, 6, iron);
  }
  return { image: outline(image, palette.outline), offsetX: 0, offsetY: 0 };
}

function fence(palette: WorldPalette): PropArt {
  const image = createBuffer(16, 16);
  for (const x of [1, 13]) {
    fillRect(image, x, 3, 2, 12, palette.wood);
    vLine(image, x + 1, 3, 12, palette.woodShade);
  }
  for (const y of [6, 10]) {
    fillRect(image, 0, y, 16, 2, palette.woodLight);
    hLine(image, 0, y + 1, 16, palette.wood);
  }
  return { image: outline(image, palette.outline), offsetX: 0, offsetY: 0 };
}

function cone(palette: WorldPalette): PropArt {
  const image = createBuffer(16, 16);
  const orange = hex('#ff8a2a');
  const white = hex('#f6f6f6');
  fillEllipse(image, 8, 14, 6, 1.6, palette.shadow);
  fillRect(image, 3, 12, 10, 2, shade(orange, 0.8));
  for (let y = 3; y < 12; y += 1) {
    const half = Math.floor((y - 2) / 2) + 1;
    hLine(image, 8 - half, y, half * 2, y === 6 || y === 9 ? white : orange);
  }
  return { image: outline(image, palette.outline), offsetX: 0, offsetY: 0 };
}

function barrier(palette: WorldPalette): PropArt {
  const image = createBuffer(16, 16);
  const red = hex('#e0483e');
  const white = hex('#f6f6f6');
  fillRect(image, 2, 9, 2, 6, palette.woodShade);
  fillRect(image, 12, 9, 2, 6, palette.woodShade);
  for (let x = 0; x < 16; x += 1) {
    vLine(image, x, 4, 5, Math.floor((x + 1) / 3) % 2 === 0 ? red : white);
  }
  return { image: outline(image, palette.outline), offsetX: 0, offsetY: 0 };
}

function crate(palette: WorldPalette): PropArt {
  const image = createBuffer(16, 16);
  fillRect(image, 2, 3, 12, 12, palette.wood);
  fillRect(image, 2, 3, 12, 2, palette.woodLight);
  for (const x of [2, 13]) vLine(image, x, 3, 12, palette.woodShade);
  hLine(image, 2, 14, 12, palette.woodShade);
  for (let index = 0; index < 10; index += 1) {
    setPixel(image, 3 + index, 5 + index, palette.woodShade);
  }
  return { image: outline(image, palette.outline), offsetX: 0, offsetY: 0 };
}

function planter(palette: WorldPalette): PropArt {
  const image = createBuffer(16, 16);
  const clay = hex('#c8643c');
  fillRect(image, 3, 9, 10, 6, clay);
  hLine(image, 2, 9, 12, shade(clay, 1.2));
  vLine(image, 12, 10, 5, shade(clay, 0.75));
  shadedBlob(
    image,
    [{ x: 8, y: 6, r: 5 }],
    { dark: palette.leafDark, shade: palette.leafShade, base: palette.leaf, light: palette.leafLight },
    31,
  );
  setPixel(image, 6, 4, palette.flowerA);
  setPixel(image, 10, 6, palette.flowerB);
  return { image: outline(image, palette.outline), offsetX: 0, offsetY: 0 };
}

function rock(palette: WorldPalette): PropArt {
  const image = createBuffer(16, 16);
  fillEllipse(image, 8, 13.5, 6, 1.6, palette.shadow);
  shadedBlob(
    image,
    [
      { x: 8, y: 9, r: 5.5 },
      { x: 5, y: 11, r: 3.5 },
    ],
    { dark: shade(palette.stoneShade, 0.7), shade: palette.stoneShade, base: palette.stone, light: palette.stoneLight },
    41,
  );
  return { image: outline(image, palette.outline), offsetX: 0, offsetY: 0 };
}

function umbrella(palette: WorldPalette): PropArt {
  const image = createBuffer(32, 32);
  const stripeA = hex('#2fc6f0');
  const stripeB = hex('#f6f6f6');
  const towel = hex('#ff6b6b');
  fillRect(image, 4, 24, 20, 6, towel);
  for (let x = 4; x < 24; x += 4) vLine(image, x, 24, 6, shade(towel, 1.2));
  fillRect(image, 15, 8, 2, 22, hex('#dfe6ee'));
  for (let y = 0; y < 9; y += 1) {
    const half = 3 + y * 1.6;
    for (let x = Math.round(16 - half); x <= Math.round(15 + half); x += 1) {
      const stripe = Math.floor((x - 16) / 4) % 2 === 0;
      setPixel(image, x, y + 2, stripe ? stripeA : stripeB);
    }
  }
  return { image: outline(image, palette.outline), offsetX: 0, offsetY: -16 };
}

function boat(palette: WorldPalette): PropArt {
  const image = createBuffer(32, 16);
  const hull = hex('#f6f6f6');
  const trim = hex('#1f7fd8');
  for (let y = 6; y < 13; y += 1) {
    const inset = Math.max(0, y - 9);
    hLine(image, 2 + inset, y, 28 - inset * 2, hull);
  }
  hLine(image, 2, 8, 28, trim);
  fillRect(image, 6, 3, 8, 3, palette.woodLight);
  hLine(image, 3, 13, 26, palette.waterLight);
  return { image: outline(image, palette.outline), offsetX: 0, offsetY: 0 };
}

function fountain(palette: WorldPalette, frame: number): PropArt {
  const image = createBuffer(48, 48);
  fillEllipse(image, 24, 41, 22, 6, palette.shadow);
  // Pileta de piedra.
  fillEllipse(image, 24, 31, 22, 13, palette.stoneShade);
  fillEllipse(image, 24, 29, 22, 13, palette.stone);
  fillEllipse(image, 24, 29, 18, 10, palette.stoneLight);
  fillEllipse(image, 24, 30, 17, 9, palette.waterDeep);
  fillEllipse(image, 24, 30, 16, 8, palette.water);
  // Ondas que se expanden (animación de 4 frames).
  const ripple = 4 + frame * 3;
  for (let angle = 0; angle < Math.PI * 2; angle += 0.12) {
    const x = 24 + Math.cos(angle) * ripple * 1.6;
    const y = 30 + Math.sin(angle) * ripple * 0.8;
    if (Math.cos(angle * 3 + frame) > 0) setPixel(image, Math.round(x), Math.round(y), palette.waterLight);
  }
  // Columna central y chorro.
  fillRect(image, 21, 16, 6, 14, palette.stone);
  vLine(image, 21, 16, 14, palette.stoneLight);
  vLine(image, 26, 16, 14, palette.stoneShade);
  fillEllipse(image, 24, 16, 6, 2.5, palette.stoneShade);
  fillEllipse(image, 24, 15, 6, 2.5, palette.stone);
  const spray = [0, 1, 2, 1][frame % 4] ?? 0;
  fillRect(image, 23, 4 - spray, 2, 11 + spray, palette.waterLight);
  for (const [dx, dy] of [
    [-5, 6],
    [5, 6],
    [-7, 10],
    [7, 10],
  ] as const) {
    setPixel(image, 24 + dx + (frame % 2 === 0 ? 0 : Math.sign(dx)), 4 + dy - spray, palette.foam);
  }
  return { image: outline(image, palette.outline), offsetX: 0, offsetY: 0 };
}

/** Genera el arte de un objeto para una paleta (y frame, si está animado). */
export function propArt(kind: PropKind, palette: WorldPalette, frame = 0): PropArt {
  switch (kind) {
    case 'tree':
      return tree(palette);
    case 'palm':
      return palm(palette);
    case 'bush':
      return bush(palette);
    case 'sign':
      return sign(palette);
    case 'mailbox':
      return mailbox(palette);
    case 'lamp':
      return lamp(palette);
    case 'bench':
      return bench(palette);
    case 'fence':
      return fence(palette);
    case 'cone':
      return cone(palette);
    case 'barrier':
      return barrier(palette);
    case 'crate':
      return crate(palette);
    case 'planter':
      return planter(palette);
    case 'rock':
      return rock(palette);
    case 'umbrella':
      return umbrella(palette);
    case 'boat':
      return boat(palette);
    case 'fountain':
      return fountain(palette, frame);
  }
}
